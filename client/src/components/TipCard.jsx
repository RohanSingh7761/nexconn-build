import { Bot, Sparkles, UserCheck } from 'lucide-react'

const categoryLabels = {
  evidence:    'evidence',
  clarity:     'clarity',
  tone:        'tone',
  structure:   'structure',
  listening:   'listening',
  assertive:   'assertiveness',
  confidence:  'confidence',
  ask:         'ask',
}

const sentimentMap = {
  improve: '',
  strong:  'chip--ok',
  caution: 'chip--bad',
}

export default function TipCard({ tip }) {
  if (!tip || (!tip.text && !tip.rewrite)) {
    return null
  }
  const tipText = (tip.text || '').trim()
  if (!tipText && !tip.rewrite) {
    return null
  }

  // System notice
  if (!tip.kind || tip.kind === 'system_notice') {
    return (
      <p className="system-notice">{tipText}</p>
    )
  }

  // 1. Human Mentor Note
  if (tip.senderType === 'mentor' || tip.kind === 'mentor_note') {
    return (
      <div className="coach-item coach-item--mentor">
        <div className="mentor-card__header">
          <div className="mentor-badge">
            <UserCheck size={12} className="mentor-badge__icon" />
            <span>MENTOR</span>
          </div>
          <span className="mentor-card__sender">{tip.senderName || 'Mentor'}</span>
          {tip.createdAt && (
            <span className="coach-item__time">
              {new Date(tip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="mentor-card__text">{tipText}</p>
      </div>
    )
  }

  // 2. Learner Question / Note in Coach channel
  if (tip.senderType === 'learner' || tip.kind === 'learner_question' || tip.kind === 'coach_question') {
    return (
      <div className="coach-item coach-item--learner">
        <div className="learner-card__header">
          <span className="learner-badge">YOU</span>
          {tip.createdAt && (
            <span className="coach-item__time">
              {new Date(tip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="learner-card__text">{tipText}</p>
      </div>
    )
  }

  // 3. AI Coach Answer to a Question
  if (tip.kind === 'coach_answer') {
    return (
      <article className="coach-item coach-item--answer">
        <div className="coach-card__header">
          <div className="coach-badge">
            <Bot size={13} />
            <span>COACH GUIDANCE</span>
          </div>
          {tip.isFallback && (
            <span className="chip chip--bad" style={{ fontSize: '9px', fontWeight: 700 }} title="AI rate limit reached. Showing offline heuristic coaching.">
              HEURISTIC
            </span>
          )}
          {tip.createdAt && (
            <span className="coach-item__time">
              {new Date(tip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <p className="coach-card__text">{tipText}</p>
      </article>
    )
  }

  // 4. Default: Live AI Coach Tip
  return (
    <article className="coach-item coach-item--tip">
      <div className="tip-card__meta">
        <div className="coach-badge coach-badge--subtle">
          <Sparkles size={12} />
          <span>AI TIP</span>
        </div>
        {tip.category && (
          <span className={`chip ${sentimentMap[tip.sentiment] ?? ''}`}>
            {categoryLabels[tip.category] ?? tip.category}
          </span>
        )}
        {tip.createdAt && (
          <span className="coach-item__time" style={{ marginLeft: 'auto' }}>
            {new Date(tip.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>
      <p className="tip-card__text">{tipText}</p>
      {tip.rewrite && (
        <div className="tip-card__rewrite-wrap">
          <div className="tip-card__label">try instead</div>
          <blockquote className="tip-card__rewrite">{tip.rewrite}</blockquote>
        </div>
      )}
    </article>
  )
}
