import { Bot } from 'lucide-react'

export default function CoachTipPill({ tip, onClick }) {
  if (!tip) return null

  return (
    <button
      type="button"
      className="tip-pill"
      onClick={onClick}
      aria-label={`New coach tip: ${tip.text}. Tap to open coach panel.`}
    >
      <Bot size={14} aria-hidden="true" style={{ flexShrink: 0 }} />
      <span className="tip-pill__text">{tip.text}</span>
    </button>
  )
}
