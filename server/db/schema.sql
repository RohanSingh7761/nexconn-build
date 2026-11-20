-- PostgreSQL 15+. gen_random_uuid() is built in since PG13.

CREATE TABLE IF NOT EXISTS users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username         text NOT NULL UNIQUE,
  display_name     text NOT NULL,
  password_hash    text NOT NULL,
  role             text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','mentor')),
  nexconn_user_id  text NOT NULL UNIQUE,           -- 'u_' || id, set by the app
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenarios (
  id                    text PRIMARY KEY,           -- slug, e.g. 'salary-raise'
  title                 text NOT NULL,
  category              text NOT NULL,              -- career | sales | leadership
  description           text NOT NULL,
  learner_objective     text NOT NULL,              -- shown to the learner AND given to the coach
  persona_name          text NOT NULL,
  persona_role          text NOT NULL,
  persona_avatar_url    text,
  persona_public_brief  text NOT NULL,              -- who they are, tone (safe to show)
  persona_private_brief text NOT NULL,              -- hidden goals/constraints (persona only, never the coach)
  opening_message       text,                       -- null = learner speaks first
  difficulty_guides     jsonb NOT NULL,             -- {"friendly":"...","neutral":"...","tough":"..."}
  rubric                jsonb NOT NULL,             -- [{"key":"clarity","label":"Clarity","weight":1}, ...]
  est_minutes           int NOT NULL DEFAULT 8,
  is_active             boolean NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS sessions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES users(id),
  scenario_id        text NOT NULL REFERENCES scenarios(id),
  difficulty         text NOT NULL CHECK (difficulty IN ('friendly','neutral','tough')),
  user_context       text,                          -- optional custom situation (max 500 chars)
  status             text NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','abandoned')),
  persona_nexconn_id text NOT NULL,                 -- 'persona_<id>'
  coach_group_id     text NOT NULL,                 -- 'coach_<id>'
  turn_count         int  NOT NULL DEFAULT 0,
  started_at         timestamptz NOT NULL DEFAULT now(),
  ended_at           timestamptz
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS session_members (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id),
  role       text NOT NULL CHECK (role IN ('owner','mentor')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id                  bigserial PRIMARY KEY,
  session_id          uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  channel             text NOT NULL CHECK (channel IN ('scene','coach')),
  sender_type         text NOT NULL CHECK (sender_type IN ('learner','persona','coach','mentor','system')),
  sender_user_id      uuid REFERENCES users(id),     -- null for bots/system
  content             text NOT NULL,
  meta                jsonb NOT NULL DEFAULT '{}',   -- coach: {kind, category, sentiment, rewrite}
  reply_to            bigint REFERENCES messages(id),-- coach tip -> the learner message it is about
  nexconn_message_uid text UNIQUE,                   -- idempotency + dedupe with SDK messages
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_session_idx ON messages(session_id, created_at, id);

CREATE TABLE IF NOT EXISTS scorecards (
  session_id    uuid PRIMARY KEY REFERENCES sessions(id) ON DELETE CASCADE,
  overall_score int  NOT NULL CHECK (overall_score BETWEEN 0 AND 100),
  summary       text NOT NULL,
  dimensions    jsonb NOT NULL,   -- [{key,label,score(1-5),comment}]
  strengths     jsonb NOT NULL,   -- [string]
  improvements  jsonb NOT NULL,   -- [string]
  key_moments   jsonb NOT NULL,   -- [{message_id, what_happened, better_option}]
  next_practice text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS invites (
  code        text PRIMARY KEY,                       -- 6 chars, A-Z2-9 (no 0/O/1/I)
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES users(id),
  expires_at  timestamptz NOT NULL,
  max_uses    int NOT NULL DEFAULT 3,
  use_count   int NOT NULL DEFAULT 0
);
