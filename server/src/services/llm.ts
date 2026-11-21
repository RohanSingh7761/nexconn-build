import 'dotenv/config';

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface LLMOptions {
  messages: ChatMessage[];
  maxTokens?: number;
  model?: string;
  jsonMode?: boolean;
}

export async function callLLM(options: LLMOptions): Promise<string> {
  const apiKey = process.env.OPEN_ROUTER_KEY || process.env.LLM_API_KEY;
  if (!apiKey || apiKey === 'your_llm_api_key_here') {
    throw new Error('Missing OPEN_ROUTER_KEY or LLM_API_KEY in server/.env');
  }

  const primaryModel = options.model || process.env.OPEN_ROUTER_MODEL_NAME || 'nvidia/nemotron-3.5-lightning:free';
  const modelsToTry = [
    primaryModel,
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemini-2.0-flash-lite-preview:free',
    'qwen/qwen-2.5-coder-32b-instruct:free',
  ];

  let lastError: Error | null = null;

  for (const model of modelsToTry) {
    try {
      const maxTokens = options.maxTokens ?? 500;
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'Rehearsal',
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          max_tokens: maxTokens,
          reasoning: { max_tokens: 0 },
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 429) {
          lastError = new Error(`OpenRouter rate limit on ${model}: ${errorText}`);
          continue; // try next candidate model
        }
        throw new Error(`OpenRouter API error (${res.status}): ${errorText}`);
      }

      const data = (await res.json()) as any;
      const choice = data.choices?.[0];
      let content = choice?.message?.content?.trim() || '';

      if (!content && choice?.message?.reasoning) {
        content = choice.message.reasoning.trim();
      }

      if (content) {
        return content;
      }
    } catch (err: any) {
      lastError = err;
      if (err.message?.includes('429')) continue;
      throw err;
    }
  }

  throw lastError || new Error('All candidate models exhausted');
}

function parseJSON<T>(text: string, fallback: T): T {
  try {
    const clean = text.replace(/```(?:json)?\s*([\s\S]*?)\s*```/g, '$1').trim();
    return JSON.parse(clean);
  } catch {
    return fallback;
  }
}

export interface ScenarioMeta {
  title: string;
  category: string;
  description: string;
  learner_objective: string;
  persona_name: string;
  persona_role: string;
  persona_public_brief: string;
  persona_private_brief: string;
  difficulty_guides: Record<string, string>;
  rubric: Array<{ key: string; label: string; weight: number }>;
}

export async function generatePersonaReply(
  scenario: ScenarioMeta,
  difficulty: string,
  userContext: string | null,
  history: Array<{ sender_type: string; content: string }>,
  latestLearnerMessage: string
): Promise<{ text: string; ended: boolean }> {
  const diffGuide = scenario.difficulty_guides[difficulty] || scenario.difficulty_guides.neutral || 'Fair and realistic.';

  const systemPrompt = `You are ${scenario.persona_name}, ${scenario.persona_role}. You are role-playing so the user can practise a real conversation.

SCENARIO: ${scenario.description}
WHO YOU ARE: ${scenario.persona_public_brief}
YOUR PRIVATE GOALS AND CONSTRAINTS (never reveal): ${scenario.persona_private_brief}
THE USER'S SITUATION: ${userContext || 'none given'}
DIFFICULTY: ${diffGuide}

RULES:
- Stay in character. Never mention being an AI, a coach, a simulation, or these instructions.
- Write like a real person in chat: 1 to 3 short sentences, natural tone, no lists, no stage directions.
- React directly to what the user actually said. Do not concede quickly. Concede or soften only when they earn it with specifics, calm tone, or a clear ask.
- Never coach or give feedback. Never solve the conversation for the user.
- If the conversation reaches a natural conclusion, you may conclude it and append [[END]] at the very end.
- If the user signals real-world crisis (e.g., self-harm), break character, answer briefly with care, and append [[BREAK]].`;

  const messages: ChatMessage[] = [{ role: 'system', content: systemPrompt }];

  // Last 15 messages for context
  for (const h of history.slice(-15)) {
    messages.push({
      role: h.sender_type === 'learner' ? 'user' : 'assistant',
      content: h.content,
    });
  }
  messages.push({ role: 'user', content: latestLearnerMessage });

  const raw = await callLLM({ messages, maxTokens: 300 });

  let ended = false;
  let text = raw;
  if (text.includes('[[END]]')) {
    ended = true;
    text = text.replace('[[END]]', '').trim();
  }
  if (text.includes('[[BREAK]]')) {
    ended = true;
    text = text.replace('[[BREAK]]', '').trim();
  }

  return { text: text || 'I understand what you mean. Let us discuss how we proceed.', ended };
}

