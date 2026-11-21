import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as api from '../lib/api'

// The sign-in page (/sign-in) and the sign-up page (/signup) share this form.
export default function AuthModal({ mode = 'sign-in', onLoginSuccess }) {
  const navigate = useNavigate()
  const isRegister = mode === 'signup'
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
      minHeight: '100dvh', background: 'var(--color-paper-2)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16
    }}>
      <div style={{
        background: 'var(--color-paper)', border: '1px solid var(--color-paper-3)', borderRadius: 12,
        maxWidth: 420, width: '100%', padding: 28, color: 'var(--color-ink)', fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{
            background: 'var(--color-accent)',
            width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
          }}>D</div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{isRegister ? 'Create your DryRun account' : 'Welcome back to DryRun'}</h2>
        </div>
        <p style={{ margin: '0 0 16px', color: 'var(--color-muted)', fontSize: 13 }}>
          {isRegister ? 'Create an account to practice high-stakes conversations' : 'Sign in to access your practice sessions'}
        </p>

        {error && (
          <div style={{
            background: 'color-mix(in oklch, var(--color-bad) 15%, transparent)', border: '1px solid var(--color-bad)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--color-bad)', fontSize: 13
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>
              Username
            </label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--color-paper-3)',
                borderRadius: 8, color: 'var(--color-ink)', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          {isRegister && (
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>
                Display Name
              </label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                style={{
                  width: '100%', padding: '10px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--color-paper-3)',
                  borderRadius: 8, color: 'var(--color-ink)', fontSize: 14, boxSizing: 'border-box'
                }}
              />
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 6 }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%', padding: '10px 12px', background: 'var(--color-paper-2)', border: '1px solid var(--color-paper-3)',
                borderRadius: 8, color: 'var(--color-ink)', fontSize: 14, boxSizing: 'border-box'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 8, padding: '12px', borderRadius: 8, border: 'none',
              background: 'var(--color-accent)', color: 'var(--color-accent-ink)',
              fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 14
            }}
          >
            {loading ? 'Processing…' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: 'var(--color-muted)' }}>
          {isRegister ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button
            type="button"
            onClick={() => { navigate(isRegister ? '/sign-in' : '/signup'); setError('') }}
            style={{ background: 'none', border: 'none', color: 'var(--color-accent)', cursor: 'pointer', padding: 0, fontWeight: 600 }}
          >
            {isRegister ? 'Sign in' : 'Create one'}
          </button>
        </div>
      </div>
    </div>
  )
}
