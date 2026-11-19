# Rehearsal: Project Plan

> Practice hard conversations in chat before having them for real. An AI plays the other person realistically while a coach whispers feedback in a separate side channel. A human mentor can join the coach channel and give live feedback alongside the AI.

| | |
|---|---|
| **Hackathon** | Nexconn Build Challenge 2026 (online, Oct 23 to Nov 22, 2026; check the exact cutoff time and timezone on the registration page) |
| **Required tech** | Nexconn Chat SDK (Call SDK for voice/video is optional and **out of scope** here) |
| **Our stack** | React + Vite (JavaScript), Express (JavaScript), local PostgreSQL, Nexconn Chat SDK + Server SDK, Capacitor for the Android APK |
| **Scope** | Chat only. Professional scenarios only. |

---

## 0. Check manually

I could not read the Nexconn API reference, so confirm these in the Nexconn docs, console, and sample repos (`github.com/NexconnAI-Dev`) during the Phase 0 spike:

1. **Client SDK (`@nexconn/chat`):** exact method names for init, connect, message listener, send text (direct and group), and fetching history. The sample repo `nexconn-chat-sample-web` is the quickest reference.
2. **Server SDK (`@nexconn/server-sdk`):** request bodies for `sendDirectChannelMessage`, `sendGroupChannelMessage`, `createGroupChannel`, `joinGroupChannel`, and the response shape of `issueAccessToken`. Each method has a page under `docs/` in `nexconn-server-sdk-node`.
3. **Console settings:** App Key, App Secret, API domains, and whether message history storage must be switched on.
4. **Typing status and read receipts:** whether they are supported on web and in group channels.
5. **Web SDK inside the Capacitor Android WebView:** that it connects and receives messages on a real phone.
6. **Judging criteria and submission requirements:** the hackathon page loads dynamically, so read it in a browser and adjust the demo emphasis.

Tip: Nexconn publishes an AI-assistant skill for integration. Run `npx skills add https://github.com/NexconnAI-Dev/nexconn-skills.git --skill nexconn-chat` and ask your coding assistant to use it during Phase 0.

All Nexconn calls are isolated behind **two adapter files** (`client/src/lib/nexconn.js` and `server/src/services/nexconnServer.ts`), so any API difference is a one-file fix. Places in the code that need a manual check are marked `CHECK`.

---

## 1. Summary

**Problem.** People freeze or fumble high-stakes conversations (asking for a raise, a tough client call, a job interview, giving hard feedback) because they never get a safe, realistic rep, and nobody gives feedback while it happens.

**Solution.** Rehearsal is a chat app with two live conversations per session:

1. **Scene channel.** You chat with an AI persona (for example, a skeptical manager). It stays in character, pushes back realistically, and concedes only if you earn it.
2. **Coach channel.** A separate side channel where an AI coach posts one short, specific tip after each of your messages. You can ask the coach questions. A **human mentor** (friend, senior, placement officer) can join this channel with an invite code and add live comments.

When you finish, you get a **scorecard** (rubric scores, key moments, better phrasing) and a **replay** of the whole session with coach tips inline.

**Users and business.** Learners (students, early-career, sales reps) and the coaches who guide them. Revenue: placement cells and colleges, sales-training teams, career coaches (per-seat licensing, mentor dashboards, custom scenarios).

**Why Nexconn is not incidental here:**

| Product feature | Nexconn capability used |
|---|---|
| Scene chat with the persona | Direct channel, real-time delivery |
| Coach side channel | Group channel, separate from the scene |
| Human mentor joins live | Group membership (server joins mentor to the coach group) |
| Persona and coach are separate identities | Server-registered bot users that send messages as themselves |
| Reload and resume a session | Channel history (plus our own Postgres transcript) |
| Reconnect and offline queue | SDK connection state + local message queue |
| Unread badge on the coach tab (mobile) | Unread counts / message listener |

---

## 2. Goals and non-goals

**Must have (MVP)**
- Register / login, pick a scenario and difficulty, start a session.
- Live scene chat with the AI persona over Nexconn.
- Live coach tips in a separate Nexconn group channel.
- Ask the coach a question in the coach channel.
- End session, scorecard, session history, replay.
- Mentor invite code, mentor joins the coach channel, mentor read-only transcript view.
- Runs as an Android APK (Capacitor) talking to the backend through a tunnel or LAN.

**Nice to have**
- Read receipts or delivery state, "persona is typing" polish, scenario custom context ("I've been here 2 years, want 20%").
- Streaming persona replies using the server stream-message API.
- Mentor messages become pinned "mentor notes" in the scorecard.


---

## 3. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Client | React 18 + Vite (JavaScript, `.jsx`) | `react-router-dom`, `zustand` (state), Tailwind CSS, `lucide-react` icons |
| Chat (client) | `@nexconn/chat` | Wrapped in `lib/nexconn.js` |
| Mobile | Capacitor (Android) | `@capacitor/core`, `@capacitor/android`, `@capacitor/keyboard`, `@capacitor/status-bar` |
| Server | Node 20 + Express + JavaScript | `zod` validation, `helmet`, `cors`, `express-rate-limit`, `jsonwebtoken`, `bcryptjs` |
| Chat (server) | `@nexconn/server-sdk` v0.1.2 | Installed from GitHub tag (see setup) |
| DB | PostgreSQL 15+ (local) | Raw SQL via `pg`, plain `schema.sql` + `seed.sql` (no ORM, fastest for 2 days) |
| LLM | Provider-agnostic `llm.complete()` | Defaults: a stronger model for the persona, a faster model for coach tips. Set via env |

