import { useEffect, useRef, useState } from 'react'
import { Bot } from 'lucide-react'
import TipCard from './TipCard'
import Composer from './Composer'

export default function CoachPanel({ tips = [], onAsk }) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [tips.length])

  function handleSend() {
    const text = draft.trim()
    if (!text) return
    onAsk?.(text)
    setDraft('')
  }

  return (
    <section className="coach-panel" aria-label="Coach channel">
      <div className="coach-panel__header">
        <Bot size={15} style={{ color: 'var(--color-cool)', flexShrink: 0 }} aria-hidden="true" />
        <span className="coach-panel__title">Coach</span>
        <span className="chip chip--cool" style={{ fontSize: '10px' }}>AI</span>
      </div>

      <div className="coach-list" role="log" aria-live="polite" aria-label="Coach tips and feedback">
        {tips.length === 0 && (
          <div className="empty-state">
            <svg className="empty-state__icon" viewBox="0 0 40 40" fill="none" aria-hidden="true" role="presentation">
              <circle cx="20" cy="20" r="19" stroke="currentColor" strokeWidth="1" strokeDasharray="4 2" />
              <path d="M14 20h12M20 14v12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <p className="empty-state__label">
              The coach will post feedback after your first message in the scene.
            </p>
          </div>
        )}

        {tips.map((tip, i) => (
          <TipCard key={tip.uid ?? tip.id ?? i} tip={tip} />
        ))}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        placeholder="Ask the coach a question…"
        variant="coach"
      />
    </section>
  )
}
