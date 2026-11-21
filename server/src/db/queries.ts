import 'dotenv/config';
import pg from 'pg';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/rehearsal',
});

export interface UserRow {
  id: string;
  username: string;
  display_name: string;
  password_hash: string;
  role: 'learner' | 'mentor';
  nexconn_user_id: string;
  created_at: Date;
}

export async function createUser(
  username: string,
  displayName: string,
  passwordHash: string,
  role: 'learner' | 'mentor' = 'learner'
): Promise<UserRow> {
  const { rows } = await pool.query<UserRow>(
    `INSERT INTO users (username, display_name, password_hash, role, nexconn_user_id)
     VALUES ($1, $2, $3, $4, 'u_' || gen_random_uuid())
     RETURNING *`,
    [username, displayName, passwordHash, role]
  );
  return rows[0];
}

export async function getUserByUsername(username: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE username = $1',
    [username]
  );
  return rows[0] || null;
}

export async function getUserById(id: string): Promise<UserRow | null> {
  const { rows } = await pool.query<UserRow>(
    'SELECT * FROM users WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export interface ScenarioRow {
  id: string;
  title: string;
  category: string;
  description: string;
  learner_objective: string;
  persona_name: string;
  persona_role: string;
  persona_avatar_url: string | null;
  persona_public_brief: string;
  persona_private_brief: string;
  opening_message: string | null;
  difficulty_guides: Record<string, string>;
  rubric: Array<{ key: string; label: string; weight: number }>;
  est_minutes: number;
  is_active: boolean;
}

export async function listScenarios(): Promise<ScenarioRow[]> {
  const { rows } = await pool.query<ScenarioRow>(
    `SELECT id, title, category, description, learner_objective,
            persona_name, persona_role, persona_avatar_url,
            persona_public_brief, opening_message, difficulty_guides,
            rubric, est_minutes, is_active
     FROM scenarios
     WHERE is_active = true
     ORDER BY category, title`
  );
  return rows;
}

export async function getScenarioById(id: string): Promise<ScenarioRow | null> {
  const { rows } = await pool.query<ScenarioRow>(
    'SELECT * FROM scenarios WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function createScenario(data: {
  id: string;
  title: string;
  category: string;
  description: string;
  learner_objective: string;
  persona_name: string;
  persona_role: string;
  persona_avatar_url?: string | null;
  persona_public_brief: string;
  persona_private_brief: string;
  opening_message?: string | null;
  difficulty_guides: Record<string, string>;
  rubric: Array<{ key: string; label: string; weight: number }>;
  est_minutes?: number;
}): Promise<ScenarioRow> {
  const { rows } = await pool.query<ScenarioRow>(
    `INSERT INTO scenarios (
       id, title, category, description, learner_objective,
       persona_name, persona_role, persona_avatar_url,
       persona_public_brief, persona_private_brief,
       opening_message, difficulty_guides, rubric, est_minutes, is_active
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
     RETURNING *`,
    [
      data.id,
      data.title,
      data.category || 'custom',
      data.description,
      data.learner_objective,
      data.persona_name,
      data.persona_role,
      data.persona_avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.persona_name)}&background=random`,
      data.persona_public_brief,
      data.persona_private_brief,
      data.opening_message || null,
      JSON.stringify(data.difficulty_guides),
      JSON.stringify(data.rubric),
      data.est_minutes || 8,
    ]
  );
  return rows[0];
}

export interface SessionRow {
  id: string;
  user_id: string;
  scenario_id: string;
  difficulty: 'friendly' | 'neutral' | 'tough';
  user_context: string | null;
  status: 'active' | 'completed' | 'abandoned';
  persona_nexconn_id: string;
  coach_group_id: string;
  turn_count: number;
  started_at: Date;
  ended_at: Date | null;
}

export async function createSession(
  userId: string,
  scenarioId: string,
  difficulty: 'friendly' | 'neutral' | 'tough',
  userContext: string | null,
  personaNexconnId: string,
  coachGroupId: string
): Promise<SessionRow> {
  const { rows } = await pool.query<SessionRow>(
    `INSERT INTO sessions (user_id, scenario_id, difficulty, user_context, persona_nexconn_id, coach_group_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING *`,
    [userId, scenarioId, difficulty, userContext, personaNexconnId, coachGroupId]
  );
  const session = rows[0];

  await pool.query(
    `INSERT INTO session_members (session_id, user_id, role)
     VALUES ($1, $2, 'owner')
     ON CONFLICT DO NOTHING`,
    [session.id, userId]
  );

  return session;
}

export async function getSessionById(id: string): Promise<SessionRow | null> {
  const { rows } = await pool.query<SessionRow>(
    'SELECT * FROM sessions WHERE id = $1',
    [id]
  );
  return rows[0] || null;
}

export async function listSessionsForUser(userId: string) {
  const { rows } = await pool.query(
    `SELECT s.*, sc.title as scenario_title, sc.persona_name, sc.persona_role, card.overall_score
     FROM sessions s
     JOIN scenarios sc ON s.scenario_id = sc.id
     LEFT JOIN scorecards card ON s.id = card.session_id
     WHERE s.user_id = $1
     ORDER BY s.started_at DESC`,
    [userId]
  );
  return rows;
}

export interface MessageRow {
  id: number;
  session_id: string;
  channel: 'scene' | 'coach';
  sender_type: 'learner' | 'persona' | 'coach' | 'mentor' | 'system';
  sender_user_id: string | null;
  content: string;
  meta: any;
  reply_to: number | null;
  nexconn_message_uid: string | null;
  created_at: Date;
}

export async function saveMessage(
  sessionId: string,
  channel: 'scene' | 'coach',
  senderType: 'learner' | 'persona' | 'coach' | 'mentor' | 'system',
  senderUserId: string | null,
  content: string,
  meta: any = {},
  replyTo: number | null = null,
  nexconnMessageUid: string | null = null
): Promise<MessageRow> {
  const { rows } = await pool.query<MessageRow>(
    `INSERT INTO messages (session_id, channel, sender_type, sender_user_id, content, meta, reply_to, nexconn_message_uid)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (nexconn_message_uid) DO UPDATE SET content = EXCLUDED.content
     RETURNING *`,
    [sessionId, channel, senderType, senderUserId, content, JSON.stringify(meta), replyTo, nexconnMessageUid]
  );
  return rows[0];
}

export async function getSessionMessages(sessionId: string): Promise<MessageRow[]> {
  const { rows } = await pool.query<MessageRow>(
    `SELECT m.*, u.display_name as sender_name
     FROM messages m
     LEFT JOIN users u ON m.sender_user_id = u.id
     WHERE m.session_id = $1
     ORDER BY m.created_at ASC, m.id ASC`,
    [sessionId]
  );
  return rows;
}

export async function getSceneMessages(sessionId: string, limit = 20): Promise<MessageRow[]> {
  const { rows } = await pool.query<MessageRow>(
    `SELECT * FROM (
       SELECT * FROM messages
       WHERE session_id = $1 AND channel = 'scene'
       ORDER BY created_at DESC, id DESC
       LIMIT $2
     ) sub ORDER BY created_at ASC, id ASC`,
    [sessionId, limit]
  );
  return rows;
}

export async function updateSessionEnd(sessionId: string): Promise<SessionRow> {
  const { rows } = await pool.query<SessionRow>(
    `UPDATE sessions
     SET status = 'completed', ended_at = now()
     WHERE id = $1
     RETURNING *`,
    [sessionId]
  );
  return rows[0];
}

export async function saveScorecard(
  sessionId: string,
  overallScore: number,
  summary: string,
  dimensions: any,
  strengths: any,
  improvements: any,
  keyMoments: any,
  nextPractice: string
) {
  const { rows } = await pool.query(
    `INSERT INTO scorecards (session_id, overall_score, summary, dimensions, strengths, improvements, key_moments, next_practice)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (session_id) DO UPDATE SET
       overall_score = EXCLUDED.overall_score,
       summary = EXCLUDED.summary,
       dimensions = EXCLUDED.dimensions,
       strengths = EXCLUDED.strengths,
       improvements = EXCLUDED.improvements,
       key_moments = EXCLUDED.key_moments,
       next_practice = EXCLUDED.next_practice
     RETURNING *`,
    [
      sessionId,
      overallScore,
      summary,
      JSON.stringify(dimensions),
      JSON.stringify(strengths),
      JSON.stringify(improvements),
      JSON.stringify(keyMoments),
      nextPractice,
    ]
  );
  return rows[0];
}

export async function getScorecard(sessionId: string) {
  const { rows } = await pool.query(
    'SELECT * FROM scorecards WHERE session_id = $1',
    [sessionId]
  );
  return rows[0] || null;
}

export async function createInvite(
  code: string,
  sessionId: string,
  createdBy: string,
  expiresAt: Date
) {
  const { rows } = await pool.query(
    `INSERT INTO invites (code, session_id, created_by, expires_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [code, sessionId, createdBy, expiresAt]
  );
  return rows[0];
}

export async function getInvite(code: string) {
  const { rows } = await pool.query(
    `SELECT i.*, s.coach_group_id
     FROM invites i
     JOIN sessions s ON i.session_id = s.id
     WHERE i.code = $1 AND i.expires_at > now() AND i.use_count < i.max_uses`,
    [code]
  );
  return rows[0] || null;
}

export async function joinSessionWithInvite(sessionId: string, userId: string, code: string) {
  await pool.query(
    `INSERT INTO session_members (session_id, user_id, role)
     VALUES ($1, $2, 'mentor')
     ON CONFLICT DO NOTHING`,
    [sessionId, userId]
  );
  await pool.query(
    'UPDATE invites SET use_count = use_count + 1 WHERE code = $1',
    [code]
  );
}

export async function getSessionMemberRole(sessionId: string, userId: string): Promise<'learner' | 'mentor' | null> {
  const { rows } = await pool.query<{ role: string }>(
    'SELECT role FROM session_members WHERE session_id = $1 AND user_id = $2',
    [sessionId, userId]
  );
  if (rows.length > 0 && rows[0].role) {
    return rows[0].role as 'learner' | 'mentor';
  }
  return null;
}
