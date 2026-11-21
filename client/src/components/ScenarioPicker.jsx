import { useState, useEffect } from 'react'
import { Sparkles, Zap, Clock, User, LogOut, Shield, MessageSquarePlus, ListFilter, Users, RefreshCw } from 'lucide-react'
import * as api from '../lib/api'

export default function ScenarioPicker({ user, onStartSession, onJoinInvite, onLogout }) {
  const [tab, setTab] = useState('custom') // 'custom' | 'presets' | 'explore'
  const [scenarios, setScenarios] = useState([])
  const [openSessions, setOpenSessions] = useState([])
  const [loadingExplore, setLoadingExplore] = useState(false)
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

  const fetchOpenSessions = async () => {
    try {
      setLoadingExplore(true)
      const res = await api.listOpenPartnerSessions()
      setOpenSessions(res.sessions || [])
    } catch (err) {
      console.warn('Failed to load partner sessions:', err)
    } finally {
      setLoadingExplore(false)
    }
  }

  useEffect(() => {
    api.listScenarios()
      .then((res) => {
        const list = res.scenarios || []
        setScenarios(list)
        if (list.length > 0) setSelectedId(list[0].id)
      })
      .catch((err) => setError(err.message))
      .finally(() => setFetching(false))

    fetchOpenSessions()
    const interval = setInterval(fetchOpenSessions, 10000)
    return () => clearInterval(interval)
  }, [])

  const selectedScenario = scenarios.find((s) => s.id === selectedId)

  // Start with a preset scenario
  const handleStartPreset = async () => {
    if (!selectedId) return
    setLoading(true)
    setLoadingText('Initializing session…')
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
    setLoadingText('Designing custom AI persona and role-play…')
    setError('')
    try {
      // 1. Create custom scenario via LLM
      const { scenario: customSc } = await api.createCustomScenario(customSituation.trim())
      setLoadingText('Setting up live session channels…')

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
    setLoadingText('Joining session…')
    setError('')
    try {
      const res = await api.joinInvite(inviteCode.trim())
      onJoinInvite(res.sessionId, res.coachGroupId, res)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleJoinPartnerSession = async (sess) => {
    if (sess.owner_id === user.id) {
      setError('You created this session. Share your code or wait for another user to join!')
      return
    }
    setLoading(true)
    setLoadingText(`Joining as ${sess.persona_name}…`)
    setError('')
    try {
      const res = await api.joinPartnerSession(sess.id)
      onJoinInvite(res.sessionId, null, res)
    } catch (err) {
      setError(err.message || 'Could not join session.')
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
      background: 'var(--color-paper-2)', color: 'var(--color-ink)',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 16px 64px'
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Top Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid var(--color-paper-3)', paddingBottom: 16, marginBottom: 24
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              background: 'var(--color-accent)',
              color: 'var(--color-accent-ink)', width: 36, height: 36, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800
            }}>D</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>DryRun</h1>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--color-ink-2)' }}>
              <User size={16} color="var(--color-accent)" aria-label={user?.displayName || user?.username} role="img" />
            </div>
            <button
              onClick={onLogout}
              style={{
                display: 'flex', alignItems: 'center', gap: 6, background: 'var(--color-paper-3)',
                border: 'none', color: 'var(--color-muted)', padding: '6px 12px', borderRadius: 6,
                cursor: 'pointer', fontSize: 12
              }}
            >
              <LogOut size={13} /> Sign Out
            </button>
          </div>
        </header>

        {error && (
          <div style={{
            background: 'color-mix(in oklch, var(--color-bad) 15%, transparent)', border: '1px solid var(--color-bad)',
            borderRadius: 8, padding: '12px 16px', marginBottom: 20, color: 'var(--color-bad)', fontSize: 13
          }}>
            {error}
          </div>
        )}

        {/* Mode Selector Tabs */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => { setTab('custom'); setError('') }}
            style={{
              flex: '1 1 200px', padding: '12px 16px', borderRadius: 10, border: 'none',
              background: tab === 'custom' ? 'color-mix(in oklch, var(--color-accent) 15%, transparent)' : 'var(--color-paper)',
              color: tab === 'custom' ? 'var(--color-accent)' : 'var(--color-muted)',
              outline: tab === 'custom' ? '2px solid var(--color-accent)' : '1px solid var(--color-rule)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <MessageSquarePlus size={18} />
            <span>Type Custom Situation</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('presets'); setError('') }}
            style={{
              flex: '1 1 200px', padding: '12px 16px', borderRadius: 10, border: 'none',
              background: tab === 'presets' ? 'color-mix(in oklch, var(--color-accent) 15%, transparent)' : 'var(--color-paper)',
              color: tab === 'presets' ? 'var(--color-accent)' : 'var(--color-muted)',
              outline: tab === 'presets' ? '2px solid var(--color-accent)' : '1px solid var(--color-rule)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <ListFilter size={18} />
            <span>Preset Scenarios</span>
          </button>
          <button
            type="button"
            onClick={() => { setTab('explore'); setError(''); fetchOpenSessions() }}
            style={{
              flex: '1 1 200px', padding: '12px 16px', borderRadius: 10, border: 'none',
              background: tab === 'explore' ? 'color-mix(in oklch, var(--color-accent) 15%, transparent)' : 'var(--color-paper)',
              color: tab === 'explore' ? 'var(--color-accent)' : 'var(--color-muted)',
              outline: tab === 'explore' ? '2px solid var(--color-accent)' : '1px solid var(--color-rule)',
              fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
            }}
          >
            <Users size={18} />
            <span>Explore Partners</span>
            {openSessions.length > 0 && (
              <span style={{
                background: 'var(--color-accent)', color: 'var(--color-accent-ink)', fontSize: 11, fontWeight: 700,
                padding: '2px 7px', borderRadius: 10
              }}>
                {openSessions.length} LIVE
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Custom Situation */}
        {tab === 'custom' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: '1 1 420px', minWidth: 0, background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 12, padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Sparkles size={18} color="var(--color-accent)" />
                <h2 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: 'var(--color-ink)' }}>
                  Describe Your Conversation Situation
                </h2>
              </div>
              <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.5 }}>
                Type in any conversation you want to rehearse. An AI persona will be created to role-play the other person, while the AI coach whispers tips.
              </p>

              <textarea
                rows={5}
                placeholder="e.g. I need to negotiate with my landlord who wants to increase the rent by 15%, but the heating was broken for two weeks this winter. I want to settle on at most a 5% increase…"
                value={customSituation}
                onChange={(e) => setCustomSituation(e.target.value)}
                style={{
                  width: '100%', padding: '12px 14px', background: 'var(--color-paper)',
                  border: '1px solid var(--color-rule)', borderRadius: 8, color: 'var(--color-ink)',
                  fontSize: 14, resize: 'vertical', boxSizing: 'border-box', lineHeight: 1.5,
                  marginBottom: 16
                }}
              />

              {/* Quick suggestions */}
              <div style={{ marginBottom: 20 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', display: 'block', marginBottom: 8 }}>
                  Or pick a situation idea:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {QUICK_EXAMPLES.map((ex, i) => (
                    <div
                      key={i}
                      onClick={() => setCustomSituation(ex)}
                      style={{
                        padding: '8px 12px', background: 'var(--color-paper)', border: '1px solid var(--color-paper-3)',
                        borderRadius: 6, fontSize: 12, color: 'var(--color-ink-2)', cursor: 'pointer',
                        transition: 'border 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'var(--color-accent)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--color-paper-3)'}
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
                  background: 'var(--color-accent)', color: 'var(--color-accent-ink)',
                  fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <Zap size={18} />
                {loading ? loadingText : 'Generate Persona & Start Conversation'}
              </button>
            </div>

            {/* Right Side Settings */}
            <div className="picker-aside" style={{ flex: '0 1 320px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                  Practice Settings
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
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
                          border: mode === m.id ? '1.5px solid var(--color-cool)' : '1px solid var(--color-rule)',
                          background: mode === m.id ? 'var(--color-paper-3)' : 'var(--color-paper)',
                          color: mode === m.id ? 'var(--color-cool)' : 'var(--color-muted)', cursor: 'pointer'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {mode === 'partner' ? (
                  <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                    A friend plays the counterpart using an invite code. The AI coach whispers tips to you only.
                  </p>
                ) : (
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
                      Difficulty Level
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 8 }}>
                      {[
                        { id: 'friendly', label: 'Friendly', color: 'var(--color-ok)' },
                        { id: 'neutral', label: 'Neutral', color: 'var(--color-accent)' },
                        { id: 'tough', label: 'Tough', color: 'var(--color-bad)' },
                      ].map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDifficulty(d.id)}
                          style={{
                            padding: '10px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                            border: difficulty === d.id ? `1.5px solid ${d.color}` : '1px solid var(--color-rule)',
                            background: difficulty === d.id ? 'var(--color-paper-3)' : 'var(--color-paper)',
                            color: difficulty === d.id ? d.color : 'var(--color-muted)', cursor: 'pointer'
                          }}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                      {difficulty === 'friendly' && 'Persona is receptive, patient, and concedes easily.'}
                      {difficulty === 'neutral' && 'Persona is realistic, professional, and requires clear reasoning.'}
                      {difficulty === 'tough' && 'Persona pushes back aggressively, brings objections, and tests composure.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Mentor Invite Box */}
              <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 10, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Shield size={16} color="var(--color-cool)" />
                  <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: 'var(--color-ink)' }}>
                    Have an Invite Code?
                  </h4>
                </div>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                  Join an active session as a human mentor to whisper real-time tips.
                </p>
                <form onSubmit={handleJoinInvite} style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="e.g. X9K2LM"
                    maxLength={6}
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    style={{
                      flex: 1, padding: '8px 10px', background: 'var(--color-paper)', border: '1px solid var(--color-rule)',
                      borderRadius: 6, color: 'var(--color-ink)', fontSize: 13, textTransform: 'uppercase'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={loading || !inviteCode.trim()}
                    style={{
                      padding: '8px 14px', borderRadius: 6, border: 'none',
                      background: 'var(--color-accent)', color: 'var(--color-accent-ink)', fontWeight: 600, fontSize: 13,
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
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'flex-start', gap: 24 }}>
            <div style={{ flex: '1 1 420px', minWidth: 0 }}>
              <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: 'var(--color-ink)' }}>
                Preset Scenarios
              </h2>

              {fetching ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--color-muted)' }}>Loading scenarios…</div>
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
                          border: isSelected ? '2px solid var(--color-accent)' : '1px solid var(--color-rule)',
                          background: isSelected ? 'color-mix(in oklch, var(--color-accent) 8%, transparent)' : 'var(--color-paper)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                          <span style={{
                            fontSize: 11, 
                            fontWeight: 700, padding: '2px 8px', borderRadius: 12,
                            background: sc.category === 'career' ? 'color-mix(in oklch, var(--color-accent) 20%, transparent)' : 'color-mix(in oklch, var(--color-cool) 20%, transparent)',
                            color: sc.category === 'career' ? 'var(--color-accent)' : 'var(--color-cool)'
                          }}>
                            {sc.category}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--color-muted)', fontSize: 12 }}>
                            <Clock size={12} /> {sc.est_minutes} min
                          </div>
                        </div>

                        <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
                          {sc.title}
                        </h3>
                        <p style={{ margin: '0 0 10px', fontSize: 13, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                          {sc.description}
                        </p>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--color-ink-2)' }}>
                          <div style={{
                            width: 22, height: 22, borderRadius: 11, background: 'var(--color-rule)',
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

            <div className="picker-aside" style={{ flex: '0 1 340px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 10, padding: 20 }}>
                <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: 'var(--color-ink)' }}>
                  Practice Settings
                </h3>

                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
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
                          border: mode === m.id ? '1.5px solid var(--color-cool)' : '1px solid var(--color-rule)',
                          background: mode === m.id ? 'var(--color-paper-3)' : 'var(--color-paper)',
                          color: mode === m.id ? 'var(--color-cool)' : 'var(--color-muted)', cursor: 'pointer'
                        }}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  {mode === 'partner' && (
                    <p style={{ margin: '8px 0 0', fontSize: 11, lineHeight: 1.4, color: 'var(--color-muted)' }}>
                      A friend plays the other person. The AI coach only whispers tips to you.
                    </p>
                  )}
                </div>

                {mode === 'ai' && (
                <div style={{ marginBottom: 16 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 8 }}>
                    Difficulty Level
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                    {[
                      { id: 'friendly', label: 'Friendly', color: 'var(--color-ok)' },
                      { id: 'neutral', label: 'Neutral', color: 'var(--color-accent)' },
                      { id: 'tough', label: 'Tough', color: 'var(--color-bad)' },
                    ].map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDifficulty(d.id)}
                        style={{
                          padding: '8px 0', borderRadius: 6, fontSize: 12, fontWeight: 600,
                          border: difficulty === d.id ? `1.5px solid ${d.color}` : '1px solid var(--color-rule)',
                          background: difficulty === d.id ? 'var(--color-paper-3)' : 'var(--color-paper)',
                          color: difficulty === d.id ? d.color : 'var(--color-muted)', cursor: 'pointer'
                        }}
                      >
                        {d.label}
                      </button>
                    ))}
                  </div>
                </div>
                )}

                <div style={{ marginBottom: 20 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>
                    Your Custom Context (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. I have been here 14 months and led the Q3 migration ahead of deadline…"
                    value={userContext}
                    onChange={(e) => setUserContext(e.target.value)}
                    style={{
                      width: '100%', padding: '8px 10px', background: 'var(--color-paper)',
                      border: '1px solid var(--color-rule)', borderRadius: 6, color: 'var(--color-ink)',
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
                    background: 'var(--color-accent)', color: 'var(--color-accent-ink)',
                    fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                  }}
                >
                  <Zap size={16} />
                  {loading ? loadingText : mode === 'partner' ? 'Start & Invite Partner' : 'Start session'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Explore Live Partner Sessions */}
        {tab === 'explore' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{
              background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 12,
              padding: '20px 24px', display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', flexWrap: 'wrap', gap: 16
            }}>
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 6px', color: 'var(--color-ink)', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Users size={20} color="var(--color-accent)" />
                  Live sessions waiting for a partner
                </h2>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--color-muted)', maxWidth: 640, lineHeight: 1.5 }}>
                  Learners below started in <strong>A partner</strong> mode and need a human counterpart to role-play with.
                  Click <strong>Join as Partner</strong> to jump directly into their session, no invite code required!
                </p>
              </div>
              <button
                type="button"
                onClick={fetchOpenSessions}
                disabled={loadingExplore}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                  background: 'var(--color-paper-3)', border: '1px solid var(--color-rule)', borderRadius: 8,
                  color: 'var(--color-ink-2)', fontSize: 13, fontWeight: 600, cursor: 'pointer'
                }}
              >
                <RefreshCw size={14} style={{ animation: loadingExplore ? 'spin 1s linear infinite' : 'none' }} />
                <span>Refresh</span>
              </button>
            </div>

            {openSessions.length === 0 ? (
              <div style={{
                background: 'var(--color-paper)', border: '1px dashed var(--color-rule)', borderRadius: 12,
                padding: '60px 24px', textAlign: 'center'
              }}>
                <div style={{
                  width: 54, height: 54, borderRadius: 27, background: 'color-mix(in oklch, var(--color-accent) 10%, transparent)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                  color: 'var(--color-accent)'
                }}>
                  <Users size={28} />
                </div>
                <h3 style={{ margin: '0 0 8px', fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
                  No open partner sessions right now
                </h3>
                <p style={{ margin: '0 auto 20px', fontSize: 13, color: 'var(--color-muted)', maxWidth: 440, lineHeight: 1.5 }}>
                  Nobody is currently waiting for a partner. Start your own session in <strong>A partner</strong> mode, or practice solo with our AI personas!
                </p>
                <button
                  type="button"
                  onClick={() => { setTab('custom'); setMode('partner') }}
                  style={{
                    padding: '10px 18px', background: 'var(--color-accent)', border: 'none', borderRadius: 8,
                    color: 'var(--color-accent-ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 8
                  }}
                >
                  <Sparkles size={15} />
                  Start a partner session
                </button>
              </div>
            ) : (
              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
                gap: 16
              }}>
                {openSessions.map((s) => {
                  const isHost = s.owner_id === user.id
                  return (
                    <div
                      key={s.id}
                      style={{
                        background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 12,
                        padding: 20, display: 'flex', flexDirection: 'column', gap: 14,
                        position: 'relative'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{
                            width: 28, height: 28, borderRadius: 14, background: 'var(--color-rule)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: 12, fontWeight: 700, color: 'var(--color-ink)'
                          }}>
                            {(s.owner_name || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink)', display: 'block' }}>
                              {s.owner_name} {isHost && <span style={{ color: 'var(--color-accent)', fontSize: 11 }}>(You)</span>}
                            </span>
                            <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>Host & Learner</span>
                          </div>
                        </div>

                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 6,
                          fontSize: 11, fontWeight: 700, 
                          padding: '3px 8px', borderRadius: 12,
                          background: 'color-mix(in oklch, var(--color-ok) 15%, transparent)', color: 'var(--color-ok)',
                          border: '1px solid color-mix(in oklch, var(--color-ok) 30%, transparent)'
                        }}>
                          <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--color-ok)' }} />
                          LIVE WAITING
                        </span>
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <span style={{
                            fontSize: 10, 
                            fontWeight: 700, padding: '1px 6px', borderRadius: 4,
                            background: 'color-mix(in oklch, var(--color-accent) 15%, transparent)', color: 'var(--color-accent)'
                          }}>
                            {s.category || 'Practice'}
                          </span>
                        </div>
                        <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--color-ink)' }}>
                          {s.scenario_title}
                        </h3>
                      </div>

                      <div style={{
                        background: 'var(--color-paper)', border: '1px solid var(--color-paper-3)', borderRadius: 8,
                        padding: '10px 12px'
                      }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--color-muted)', display: 'block', marginBottom: 4 }}>
                          Your Assigned Counterpart Role
                        </span>
                        <div style={{ fontSize: 13, color: 'var(--color-ink)', fontWeight: 600 }}>
                          {s.persona_name} <span style={{ color: 'var(--color-muted)', fontWeight: 400 }}>({s.persona_role})</span>
                        </div>
                      </div>

                      {s.description && (
                        <p style={{
                          margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4,
                          overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
                        }}>
                          {s.description}
                        </p>
                      )}

                      <div style={{ marginTop: 'auto', paddingTop: 6 }}>
                        {isHost ? (
                          <div style={{
                            textAlign: 'center', padding: '10px', background: 'var(--color-paper-3)',
                            borderRadius: 6, fontSize: 12, color: 'var(--color-muted)', fontWeight: 500
                          }}>
                            Your active session • Waiting for a partner to join
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => handleJoinPartnerSession(s)}
                            style={{
                              width: '100%', padding: '10px 16px', borderRadius: 8, border: 'none',
                              background: 'var(--color-accent)', color: 'var(--color-accent-ink)',
                              fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              boxShadow: '0 2px 8px color-mix(in oklch, var(--color-ok) 25%, transparent)'
                            }}
                          >
                            <Users size={15} />
                            <span>Join as {s.persona_name}</span>
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