---

## 4. Architecture

```mermaid
flowchart LR
  subgraph Client["React + Vite (Capacitor APK)"]
    UI[Chat UI]
    NX[Nexconn Chat SDK]
  end
  subgraph Server["Express API"]
    API[REST routes]
    ORCH[Turn orchestrator]
    NS[Nexconn Server SDK]
  end
  PG[(Postgres)]
  LLM[LLM API]
  CLOUD[[Nexconn Cloud]]
  UI --> NX
  NX <--> CLOUD
  UI -->|HTTPS| API
  API --> ORCH
  ORCH --> LLM
  ORCH --> PG
  ORCH --> NS
  NS --> CLOUD
```

### 4.1 Identity model

| Who | Nexconn userId | Created by |
|---|---|---|
| Learner / mentor | `u_<users.id>` | Backend, on login via `issueAccessToken` |
| Persona bot | `persona_<sessionId>` | Backend, at session start (one per session) |
| Coach bot | `bot_coach` | Backend, at server startup |

**Why one persona user per session:** a direct channel is keyed by the pair of users, so reusing one persona for every session would mix histories. A per-session persona gives each session its own clean channel and lets the persona carry the scenario's name and avatar.

### 4.2 Channel model

| Channel | Type | Target id | Members | Purpose |
|---|---|---|---|---|
| Scene | Direct | learner <-> `persona_<sessionId>` | learner, persona bot | The rehearsal itself |
| Coach | Group | `coach_<sessionId>` | learner, `bot_coach`, mentor(s) | Tips, questions, mentor comments, scorecard-ready notice |

### 4.3 Who sends what

- **Learner messages** are sent by the **client through the Nexconn SDK** (so they get delivery, ordering, offline queueing), then the client calls `POST /turns` so the backend can persist and generate replies. The backend de-duplicates on `nexconnMessageUid`.
- **Persona replies and coach tips** are sent by the **backend through the Server SDK** as the bot users. The client receives them through its normal SDK listener.
- **The HTTP response to `/turns` also contains the replies.** The client de-duplicates against SDK-delivered messages. This is the fallback if server-sent delivery misbehaves during the demo.
- **Mentor messages** are sent by the mentor client through the SDK, then acknowledged to the backend so they land in the transcript.

### 4.4 Single source of truth

Nexconn carries live traffic. **Postgres holds the canonical transcript** (needed for scorecards, replay, and mentor view). Messages are dual-written and linked by `nexconn_message_uid`.

---

## 5. Core flows

### 5.1 Login and Nexconn connect
1. `POST /api/auth/login` returns our JWT + user.
2. Client calls `POST /api/nexconn/token` (JWT-protected). Backend calls `issueAccessToken({ userId: 'u_<id>', name, avatarUrl })` and returns `{ appKey, userId, token }`.
3. Client calls `nexconn.init(appKey)` then `nexconn.connect(token)`. On "token expired" status, fetch a new token and reconnect.

### 5.2 Start a session
1. `POST /api/sessions { scenarioId, difficulty, userContext? }`.
2. Backend inserts the session, registers `persona_<sessionId>` (name/avatar from the scenario), ensures `bot_coach` exists, creates group `coach_<sessionId>` with members `[learner, bot_coach]`.
3. Backend sends the persona's opening line (if the scenario has one, for example an interviewer) and a short coach welcome into the coach group.
4. Response returns both channel references. Client opens the session screen and loads history for both channels.

### 5.3 One conversational turn

```mermaid
sequenceDiagram
    participant L as Learner app
    participant N as Nexconn
    participant S as Express API
    participant DB as Postgres
    participant AI as LLM
    L->>N: send text (scene channel)
    L->>S: POST /sessions/:id/turns
    S->>DB: save learner message
    par persona reply
        S->>AI: persona prompt + history
    and coach tip
        S->>AI: coach prompt + history
    end
    S->>N: persona bot sends reply (scene)
    S->>N: coach bot sends tip (coach group)
    S->>DB: save both
    N-->>L: persona reply (SDK listener)
    N-->>L: coach tip (SDK listener)
    S-->>L: 200 with persona + coach (fallback / dedupe)
```

Rules: turns for one session are **serialized with an in-memory lock** (a learner double-sending must not interleave AI replies). The coach tip is allowed to be `skip: true` (trivial message), in which case nothing is sent to the coach channel.

### 5.4 Ask the coach
Learner types in the coach channel, the client sends via SDK, then `POST /sessions/:id/coach-channel/messages`. Backend saves it. If the sender is the learner, the AI coach answers (a different, "answer the question" prompt) and sends the reply as `bot_coach`. If the sender is a mentor, the backend only saves it.

