import { useEffect, useState } from 'react'
import { UserPlus, Square, WifiOff, Loader2 } from 'lucide-react'

function pad(n) {
  return String(n).padStart(2, '0')
}

function formatElapsed(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${pad(m)}:${pad(s)}`
}

export default function SessionHeader({
  personaName = 'Alex Marsh',
  personaRole = 'Hiring Manager',
  difficulty = 'neutral',
  connectionStatus = 'connected',
  startedAt,
  isFinishing = false,
  mode = 'ai',
  myRole = 'learner',
  onInvite,
  onFinish,
}) {
  const isPartnerMode = mode === 'partner'
  const isPartner = isPartnerMode && myRole === 'partner'
  const [mountedAt] = useState(Date.now)
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])
  const elapsed = Math.max(0, Math.floor((now - (startedAt ?? mountedAt)) / 1000))

  const initials = personaName
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const difficultyMap = {
    friendly: 'chip--ok',
    neutral:  '',
    tough:    'chip--bad',
  }

  return (
    <header className="session-header">
      <div className="session-header__persona">
        <div className="persona-avatar" aria-hidden="true">{initials}</div>
        <div>
          <div className="persona-name">{personaName}</div>
          {personaRole && (
            <div className="measured" style={{ fontSize: '11px' }}>{personaRole}</div>
          )}
        </div>
        {isPartnerMode ? (
          <span className="chip chip--cool" style={{ marginLeft: '4px', fontSize: '10px' }}>
            {isPartner ? 'You play this role' : 'Live partner'}
          </span>
        ) : (
          <>
            <span className={`chip ${difficultyMap[difficulty] ?? ''}`} style={{ marginLeft: '4px' }}>
              {difficulty}
            </span>
            <span className="chip chip--cool" style={{ marginLeft: '2px', fontSize: '10px' }}>
              AI
            </span>
          </>
        )}
      </div>

      <div className="session-header__controls">
        {connectionStatus !== 'connected' && (
          <span className="chip chip--bad" aria-live="polite" aria-label="Disconnected">
            <WifiOff size={12} aria-hidden="true" />
            offline
          </span>
        )}

        <span className="timer" aria-label={`Elapsed time ${formatElapsed(elapsed)}`}>
          {formatElapsed(elapsed)}
        </span>

        {/* The partner only chats; inviting and ending belong to the interviewee. */}
        {!isPartner && (
          <>
            <button
              type="button"
              className="btn btn--ghost btn--icon"
              onClick={onInvite}
              title={isPartnerMode ? 'Invite your partner' : 'Invite a mentor'}
              aria-label={isPartnerMode ? 'Invite your partner' : 'Invite a mentor'}
            >
              <UserPlus size={16} aria-hidden="true" />
              <span className="btn--label" style={{ marginLeft: '4px' }}>Invite</span>
            </button>

            <button
              type="button"
              className="btn"
              disabled={isFinishing}
              onClick={onFinish}
              aria-label="End this session"
              style={{ opacity: isFinishing ? 0.7 : 1, cursor: isFinishing ? 'wait' : 'pointer' }}
            >
              {isFinishing ? (
                <>
                  <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <Square size={14} aria-hidden="true" />
                  <span>Finish</span>
                </>
              )}
            </button>
          </>
        )}
      </div>
    </header>
  )
}
