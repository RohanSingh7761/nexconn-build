import { useEffect, useState } from 'react'
import { UserPlus, Square, WifiOff, Loader2, LogOut, User } from 'lucide-react'

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
  currentUser,
  ownerName,
  partnerName,
  onInvite,
  onFinish,
  onLeave,
}) {
  const isPartnerMode = mode === 'partner'
  const isPartner = isPartnerMode && myRole === 'partner'
  const isMentor = myRole === 'mentor'
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

  const currentUserName = currentUser?.displayName || currentUser?.username || 'You'
  const currentUserInitials = currentUserName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <header className="session-header">
      {/* Left: Scenario & Counterpart Info */}
      <div className="session-header__persona">
        <div className="persona-avatar" aria-hidden="true">{initials}</div>
        <div style={{ minWidth: 0 }}>
          <div className="persona-name">
            {isPartner ? `Playing: ${personaName}` : personaName}
          </div>
          <div className="measured" style={{ fontSize: '11px', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span>{personaRole}</span>
            {isPartner && ownerName && (
              <span style={{ color: '#c4b5fd' }}>• Partner for {ownerName}</span>
            )}
            {isMentor && ownerName && (
              <span style={{ color: '#bc8cff' }}>• Observing {ownerName}</span>
            )}
          </div>
        </div>

        {/* Counterpart / Session Mode Badge */}
        {isPartnerMode ? (
          isPartner ? (
            <span className="chip chip--role" style={{ marginLeft: '4px' }}>
              YOU PLAY THIS ROLE
            </span>
          ) : isMentor ? (
            <span className="chip chip--mentor" style={{ marginLeft: '4px' }}>
              MENTOR OBSERVER
            </span>
          ) : (
            <span className="chip chip--live" style={{ marginLeft: '4px' }}>
              {partnerName ? `Live Partner: ${partnerName}` : 'Live Partner (Waiting…)'}
            </span>
          )
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

      {/* Right: Controls & Logged-in User Identity */}
      <div className="session-header__controls">
        {connectionStatus !== 'connected' && (
          <span className="chip chip--bad" aria-live="polite" aria-label="Disconnected">
            <WifiOff size={12} aria-hidden="true" />
            offline
          </span>
        )}

        {/* Top Right: Who YOU are */}
        <div className="session-user-badge" title={`Signed in as ${currentUserName} (${myRole})`}>
          <div className={`session-user-badge__avatar session-user-badge__avatar--${myRole}`}>
            {currentUserInitials}
          </div>
          <div className="session-user-badge__meta">
            <span className="session-user-badge__name">{currentUserName}</span>
            <span className={`session-user-badge__tag session-user-badge__tag--${myRole}`}>
              {myRole === 'partner' ? 'PARTNER' : myRole === 'mentor' ? 'MENTOR' : 'LEARNER'}
            </span>
          </div>
        </div>

        {/* Timer */}
        <span className="timer" aria-label={`Elapsed time ${formatElapsed(elapsed)}`}>
          {formatElapsed(elapsed)}
        </span>

        {/* Actions based on role */}
        {!isPartner && !isMentor ? (
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
        ) : (
          <button
            type="button"
            className="btn btn--ghost"
            onClick={onLeave}
            title="Leave this rehearsal session"
            style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}
          >
            <LogOut size={14} />
            <span>Leave</span>
          </button>
        )}
      </div>
    </header>
  )
}