### 5.5 Mentor joins
1. Learner taps "Invite a mentor" and gets a 6-character code (`POST /sessions/:id/invites`).
2. Mentor (own account, role `mentor`) enters the code (`POST /invites/:code/join`). Backend adds a `session_members` row and calls `joinGroupChannel` for the mentor on `coach_<sessionId>`.
3. Mentor screen shows the coach channel live plus a **read-only scene transcript** from `GET /sessions/:id/transcript` (auto-refreshed when a new coach-channel message arrives or every 5 s). Mentor sees the coach channel but cannot send into the scene.

### 5.6 End, scorecard, replay
1. `POST /sessions/:id/end` marks the session completed, generates the scorecard (idempotent), posts a `scorecard_ready` notice in the coach channel.
2. `GET /sessions/:id/scorecard` returns it. `GET /sessions/:id/transcript` returns scene + coach messages merged by time for replay.

---

## 6. Data model

```mermaid
erDiagram
  USERS ||--o{ SESSIONS : starts
  SCENARIOS ||--o{ SESSIONS : "used in"
  SESSIONS ||--o{ MESSAGES : contains
  SESSIONS ||--o| SCORECARDS : "scored by"
  SESSIONS ||--o{ SESSION_MEMBERS : has
  SESSIONS ||--o{ INVITES : has
  USERS ||--o{ SESSION_MEMBERS : joins
```

### `db/schema.sql`

```sql
-- PostgreSQL 15+. gen_random_uuid() is built in since PG13.

CREATE TABLE users (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username         text NOT NULL UNIQUE,
  display_name     text NOT NULL,
  password_hash    text NOT NULL,
  role             text NOT NULL DEFAULT 'learner' CHECK (role IN ('learner','mentor')),
  nexconn_user_id  text NOT NULL UNIQUE,           -- 'u_' || id, set by the app
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE scenarios (
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

CREATE TABLE sessions (
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
CREATE INDEX sessions_user_idx ON sessions(user_id, started_at DESC);

CREATE TABLE session_members (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES users(id),
  role       text NOT NULL CHECK (role IN ('owner','mentor')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE messages (
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
CREATE INDEX messages_session_idx ON messages(session_id, created_at, id);

CREATE TABLE scorecards (
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

CREATE TABLE invites (
  code        text PRIMARY KEY,                       -- 6 chars, A-Z2-9 (no 0/O/1/I)
  session_id  uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  created_by  uuid NOT NULL REFERENCES users(id),
  expires_at  timestamptz NOT NULL,
  max_uses    int NOT NULL DEFAULT 3,
  use_count   int NOT NULL DEFAULT 0
);
```

---

## 7. REST API

Base path `/api`. JSON in, JSON out. Auth: `Authorization: Bearer <jwt>` unless marked public. Error shape: `{ "error": { "code": "STRING", "message": "human text" } }`. Validation with `zod` (400), ownership checks (403/404), per-IP rate limit on auth, per-user rate limit on `/turns`.

### Auth

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/auth/register` (public) | `{ username, displayName, password, role? }` | `{ token, user }` |
| POST | `/auth/login` (public) | `{ username, password }` | `{ token, user }` |
| GET | `/me` | n/a | `{ user }` |
| POST | `/nexconn/token` | n/a | `{ appKey, userId, token }` |

`user` = `{ id, username, displayName, role, nexconnUserId }`.

### Scenarios

| Method | Path | Response |
|---|---|---|
| GET | `/scenarios` | `[{ id, title, category, description, estMinutes, personaName, personaRole, personaAvatarUrl }]` |
| GET | `/scenarios/:id` | the above + `{ learnerObjective, difficulties: ['friendly','neutral','tough'] }` (never returns private brief) |

### Sessions

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/sessions` | `{ scenarioId, difficulty, userContext? }` | `{ session, channels: { scene: {type:'direct', targetId}, coach: {type:'group', targetId} }, opening: Message? }` |
| GET | `/sessions` | n/a | `[{ id, scenarioTitle, difficulty, status, startedAt, overallScore? }]` |
| GET | `/sessions/:id` | n/a | `{ session, scenario, channels, myRole }` (owner or mentor) |
| POST | `/sessions/:id/turns` | `{ text (1..1000), nexconnMessageUid? }` | `{ learnerMessageId, persona: {messageId,text,ended?}, coach: {messageId,text,category,sentiment,rewrite?} \| null }` |
| POST | `/sessions/:id/coach-channel/messages` | `{ text (1..1000), nexconnMessageUid? }` | `{ messageId, coachReply?: {messageId,text} }` |
| POST | `/sessions/:id/end` | n/a | `{ session, scorecard }` (idempotent) |
| GET | `/sessions/:id/transcript` | n/a | `{ messages: [{ id, channel, senderType, senderName, content, meta, replyTo, createdAt }] }` |
| GET | `/sessions/:id/scorecard` | n/a | `{ scorecard }` or 404 |

`/turns` errors: `409 SESSION_ENDED`, `429 TOO_FAST`, `502 AI_UNAVAILABLE` (the learner message is still saved; client shows "Try again").

### Mentor

| Method | Path | Body | Response |
|---|---|---|---|
| POST | `/sessions/:id/invites` (owner) | `{ }` | `{ code, expiresAt }` |
| POST | `/invites/:code/join` (role mentor) | n/a | `{ sessionId, channels: { coach: {...} } }` |
| GET | `/mentor/sessions` (role mentor) | n/a | `[{ id, learnerName, scenarioTitle, status, startedAt }]` |