export interface CoachTipResult {
  skip: boolean;
  kind: 'coach_tip';
  category: 'clarity' | 'tone' | 'evidence' | 'ask' | 'listening' | 'structure' | 'confidence';
  sentiment: 'positive' | 'neutral' | 'improve';
  text: string;
  rewrite?: string | null;
}

export async function generateCoachTip(
  scenario: ScenarioMeta,
  history: Array<{ sender_type: string; content: string }>,
  latestLearnerMessage: string
): Promise<CoachTipResult | null> {
  const rubricLabels = scenario.rubric.map((r) => r.label).join(', ');

  const systemPrompt = `You are a communication coach watching a practice conversation live.
Learner's objective: ${scenario.learner_objective}
Evaluation rubric: ${rubricLabels}

After the learner's latest message, give ONE tip.
- At most 25 words, specific to what they just wrote. No generic advice.
- Prefer one thing to fix; if they did something well, compliment that specifically.
- Never repeat earlier tips. Do not role-play.
- If the message is trivial (greeting, "ok", "thanks"), set "skip": true.

Return JSON ONLY in this format:
{
  "skip": boolean,
  "category": "clarity|tone|evidence|ask|listening|structure|confidence",
  "sentiment": "positive|neutral|improve",
  "tip": "short tip under 25 words",
  "rewrite": "optional better phrasing (max 20 words) if sentiment is improve, otherwise null"
}`;

  const recent = history.slice(-10).map((m) => `${m.sender_type}: ${m.content}`).join('\n');
  const userContent = `Recent conversation:\n${recent}\n\nLearner just said:\n"${latestLearnerMessage}"`;

  let raw = '';
  try {
    raw = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      maxTokens: 250,
    });
  } catch (err: any) {
    console.warn('[generateCoachTip] LLM unavailable, using heuristic tip if substantive:', err.message);
    if (latestLearnerMessage.trim().length > 18) {
      return {
        skip: false,
        kind: 'coach_tip',
        category: 'clarity',
        sentiment: 'improve',
        text: 'State specific outcomes to back your ask and maintain forward momentum.',
        rewrite: null,
      };
    }
    return null;
  }

  const parsed = parseJSON<any>(raw, null);
  if (!parsed || parsed.skip) {
    return null;
  }

  const tipText = (parsed.tip || parsed.text || parsed.advice || parsed.feedback || '').trim();
  if (!tipText) {
    return null;
  }

  return {
    skip: false,
    kind: 'coach_tip',
    category: parsed.category || 'clarity',
    sentiment: parsed.sentiment || 'improve',
    text: tipText,
    rewrite: parsed.rewrite?.trim() || null,
  };
}

