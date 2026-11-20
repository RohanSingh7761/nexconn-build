import { useState, useEffect } from 'react'
import { Sparkles, Target, Zap, Clock, User, LogOut, ArrowRight, Shield } from 'lucide-react'
import * as api from '../lib/api'

export default function ScenarioPicker({ user, onStartSession, onJoinInvite, onLogout }) {
  const [scenarios, setScenarios] = useState([])
  const [selectedId, setSelectedId] = useState('')
  const [difficulty, setDifficulty] = useState('neutral')
  const [userContext, setUserContext] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [loading, setLoading] = useState(false)
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

  const handleStart = async () => {
    if (!selectedId) return
    setLoading(true)
    setError('')
    try {
      const res = await api.createSession(selectedId, difficulty, userContext)
      onStartSession(res.session, selectedScenario, res.channels, res.opening)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  const handleJoinInvite = async (e) => {
    e.preventDefault()
    if (!inviteCode.trim()) return
    setLoading(true)
    setError('')
    try {
      const res = await api.joinInvite(inviteCode.trim())
      onJoinInvite(res.sessionId, res.coachGroupId)
    } catch (err) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0c10', color: '#e6edf3',
      fontFamily: 'system-ui, -apple-system, sans-serif', padding: '24px 16px'
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Top Header */}
        <header style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid #21262d', paddingBottom: 16, marginBottom: 28
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Left Column: Scenario Catalog */}
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 600, margin: '0 0 16px', color: '#f0f6fc' }}>
              Select a Conversation Scenario
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

          {/* Right Column: Settings & Launch */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Scenario Configuration Box */}
            <div style={{
              background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 20
            }}>
              <h3 style={{ margin: '0 0 14px', fontSize: 15, fontWeight: 600, color: '#f0f6fc' }}>
                Practice Settings
              </h3>

              {/* Difficulty selector */}
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

              {/* Custom situation context */}
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
                onClick={handleStart}
                style={{
                  width: '100%', padding: '12px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #238636, #2ea043)', color: '#fff',
                  fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
                }}
              >
                <Zap size={16} />
                {loading ? 'Starting Rehearsal...' : 'Start Rehearsal'}
              </button>
            </div>

            {/* Join as Mentor Box */}
            <div style={{
              background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Shield size={16} color="#bc8cff" />
                <h4 style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#f0f6fc' }}>
                  Have an Invite Code?
                </h4>
              </div>
              <p style={{ margin: '0 0 12px', fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
                Join an active session as a human mentor to whisper real-time tips into the Coach channel.
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
      </div>
    </div>
  )
}