### Misc
`GET /health` (public) returns `{ ok: true, db: true }`.

---

## 8. Nexconn integration details

### 8.1 Server adapter: `server/src/services/nexconnServer.ts`

Request and response shapes for lines marked `CHECK` need to be confirmed manually from `docs/*.md` in the server SDK repo.

```ts
import {
  Configuration, UserManagementApi, MessageManagementApi, GroupChannelManagementApi,
} from '@nexconn/server-sdk';
import { env } from '../config';

const cfg = new Configuration();
cfg.setNexconnCredentials(env.NEXCONN_APP_KEY, env.NEXCONN_APP_SECRET);
cfg.setPrimaryBackupDomains(env.NEXCONN_PRIMARY_API_DOMAIN, env.NEXCONN_SECONDARY_API_DOMAIN);

const users = new UserManagementApi(cfg);
const messages = new MessageManagementApi(cfg);
const groups = new GroupChannelManagementApi(cfg);

export async function issueToken(userId: string, name: string, avatarUrl?: string) {
  const { data } = await users.issueAccessToken({ userId, name, avatarUrl });
  return data; // CHECK: expect data.result.token
}

export async function sendDirectText(fromUserId: string, toUserId: string, text: string) {
  // CHECK: DirectChannelMessageSendRequest (sender, receiver, content/type fields)
  // const { data } = await messages.sendDirectChannelMessage({ ... });
  // return data.result.messageUid  // CHECK
}

export async function sendGroupText(fromUserId: string, groupId: string, text: string) {
  // CHECK: GroupChannelMessageSendRequest
}

export async function createCoachGroup(groupId: string, memberIds: string[]) {
  // CHECK: GroupChannelCreateRequest. Confirm whether bots must be members to send.
}

export async function joinCoachGroup(groupId: string, userId: string) {
  // CHECK: GroupChannelJoinRequest
}
```

Notes:
- Wrap every call in the SDK's typed exceptions (`ApiException`, `TooManyRequestsException`, `ServiceException`). Retry 5xx once. Never let a Nexconn failure lose the Postgres write.
- Register `bot_coach` once at startup (`issueToken('bot_coach','Coach')`). Confirm calling `issueAccessToken` for an existing user is safe to repeat.
- Stretch: the SDK has `sendDirectChannelStreamMessage`, which could stream persona text token by token. Only try this after the MVP works.

### 8.2 Client adapter: `client/src/lib/nexconn.js`

The rest of the app only ever sees this interface. Fill the bodies from the `@nexconn/chat` docs / sample repo (samples 01, 02, 04, 05). The shapes are documented with JSDoc so editors still give autocomplete in plain JavaScript.

```js
/** @typedef {{ type: 'direct' | 'group', targetId: string }} ChannelRef */

/**
 * @typedef {Object} IncomingMessage
 * @property {string} uid         Nexconn message uid (dedupe key)
 * @property {ChannelRef} channel
 * @property {string} senderId
 * @property {string} text
 * @property {number} sentAt
 */

// Functions every consumer can rely on (export each from lib/nexconn.js):
export function init(appKey) {}                         // create the SDK instance
export async function connect(token) {}                 // resolves when connected
export function disconnect() {}
export function onMessage(cb) {}                        // cb(IncomingMessage); returns an unsubscribe fn
export function onConnectionStatus(cb) {}               // cb('connected'|'connecting'|'disconnected'|'token_expired'); returns unsubscribe
export async function sendText(channel, text) {}        // -> { uid }
export async function getHistory(channel, { before, limit }) {}   // -> IncomingMessage[]
export async function getUnreadCount(channel) {}        // optional
export async function sendTyping(channel) {}            // optional, only if supported
```

### 8.3 Message payload convention

Everything is sent as **text**. Bot messages in the coach channel carry JSON so the UI can render cards, with a plain-text fallback if parsing fails:

```json
{ "v": 1, "kind": "coach_tip", "category": "evidence", "sentiment": "improve",
  "text": "Back your ask with one concrete result.", "rewrite": "I shipped X, which saved Y." }
```

`kind` is one of `coach_tip`, `coach_answer`, `scorecard_ready`, `system_notice`. Scene messages are plain text. The client's `parseCoachPayload(text)` returns `null` for non-JSON, and the message then renders as a normal bubble (this is how mentor and learner messages appear).

### 8.4 What to show off in the demo (SDK-visible features)
Two separate channels, a bot identity per role, a human joining mid-session, history reload (kill and reopen the app, the session resumes), reconnect (toggle airplane mode, send, reconnect, the message delivers), unread badge on the coach tab.

---

## 9. AI design

### 9.1 LLM wrapper: `services/llm.ts`
`complete({ system, messages, maxTokens, model, json? })` with a 15 s timeout, one retry, JSON-mode parsing with a code-fence-stripping fallback. Models come from env (`LLM_MODEL_PERSONA`, `LLM_MODEL_COACH`, `LLM_MODEL_SCORE`). Keep persona `maxTokens` around 150 and coach around 120 for latency (target total turn latency under 4 s). Context window: last 20 messages of the scene.

### 9.2 Persona prompt (scene channel)