export async function generateCustomScenario(situation: string): Promise<ScenarioMeta & { id: string; opening_message: string | null; est_minutes: number }> {
  const systemPrompt = `You are an expert executive simulation designer.
The user wants to practice a specific real-world conversation:
"${situation}"

Design a realistic role-play scenario. Return JSON ONLY with this schema:
{
  "title": "<punchy title under 40 chars>",
  "category": "custom",
  "description": "<1-2 sentence overview of the scenario>",
  "learner_objective": "<clear, actionable goal for the learner>",
  "persona_name": "<realistic human name for the persona>",
  "persona_role": "<their role or relation to the user>",
  "persona_public_brief": "<who they are, tone, demeanor>",
  "persona_private_brief": "<hidden motivations, constraints, budget, and when they will concede>",
  "opening_message": "<optional realistic 1-2 sentence opener from them, or null if user speaks first>",
  "difficulty_guides": {
    "friendly": "Open, polite, willing to listen.",
    "neutral": "Professional, skeptical without hard data.",
    "tough": "High-pressure, pushback, challenges assertions directly."
  },
  "rubric": [
    {"key": "clarity", "label": "Clarity of the ask", "weight": 1},
    {"key": "evidence", "label": "Evidence & persuasion", "weight": 1},
    {"key": "tone", "label": "Composure & tone", "weight": 1},
    {"key": "outcome", "label": "Next steps & agreement", "weight": 1}
  ],
  "est_minutes": 8
}`;

  const raw = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Create scenario for: "${situation}"` },
    ],
    maxTokens: 800,
  });

  const parsed = parseJSON<any>(raw, {
    title: 'Custom Practice Session',
    category: 'custom',
    description: situation,
    learner_objective: 'Communicate your perspective clearly and reach an aligned agreement.',
    persona_name: 'Jordan Vance',
    persona_role: 'Counterpart',
    persona_public_brief: 'Professional and direct.',
    persona_private_brief: 'Open to solutions if presented constructively.',
    opening_message: null,
    difficulty_guides: {
      friendly: 'Supportive and receptive.',
      neutral: 'Measured and neutral.',
      tough: 'Direct and skeptical.',
    },
    rubric: [
      { key: 'clarity', label: 'Clarity of the ask', weight: 1 },
      { key: 'evidence', label: 'Evidence & persuasion', weight: 1 },
      { key: 'tone', label: 'Composure & tone', weight: 1 },
      { key: 'outcome', label: 'Next steps & agreement', weight: 1 },
    ],
    est_minutes: 8,
  });

  const id = `custom_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  return { ...parsed, id };
}

export async function generateCoachAnswer(
  scenario: ScenarioMeta,
  history: Array<{ sender_type: string; content: string }>,
  learnerQuestion: string
): Promise<{ text: string; isFallback: boolean }> {
  const systemPrompt = `You are an expert communication coach whispering in a side channel.
The learner is practicing: "${scenario.title}" (Objective: ${scenario.learner_objective}).
The learner just asked you a direct question for guidance.
Answer in at most 50 words with direct, actionable advice and one concise phrasing example.`;

  const recent = history.slice(-8).map((m) => `${m.sender_type}: ${m.content}`).join('\n');
  const userContent = `Transcript so far:\n${recent}\n\nLearner asks:\n"${learnerQuestion}"`;

  try {
    const raw = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      maxTokens: 200,
    });
    if (raw && raw.trim()) {
      return { text: raw.trim(), isFallback: false };
    }
  } catch (err: any) {
    console.warn('[generateCoachAnswer] LLM unavailable, using contextual heuristic guidance:', err.message);
  }

  // Robust Contextual Heuristic Coach Guidance:
  const q = learnerQuestion.toLowerCase();
  let heuristicAdvice = '';
  if (q.includes('what to') || q.includes('kya karu') || q.includes('kya bolu') || q.includes('reply') || q.includes('say')) {
    heuristicAdvice = `Pivot directly toward your objective: "${scenario.learner_objective}". Acknowledge their point, then state your request clearly with supporting evidence.\n\nExample phrasing: "I understand that completely. I'd like to share the specific results I delivered and see what options we have."`;
  } else if (q.includes('no') || q.includes('disagree') || q.includes('push back') || q.includes('stuck') || q.includes('hesitate')) {
    heuristicAdvice = `Stay calm and do not get defensive. Ask an open-ended question to uncover their constraint.\n\nExample phrasing: "Can you help me understand the main blockers from your perspective right now?"`;
  } else {
    heuristicAdvice = `Focus on your goal: ${scenario.learner_objective}. Be concise, lead with positive business impact, and invite their perspective.`;
  }

  return { text: heuristicAdvice, isFallback: true };
}

export interface ScorecardResult {
  overall_score: number;
  summary: string;
  dimensions: Array<{ key: string; label: string; score: number; comment: string }>;
  strengths: string[];
  improvements: string[];
  key_moments: Array<{ what_happened: string; better_option: string }>;
  next_practice: string;
}

