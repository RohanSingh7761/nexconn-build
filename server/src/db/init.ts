import 'dotenv/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rehearsal';
  console.log(`[db:init] Using connection string: ${connectionString.replace(/:[^:@]+@/, ':***@')}`);

  const parsed = new URL(connectionString);
  const targetDbName = parsed.pathname.slice(1) || 'rehearsal';

  // Step 1: Connect to maintenance db ('postgres') to ensure target db exists
  const adminUrl = new URL(connectionString);
  adminUrl.pathname = '/postgres';

  const adminClient = new Client({ connectionString: adminUrl.toString() });
  try {
    await adminClient.connect();
    const checkRes = await adminClient.query('SELECT 1 FROM pg_database WHERE datname = $1', [targetDbName]);
    if (checkRes.rowCount === 0) {
      console.log(`[db:init] Database "${targetDbName}" does not exist. Creating...`);
      await adminClient.query(`CREATE DATABASE "${targetDbName}"`);
      console.log(`[db:init] Database "${targetDbName}" created successfully.`);
    } else {
      console.log(`[db:init] Database "${targetDbName}" already exists.`);
    }
  } catch (err: any) {
    console.warn(`[db:init] Note: Could not auto-create database from default 'postgres' database: ${err.message}. Proceeding directly to target connection...`);
  } finally {
    await adminClient.end().catch(() => {});
  }

  // Step 2: Connect to the target database and run schema & seed
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log(`[db:init] Connected to database "${targetDbName}".`);

    const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
    const seedPath = path.resolve(__dirname, '../../db/seed.sql');

    if (fs.existsSync(schemaPath)) {
      console.log('[db:init] Applying schema.sql...');
      const schemaSql = fs.readFileSync(schemaPath, 'utf8');
      await client.query(schemaSql);
      console.log('[db:init] schema.sql applied successfully.');
    }

    if (fs.existsSync(seedPath)) {
      console.log('[db:init] Applying seed.sql...');
      const seedSql = fs.readFileSync(seedPath, 'utf8');
      await client.query(seedSql);
      console.log('[db:init] seed.sql applied successfully.');
    }

    const { rows: scenarioRows } = await client.query('SELECT id, title, category FROM scenarios');
    console.log(`[db:init] Verification: ${scenarioRows.length} scenario(s) found in database:`);
    for (const s of scenarioRows) {
      console.log(`  - [${s.category}] ${s.title} (${s.id})`);
    }

    console.log('[db:init] Database setup complete!');
  } catch (err: any) {
    console.error(`[db:init] Failed to initialize database: ${err.message}`);
    console.error('Make sure PostgreSQL is running and your DATABASE_URL in server/.env has valid username/password/host/port credentials.');
    process.exit(1);
  } finally {
    await client.end().catch(() => {});
  }
}

main();
