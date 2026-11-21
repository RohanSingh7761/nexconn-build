import { useState } from 'react'
import * as api from '../lib/api'

export default function AuthModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isRegister) {
        const res = await api.register(username, displayName, password)
        onLoginSuccess(res.user)
      } else {
        const res = await api.login(username, password)
        onLoginSuccess(res.user)
      }
    } catch (err) {
      setError(err.message || 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: '#16181d', border: '1px solid #282c37', borderRadius: 12,
        maxWidth: 420, width: '100%', padding: 28, color: '#f0f2f5', fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>R</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Welcome to Rehearsal</h2>
        </div>
        <p style={{ margin: '0 0 16px', color: '#9ba1b0', fontSize: 13 }}>
          {isRegister ? 'Create an account to practice high-stakes conversations' : 'Sign in to access your practice sessions'}
        </p>

        {error && (
          <div style={{
            background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: '#fca5a5', fontSize: 13
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ba1b0', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#0e1014', border: '1px solid #282c37',
                borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ba1b0', marginBottom: 6 }}>
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: '#0e1014', border: '1px solid #282c37',
                  borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#9ba1b0', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: '#0e1014', border: '1px solid #282c37',
                borderRadius: 8, color: '#fff', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, padding: '12px', borderRadius: 8, border: 'none',
              background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14
            }}
          >
            {loading ? 'Processing...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#9ba1b0' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { setIsRegister(!isRegister); setError('') }}
            style={{ background: 'none', border: 'none', color: '#60a5fa', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  )
}
