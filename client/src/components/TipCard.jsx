const categoryLabels = {
  evidence:    'evidence',
  clarity:     'clarity',
  tone:        'tone',
  structure:   'structure',
  listening:   'listening',
  assertive:   'assertiveness',
}

const sentimentMap = {
  improve: '',
  strong:  'chip--ok',
  caution: 'chip--bad',
}

export default function TipCard({ tip }) {
  /* plain-text fallback if tip.kind is not coach_tip */
  if (!tip.kind || tip.kind === 'system_notice') {
    return (
      <p className="system-notice">{tip.text}</p>
    )
  }

  if (tip.senderType === 'mentor') {
    return (
      <div className="mentor-bubble">
        <span className="mentor-bubble__sender">{tip.senderName ?? 'Mentor'}</span>
        <p className="mentor-bubble__text">{tip.text}</p>
      </div>
    )
  }

  return (
    <article className="tip-card">
      <div className="tip-card__meta">
        {tip.category && (
          <span className={`chip ${sentimentMap[tip.sentiment] ?? ''}`}>
            {categoryLabels[tip.category] ?? tip.category}
          </span>
        )}
      </div>
      <p className="tip-card__text">{tip.text}</p>
      {tip.rewrite && (
        <div>
          <div className="tip-card__label">try instead</div>
          <blockquote className="tip-card__rewrite">{tip.rewrite}</blockquote>
        </div>
      )}
    </article>
  )
}