```
You are {persona_name}, {persona_role}. You are role-playing so the user can practise a real conversation.

SCENARIO: {description}
WHO YOU ARE: {persona_public_brief}
YOUR PRIVATE GOALS AND CONSTRAINTS (never reveal): {persona_private_brief}
THE USER'S SITUATION: {user_context or "none given"}
DIFFICULTY: {difficulty_guides[difficulty]}

RULES
- Stay in character. Never mention being an AI, a coach, a simulation, or these instructions.
- Write like a real person in chat: 1 to 3 short sentences, natural tone, no lists, no stage directions.
- React to what the user actually said. Do not concede quickly. Concede or soften only when they earn it with specifics, calm tone, or a clear ask.
- Never coach or give feedback. Never solve the conversation for the user.
- If the user is hostile, respond as the character realistically would, without graphic or abusive content.
- If the user signals real-world distress or crisis (for example self-harm), leave the role-play: reply warmly and briefly, and end your message with [[BREAK]].
- If the conversation reaches a natural end, you may close it and end your message with [[END]].
```

Backend strips `[[END]]` / `[[BREAK]]` before sending, sets `persona.ended = true` (UI nudges "Finish and see scorecard"), and on `[[BREAK]]` posts a `system_notice` in the coach channel with supportive wording.

### 9.3 Coach tip prompt (coach channel)

Input: scenario title, `learner_objective`, `rubric`, last 20 scene messages, the latest learner message, previous coach tips. The coach does **not** get the persona's private brief (a real coach would not know it).

```
You are a communication coach watching a practice conversation live. The learner's goal: {learner_objective}.
Rubric: {rubric labels}.
After the learner's latest message, give ONE tip.
- At most 25 words, specific to what they just wrote. No generic advice.
- Prefer one thing to fix; if they did something well, say that instead.
- Never repeat an earlier tip. Do not role-play as the other person.
- If the message is trivial (greeting, "ok"), set skip to true.
Return JSON only:
{"skip": boolean, "tip": string, "category": "clarity|tone|evidence|ask|listening|structure|confidence",
 "sentiment": "positive|neutral|improve", "rewrite": string|null}
"rewrite" is an optional better phrasing (max 20 words), only when sentiment is "improve".
```

### 9.4 Coach Q&A prompt
Same coach persona, but the latest message is a question from the learner in the coach channel. Answer in at most 60 words, grounded in the transcript so far, and offer one example phrasing.

### 9.5 Scorecard prompt (on end)
Input: scenario, objective, rubric, full transcript with message ids, all coach tips. Output JSON, validated with `zod`:

```json
{
  "overall_score": 0-100,
  "summary": "2 sentences",
  "dimensions": [{ "key": "clarity", "label": "Clarity", "score": 1-5, "comment": "1 sentence" }],
  "strengths": ["..."],
  "improvements": ["..."],
  "key_moments": [{ "message_id": 123, "what_happened": "...", "better_option": "..." }],
  "next_practice": "one concrete drill"
}
```

Rules in the prompt: scores must be justified by quotes or events in the transcript, no inflated praise, `message_id` must be one of the ids provided. If the session has fewer than 3 learner turns, return a short "not enough conversation to score" card instead of fabricating a score.

### 9.6 Guardrails
- Scenario catalog is **professional only**; no custom persona from free text (the `user_context` field is data, wrapped in delimiters and treated as untrusted).
- Bots are clearly labelled "AI" in the UI (avatar badge); the coach channel states this in its welcome message.
- Crisis handling via `[[BREAK]]` (9.2). Input length caps, per-user rate limit, no PII logging of message bodies beyond Postgres.

---

## 10. Frontend

### 10.1 Routes

| Path | Screen | Role |
|---|---|---|
| `/auth` | Login / register (tabs) | public |
| `/` | Scenario picker + recent sessions | learner |
| `/scenario/:id` | Scenario detail: objective, difficulty chips, optional context, **Start** | learner |
| `/s/:sessionId` | **Live session** (scene + coach) | learner |
| `/s/:sessionId/score` | Scorecard | learner |
| `/s/:sessionId/replay` | Replay with coach tips inline | learner, mentor |
| `/history` | Past sessions with scores | learner |
| `/join` | Enter invite code | mentor |
| `/mentor` | Sessions I am mentoring | mentor |
| `/mentor/s/:sessionId` | Mentor live view (coach channel + read-only transcript) | mentor |

### 10.2 Live session layout
- **Desktop / tablet (>= 768 px):** two columns. Left: scene chat (about 62%). Right: coach panel (about 38%).
- **Phone / APK:** one column with tabs **Scene | Coach** and an **unread badge** on Coach. Because the coach is hidden while you type, show the newest coach tip as a **floating tip pill** above the composer for about 5 s (tap to open the Coach tab). This is the key mobile UX detail.
- Top bar: persona name + "AI" badge, difficulty chip, elapsed timer, **Invite mentor** (code sheet), **Finish**.
- Scene composer: textarea, Send, disabled while a turn is pending. While pending show a "{persona} is typing..." indicator (local UI state; the persona is a server-side bot, so this is not an SDK typing signal).
- Coach panel: tip cards (category chip, sentiment colour, optional "Try: ..." rewrite), mentor messages visibly distinct (human badge), composer to ask the coach.
- Connection banner when SDK status is not `connected`; sending is queued by the SDK.

