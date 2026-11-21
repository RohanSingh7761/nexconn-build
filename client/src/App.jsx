import { useState, useEffect } from 'react'
import * as api from './lib/api'
import * as nx from './lib/nexconn'
import SessionScreen from './components/SessionScreen'
import ScenarioPicker from './components/ScenarioPicker'
import ScorecardModal from './components/ScorecardModal'
import AuthModal from './components/AuthModal'
import Spike from './Spike'

// 'learner' owns the session, 'partner' is the human counterpart in partner mode, anyone else is a mentor.
function roleOf(session, user) {
  if (!session || !user) return null
  if (session.user_id === user.id) return 'learner'
  return session.partner_user_id === user.id ? 'partner' : 'mentor'
}

export default function App() {
  const [viewSpike, setViewSpike] = useState(import.meta.env.VITE_SPIKE === '1' || import.meta.env.VITE_SPIKE === 'true')
  const [user, setUser] = useState(null)
  const [loadingUser, setLoadingUser] = useState(true)

  // Active rehearsal state
  const [session, setSession] = useState(null)
  const [scenario, setScenario] = useState(null)
  const [channels, setChannels] = useState(null)
  const [sceneMessages, setSceneMessages] = useState([])
  const [coachMessages, setCoachMessages] = useState([])
  const [pendingTurn, setPendingTurn] = useState(false)
  const [isFinishing, setIsFinishing] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')
  const [inviteCode, setInviteCode] = useState(null)
  const [inviteExpiry, setInviteExpiry] = useState(null)
  const [sessionEnded, setSessionEnded] = useState(false) // partner mode: the interviewee finished the session

  // Scorecard modal
  const [scorecard, setScorecard] = useState(null)
  const [showScorecard, setShowScorecard] = useState(false)

  // Load user profile on mount if token exists
  useEffect(() => {
    if (api.getToken()) {
      api.getMe()
        .then((res) => setUser(res.user))
        .catch(() => {
          api.setToken('')
          setUser(null)
        })
        .finally(() => setLoadingUser(false))
    } else {
      setLoadingUser(false)
    }
  }, [])

  // Connect to Nexconn when a session starts
  useEffect(() => {
    if (!session || !channels || !user) return

    let unsubMsg = null
    let unsubConn = null

    const connectNexconn = async () => {
      try {
        setConnectionStatus('connecting')
        const { appKey, token } = await api.getNexconnToken()
        nx.init(appKey, 2) // SG datacenter areaCode 2

        unsubConn = nx.onConnectionStatus((status) => {
          setConnectionStatus(status === 'connected' ? 'connected' : 'disconnected')
        })

        unsubMsg = nx.onMessage((m) => {
          const role = roleOf(session, user)
          const partnerMode = session.mode === 'partner'

          // If message is in scene channel
          if (m.channel.targetId === channels.scene.targetId) {
            const text = (m.text || '').trim()
            if (!text) return // Prevent empty bubbles

            // The server posts a session_ended control message so the partner's composer can lock.
            if (partnerMode && text.startsWith('{')) {
              try {
                if (JSON.parse(text).kind === 'session_ended') {
                  setSessionEnded(true)
                  return
                }
              } catch {
                // ordinary text that happens to start with a brace
              }
            }

            const isMine = m.senderId === user.nexconnUserId
            // Partner mode: the owner is always 'learner' and the other human 'persona', on every screen.
            const senderType = partnerMode
              ? (isMine === (role === 'learner') ? 'learner' : 'persona')
              : (isMine ? 'learner' : 'persona')
            const senderName = isMine
              ? 'You'
              : partnerMode && role === 'partner'
                ? 'Interviewee'
                : (scenario?.persona_name || 'Persona')

            setSceneMessages((prev) => {
              // Deduplicate on UID. AI mode also dedupes on content, since the HTTP fallback adds the same reply
              // under a different uid; humans can legitimately repeat themselves, so partner mode does not.
              if (prev.some((x) => x.uid === m.uid || (!partnerMode && x.content === text && x.senderType === senderType))) {
                return prev
              }
              return [
                ...prev,
                {
                  uid: m.uid,
                  senderType,
                  senderName,
                  isMine,
                  content: text,
                  createdAt: m.sentAt,
                },
              ]
            })
          }

          // If message is in coach channel (the partner has none)
          if (channels.coach && m.channel.targetId === channels.coach.targetId) {
            let parsed = null
            try {
              parsed = typeof m.text === 'string' ? JSON.parse(m.text) : m.text
              if (parsed && typeof parsed.content === 'string') {
                try {
                  parsed = JSON.parse(parsed.content)
                } catch {}
              }
            } catch {
              parsed = null
            }

            const tipText = (parsed?.text || parsed?.tip || parsed?.advice || m.text || '').trim()
            if (!tipText) return // Prevent empty boxes

            const isBot = m.senderId === 'bot_coach'
            const isMe = m.senderId === user.nexconnUserId
            const isSessionOwner = user.id === session.user_id

            let senderType = parsed?.senderType || (isBot ? 'coach' : (isSessionOwner ? 'mentor' : (m.senderId === session.user_id ? 'learner' : 'mentor')))
            if (isBot) senderType = 'coach'
            else if (isMe) senderType = isSessionOwner ? 'learner' : 'mentor'

            let kind = parsed?.kind
            if (!kind) {
              if (senderType === 'coach') kind = 'coach_tip'
              else if (senderType === 'mentor') kind = 'mentor_note'
              else kind = 'learner_question'
            }

            let senderName = 'Mentor'
            if (senderType === 'coach') {
              senderName = 'Coach (AI)'
            } else if (isMe) {
              senderName = 'You'
            } else if (parsed?.senderName) {
              senderName = parsed.senderName
            } else if (senderType === 'learner') {
              senderName = 'Learner'
            }

            setCoachMessages((prev) => {
              if (prev.some((x) => x.uid === m.uid || (x.text === tipText && x.senderType === senderType))) return prev
              return [
                ...prev,
                {
                  uid: m.uid,
                  kind,
                  senderType,
                  category: parsed?.category || null,
                  sentiment: parsed?.sentiment || null,
                  text: tipText,
                  rewrite: parsed?.rewrite || null,
                  senderName,
                  createdAt: m.sentAt || Date.now(),
                },
              ]
            })
          }
        })

        await nx.connect(token)
        setConnectionStatus('connected')
      } catch (err) {
        console.error('Nexconn connect error:', err)
        setConnectionStatus('disconnected')
      }
    }

    connectNexconn()

    return () => {
      unsubMsg?.()
      unsubConn?.()
    }
  }, [session, channels, user, scenario])

  // Start new session
  const handleStartSession = (newSession, newScenario, newChannels, openingMessage) => {
    setSession(newSession)
    setScenario(newScenario)
    setChannels(newChannels)
    setScorecard(null)
    setShowScorecard(false)
    setIsFinishing(false)
    setSessionEnded(false)
    setInviteCode(null) // don't carry a previous session's code into this one
    setInviteExpiry(null)

    const initialScene = []
    if (openingMessage && openingMessage.content && openingMessage.content.trim()) {
      initialScene.push({
        uid: openingMessage.nexconn_message_uid || String(openingMessage.id),
        senderType: 'persona',
        senderName: newScenario.persona_name,
        content: openingMessage.content.trim(),
        createdAt: new Date(openingMessage.created_at).getTime(),
      })
    }
    setSceneMessages(initialScene)
    setCoachMessages([
      {
        uid: 'sys-start',
        kind: 'system_notice',
        text: newSession.mode === 'partner'
          ? `Practice started: "${newScenario.title}". Share the invite code so your partner can join as ${newScenario.persona_name}. The AI coach will whisper tips here after each of your messages.`
          : `Practice started: "${newScenario.title}". The AI coach will whisper tips here after each of your messages.`,
      },
    ])
  }

  // Join as mentor via invite
  const handleJoinInvite = async (sessionId, coachGroupId, joinRes) => {
    try {
      const { session: sess, scenario: sc, channels: ch } = await api.getSession(sessionId)
      const asPartner = joinRes?.role === 'partner'
      setSession(sess)
      setScenario(sc)
      setSessionEnded(sess.status === 'completed')
      setInviteCode(null)
      setInviteExpiry(null)
      setChannels({
        scene: ch.scene,
        // The partner is never in the private coach channel.
        coach: asPartner ? null : { type: 'group', targetId: coachGroupId },
      })
      const { messages } = await api.getTranscript(sessionId)
      const sceneMsgs = messages
        .filter((m) => m.channel === 'scene' && m.content && m.content.trim())
        .map((m) => {
          // Mentors only watch, so they get no "mine"; the Bubble falls back to the sender type for them.
          const isMine = asPartner || sess.user_id === user.id ? m.sender_user_id === user.id : undefined
          return {
            uid: m.nexconn_message_uid || String(m.id),
            senderType: m.sender_type,
            senderName: isMine
              ? 'You'
              : m.sender_type === 'learner'
                ? (asPartner ? 'Interviewee' : 'Learner')
                : sc.persona_name,
            isMine,
            content: m.content.trim(),
            createdAt: new Date(m.created_at).getTime(),
          }
        })
      setSceneMessages(sceneMsgs)

      if (asPartner) {
        setCoachMessages([])
        return
      }

      const coachMsgs = messages
        .filter((m) => m.channel === 'coach' && m.content && m.content.trim())
        .map((m) => {
          let parsed = null
          try {
            parsed = JSON.parse(m.content)
          } catch {
            parsed = { text: m.content }
          }
          const text = (parsed.text || parsed.tip || parsed.advice || m.content || '').trim()
          return {
            uid: m.nexconn_message_uid || String(m.id),
            kind: parsed.kind || (m.sender_type === 'mentor' ? 'mentor_note' : (m.sender_type === 'coach' ? 'coach_tip' : 'learner_question')),
            senderType: m.sender_type,
            category: parsed.category || null,
            sentiment: parsed.sentiment || null,
            text,
            rewrite: parsed.rewrite || null,
            senderName: m.sender_type === 'mentor'
              ? (m.metadata?.senderName || 'Mentor')
              : (m.sender_type === 'coach' ? 'Coach (AI)' : 'Learner'),
            createdAt: new Date(m.created_at).getTime(),
          }
        })
      setCoachMessages(coachMsgs)
    } catch (err) {
      alert(`Join failed: ${err.message}`)
    }
  }

  // Learner sends a scene turn
  const handleSendSceneMessage = async (text) => {
    const trimmed = text.trim()
    if (!session || !channels || pendingTurn || sessionEnded || !trimmed) return
    const partnerMode = session.mode === 'partner'
    const role = roleOf(session, user)
    // Partner mode has no AI reply to wait for, so no "typing…" state.
    if (!partnerMode) setPendingTurn(true)

    let uid = null
    try {
      const delivery = await nx.sendText(channels.scene, trimmed)
      uid = delivery.uid
    } catch (err) {
      console.warn('Nexconn client send fallback:', err.message)
    }

    // Add locally to scene UI
    const localMsg = {
      uid: uid || `local-${Date.now()}`,
      senderType: partnerMode && role === 'partner' ? 'persona' : 'learner',
      senderName: 'You',
      isMine: true,
      content: trimmed,
      createdAt: Date.now(),
    }
    setSceneMessages((prev) => [...prev, localMsg])

    try {
      // Call backend /turns (runs Persona LLM + Coach LLM in parallel)
      const res = await api.sendTurn(session.id, trimmed, uid)

      // Fallback: If persona reply is present and non-empty
      if (res.persona && res.persona.text && res.persona.text.trim()) {
        const personaText = res.persona.text.trim()
        setSceneMessages((prev) => {
          if (prev.some((x) => x.content === personaText && x.senderType === 'persona')) return prev
          return [
            ...prev,
            {
              uid: `p-${res.persona.messageId}`,
              senderType: 'persona',
              senderName: scenario?.persona_name || 'Persona',
              content: personaText,
              createdAt: Date.now(),
            },
          ]
        })
      }

      // Fallback: If coach tip is present and non-empty
      if (res.coach && (res.coach.text || res.coach.tip)) {
        const coachText = (res.coach.text || res.coach.tip || '').trim()
        if (coachText) {
          setCoachMessages((prev) => {
            if (prev.some((x) => x.text === coachText)) return prev
            return [
              ...prev,
              {
                uid: `c-${res.coach.messageId}`,
                kind: 'coach_tip',
                senderType: 'coach',
                category: res.coach.category || null,
                sentiment: res.coach.sentiment || 'improve',
                text: coachText,
                rewrite: res.coach.rewrite || null,
                senderName: 'Coach (AI)',
                createdAt: Date.now(),
              },
            ]
          })
        }
      }
    } catch (err) {
      console.error('Turn error:', err)
    } finally {
      setPendingTurn(false)
    }
  }

  // Learner asks coach a question or Mentor posts live advice in Coach channel
  const handleAskCoach = async (text) => {
    const trimmed = text.trim()
    if (!session || !channels || !trimmed) return

    const isLearner = session.user_id === user.id
    const senderType = isLearner ? 'learner' : 'mentor'
    const kind = isLearner ? 'learner_question' : 'mentor_note'
    const senderName = isLearner ? 'You' : (user.displayName || 'Mentor')

    const messagePayload = {
      v: 1,
      kind,
      senderType,
      senderName: user.displayName || (isLearner ? 'Learner' : 'Mentor'),
      text: trimmed,
    }

    let uid = null
    try {
      const delivery = await nx.sendText(channels.coach, JSON.stringify(messagePayload))
      uid = delivery.uid
    } catch (err) {
      console.warn('Nexconn coach send warn:', err)
    }

    setCoachMessages((prev) => [
      ...prev,
      {
        uid: uid || `local-coach-${Date.now()}`,
        kind,
        senderType,
        text: trimmed,
        senderName: 'You',
        createdAt: Date.now(),
      },
    ])

    try {
      const res = await api.sendCoachMessage(session.id, trimmed, uid)
      if (res.coachReply) {
        let parsed = null
        try {
          parsed = JSON.parse(res.coachReply.content)
        } catch {
          parsed = { text: res.coachReply.content }
        }
        const answer = (parsed.text || res.coachReply.content || '').trim()
        if (answer) {
          setCoachMessages((prev) => [
            ...prev,
            {
              uid: `ans-${res.coachReply.messageId}`,
              kind: 'coach_answer',
              senderType: 'coach',
              text: answer,
              senderName: 'Coach (AI)',
              createdAt: Date.now(),
            },
          ])
        }
      }
    } catch (err) {
      console.error('Coach message error:', err)
    }
  }

  // End session & show scorecard
  const handleFinish = async () => {
    if (!session || isFinishing) return

    // Issue #4: If user has not sent any message, confirm exit without scorecard
    const learnerMsgs = sceneMessages.filter((m) => m.senderType === 'learner')
    if (learnerMsgs.length === 0) {
      const shouldExit = window.confirm(
        'You have not sent any messages in this rehearsal yet.\n\nExit now without generating a scorecard?'
      )
      if (shouldExit) {
        setSession(null)
      }
      return
    }

    // Issue #3: Instant visual feedback with loading state
    setIsFinishing(true)
    try {
      const res = await api.endSession(session.id)
      if (res.scorecard) {
        setScorecard(res.scorecard)
        setShowScorecard(true)
      } else {
        alert(res.message || 'Session ended.')
        setSession(null)
      }
    } catch (err) {
      alert(`Could not finish session: ${err.message}`)
    } finally {
      setIsFinishing(false)
    }
  }

  // Generate invite code for mentor
  const handleInvite = async () => {
    if (!session) return
    try {
      const res = await api.createInvite(session.id)
      setInviteCode(res.code)
      // Save raw ISO timestamp to prevent Invalid Date crashes
      setInviteExpiry(res.expiresAt)
    } catch (err) {
      console.error('Invite create error:', err)
    }
  }

  const handleLogout = () => {
    api.setToken('')
    setUser(null)
    setSession(null)
  }

  if (viewSpike) {
    return (
      <div>
        <div style={{ background: '#1c1e24', padding: '8px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #333' }}>
          <span style={{ color: '#aaa', fontSize: 13 }}>Nexconn Debug Harness</span>
          <button
            onClick={() => setViewSpike(false)}
            style={{ background: '#3b82f6', color: '#fff', border: 'none', borderRadius: 4, padding: '4px 10px', fontSize: 12, cursor: 'pointer' }}
          >
            Switch to Rehearsal App UI
          </button>
        </div>
        <Spike />
      </div>
    )
  }

  if (loadingUser) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0c10', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#8b949e' }}>
        Loading Rehearsal...
      </div>
    )
  }

  if (!user) {
    return <AuthModal onLoginSuccess={(u) => setUser(u)} />
  }

  if (!session) {
    return (
      <ScenarioPicker
        user={user}
        onStartSession={handleStartSession}
        onJoinInvite={handleJoinInvite}
        onLogout={handleLogout}
      />
    )
  }

  const role = roleOf(session, user)

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SessionScreen
        session={{
          ...session,
          isMentor: role === 'mentor',
          myRole: role,
          sessionEnded,
          sceneMessages,
          coachMessages,
          pendingTurn,
          isFinishing,
          startedAt: new Date(session.started_at).getTime(),
          inviteCode,
          inviteExpiry,
        }}
        scenario={scenario}
        connectionStatus={connectionStatus}
        onSendSceneMessage={handleSendSceneMessage}
        onAskCoach={handleAskCoach}
        onFinish={handleFinish}
        onInvite={handleInvite}
        onLeave={() => setSession(null)}
      />

      {showScorecard && (
        <ScorecardModal
          scorecard={scorecard}
          scenario={scenario}
          onDone={() => {
            setShowScorecard(false)
            setSession(null)
          }}
        />
      )}
    </div>
  )
}
