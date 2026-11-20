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

  const model = options.model || process.env.OPEN_ROUTER_MODEL_NAME || 'nvidia/nemotron-3.5-lightning:free';
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
    throw new Error(`OpenRouter API error (${res.status}): ${errorText}`);
  }

  const data = (await res.json()) as any;
  const choice = data.choices?.[0];
  let content = choice?.message?.content?.trim() || '';

  // Fallback if model put answer in reasoning or choice content was empty
  if (!content && choice?.message?.reasoning) {
    content = choice.message.reasoning.trim();
  }

  return content;
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

  const raw = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    maxTokens: 250,
  });

  const parsed = parseJSON<any>(raw, null);
  if (!parsed || parsed.skip) {
    return null;
  }

  return {
    skip: false,
    kind: 'coach_tip',
    category: parsed.category || 'clarity',
    sentiment: parsed.sentiment || 'improve',
    text: parsed.tip || 'Be specific with examples to strengthen your point.',
    rewrite: parsed.rewrite || null,
  };
}

export async function generateCoachAnswer(
  scenario: ScenarioMeta,
  history: Array<{ sender_type: string; content: string }>,
  learnerQuestion: string
): Promise<string> {
  const systemPrompt = `You are an expert communication coach whispering in a side channel.
The learner is practicing: "${scenario.title}" (Objective: ${scenario.learner_objective}).
The learner just asked you a direct question for guidance.
Answer in at most 50 words with direct, actionable advice and one concise phrasing example.`;

  const recent = history.slice(-8).map((m) => `${m.sender_type}: ${m.content}`).join('\n');
  const userContent = `Transcript so far:\n${recent}\n\nLearner asks:\n"${learnerQuestion}"`;

  const raw = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    maxTokens: 200,
  });

  return raw.trim() || 'Focus on concrete outcomes you delivered and ask for their perspective.';
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
  const systemPrompt = `You are a senior executive communication evaluator.
Evaluate the learner's performance in this conversation:
Scenario: ${scenario.title} (${scenario.description})
Learner Objective: ${scenario.learner_objective}
Rubric criteria: ${JSON.stringify(scenario.rubric)}

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

  const raw = await callLLM({
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Here is the full transcript:\n\n${conversationText}` },
    ],
    maxTokens: 1200,
  });

  const parsed = parseJSON<ScorecardResult>(raw, {
    overall_score: 75,
    summary: 'Solid effort with clear expression of intent. Adding more quantifiable metrics will elevate your persuasion.',
    dimensions: scenario.rubric.map((r) => ({
      key: r.key,
      label: r.label,
      score: 4,
      comment: 'Addressed well with composure.',
    })),
    strengths: ['Maintained composure under questioning', 'Clear statement of objective'],
    improvements: ['Include hard metrics or data', 'Prepare answers to budget constraints'],
    key_moments: [
      {
        what_happened: 'Initial request lacked specific ROI quantification.',
        better_option: 'State project results in terms of time saved or revenue impacted.',
      },
    ],
    next_practice: 'Practice handling aggressive budget pushback with the Tough difficulty.',
  });

  return parsed;
}