### 10.3 Component tree (main pieces)
```
App
 +- AuthGate
 +- ScenarioPicker > ScenarioCard
 +- ScenarioDetail
 +- SessionScreen
 |   +- SessionHeader (timer, invite, finish)
 |   +- SceneChat > MessageList > Bubble, TypingDots, Composer
 |   +- CoachPanel > CoachTipCard, MentorBubble, Composer
 |   +- CoachTipPill (mobile)
 |   +- InviteSheet
 +- ScorecardScreen > ScoreRing, DimensionBar, KeyMomentCard
 +- ReplayScreen
 +- HistoryList
 +- MentorJoin, MentorList, MentorSessionScreen
```

### 10.4 State (zustand)
- `authStore`: `{ token, user }`, persisted to `localStorage` (fine inside Capacitor).
- `chatStore`: `{ connection, messagesByChannel: Record<channelKey, Message[]>, unread: {coach:number}, pendingTurn: boolean, latestTip }`. Messages are keyed and de-duplicated by `uid` (SDK) and `messageId` (HTTP fallback).
- Session load order: `GET /sessions/:id` -> `GET /sessions/:id/transcript` (backfill from Postgres) -> subscribe via `nexconn.onMessage` -> merge. Use the Postgres transcript as the primary backfill since it is guaranteed to include everything.

### 10.5 API client
Thin `fetch` wrapper in `lib/api.js`: base URL from `VITE_API_BASE_URL`, attaches the JWT, parses the error shape, on 401 clears auth and redirects to `/auth`.

---

## 11. Android APK (Capacitor)

**Biggest gotcha: a phone cannot reach `localhost`.** Your backend and Postgres run on your laptop. Use one of:
1. **HTTPS tunnel (recommended):** `cloudflared tunnel --url http://localhost:4000` or `ngrok http 4000`. Put the HTTPS URL in `VITE_API_BASE_URL`. Works on any phone, no cleartext config.
2. **LAN IP:** `http://192.168.x.x:4000` (phone and laptop on the same Wi-Fi). Needs cleartext enabled (below).
3. Android emulator only: `http://10.0.2.2:4000`.

If the hackathon requires judges to run it themselves, plan to also deploy the backend (for example a free-tier host plus a hosted Postgres) and rebuild the APK against that URL. Check the submission rules.

```bash
cd client
npm i @capacitor/core @capacitor/cli @capacitor/android @capacitor/keyboard @capacitor/status-bar
npx cap init Rehearsal com.rehearsal.app --web-dir=dist
npx cap add android
# every change:
npm run build && npx cap sync android
npx cap open android      # Android Studio > Build > Build APK(s) (debug APK is fine)
```

`capacitor.config.json`:
```json
{
  "appId": "com.rehearsal.app",
  "appName": "Rehearsal",
  "webDir": "dist",
  "server": { "androidScheme": "https" },
  "plugins": { "Keyboard": { "resize": "body" } }
}
```
(Add `"cleartext": true` inside `server` only if you use an `http://` LAN URL.)

Checklist:
- Backend CORS must allow origins `https://localhost` (Capacitor Android with `androidScheme: https`), `http://localhost:5173` (Vite dev), and your tunnel/web origin.
- Add `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` and pad with `env(safe-area-inset-*)`.
- Use `100dvh` for the chat screen so the keyboard does not break the layout; the composer stays pinned.
- Handle the hardware Back button (session screen -> confirm leave).
- **Test the Nexconn SDK connection in the APK on day 1 of the build**, not at the end (see Phase 0). Fallback if it will not connect in the WebView: demo from the browser/PWA and keep the APK as a secondary deliverable.

---

## 12. Project structure

```
rehearsal/
+- plan.md
+- README.md
+- client/
|  +- index.html
|  +- capacitor.config.json
|  +- src/
|     +- main.jsx, App.jsx, routes.jsx
|     +- lib/ nexconn.js  api.js  coachPayload.js  time.js
|     +- store/ authStore.js  chatStore.js
|     +- pages/ Auth.jsx  Scenarios.jsx  ScenarioDetail.jsx  Session.jsx
|     |         Score.jsx  Replay.jsx  History.jsx  MentorJoin.jsx  MentorList.jsx  MentorSession.jsx
|     +- components/ chat/  coach/  score/  ui/
+- server/
   +- package.json, tsconfig.json, .env.example
   +- db/ schema.sql  seed.sql
   +- src/
      +- index.ts  config.ts  db.ts
      +- middleware/ auth.ts  error.ts  rateLimit.ts
      +- routes/ auth.ts  nexconn.ts  scenarios.ts  sessions.ts  invites.ts  mentor.ts
      +- services/ nexconnServer.ts  llm.ts  persona.ts  coach.ts  scorecard.ts  sessionLock.ts
      +- prompts/ persona.ts  coach.ts  coachAnswer.ts  scorecard.ts
```

### Environment variables

