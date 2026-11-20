# Rehearsal (Nexconn Build Challenge 2026)

Practice hard conversations in chat before having them for real. An AI plays the other person realistically (Scene channel) while an AI coach whispers feedback in a separate side channel (Coach channel). A human mentor can also join the coach channel live.

---

## Project Structure

```text
nexconn-build/
├── client/                     # Frontend: React 19 + Vite + Tailwind + Capacitor + @nexconn/chat
│   ├── src/
│   │   ├── components/         # Chat UI components (SessionScreen, Bubble, Composer, etc.)
│   │   ├── lib/nexconn.js      # Client adapter for Nexconn Chat SDK
│   │   ├── Spike.jsx           # Phase 0 interactive Spike test page
│   │   └── App.jsx
│   ├── .env                    # Client environment configuration
│   └── package.json
├── server/                     # Backend: Node.js + Express + TypeScript + @nexconn/server-sdk
│   ├── src/
│   │   ├── services/           # nexconnServer.ts adapter
│   │   └── spike.ts            # Phase 0 test script (issue tokens, send bot messages, create groups)
│   ├── build-sdk.js            # Automated build script for @nexconn/server-sdk
│   ├── .env                    # Server environment variables & credentials
│   └── package.json
└── plan.md                     # Full architectural plan & phase roadmap
```

---

## 1. Setup & Installation

All required dependencies have been installed and tested. If you need to re-install at any point:

### From the root folder:
```bash
npm run install:all
```

### Or manually:
```bash
# In client:
cd client
npm install

# In server:
cd ../server
npm install
```

> **Note on `@nexconn/server-sdk`**: Installed via GitHub tag. A `postinstall` script (`node build-sdk.js`) automatically compiles its TypeScript source into `dist/` and `dist/esm/` upon installation.

---

## 2. Database (PostgreSQL)

The application uses local PostgreSQL for the canonical transcript, session management, and scenario catalog.

### Initialize & Seed Database:
```bash
npm run db:init
```
This automated command:
1. Connects to PostgreSQL using `DATABASE_URL` in `server/.env`.
2. Automatically creates the `rehearsal` database if it doesn't already exist.
3. Applies [server/db/schema.sql](file:///f:/Rohan%20Folder/Hackathon%20Stuff/nexconn-build/server/db/schema.sql) (users, scenarios, sessions, session_members, messages, scorecards, invites).
4. Seeds all 4 practice scenarios from [server/db/seed.sql](file:///f:/Rohan%20Folder/Hackathon%20Stuff/nexconn-build/server/db/seed.sql) (`salary-raise`, `behavioural-interview`, `client-escalation`, `hard-feedback`).

---

## 3. Configuration (`.env`)

### Server (`server/.env`)
The server environment is pre-configured with the project's Nexconn App Key and Secret:
```env
PORT=4000
DATABASE_URL=postgres://postgres:postgres@localhost:5432/rehearsal
JWT_SECRET=change-me-to-a-secure-secret-key-in-production
CORS_ORIGINS=http://localhost:5173,https://localhost

NEXCONN_APP_KEY=6tnym1br6ia37
NEXCONN_APP_SECRET=y39k0InBtQUZ
# Singapore Region API endpoints (matching App Key data center):
NEXCONN_PRIMARY_API_DOMAIN=api.sg-light-api.com
NEXCONN_SECONDARY_API_DOMAIN=api-b.sg-light-api.com

LLM_API_KEY=your_llm_api_key_here
LLM_MODEL_PERSONA=gpt-4o-mini
LLM_MODEL_COACH=gpt-4o-mini
LLM_MODEL_SCORE=gpt-4o-mini
```

### Client (`client/.env`)
```env
# Set VITE_SPIKE=1 to open the Phase 0 Nexconn Spike verification page.
# Set VITE_SPIKE=0 to open the Rehearsal SessionScreen.
VITE_SPIKE=1
```

---

## 4. How to Run

### Step A: Run the Server Spike (Phase 0 Verification)
Test the Nexconn backend integration directly from your terminal:

```bash
# Generate access tokens for test users (Alice and Bob):
npm run server:spike tokens

# Register bots (persona_spike, bot_coach), send DM, and create group channel:
npm run server:spike send
```

### Step B: Run the Frontend (Vite Dev Server)
Start the client application:

```bash
npm run client:dev
```
Or:
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your browser.

- When `VITE_SPIKE=1`:
  1. The page opens the **Nexconn Spike** interactive testbed.
  2. Enter the App Key: `6tnym1br6ia37`.
  3. Select datacenter: `SG (SDK default)` or area code `2`.
  4. Paste an access token generated from `npm run server:spike tokens`.
  5. Click **Connect** to connect to Nexconn real-time messaging, send messages, and view history!

- When `VITE_SPIKE=0` (in `client/.env`):
  Runs the full **Rehearsal Session Screen** with Scene Chat and Coach Panel tabs.

### Step C: Build for Production
```bash
npm run client:build
```