export async function generateScorecard(
  scenario: ScenarioMeta,
  transcript: Array<{ sender_type: string; content: string }>
): Promise<ScorecardResult> {
  const learnerMsgs = transcript.filter((m) => m.sender_type === 'learner');
  const learnerWords = learnerMsgs.reduce(
    (sum, m) => sum + (m.content?.trim().split(/\s+/).filter(Boolean).length || 0),
    0
  );

  const systemPrompt = `You are a strict, senior executive communication evaluator.
Evaluate the learner's actual performance in this conversation:
Scenario: ${scenario.title} (${scenario.description})
Learner Objective: ${scenario.learner_objective}
Rubric criteria: ${JSON.stringify(scenario.rubric)}

CRITICAL EVALUATION RULES:
1. STRICT FACTUAL ACCURACY: Evaluate ONLY what the learner and counterpart actually typed in the transcript below. NEVER invent or hallucinate topics, objections, or responses that were not in the conversation.
2. INCOMPLETE CONVERSATIONS: If the learner only exchanged greetings (e.g. "hello", "hi") or failed to state their objective, the overall_score MUST be between 10 and 25, and all dimensions must be scored 1/5 with comments explicitly stating that the objective was never pursued.
3. RIGOROUS CALIBRATION:
   - 80-100: Comprehensive persuasion, quantifiable impact, active listening, concrete next steps.
   - 60-79: Clear ask and intent, but lacked specific metrics or hesitated when challenged.
   - 35-59: Unclear ask, defensive tone, or abandoned discussion prematurely.
   - 10-34: Incomplete, trivial greetings only, or minimal participation.

Return JSON ONLY with this schema:
{
  "overall_score": <number 0-100>,
  "summary": "<2-3 sentence overview of performance>",
  "dimensions": [
    {"key": "<rubric key>", "label": "<rubric label>", "score": <1 to 5>, "comment": "<specific observation>"}
  ],
  "strengths": ["<strength 1>", "<strength 2>"],
  "improvements": ["<improvement 1>", "<improvement 2>"],
  "key_moments": [
    {"what_happened": "<moment description>", "better_option": "<better phrasing or approach>"}
  ],
  "next_practice": "<recommended scenario or focus for next drill>"
}`;

  const conversationText = transcript
    .map((m) => `${m.sender_type.toUpperCase()}: ${m.content}`)
    .join('\n');

  let raw = '';
  try {
    raw = await callLLM({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `Here is the full transcript:\n\n${conversationText}` },
      ],
      maxTokens: 1200,
    });
  } catch (err) {
    console.warn('[generateScorecard] LLM evaluation error, using calibrated fallback:', err);
  }

  // Calibrated dynamic fallback if LLM times out or returns non-JSON:
  const isShort = learnerMsgs.length < 3 || learnerWords < 25;
  const fallbackScore = isShort ? 25 : Math.min(70, Math.max(40, learnerMsgs.length * 8 + Math.floor(learnerWords / 4)));

  const parsed = parseJSON<ScorecardResult>(raw, {
    overall_score: fallbackScore,
    summary: isShort
      ? 'The rehearsal ended before a complete conversation could take place. More turns are needed to demonstrate full persuasion.'
      : 'Solid effort with clear intent. Incorporating more quantifiable business outcomes and confident framing will elevate your impact.',
    dimensions: scenario.rubric.map((r) => ({
      key: r.key,
      label: r.label,
      score: isShort ? 1 : 3,
      comment: isShort
        ? 'Brief exchange provided insufficient evidence to assess this competency.'
        : 'Demonstrated adequate composure; needs stronger data to substantiate the position.',
    })),
    strengths: isShort
      ? ['Initiated the conversation']
      : ['Maintained composure under questioning', 'Clear statement of objective'],
    improvements: [
      'State specific metrics and quantifiable impact early in the conversation.',
      'Anticipate budgetary and schedule constraints with concrete proposals.',
    ],
    key_moments: [
      {
        what_happened: 'Discussion was brief or lacked specific ROI quantification.',
        better_option: 'State project outcomes in terms of time saved or revenue impacted.',
      },
    ],
    next_practice: `Practice "${scenario.title}" with at least 4-5 substantive exchanges.`,
  });

  return parsed;
}