`server/.env`
```
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rehearsal
JWT_SECRET=change-me
CORS_ORIGINS=http://localhost:5173,https://localhost

NEXCONN_APP_KEY=...
NEXCONN_APP_SECRET=...            # never ship to the client
NEXCONN_PRIMARY_API_DOMAIN=...    # from the Nexconn console
NEXCONN_SECONDARY_API_DOMAIN=...

LLM_API_KEY=...
LLM_MODEL_PERSONA=...
LLM_MODEL_COACH=...
LLM_MODEL_SCORE=...
```

`client/.env`
```
VITE_API_BASE_URL=https://<your-tunnel>.trycloudflare.com/api
```
(The Nexconn App Key arrives at runtime from `POST /nexconn/token`, so nothing Nexconn-specific is hard-coded in the client.)

### Setup commands
```bash
# DB
createdb rehearsal
psql rehearsal -f server/db/schema.sql
psql rehearsal -f server/db/seed.sql

# Server
cd server && npm init -y
npm i express cors helmet pg zod jsonwebtoken bcryptjs dotenv express-rate-limit
npm i "git+https://github.com/NexconnAI-Dev/nexconn-server-sdk-node.git#v0.1.2"
npm i -D typescript tsx @types/node @types/express @types/cors @types/pg @types/jsonwebtoken @types/bcryptjs
# plus your LLM provider's SDK (or use fetch)
npx tsx watch src/index.ts

# Client
npm create vite@latest client -- --template react
cd client && npm i @nexconn/chat react-router-dom zustand lucide-react
npm i tailwindcss @tailwindcss/vite
```
Note: installing the server SDK from a git tag may need a build step (the repo ships TypeScript sources). If `npm i` fails or types are missing, clone it, run `npm install && npm run build` inside it, and install from the local path.

### Turn handler skeleton (`routes/sessions.ts`)

```ts
router.post('/:id/turns', auth, rateLimitTurns, async (req, res) => {
  const { text, nexconnMessageUid } = turnSchema.parse(req.body);
  await withSessionLock(req.params.id, async () => {
    const session = await loadSessionForOwner(req.params.id, req.user.id);   // 404/403
    if (session.status !== 'active') throw new AppError(409, 'SESSION_ENDED');

    const learnerMsg = await saveMessage({            // idempotent on nexconnMessageUid
      sessionId: session.id, channel: 'scene', senderType: 'learner',
      senderUserId: req.user.id, content: text, nexconnMessageUid,
    });
    const history = await loadRecent(session.id, 20);

    const [p, c] = await Promise.allSettled([
      generatePersonaReply(session, history),          // { text, ended, break }
      generateCoachTip(session, history, learnerMsg),  // { skip, tip, category, sentiment, rewrite }
    ]);
    if (p.status === 'rejected') throw new AppError(502, 'AI_UNAVAILABLE');

    const persona = await deliverPersona(session, p.value);                   // Nexconn send + DB save
    const coach = c.status === 'fulfilled' && !c.value.skip
      ? await deliverCoachTip(session, learnerMsg, c.value) : null;           // Nexconn send + DB save

    await bumpTurnCount(session.id);
    res.json({ learnerMessageId: learnerMsg.id, persona, coach });
  });
});
```

---

## 13. Build plan (about 2 days left)

Assuming the deadline is end of day **Sun Nov 22**: work now, Saturday, Sunday morning, and **submit with buffer, not at the last minute.**

### Phase 0: Nexconn spike (about 1.5 h) *(go/no-go gate)*
- [ ] Create the Nexconn app in the console, get App Key/Secret and API domains. Enable message history storage if it exists as a toggle.
- [ ] Server: `issueAccessToken` for two users works.
- [ ] Browser: `@nexconn/chat` init + connect with both tokens; user A sends to user B in a direct channel; B receives.
- [ ] Server sends a direct message **as** a registered bot user to a user, and the client receives it.
- [ ] Server creates a group with 2 members; both receive a group message; server sends a group message as a bot.
- [ ] Put a 20-line test page into the Capacitor APK and confirm it connects and receives on a real phone.
- **If server-sent bot messages or group-by-server do not work:** fall back to rendering AI replies from the `/turns` HTTP response and keep Nexconn for learner/mentor group chat. The product still works.

### Phase 1: Core loop (about 6 to 7 h)
- [ ] Postgres schema + seed (4 scenarios, full detail for 2).
- [ ] Auth (register/login/JWT), `/nexconn/token`.
- [ ] Scenarios list/detail, create session (bots + coach group + opener).
- [ ] `/turns` with persona only; Session screen with scene chat on Nexconn.
- **Done when:** you can hold a full conversation with the persona, reload the app and the history is still there.

### Phase 2: Coach and mentor (about 5 to 6 h)
- [ ] Coach tips (parallel with persona), coach panel, tip pill, unread badge.
- [ ] Ask-the-coach flow.
- [ ] Invites + mentor join + mentor view (coach channel + transcript).
- **Done when:** two devices (learner + mentor) show the same coach channel live.

### Phase 3: Scorecard, replay, history (about 3 to 4 h)
- [ ] Scorecard generation + screen; end-session flow.
- [ ] Replay screen with inline coach tips; history list.

### Phase 4: APK + polish (about 3 to 4 h)
- [ ] Capacitor build against the tunnel URL, keyboard/safe-area fixes, back button.
- [ ] Empty/error/loading states, connection banner, "AI" badges, copy polish.

