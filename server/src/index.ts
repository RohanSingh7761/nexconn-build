import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import {
  initNexconnServer,
  issueToken,
  sendDirectText,
  sendGroupText,
  createCoachGroup,
  joinCoachGroup,
} from './services/nexconnServer.js';
import {
  generatePersonaReply,
  generateCoachTip,
  generateCoachAnswer,
  generateScorecard,
  generateCustomScenario,
} from './services/llm.js';
import * as db from './db/queries.js';

const app = express();
const PORT = process.env.PORT || 4000;
// Secrets and credentials come only from server/.env. Fail at startup rather than fall back to a public default.
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable ${name}. Set it in server/.env.`);
  return value;
}

const JWT_SECRET = requireEnv('JWT_SECRET');

// Middleware
app.use(helmet());
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '1mb' }));

// Init Nexconn SDK
initNexconnServer({
  appKey: requireEnv('NEXCONN_APP_KEY'),
  appSecret: requireEnv('NEXCONN_APP_SECRET'),
  primaryDomain: requireEnv('NEXCONN_PRIMARY_API_DOMAIN'),
  secondaryDomain: requireEnv('NEXCONN_SECONDARY_API_DOMAIN'),
});

// Startup: Register bot_coach in Nexconn
(async () => {
  try {
    await issueToken('bot_coach', 'Coach (AI)');
    console.log('[startup] bot_coach registered on Nexconn');
  } catch (err: any) {
    console.warn('[startup] Warning: could not pre-register bot_coach:', err.message);
  }
})();

function getParam(param: string | string[] | undefined): string {
  if (!param) return '';
  return Array.isArray(param) ? param[0] : param;
}

// The scene is a direct channel with the AI persona, or a group between two humans in partner mode.
function sceneChannel(session: db.SessionRow) {
  return { type: session.mode === 'partner' ? 'group' : 'direct', targetId: session.persona_nexconn_id };
}

// Auth Token Helper
function createJwt(user: db.UserRow) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      nexconnUserId: user.nexconn_user_id,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Auth Middleware
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    displayName: string;
    role: 'learner' | 'mentor';
    nexconnUserId: string;
  };
}

function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing or invalid token' } });
    return;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token expired or invalid' } });
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   AUTH ROUTES
───────────────────────────────────────────────────────────────────────────── */

app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { username, displayName, password, role } = req.body;
    if (!username || !password || !displayName) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'username, displayName, and password required' } });
      return;
    }
    const existing = await db.getUserByUsername(username.toLowerCase().trim());
    if (existing) {
      res.status(409).json({ error: { code: 'USER_EXISTS', message: 'Username already in use' } });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await db.createUser(
      username.toLowerCase().trim(),
      displayName.trim(),
      passwordHash,
      role === 'mentor' ? 'mentor' : 'learner'
    );

    // Register user in Nexconn
    await issueToken(user.nexconn_user_id, user.display_name).catch(() => {});

    const token = createJwt(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        nexconnUserId: user.nexconn_user_id,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Username and password required' } });
      return;
    }
    const user = await db.getUserByUsername(username.toLowerCase().trim());
    if (!user) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
      return;
    }
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid username or password' } });
      return;
    }
    const token = createJwt(user);
    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
        nexconnUserId: user.nexconn_user_id,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  res.json({ user: req.user });
});

app.post('/api/nexconn/token', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { token } = await issueToken(user.nexconnUserId, user.displayName);
    res.json({
      appKey: process.env.NEXCONN_APP_KEY || '6tnym1br6ia37',
      userId: user.nexconnUserId,
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'NEXCONN_ERROR', message: err.message } });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   SCENARIOS ROUTES
───────────────────────────────────────────────────────────────────────────── */

app.get('/api/scenarios', async (_req: Request, res: Response) => {
  try {
    const list = await db.listScenarios();
    res.json({ scenarios: list });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/scenarios/:id', async (req: Request, res: Response) => {
  try {
    const scenario = await db.getScenarioById(getParam(req.params.id));
    if (!scenario) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scenario not found' } });
      return;
    }
    const { persona_private_brief, ...safeScenario } = scenario;
    res.json({ scenario: safeScenario });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/scenarios/custom', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { situation } = req.body;
    if (!situation || typeof situation !== 'string' || !situation.trim()) {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Situation description required' } });
      return;
    }

    const generated = await generateCustomScenario(situation.trim());
    const scenario = await db.createScenario(generated);

    const { persona_private_brief, ...safeScenario } = scenario;
    res.json({ scenario: safeScenario });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   SESSIONS ROUTES
───────────────────────────────────────────────────────────────────────────── */

app.post('/api/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = req.user!;
    const { scenarioId, difficulty = 'neutral', userContext, mode = 'ai' } = req.body;
    if (mode !== 'ai' && mode !== 'partner') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: "mode must be 'ai' or 'partner'" } });
      return;
    }

    const scenario = await db.getScenarioById(scenarioId);
    if (!scenario) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scenario not found' } });
      return;
    }

    const suffix = `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    // In partner mode this column holds the scene group id (a human plays the counterpart).
    const personaNexconnId = mode === 'partner' ? `scene_${suffix}` : `persona_${scenario.id}_${Date.now().toString(36)}`;
    const coachGroupId = `coach_${suffix}`;

    if (mode === 'partner') {
      // 1a. Scene group: owner now, the partner joins later via invite. bot_coach is a member so it can post the end notice.
      await createCoachGroup(
        personaNexconnId,
        `Scene: ${scenario.title}`,
        user.nexconnUserId,
        [user.nexconnUserId, 'bot_coach']
      ).catch((e) => console.warn('scene group create warn:', e.message));
    } else {
      // 1. Register persona bot on Nexconn
      await issueToken(personaNexconnId, scenario.persona_name, scenario.persona_avatar_url || undefined).catch((e) =>
        console.warn('persona register warn:', e.message)
      );
    }

    // 2. Create coach group channel on Nexconn with learner and bot_coach
    await createCoachGroup(
      coachGroupId,
      `Coach: ${scenario.title}`,
      user.nexconnUserId,
      [user.nexconnUserId, 'bot_coach']
    ).catch((e) => console.warn('coach group create warn:', e.message));

    // 3. Create session record in Postgres
    const session = await db.createSession(
      user.id,
      scenario.id,
      difficulty,
      userContext || null,
      personaNexconnId,
      coachGroupId,
      mode
    );

    let openingMessage: any = null;

    // 4. Send opening message if scenario has one (AI mode only; in partner mode a human speaks first)
    if (mode === 'ai' && scenario.opening_message) {
      const delivery = await sendDirectText(
        personaNexconnId,
        user.nexconnUserId,
        scenario.opening_message
      ).catch(() => null);

      openingMessage = await db.saveMessage(
        session.id,
        'scene',
        'persona',
        null,
        scenario.opening_message,
        {},
        null,
        delivery?.messageUid || null
      );
    }

    res.json({
      session,
      channels: {
        scene: sceneChannel(session),
        coach: { type: 'group', targetId: coachGroupId },
      },
      opening: openingMessage,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/sessions', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const sessions = await db.listSessionsForUser(req.user!.id);
    res.json({ sessions });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/sessions/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await db.getSessionById(getParam(req.params.id));
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    const scenario = await db.getScenarioById(session.scenario_id);
    const myRole =
      session.user_id === req.user!.id ? 'learner' : session.partner_user_id === req.user!.id ? 'partner' : 'mentor';
    // The persona's hidden goals are only for the human playing them, never the interviewee or a mentor.
    let visibleScenario: Partial<db.ScenarioRow> | null = scenario;
    if (scenario && myRole !== 'partner') {
      const { persona_private_brief, ...rest } = scenario;
      visibleScenario = rest;
    }
    res.json({
      session,
      scenario: visibleScenario,
      channels: {
        scene: sceneChannel(session),
        coach: { type: 'group', targetId: session.coach_group_id },
      },
      myRole,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/sessions/:id/transcript', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await db.getSessionById(getParam(req.params.id));
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    let messages = await db.getSessionMessages(session.id);
    // The partner plays the other person, so the private coach channel stays hidden from them.
    if (session.partner_user_id === req.user!.id) {
      messages = messages.filter((m) => m.channel === 'scene');
    }
    res.json({ messages });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   TURNS & CHAT (THE CORE AI LOOP)
───────────────────────────────────────────────────────────────────────────── */

// Sends a coach tip into the private coach group as bot_coach and stores it. Nexconn failures never lose the DB write.
async function postCoachTip(session: db.SessionRow, learnerMsgId: number, tip: object) {
  const payload = JSON.stringify(tip);
  const delivery = await sendGroupText('bot_coach', session.coach_group_id, payload).catch((e) => {
    console.warn('[turns] Nexconn coach group error:', e.message);
    return null;
  });
  return db.saveMessage(session.id, 'coach', 'coach', null, payload, tip, learnerMsgId, delivery?.messageUid || null);
}

app.post('/api/sessions/:id/turns', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, nexconnMessageUid } = req.body;
    if (!text || typeof text !== 'string') {
      res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Message text required' } });
      return;
    }

    const session = await db.getSessionById(getParam(req.params.id));
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    if (session.status === 'completed') {
      res.status(409).json({ error: { code: 'SESSION_ENDED', message: 'This session has already ended' } });
      return;
    }

    const scenario = await db.getScenarioById(session.scenario_id);
    if (!scenario) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scenario not found' } });
      return;
    }

    // Partner mode: two humans talk; the AI only whispers a tip to the interviewee. No persona reply.
    if (session.mode === 'partner') {
      const isOwner = session.user_id === req.user!.id;
      const isPartner = session.partner_user_id === req.user!.id;
      if (!isOwner && !isPartner) {
        res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the interviewee and the partner can send messages' } });
        return;
      }
      // The partner plays the counterpart, so their messages are stored as 'persona' for the coach and scorecard.
      const msg = await db.saveMessage(
        session.id,
        'scene',
        isOwner ? 'learner' : 'persona',
        req.user!.id,
        text.trim(),
        {},
        null,
        nexconnMessageUid || null
      );
      if (isPartner) {
        res.json({ messageId: msg.id });
        return;
      }
      const history = await db.getSceneMessages(session.id, 15);
      const coachRes = await generateCoachTip(scenario, history, text.trim()).catch((err) => {
        console.error('[turns] Coach LLM error:', err);
        return null;
      });
      const coachMsg = coachRes ? await postCoachTip(session, msg.id, coachRes) : null;
      await db.incrementTurnCount(session.id);
      res.json({
        learnerMessageId: msg.id,
        persona: null,
        coach: coachRes ? { messageId: coachMsg?.id, ...coachRes } : null,
      });
      return;
    }

    // 1. Save learner message in Postgres
    const learnerMsg = await db.saveMessage(
      session.id,
      'scene',
      'learner',
      req.user!.id,
      text.trim(),
      {},
      null,
      nexconnMessageUid || null
    );

    // 2. Fetch recent conversation context for the AI
    const history = await db.getSceneMessages(session.id, 15);

    // 3. Generate Persona Reply and Coach Tip in parallel
    const [personaRes, coachRes] = await Promise.all([
      generatePersonaReply(scenario, session.difficulty, session.user_context, history, text.trim()).catch((err) => {
        console.error('[turns] Persona LLM error:', err);
        return { text: 'I hear what you are saying. Let us continue.', ended: false };
      }),
      generateCoachTip(scenario, history, text.trim()).catch((err) => {
        console.error('[turns] Coach LLM error:', err);
        return null;
      }),
    ]);

    // 4. Send persona message via Nexconn SDK as persona bot
    const personaDelivery = await sendDirectText(
      session.persona_nexconn_id,
      req.user!.nexconnUserId,
      personaRes.text
    ).catch((e) => {
      console.warn('[turns] Nexconn persona DM error:', e.message);
      return null;
    });

    // 5. Save persona message to Postgres
    const personaMsg = await db.saveMessage(
      session.id,
      'scene',
      'persona',
      null,
      personaRes.text,
      { ended: personaRes.ended },
      learnerMsg.id,
      personaDelivery?.messageUid || null
    );

    // 6. If coach tip was generated, send via Nexconn SDK as bot_coach into group channel
    const coachMsg = coachRes ? await postCoachTip(session, learnerMsg.id, coachRes) : null;

    await db.incrementTurnCount(session.id);
    res.json({
      learnerMessageId: learnerMsg.id,
      persona: {
        messageId: personaMsg.id,
        text: personaRes.text,
        ended: personaRes.ended,
      },
      coach: coachRes ? { messageId: coachMsg?.id, ...coachRes } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Q&A / messages in the coach channel
app.post('/api/sessions/:id/coach-channel/messages', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { text, nexconnMessageUid } = req.body;
    const session = await db.getSessionById(getParam(req.params.id));
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    const isOwner = session.user_id === req.user!.id;
    let senderType: 'learner' | 'mentor' = isOwner ? 'learner' : 'mentor';

    if (!isOwner) {
      senderType = 'mentor';
    } else {
      const memberRole = await db.getSessionMemberRole(session.id, req.user!.id);
      if (memberRole === 'mentor') {
        senderType = 'mentor';
      }
    }

    const senderName = req.user!.displayName || (senderType === 'mentor' ? 'Mentor' : 'Learner');

    const userMsg = await db.saveMessage(
      session.id,
      'coach',
      senderType,
      req.user!.id,
      text.trim(),
      { senderName },
      null,
      nexconnMessageUid || null
    );

    let coachReply: any = null;

    // AI Coach ONLY answers questions from the learner. NEVER answer mentor messages!
    if (senderType === 'learner') {
      const scenario = await db.getScenarioById(session.scenario_id);
      if (scenario) {
        const history = await db.getSceneMessages(session.id, 10);
        const answerText = await generateCoachAnswer(scenario, history, text.trim());
        const coachPayload = JSON.stringify({
          v: 1,
          kind: 'coach_answer',
          text: answerText,
        });

        const delivery = await sendGroupText('bot_coach', session.coach_group_id, coachPayload).catch(() => null);
        coachReply = await db.saveMessage(
          session.id,
          'coach',
          'coach',
          null,
          coachPayload,
          { kind: 'coach_answer' },
          userMsg.id,
          delivery?.messageUid || null
        );
      }
    }

    res.json({
      messageId: userMsg.id,
      coachReply: coachReply ? { messageId: coachReply.id, content: coachReply.content } : null,
    });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   SCORECARD & END SESSION
───────────────────────────────────────────────────────────────────────────── */

app.post('/api/sessions/:id/end', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await db.getSessionById(getParam(req.params.id));
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }

    // In partner mode only the interviewee ends the session; the partner just gets locked out.
    if (session.mode === 'partner' && session.user_id !== req.user!.id) {
      res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Only the interviewee can end this session' } });
      return;
    }

    const endedSession = await db.updateSessionEnd(session.id);
    if (session.mode === 'partner' && session.status !== 'completed') {
      // Tells the partner's client to lock the scene composer.
      await sendGroupText('bot_coach', session.persona_nexconn_id, JSON.stringify({ v: 1, kind: 'session_ended' })).catch(() => {});
    }
    const scenario = await db.getScenarioById(session.scenario_id);
    const messages = await db.getSessionMessages(session.id);

    const learnerMessages = messages.filter((m) => m.sender_type === 'learner');
    if (learnerMessages.length === 0) {
      res.json({
        session: endedSession,
        scorecard: null,
        message: 'No messages were sent in this session. No scorecard was generated.',
      });
      return;
    }

    let scorecard = await db.getScorecard(session.id);
    if (!scorecard && scenario) {
      const evaluation = await generateScorecard(scenario, messages);
      scorecard = await db.saveScorecard(
        session.id,
        evaluation.overall_score,
        evaluation.summary,
        evaluation.dimensions,
        evaluation.strengths,
        evaluation.improvements,
        evaluation.key_moments,
        evaluation.next_practice
      );

      // Post scorecard notice to coach channel
      const noticePayload = JSON.stringify({
        v: 1,
        kind: 'scorecard_ready',
        score: evaluation.overall_score,
        text: `Practice completed! Overall score: ${evaluation.overall_score}/100. Check the scorecard for detailed feedback.`,
      });
      await sendGroupText('bot_coach', session.coach_group_id, noticePayload).catch(() => {});
    }

    res.json({ session: endedSession, scorecard });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.get('/api/sessions/:id/scorecard', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const scorecard = await db.getScorecard(getParam(req.params.id));
    if (!scorecard) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Scorecard not ready yet' } });
      return;
    }
    res.json({ scorecard });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

/* ─────────────────────────────────────────────────────────────────────────────
   MENTOR INVITES
───────────────────────────────────────────────────────────────────────────── */

app.post('/api/sessions/:id/invites', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const session = await db.getSessionById(getParam(req.params.id));
    if (!session) {
      res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Session not found' } });
      return;
    }
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const invite = await db.createInvite(code, session.id, req.user!.id, expiresAt);
    res.json({ code: invite.code, expiresAt: invite.expires_at });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

app.post('/api/invites/:code/join', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const code = getParam(req.params.code).toUpperCase().trim();
    const invite = await db.getInvite(code);
    if (!invite) {
      res.status(404).json({ error: { code: 'INVALID_CODE', message: 'Invite code is invalid or expired' } });
      return;
    }

    const me = req.user!;
    const sceneTarget = { type: 'group', targetId: invite.persona_nexconn_id };

    // Partner mode: the first joiner (not the owner) takes the interviewer seat. Reloading as the partner is idempotent.
    if (invite.mode === 'partner' && invite.owner_id !== me.id) {
      const alreadyPartner = invite.partner_user_id === me.id;
      const claimed = alreadyPartner || (!invite.partner_user_id && (await db.setSessionPartner(invite.session_id, me.id)));
      if (claimed) {
        if (!alreadyPartner) {
          await joinCoachGroup(invite.persona_nexconn_id, [me.nexconnUserId]).catch(() => {});
          const scenario = await db.getScenarioById(invite.scenario_id);
          const notice = JSON.stringify({
            v: 1,
            kind: 'system_notice',
            text: `${me.displayName} joined as ${scenario?.persona_name ?? 'the partner'}.`,
          });
          await sendGroupText('bot_coach', invite.coach_group_id, notice).catch(() => {});
        }
        // The partner never sees the private coach channel, so only the scene is returned.
        res.json({ sessionId: invite.session_id, role: 'partner', channels: { scene: sceneTarget } });
        return;
      }
      // Seat already taken by someone else: fall through and join as a mentor.
    }

    await db.joinSessionWithInvite(invite.session_id, me.id, invite.code);

    // Join mentor's Nexconn user to coach group channel
    await joinCoachGroup(invite.coach_group_id, [req.user!.nexconnUserId]).catch(() => {});

    // Notify coach channel
    const notice = JSON.stringify({
      v: 1,
      kind: 'system_notice',
      text: `${req.user!.displayName} (mentor) joined the coach channel.`,
    });
    await sendGroupText('bot_coach', invite.coach_group_id, notice).catch(() => {});

    res.json({ sessionId: invite.session_id, coachGroupId: invite.coach_group_id, role: 'mentor' });
  } catch (err: any) {
    res.status(500).json({ error: { code: 'SERVER_ERROR', message: err.message } });
  }
});

// Start listening
app.listen(PORT, () => {
  console.log(`[rehearsal-server] Server running on http://localhost:${PORT}`);
});
