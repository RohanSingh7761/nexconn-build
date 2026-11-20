import { useEffect, useRef, useState } from 'react'
import Bubble from './Bubble'
import TypingDots from './TypingDots'
import Composer from './Composer'

export default function SceneChat({
  messages = [],
  pendingTurn = false,
  personaName = 'Alex',
  connectionStatus = 'connected',
  onSend,
}) {
  const [draft, setDraft] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, pendingTurn])

  function handleSend() {
    const text = draft.trim()
    if (!text || pendingTurn) return
    onSend?.(text)
    setDraft('')
  }

  const isDisabled = pendingTurn || connectionStatus === 'disconnected'

  return (
    <div className="chat-pane" aria-label="Scene conversation">
      <div
        className="message-list"
        role="log"
        aria-live="polite"
        aria-label="Scene messages"
      >
        {messages.length === 0 && !pendingTurn && (
          <div className="empty-state">
            <svg className="empty-state__icon" viewBox="0 0 40 40" fill="none" aria-hidden="true" role="presentation">
              <rect x="1" y="8" width="38" height="24" rx="3" stroke="currentColor" strokeWidth="1" />
              <path d="M8 32v5l6-5" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <p className="empty-state__label">
              The scene is ready. Send your opening message to begin the rehearsal.
            </p>
          </div>
        )}

        {messages.map((msg, i) => (
          <Bubble key={msg.uid ?? msg.id ?? i} message={msg} />
        ))}

        {pendingTurn && <TypingDots name={personaName} />}

        <div ref={bottomRef} aria-hidden="true" />
      </div>

      <Composer
        value={draft}
        onChange={setDraft}
        onSend={handleSend}
        disabled={isDisabled}
        placeholder={
          isDisabled && connectionStatus !== 'connected'
            ? 'Reconnecting…'
            : pendingTurn
              ? `${personaName} is replying…`
              : 'Your message…'
        }
        variant="scene"
      />
    </div>
  )
}
