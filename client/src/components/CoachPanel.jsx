import { useEffect, useRef, useState } from 'react'
import { Bot, Sparkles, AlertCircle } from 'lucide-react'
import TipCard from './TipCard'
import Composer from './Composer'

export default function CoachPanel({
  tips = [],
  onAsk,
  isMentor = false,
  isThinking = false,
  coachStatus = 'ready', // 'ready' | 'thinking' | 'fallback'
}) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tips.length, isThinking])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    onAsk?.(text)
    setDraft('')
  }

  const statusLabel =
    isThinking || coachStatus === 'thinking'
      ? 'Analyzing…'
      : coachStatus === 'fallback'
        ? 'Heuristic Mode'
        : 'Active & Listening'

  const statusClass =
    isThinking || coachStatus === 'thinking'
      ? 'coach-status--thinking'
      : coachStatus === 'fallback'
        ? 'coach-status--fallback'
        : 'coach-status--ready'

  return (
    <section className="coach-panel" aria-label="Coach channel">
      <div className="coach-panel__header">
        <Bot size={15} style={{ color: 'var(--color-cool)', flexShrink: 0 }} aria-hidden="true" />
        <span className="coach-panel__title">Coach &amp; Mentor</span>

        {/* Live Coach Status Indicator */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          <div className={`coach-status-pill ${statusClass}`} title={`AI Coach status: ${statusLabel}`}>
            <span className="coach-status-dot" />
            <span className="coach-status-text">{statusLabel}</span>
          </div>
          {isMentor && (
            <span className="chip chip--mentor" style={{ fontSize: '10px' }}>LIVE</span>
          )}
        </div>
      </div>

      <div className="coach-list" role="log" aria-live="polite" aria-label="Coach tips and feedback">
        {tips.length === 0 && !isThinking && (
          <div className="empty-state">
            <svg className="empty-state__icon" viewBox="0 0 40 40" fill="none" aria-hidden="true" role="presentation">
              <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
              <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="empty-state__label">
              {isMentor
                ? 'Type below to share live coaching advice with the learner.'
                : 'The coach will post feedback after your first message in the scene.'}
            </p>
          </div>
        )}

        {tips.map((tip, i) => (
          <TipCard key={tip.uid ?? tip.id ?? i} tip={tip} />
        ))}

        {isThinking && (
          <div className="coach-thinking-bubble">
            <span className="coach-thinking-dot" />
            <span className="coach-thinking-dot" />
            <span className="coach-thinking-dot" />
            <span style={{ fontSize: '12px', color: 'var(--color-muted)', marginLeft: '6px' }}>
              Coach is analyzing your message…
            </span>
          </div>
        )}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        placeholder={isMentor ? 'Give advice to learner…' : 'Ask coach or reply to mentor…'}
        variant="coach"
        disabled={isThinking}
      />
    </section>
  )
}
