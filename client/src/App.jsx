import { useState, useEffect } from 'react'
import * as api from './lib/api'
import * as nx from './lib/nexconn'
import SessionScreen from './components/SessionScreen'
import ScenarioPicker from './components/ScenarioPicker'
import ScorecardModal from './components/ScorecardModal'
import AuthModal from './components/AuthModal'
import Spike from './Spike'

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
          // If message is in scene channel
          if (m.channel.targetId === channels.scene.targetId) {
            const text = (m.text || '').trim()
            if (!text) return // Prevent empty bubbles

            setSceneMessages((prev) => {
              // Deduplicate on UID or exact content & sender
              const senderType = m.senderId === user.nexconnUserId ? 'learner' : 'persona'
              if (prev.some((x) => x.uid === m.uid || (x.content === text && x.senderType === senderType))) {
                return prev
              }
              return [
                ...prev,
                {
                  uid: m.uid,
                  senderType,
                  senderName: senderType === 'learner' ? 'You' : (scenario?.persona_name || 'Persona'),
                  content: text,
                  createdAt: m.sentAt,
                },
              ]
            })
          }

          // If message is in coach channel
          if (m.channel.targetId === channels.coach.targetId) {
            let parsed = null
            try {
              parsed = typeof m.text === 'string' ? JSON.parse(m.text) : m.text
              if (parsed && typeof parsed.content === 'string') {
                try {
                  parsed = JSON.parse(parsed.content)
                } catch {}
              }
            } catch {
              parsed = { text: m.text, kind: 'coach_tip' }
            }

            const tipText = (parsed.text || parsed.tip || parsed.advice || m.text || '').trim()
            if (!tipText) return // Prevent empty boxes

            setCoachMessages((prev) => {
              if (prev.some((x) => x.uid === m.uid || (x.text && x.text === tipText))) return prev
              return [
                ...prev,
                {
                  uid: m.uid,
                  kind: parsed.kind || 'coach_tip',
                  category: parsed.category || 'clarity',
                  sentiment: parsed.sentiment || 'neutral',
                  text: tipText,
                  rewrite: parsed.rewrite || null,
                  senderName: m.senderId === 'bot_coach' ? 'Coach (AI)' : 'Mentor',
                  createdAt: m.sentAt,
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
        text: `Practice started: "${newScenario.title}". The AI coach will whisper tips here after each of your messages.`,
      },
    ])
  }

  // Join as mentor via invite
  const handleJoinInvite = async (sessionId, coachGroupId) => {
    try {
      const { session: sess, scenario: sc } = await api.getSession(sessionId)
      setSession(sess)
      setScenario(sc)
      setChannels({
        scene: { type: 'direct', targetId: sess.persona_nexconn_id },
        coach: { type: 'group', targetId: coachGroupId },
      })
      const { messages } = await api.getTranscript(sessionId)
      const sceneMsgs = messages
        .filter((m) => m.channel === 'scene' && m.content && m.content.trim())
        .map((m) => ({
          uid: m.nexconn_message_uid || String(m.id),
          senderType: m.sender_type,
          senderName: m.sender_type === 'learner' ? 'Learner' : sc.persona_name,
          content: m.content.trim(),
          createdAt: new Date(m.created_at).getTime(),
        }))
      setSceneMessages(sceneMsgs)
    } catch (err) {
      alert(`Join failed: ${err.message}`)
    }
  }

  // Learner sends a scene turn
  const handleSendSceneMessage = async (text) => {
    const trimmed = text.trim()
    if (!session || !channels || pendingTurn || !trimmed) return
    setPendingTurn(true)

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
      senderType: 'learner',
      senderName: 'You',
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
                category: res.coach.category || 'clarity',
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

  // Learner asks coach a question in Coach channel
  const handleAskCoach = async (text) => {
    const trimmed = text.trim()
    if (!session || !channels || !trimmed) return

    let uid = null
    try {
      const delivery = await nx.sendText(channels.coach, trimmed)
      uid = delivery.uid
    } catch (err) {
      console.warn('Nexconn coach send warn:', err)
    }

    setCoachMessages((prev) => [
      ...prev,
      {
        uid: uid || `local-coach-${Date.now()}`,
        kind: 'coach_question',
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

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <SessionScreen
        session={{
          ...session,
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
