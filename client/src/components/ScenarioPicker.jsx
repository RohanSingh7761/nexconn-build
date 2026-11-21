import { useState, useEffect } from 'react'
import { Sparkles, Zap, Clock, User, LogOut, Shield, MessageSquarePlus, ListFilter } from 'lucide-react'
import * as api from '../lib/api'

export default function ScenarioPicker({ user, onStartSession, onJoinInvite, onLogout }) {
  const [tab, setTab] = useState('custom') // 'custom' | 'presets'
  const [scenarios, setScenarios] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [difficulty, setDifficulty] = useState('neutral')
  const [mode, setMode] = useState('ai') // 'ai' = AI plays the other person, 'partner' = a human does
  const [customSituation, setCustomSituation] = useState('')
  const [userContext, setUserContext] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [fetching, setFetching] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    api.listScenarios()
      .then((res) => {
        const list = res.scenarios || []
        setScenarios(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetching(false))
  }, [])

  const selectedScenario = scenarios.find((s) => s.id === selectedId)

  // Start with a preset scenario
  const handleStartPreset = async () => {
    if (!selectedId) return
    setLoading(true)
    setLoadingText('Initializing session...')
    setError('')
    try {
      const res = await api.createSession(selectedId, difficulty, userContext, mode)
      onStartSession(res.session, selectedScenario, res.channels, res.opening)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  // Generate on the fly from user's custom situation
  const handleStartCustom = async () => {
    if (!customSituation.trim()) {
      setError('Please type in your situation first.')
      return
    }
    setLoading(true)
    setLoadingText('Designing custom AI persona and role-play...')
    setError('')
    try {
      // 1. Create custom scenario via LLM
      const { scenario: customSc } = await api.createCustomScenario(customSituation.trim())
      setLoadingText('Setting up live rehearsal channels...')

      // 2. Start session with the custom scenario
      const res = await api.createSession(customSc.id, difficulty, customSituation.trim(), mode)
      onStartSession(res.session, customSc, res.channels, res.opening)
    } catch (err) {
      setError(err.message || 'Could not generate custom scenario.')
      setLoading(false)
    }
  }

  const handleJoinInvite = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setLoading(true)
    setLoadingText('Joining session...')
    setError('')
    try {
      const res = await api.joinInvite(inviteCode.trim())
      onJoinInvite(res.sessionId, res.coachGroupId, res)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const QUICK_EXAMPLES = [
    'Asking my landlord to waive a late penalty because my bank had an unexpected outage.',
    'Negotiating a contract renewal with a vendor who wants to raise fees by 25%.',
    'Telling my team lead that I am feeling burnt out and need to drop a secondary project.',
    'Pitching my new AI SaaS product to a skeptical enterprise engineering director.',
  ]

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c10', color: '#e6edf3',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 16px'
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Top Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #21262d', paddingBottom: 16, marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff', width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
            }}>R</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Rehearsal</h1>
              <p style={{ margin: 0, fontSize: 12, color: '#8b949e' }}>Powered by Nexconn Chat & Server SDK</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#c9d1d9' }}>
              <User size={14} color="#58a6ff" />
              <span>{user?.displayName || user?.username}</span>
            </div>
            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: '#21262d',
                border: 'none', color: '#8b949e', padding: '6px 12px', borderRadius: 6,
                cursor: 'pointer', fontSize: 12
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            background: 'rgba(248, 81, 73, 0.15)', border: '1px solid #f85149',
            borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: '#ff7b72', fontSize: 13
          }}>
            {error}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
          <button
            type="button"
            onClick={() => { setTab('custom'); setError('') }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
              background: tab === 'custom' ? 'rgba(56, 139, 253, 0.15)' : '#161b22',
              color: tab === 'custom' ? '#58a6ff' : '#8b949e',
              outline: tab === 'custom' ? '2px solid #58a6ff' : '1px solid #30363d',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <MessageSquarePlus size={18} />
            <span>Type Your Own Situation (Custom)</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('presets'); setError('') }}
            style={{
              flex: 1, padding: '12px 16px', borderRadius: 10, border: 'none',
              background: tab === 'presets' ? 'rgba(56, 139, 253, 0.15)' : '#161b22',
              color: tab === 'presets' ? '#58a6ff' : '#8b949e',
              outline: tab === 'presets' ? '2px solid #58a6ff' : '1px solid #30363d',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <ListFilter size={18} />
            <span>Choose from Preset Scenarios</span>
          </button>
        </div>

        {/* Tab 1: Custom Situation */}
        {tab === 'custom' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: '1 1 420px', minWidth: 0, background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={18} color="#58a6ff" />
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#f0f6fc' }}>
                  Describe Your Conversation Situation
                </h2>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: '#8b949e', lineHeight: 1.5 }}>
                Type in any conversation you want to rehearse. An AI persona will be created to role-play the other person, while the AI coach whispers tips.
              </p>

              <textarea
                rows={5}
                placeholder="e.g. I need to negotiate with my landlord who wants to increase the rent by 15%, but the heating was broken for two weeks this winter. I want to settle on at most a 5% increase..."
                value={customSituation}
                onChange={(e) => setCustomSituation(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', background: '#0d1117',
                  border: '1px solid #30363d', borderRadius: 8, color: '#f0f6fc',
                  fontSize: 14, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
                  marginBottom: 16
                }}
              />

              {/* Quick suggestions */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: '#8b949e', textTransform: 'uppercase', letterSpacing: 0.5, display: 'block', marginBottom: 8 }}>
                  Or pick a situation idea:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {QUICK_EXAMPLES.map((ex, i) => (
                    <div
                      key={i}
                      onClick={() => setCustomSituation(ex)}
                      style={{
                        padding: '8px 12px', background: '#0d1117', border: '1px solid #21262d',
                        borderRadius: 6, fontSize: 12, color: '#c9d1d9', cursor: 'pointer',
                        transition: 'border 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = '#58a6ff'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = '#21262d'}
                    >
                      {ex}
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={loading || !customSituation.trim()}
                onClick={handleStartCustom}
                style={{
                  width: '100%', padding: '14px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #238636, #2ea043)', color: '#fff',
                  fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <Zap size={18} />
                {loading ? loadingText : 'Generate Persona & Start Conversation'}
              </button>
            </div>

            {/* Right Side Settings */}
            <div style={{ flex: '0 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: '#f0f6fc' }}>
                  Practice Settings
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>
                    Practice With
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { id: 'ai', label: 'AI persona' },
                      { id: 'partner', label: 'A partner' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        style={{
                          padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          border: mode === m.id ? '1.5px solid #a371f7' : '1px solid #30363d',
                          background: mode === m.id ? 'rgba(255,255,255,0.06)' : '#0d1117',
                          color: mode === m.id ? '#bc8cff' : '#8b949e', cursor: 'pointer'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'partner' ? (
                  <p style={{ margin: 0, fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
                    A friend plays the counterpart using an invite code. The AI coach whispers tips to you only.
                  </p>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>
                      Difficulty Level
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                      {[
                        { id: 'friendly', label: 'Friendly', color: '#3fb950' },
                        { id: 'neutral', label: 'Neutral', color: '#58a6ff' },
                        { id: 'tough', label: 'Tough', color: '#f85149' },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDifficulty(d.id)}
                          style={{
                            padding: '10px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: difficulty === d.id ? `1.5px solid ${d.color}` : '1px solid #30363d',
                            background: difficulty === d.id ? 'rgba(255,255,255,0.06)' : '#0d1117',
                            color: difficulty === d.id ? d.color : '#8b949e', cursor: 'pointer'
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
                      {difficulty === 'friendly' && 'Persona is receptive, patient, and concedes easily.'}
                      {difficulty === 'neutral' && 'Persona is realistic, professional, and requires clear reasoning.'}
                      {difficulty === 'tough' && 'Persona pushes back aggressively, brings objections, and tests composure.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Mentor Invite Box */}
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield size={16} color="#bc8cff" />
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f0f6fc' }}>
                    Have an Invite Code?
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
                  Join an active rehearsal session as a human mentor to whisper real-time tips.
                </p>
                <form onSubmit={handleJoinInvite} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. X9K2LM"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    style={{
                      flex: 1, padding: '8px 10px', background: '#0d1117', border: '1px solid #30363d',
                      borderRadius: 6, color: '#f0f6fc', fontSize: 13, textTransform: 'uppercase'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inviteCode.trim()}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: 'none',
                      background: '#8957e5', color: '#fff', fontWeight: 600, fontSize: 13,
                      cursor: loading ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Join
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Preset Scenarios */}
        {tab === 'presets' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: '#f0f6fc' }}>
                Preset Scenarios
              </h2>

              {fetching ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#8b949e' }}>Loading scenarios...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {scenarios.map((sc) => {
                    const isSelected = sc.id === selectedId
                    return (
                      <div
                        key={sc.id}
                        onClick={() => setSelectedId(sc.id)}
                        style={{
                          padding: 16, borderRadius: 10, cursor: 'pointer',
                          border: isSelected ? '2px solid #58a6ff' : '1px solid #30363d',
                          background: isSelected ? 'rgba(56, 139, 253, 0.08)' : '#161b22',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{
                            fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5,
                            fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                            background: sc.category === 'career' ? 'rgba(56, 139, 253, 0.2)' : 'rgba(163, 113, 247, 0.2)',
                            color: sc.category === 'career' ? '#58a6ff' : '#bc8cff'
                          }}>
                            {sc.category}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#8b949e', fontSize: 12 }}>
                            <Clock size={12} /> {sc.est_minutes} min
                          </div>
                        </div>

                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: '#f0f6fc' }}>
                          {sc.title}
                        </h3>
                        <p style={{ margin: '0 0 10px', fontSize: 13, color: '#8b949e', lineHeight: 1.4 }}>
                          {sc.description}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#c9d1d9' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 11, background: '#30363d',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700
                          }}>
                            {sc.persona_name[0]}
                          </div>
                          <span>Role-play with <strong>{sc.persona_name}</strong> ({sc.persona_role})</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ flex: '0 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#f0f6fc' }}>
                  Practice Settings
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>
                    Practice With
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                    {[
                      { id: 'ai', label: 'AI persona' },
                      { id: 'partner', label: 'A partner' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id)}
                        style={{
                          padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          border: mode === m.id ? '1.5px solid #a371f7' : '1px solid #30363d',
                          background: mode === m.id ? 'rgba(255,255,255,0.06)' : '#0d1117',
                          color: mode === m.id ? '#bc8cff' : '#8b949e', cursor: 'pointer'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {mode === 'partner' && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, lineHeight: 1.4, color: '#8b949e' }}>
                      A friend plays the other person. The AI coach only whispers tips to you.
                    </p>
                  )}
                </div>

                {mode === 'ai' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 8 }}>
                    Difficulty Level
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[
                      { id: 'friendly', label: 'Friendly', color: '#3fb950' },
                      { id: 'neutral', label: 'Neutral', color: '#58a6ff' },
                      { id: 'tough', label: 'Tough', color: '#f85149' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficulty(d.id)}
                        style={{
                          padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          border: difficulty === d.id ? `1.5px solid ${d.color}` : '1px solid #30363d',
                          background: difficulty === d.id ? 'rgba(255,255,255,0.06)' : '#0d1117',
                          color: difficulty === d.id ? d.color : '#8b949e', cursor: 'pointer'
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#8b949e', marginBottom: 6 }}>
                    Your Custom Context (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. I have been here 14 months and led the Q3 migration ahead of deadline..."
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: '#0d1117',
                      border: '1px solid #30363d', borderRadius: 6, color: '#f0f6fc',
                      fontSize: 12, resize: 'none', boxSizing: 'border-box'
                    }}
                  />
                </div>

                <button
                  type="button"
                  disabled={loading || !selectedId}
                  onClick={handleStartPreset}
                  style={{
                    width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                    background: 'linear-gradient(135deg, #238636, #2ea043)', color: '#fff',
                    fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <Zap size={16} />
                  {loading ? loadingText : mode === 'partner' ? 'Start & Invite Partner' : 'Start Rehearsal'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