### Phase 5: Submission (about 3 h, protect this time)
- [ ] README (setup, architecture diagram, **how Nexconn is used**), `.env.example`.
- [ ] 2 to 3 minute demo video, screenshots, APK, repo link.
- [ ] Re-read the hackathon page for required fields and submit **early**.

### Cut list (in this order if you run short)
1. Mentor read-only transcript pane (keep mentor in the coach channel only).
2. Ask-the-coach Q&A.
3. Replay screen (scorecard still shows key moments).
4. Scenarios 3 and 4 (ship two, polished).
5. APK (demo from browser, include the APK only if it works).

**Never cut:** scene + coach on separate Nexconn channels, and the scorecard.

---

## 14. Risks

| Risk | Impact | Mitigation |
|---|---|---|
| Nexconn request shapes differ from assumptions | Lost time | Phase 0 spike; adapters isolate it; use Nexconn's AI skill with your coding assistant |
| Server-sent bot messages not delivered as expected | Core loop broken | HTTP-response fallback already designed (4.3) |
| Web SDK will not connect in the Capacitor WebView | APK unusable | Test in Phase 0; fall back to browser/PWA demo |
| LLM latency makes the persona feel laggy | Weak demo | Short outputs, parallel coach call, "typing..." indicator, cheaper model for the coach |
| Phone cannot reach local backend | APK shows errors | HTTPS tunnel; keep it running during the demo |
| Local-only backend | Judges cannot try it | Record a strong demo video; deploy backend if rules require a live demo |
| Persona too agreeable or too harsh | Unconvincing | Tune `difficulty_guides` and private briefs with 5 test runs before polishing UI |
| Scope creep | Misses deadline | Follow the cut list; freeze features at the start of Phase 4 |

---

## 15. Demo script (about 2 minutes)

1. **Hook (10 s):** "Nobody gives you feedback during the conversation that matters. Rehearsal does."
2. Pick **Ask for a raise**, difficulty **Tough**, add one line of context. Start.
3. Send 3 to 4 messages. Point out: the persona pushes back realistically; coach tips appear in the **separate** coach channel (on the phone: the tip pill + badge).
4. Ask the coach "how do I answer 'there's no budget'?" and show the answer.
5. **Mentor moment:** invite code, second device joins, mentor types a comment that appears live in the coach channel.
6. Airplane mode, send, reconnect, the message delivers. Reopen the app, the session resumes. (SDK story.)
7. Finish: scorecard, key moment with a better phrasing, replay.
8. **Business close (15 s):** placement cells, sales onboarding, career coaches; mentors become a seat-based dashboard.

### Submission description should say, explicitly
Which Nexconn features are used (direct + group channels, bot identities via server SDK, history, reconnect/offline queue, unread), and that voice via the Call SDK is the natural next step.

---

## 16. Seed scenarios (`seed.sql` content)

Each has: persona name/role, public brief, **private brief**, optional opener, three difficulty guides, a 5-dimension rubric.

**1. `salary-raise`: Ask for a raise** (opener: none, learner speaks first)
- Persona: Maya Rao, Engineering Manager.
- Private brief: budget is tight this cycle; respects data on impact; will offer roughly 5 percent and a 6-month review only if the learner is specific and calm; will not commit to a big number in the first conversation.
- Difficulty: *friendly* open and supportive but vague on numbers; *neutral* fair but noncommittal; *tough* time-pressed, cites budget and "others are at the same level", tests for specifics.
- Rubric: Clarity of the ask, Evidence of impact, Handling objections, Tone and composure, Closing / next step.

**2. `behavioural-interview`: Job interview**
- Persona: Daniel Kim, Hiring Manager at a fintech. Opens with a short intro and "tell me about a time...".
- Private brief: wants STAR-structured answers, probes vague claims with "what exactly did you do?", cares about ownership and learning.
- Rubric: Structure (STAR), Specificity, Ownership, Concision, Questions asked back.

**3. `client-escalation`: Tough client call**
- Persona: Rohan Mehta, Client Director, upset about a delayed delivery. Opens angry but professional.
- Private brief: wants a concrete recovery plan and a discount; walks toward escalation if the learner gets defensive or makes vague promises.
- Rubric: Empathy, Ownership without defensiveness, Concrete recovery plan, Boundaries on scope/discount, Next steps and follow-up.

**4. `hard-feedback`: Give difficult feedback to a teammate**
- Persona: Sam Iyer, a teammate who missed several deadlines; initially defensive.
- Private brief: has a personal reason they will share only if the learner asks with curiosity rather than blame.
- Rubric: Specific observations, Impact stated, Curiosity / listening, Tone, Agreed next steps.

*(Out of MVP scope on purpose: personal or emotionally sensitive scenarios such as breakups.)*

---

## 17. Final pre-submission checklist

- [ ] Fresh clone runs with README steps (`.env.example` complete, schema + seed included).
- [ ] No secrets in the repo (`.env` ignored; the App Secret exists only on the server).
- [ ] APK installs on a real phone and completes a full session.
- [ ] Demo video shows the two-channel chat, the mentor joining, and the scorecard.
- [ ] Description names the Nexconn features used.
- [ ] Submitted before the cutoff, with the cutoff time and timezone confirmed on the hackathon page.
