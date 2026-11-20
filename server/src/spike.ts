// Phase 0 spike. Usage (from server/):
//   npx tsx src/spike.ts tokens   -> prints tokens for u_alice, u_bob (paste into the client spike page)
//   npx tsx src/spike.ts send     -> persona bot DMs u_alice, creates group coach_spike, bot_coach posts in it
import 'dotenv/config';
import { initNexconnServer, issueToken, sendDirectText, sendGroupText, createCoachGroup } from './services/nexconnServer.js';

const need = (k: string) => {
  const v = process.env[k];
  if (!v) throw new Error(`Missing ${k} in server/.env`);
  return v;
};

initNexconnServer({
  appKey: need('NEXCONN_APP_KEY'),
  appSecret: need('NEXCONN_APP_SECRET'),
  primaryDomain: need('NEXCONN_PRIMARY_API_DOMAIN'),
  secondaryDomain: need('NEXCONN_SECONDARY_API_DOMAIN'),
});

const GROUP = 'coach_spike';

async function step(name: string, fn: () => Promise<unknown>) {
  try {
    console.log(`OK   ${name}:`, JSON.stringify(await fn(), null, 2));
  } catch (e: any) {
    console.log(`FAIL ${name}:`, e?.response?.data ?? e?.message ?? e);
  }
}

const mode = process.argv[2];
console.log('App key (paste into client spike):', need('NEXCONN_APP_KEY'));

if (mode === 'tokens') {
  await step('token u_alice', () => issueToken('u_alice', 'Alice'));
  await step('token u_bob', () => issueToken('u_bob', 'Bob'));
  await step('token u_alice again (repeat-safe?)', () => issueToken('u_alice', 'Alice'));
} else if (mode === 'send') {
  await step('register persona_spike', () => issueToken('persona_spike', 'Maya (AI)'));
  await step('register bot_coach', () => issueToken('bot_coach', 'Coach (AI)'));
  await step('persona DM -> u_alice', () => sendDirectText('persona_spike', 'u_alice', 'Hi Alice, this is the persona bot.'));
  await step(`create group ${GROUP}`, () => createCoachGroup(GROUP, 'Coach spike', 'u_alice', ['u_alice', 'u_bob']));
  await step('bot_coach (non-member) -> group', () =>
    sendGroupText('bot_coach', GROUP, JSON.stringify({ v: 1, kind: 'coach_tip', text: 'Spike tip from bot_coach' })));
} else {
  console.log('Usage: npx tsx src/spike.ts tokens|send');
}
