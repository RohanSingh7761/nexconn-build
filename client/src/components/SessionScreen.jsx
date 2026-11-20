import { useState, useEffect, useCallback, useRef } from 'react'
import { MessageSquare, Bot } from 'lucide-react'

import SessionHeader from './SessionHeader'
import SceneChat from './SceneChat'
import CoachPanel from './CoachPanel'
import ConnectionBanner from './ConnectionBanner'
import InviteSheet from './InviteSheet'
import CoachTipPill from './CoachTipPill'

/* ─── Demo seed data ──────────────────────────────────────────── */
const DEMO_SCENE = [
  {
    uid: '1',
    senderType: 'persona',
    senderName: 'Alex Marsh',
    content: 'Thanks for coming in. Walk me through why you feel you deserve a 15% raise at this point in your tenure.',
    createdAt: Date.now() - 90000,
  },
  {
    uid: '2',
    senderType: 'learner',
    senderName: 'You',
    content: "Sure. Over the past year I've delivered the new reporting pipeline two weeks ahead of schedule, which unblocked the Q3 launch.",
    createdAt: Date.now() - 75000,
  },
  {
    uid: '3',
    senderType: 'persona',
    senderName: 'Alex Marsh',
    content: "That's one deliverable. The pipeline has also had three outages since launch. How do you account for that?",
    createdAt: Date.now() - 60000,
  },
]

const DEMO_STARTED_AT = Date.now() - 95000

const DEMO_TIPS = [
  {
    uid: 'c1',
    kind: 'coach_tip',
    category: 'evidence',
    sentiment: 'improve',
    text: 'Lead with the business outcome, not the action. Quantify the impact the Q3 launch had in revenue or time saved.',
    rewrite: 'The pipeline I shipped in Q2 contributed directly to the Q3 launch closing $420 k ahead of forecast.',
  },
  {
    uid: 'c2',
    kind: 'coach_tip',
    category: 'tone',
    sentiment: 'strong',
    text: 'Good — staying calm when challenged. Keep that register.',
  },
]

/* ─── Main component ──────────────────────────────────────────── */
export default function SessionScreen({
  /* real props from the router / store */
  session,
  scenario,
  connectionStatus = 'connected',
  onSendSceneMessage,
  onAskCoach,
  onFinish,
  onInvite,
}) {
  /* use demo data if no live session yet */
  const sceneMessages  = session?.sceneMessages  ?? DEMO_SCENE
  const coachMessages  = session?.coachMessages  ?? DEMO_TIPS
  const pendingTurn    = session?.pendingTurn     ?? false
  const personaName    = scenario?.personaName    ?? 'Alex Marsh'
  const personaRole    = scenario?.personaRole    ?? 'Hiring Manager'
  const difficulty     = session?.difficulty      ?? 'neutral'
  const startedAt      = session?.startedAt       ?? DEMO_STARTED_AT
  const inviteCode     = session?.inviteCode
  const inviteExpiry   = session?.inviteExpiry

  /* mobile tab */
  const [activeTab, setActiveTab] = useState('scene')
  const [showInvite, setShowInvite] = useState(false)

  /* latest coach tip for the mobile pill */
  const [pillTip, setPillTip] = useState(null)
  const prevCoachLen = useRef(coachMessages.length)
  useEffect(() => {
    const grew = coachMessages.length > prevCoachLen.current
    prevCoachLen.current = coachMessages.length
    const last = coachMessages[coachMessages.length - 1]
    if (!grew || activeTab === 'coach' || last?.kind !== 'coach_tip') return
    setPillTip(last) // eslint-disable-line react/set-state-in-effect -- reacting to a new incoming tip
    const t = setTimeout(() => setPillTip(null), 5000)
    return () => clearTimeout(t)
  }, [coachMessages, activeTab])

  const handleInviteClick = useCallback(() => {
    onInvite?.()
    setShowInvite(true)
  }, [onInvite])

  const handleFinish = useCallback(() => {
    onFinish?.()
  }, [onFinish])

  return (
    <>
      <div className="session">
        <SessionHeader
          personaName={personaName}
          personaRole={personaRole}
          difficulty={difficulty}
          connectionStatus={connectionStatus}
          startedAt={startedAt}
          isFinishing={session?.isFinishing}
          onInvite={handleInviteClick}
          onFinish={handleFinish}
        />

        <ConnectionBanner status={connectionStatus} />

        {/* mobile tabs */}
        <nav className="tab-bar" aria-label="Channel tabs">
          <ul className="tab-bar__list" role="tablist">
            <li role="presentation">
              <button
                type="button"
                role="tab"
                className="tab-bar__btn"
                aria-selected={activeTab === 'scene'}
                aria-controls="panel-scene"
                onClick={() => setActiveTab('scene')}
              >
                <MessageSquare size={15} aria-hidden="true" />
                Scene
              </button>
            </li>
            <li role="presentation">
              <button
                type="button"
                role="tab"
                className="tab-bar__btn"
                aria-selected={activeTab === 'coach'}
                aria-controls="panel-coach"
                onClick={() => { setActiveTab('coach'); setPillTip(null) }}
              >
                <Bot size={15} aria-hidden="true" />
                Coach
                {pillTip && activeTab !== 'coach' && (
                  <span className="unread-badge" aria-label="New coach tip">1</span>
                )}
              </button>
            </li>
          </ul>
        </nav>

        <div className="session-body">
          <div
            id="panel-scene"
            role="tabpanel"
            data-hidden={activeTab !== 'scene' ? 'true' : undefined}
            className="chat-pane"
            style={activeTab !== 'scene' ? { display: 'none' } : undefined}
          >
            <SceneChat
              messages={sceneMessages}
              pendingTurn={pendingTurn}
              personaName={personaName}
              connectionStatus={connectionStatus}
              onSend={onSendSceneMessage}
            />
          </div>

          <div
            id="panel-coach"
            role="tabpanel"
            data-hidden={activeTab !== 'coach' ? 'true' : undefined}
            className="coach-panel"
            style={activeTab !== 'coach' ? { display: 'none' } : undefined}
          >
            <CoachPanel
              tips={coachMessages}
              onAsk={onAskCoach}
            />
          </div>

          {/* desktop: always show coach panel (CSS grid handles layout) */}
          <style>{`
            @media (min-width: 768px) {
              #panel-scene { display: flex !important; flex-direction: column; }
              #panel-coach { display: flex !important; flex-direction: column; }
            }
          `}</style>
        </div>
      </div>

      {/* mobile floating tip pill */}
      {pillTip && activeTab === 'scene' && (
        <CoachTipPill
          tip={pillTip}
          onClick={() => { setActiveTab('coach'); setPillTip(null) }}
        />
      )}

      {/* invite sheet */}
      {showInvite && (
        <InviteSheet
          code={inviteCode ?? 'AB3K7P'}
          expiresAt={inviteExpiry}
          onClose={() => setShowInvite(false)}
        />
      )}

      {/* Finishing analysis overlay */}
      {session?.isFinishing && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
          zIndex: 9999, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 14, color: '#f0f6fc',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            width: 44, height: 44, border: '3px solid #30363d', borderTopColor: '#58a6ff',
            borderRadius: '50%', animation: 'spin 1s linear infinite'
          }} />
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Evaluating Your Rehearsal...</h3>
          <p style={{ margin: 0, fontSize: 13, color: '#8b949e' }}>
            Analyzing conversation transcript and generating your AI scorecard...
          </p>
        </div>
      )}
    </>
  )
}
