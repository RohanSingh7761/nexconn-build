-- Seed Scenarios for Rehearsal

INSERT INTO scenarios (
  id, title, category, description, learner_objective,
  persona_name, persona_role, persona_avatar_url,
  persona_public_brief, persona_private_brief,
  opening_message, difficulty_guides, rubric, est_minutes, is_active
) VALUES
(
  'salary-raise',
  'Ask for a raise',
  'career',
  'You have taken on extra responsibilities and delivered major projects over the past year. Speak with your engineering manager to request a salary increase.',
  'Make a clear, evidence-based salary increase request, listen constructively to constraints, and agree on a concrete next step.',
  'Maya Rao',
  'Engineering Manager',
  'https://ui-avatars.com/api/?name=Maya+Rao&background=0D8ABC&color=fff',
  'Maya is an experienced engineering manager who values data, direct communication, and ownership. She cares about team equity and realistic workload.',
  'Budget is tight this cycle. She respects data on measurable impact. She will offer roughly 5% and a 6-month review only if the learner is specific and calm; she will not commit to a big number in this first conversation.',
  NULL,
  '{
    "friendly": "Open and supportive, acknowledges hard work quickly, but still vague on exact numbers.",
    "neutral": "Fair, polite, but noncommittal without solid data. Asks probing questions about business impact.",
    "tough": "Time-pressed, cites budget freeze, points out peers at similar levels, and directly challenges vague claims."
  }'::jsonb,
  '[
    {"key": "clarity", "label": "Clarity of the ask", "weight": 1},
    {"key": "evidence", "label": "Evidence of impact", "weight": 1},
    {"key": "objections", "label": "Handling objections", "weight": 1},
    {"key": "composure", "label": "Tone and composure", "weight": 1},
    {"key": "closing", "label": "Closing & next steps", "weight": 1}
  ]'::jsonb,
  8,
  true
),
(
  'behavioural-interview',
  'Fintech Job Interview',
  'career',
  'A behavioral interview for a senior engineering role at a high-growth fintech startup.',
  'Deliver structured STAR-format answers highlighting ownership, concrete metrics, and lessons learned.',
  'Daniel Kim',
  'Hiring Manager',
  'https://ui-avatars.com/api/?name=Daniel+Kim&background=2E7D32&color=fff',
  'Daniel is a hiring manager at a fast-moving fintech. He looks for high agency, clear technical communication, and intellectual honesty.',
  'He actively looks for STAR-structured answers. He probes vague claims with "what exactly did you do versus the team?", and values humble self-awareness.',
  'Hi! Thanks for taking the time to chat today. To start off, could you tell me about a time when a critical system failed under your watch and how you handled it?',
  '{
    "friendly": "Encouraging and patient, nods along, prompts gently if steps are missed.",
    "neutral": "Attentive, asks standard follow-up questions to verify candidate contribution.",
    "tough": "Skeptical, interrupts high-level buzzwords, presses hard on root causes and individual accountability."
  }'::jsonb,
  '[
    {"key": "structure", "label": "STAR structure", "weight": 1},
    {"key": "specificity", "label": "Specificity & metrics", "weight": 1},
    {"key": "ownership", "label": "Individual ownership", "weight": 1},
    {"key": "concision", "label": "Concision", "weight": 1},
    {"key": "curiosity", "label": "Reverse questions", "weight": 1}
  ]'::jsonb,
  10,
  true
),
(
  'client-escalation',
  'Tough Client Escalation',
  'sales',
  'A tier-1 enterprise client is furious about a 2-week delay on an agreed deliverable. De-escalate and preserve the account.',
  'Acknowledge frustration with empathy, take ownership without being defensive, and establish a firm recovery timeline.',
  'Rohan Mehta',
  'Client Director',
  'https://ui-avatars.com/api/?name=Rohan+Mehta&background=D32F2F&color=fff',
  'Rohan is a busy client executive whose company deadline depends on this delivery. He is under pressure from his board.',
  'He wants a concrete, verified recovery plan and a commercial concession (discount or extra services). He will escalate to your VP if you make excuses or give vague assurances.',
  'I was promised this deployment would be live on Monday. My executive board is demanding answers. What happened, and why am I only finding out now?',
  '{
    "friendly": "Frustrated but receptive to honest explanations and quick apologies.",
    "neutral": "Demands clear timelines and will not accept hand-waving.",
    "tough": "Aggressive, threatens contract termination, tests emotional resilience."
  }'::jsonb,
  '[
    {"key": "empathy", "label": "Empathy & validation", "weight": 1},
    {"key": "ownership", "label": "Ownership vs defensiveness", "weight": 1},
    {"key": "recovery_plan", "label": "Concrete recovery plan", "weight": 1},
    {"key": "boundaries", "label": "Scope & discount boundaries", "weight": 1},
    {"key": "follow_up", "label": "Actionable follow-up", "weight": 1}
  ]'::jsonb,
  8,
  true
),
(
  'hard-feedback',
  'Difficult Teammate Feedback',
  'leadership',
  'A peer on your project has missed several commitments recently, creating blockers for others. Address it directly.',
  'Deliver clear behavioral observations, explain the team impact, uncover root causes with curiosity, and agree on support.',
  'Sam Iyer',
  'Software Engineer',
  'https://ui-avatars.com/api/?name=Sam+Iyer&background=7B1FA2&color=fff',
  'Sam is a talented engineer who has been quieter and more distracted than usual over the last month.',
  'Sam is dealing with unexpected family care obligations outside of work, but is afraid to look incompetent. Will only open up if approached with psychological safety rather than accusation.',
  NULL,
  '{
    "friendly": "Relieved that someone noticed, opens up quickly with gentle prompting.",
    "neutral": "Slightly guarded initially, relaxes once they see the feedback is constructive.",
    "tough": "Defensive, deflects to other team issues, needs calm, non-confrontational facts."
  }'::jsonb,
  '[
    {"key": "observations", "label": "Specific observations", "weight": 1},
    {"key": "impact", "label": "Impact stated clearly", "weight": 1},
    {"key": "curiosity", "label": "Curiosity & listening", "weight": 1},
    {"key": "tone", "label": "Constructive tone", "weight": 1},
    {"key": "action_plan", "label": "Agreed next steps", "weight": 1}
  ]'::jsonb,
  8,
  true
)
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  learner_objective = EXCLUDED.learner_objective,
  persona_name = EXCLUDED.persona_name,
  persona_role = EXCLUDED.persona_role,
  persona_avatar_url = EXCLUDED.persona_avatar_url,
  persona_public_brief = EXCLUDED.persona_public_brief,
  persona_private_brief = EXCLUDED.persona_private_brief,
  opening_message = EXCLUDED.opening_message,
  difficulty_guides = EXCLUDED.difficulty_guides,
  rubric = EXCLUDED.rubric,
  est_minutes = EXCLUDED.est_minutes,
  is_active = EXCLUDED.is_active;
