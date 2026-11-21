import { useEffect, useRef, useState } from 'react'
import { Copy, X } from 'lucide-react'

export default function InviteSheet({ code = 'AB3K7P', expiresAt, kind = 'mentor', partnerName, onClose }) {
  const isPartner = kind === 'partner'
  const title = isPartner ? 'Invite your partner' : 'Invite a mentor'
  const closeRef = useRef(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    closeRef.current?.focus()
  }, [])

  function handleCopy() {
    navigator.clipboard.writeText(code).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) onClose?.()
  }

  function handleKey(e) {
    if (e.key === 'Escape') onClose?.()
  }

  return (
    <div
      className="sheet-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={handleOverlayClick}
      onKeyDown={handleKey}
    >
      <div className="sheet">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 className="sheet__title">{title}</h2>
          <button
            ref={closeRef}
            type="button"
            className="btn btn--ghost btn--icon"
            onClick={onClose}
            aria-label="Close invite sheet"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        <div
          className="sheet__code"
          aria-label={`Invite code: ${code ? code.split('').join(' ') : 'Generating…'}`}
        >
          {code || 'Generating…'}
        </div>

        <p className="sheet__note">
          {isPartner
            ? `Share this code with a friend. They enter it on the join page to chat with you live${partnerName ? ` as ${partnerName}` : ''}. The AI coach only whispers to you.`
            : 'Share this code with your mentor. They can enter it on the join page to access the coach channel alongside this session.'}
          {(() => {
            if (!expiresAt) return null;
            try {
              const d = new Date(expiresAt);
              if (isNaN(d.getTime())) return null;
              return (
                <> Code expires at <time dateTime={d.toISOString()}>{d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>.</>
              );
            } catch {
              return null;
            }
          })()}
        </p>

        <div className="sheet__actions">
          <button type="button" className="btn" onClick={handleCopy} aria-live="polite">
            <Copy size={14} aria-hidden="true" />
            {copied ? 'Copied' : 'Copy code'}
          </button>
          <button type="button" className="btn btn--primary" onClick={onClose}>
            Done
          </button>
        </div>
      </div>
    </div>
  )
}
