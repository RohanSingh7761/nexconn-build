import { useEffect, useMemo, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LogOut, ArrowRight } from 'lucide-react'
import * as api from '../lib/api'

const DIFFICULTY_LABEL = { friendly: 'Friendly', neutral: 'Neutral', tough: 'Tough' }

function formatDate(value) {
  if (!value) return ''
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function Stat({ label, value, note }) {
  return (
    <div className="dash-stat">
      <div className="dash-stat__value">{value}</div>
      <div className="dash-stat__label">{label}</div>
      {note && <div className="dash-stat__note">{note}</div>}
    </div>
  )
}

// The home page for everyone. Signed-out visitors see the scenarios and the sign-in and sign-up calls to action;
// signed-in users also see their own sessions and figures.
export default function Dashboard({ user, onLogout }) {
  const [sessions, setSessions] = useState(null)
  const [scenarios, setScenarios] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    const loads = [api.listScenarios()]
    if (user) loads.push(api.listSessions())
    Promise.all(loads)
      .then(([sc, s]) => {
        setScenarios(sc.scenarios || [])
        if (s) setSessions(s.sessions || [])
      })
      .catch((err) => setError(err.message || 'Could not load the dashboard'))
  }, [user])

  // Every figure below is computed from the user's own sessions; nothing is estimated.
  const stats = useMemo(() => {
    const list = sessions || []
    const completed = list.filter((s) => s.status === 'completed')
    const scored = completed.filter((s) => typeof s.overall_score === 'number')
    const average = scored.length
      ? Math.round(scored.reduce((sum, s) => sum + s.overall_score, 0) / scored.length)
      : null
    return {
      completed: completed.length,
      average,
      turns: list.reduce((sum, s) => sum + (s.turn_count || 0), 0),
      active: list.filter((s) => s.status === 'active').length,
    }
  }, [sessions])

  const recent = (sessions || []).slice(0, 5)

  return (
    <div className="dash">
      <header className="dash-top">
        <div className="dash-top__inner">
          <Link to="/" className="dash-brand" aria-label="DryRun home">
            <span className="dash-brand__mark" aria-hidden="true">D</span>
            <span className="dash-brand__name">DryRun</span>
          </Link>
          <nav className="dash-nav" aria-label="Main">
            <NavLink to="/" end className="dash-nav__link">Dashboard</NavLink>
            <NavLink to="/practice" className="dash-nav__link">Practice</NavLink>
          </nav>
          {user ? (
            <button type="button" className="dash-signout" onClick={onLogout}>
              <LogOut size={15} aria-hidden="true" />
              <span>Sign out</span>
            </button>
          ) : (
            <div className="dash-auth">
              <Link to="/sign-in" className="dash-btn dash-btn--ghost dash-btn--compact">Sign in</Link>
              <Link to="/signup" className="dash-btn dash-btn--primary dash-btn--compact">Create account</Link>
            </div>
          )}
        </div>
      </header>

      <main className="dash-main">
        <section className="dash-hero" aria-labelledby="dash-hero-title">
          <div className="dash-hero__copy">
            <h1 id="dash-hero-title" className="dash-hero__title">
              Practice the hard conversation before it happens.
            </h1>
            <p className="dash-hero__lede">
              Practice with an AI persona or a live partner. The AI coach whispers tips only to you,
              and every session ends with a scorecard.
            </p>
            <div className="dash-hero__actions">
              {user ? (
                <Link to="/practice" className="dash-btn dash-btn--primary">
                  Start a session <ArrowRight size={16} aria-hidden="true" />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="dash-btn dash-btn--primary">
                    Create an account <ArrowRight size={16} aria-hidden="true" />
                  </Link>
                  <Link to="/sign-in" className="dash-btn dash-btn--ghost">Sign in</Link>
                </>
              )}
              <a href="#how-it-works" className="dash-btn dash-btn--ghost">How it works</a>
            </div>
          </div>

          <div className="dash-preview" aria-label="Example of a coach tip">
            <div className="dash-preview__head">
              <span>Coach</span>
              <span className="dash-preview__tag">Example</span>
            </div>
            <div className="dash-preview__bubble dash-preview__bubble--them">
              I’ve heard the migration story. What’s the number that makes it a raise?
            </div>
            <div className="dash-preview__tip">
              <span className="dash-preview__label">Tip for you</span>
              <p>Lead with the number, then the scope. Name the saving before the timeline.</p>
            </div>
          </div>
        </section>

        {error && <p className="dash-error" role="alert">{error}</p>}

        {user && (
          <section className="dash-stats" aria-label="Your progress">
            <Stat label="Sessions completed" value={sessions === null ? '…' : stats.completed} />
            <Stat
              label="Average score"
              value={sessions === null ? '…' : stats.average ?? '—'}
              note={stats.average === null && sessions !== null ? 'Appears after your first scorecard' : undefined}
            />
            <Stat label="Turns practiced" value={sessions === null ? '…' : stats.turns} />
            <Stat label="In progress" value={sessions === null ? '…' : stats.active} />
          </section>
        )}

        <div className={`dash-columns${user ? '' : ' dash-columns--single'}`}>
          {user && (
            <section className="dash-card" aria-labelledby="dash-recent">
              <div className="dash-card__head">
                <h2 id="dash-recent" className="dash-card__title">Recent sessions</h2>
              </div>
              {sessions === null && <p className="dash-muted">Loading your sessions…</p>}
              {sessions !== null && recent.length === 0 && (
                <p className="dash-muted">
                  No sessions yet. <Link to="/practice" className="dash-link">Start your first one</Link> and it will show up here.
                </p>
              )}
              {recent.length > 0 && (
                <ul className="dash-list">
                  {recent.map((s) => (
                    <li key={s.id} className="dash-row">
                      <div className="dash-row__main">
                        <div className="dash-row__title">{s.scenario_title}</div>
                        <div className="dash-row__meta">
                          {DIFFICULTY_LABEL[s.difficulty] || s.difficulty}, {formatDate(s.started_at)}
                        </div>
                      </div>
                      <div className="dash-row__side">
                        <span className={`dash-status dash-status--${s.status}`}>
                          {s.status === 'active' ? 'In progress' : s.status === 'completed' ? 'Completed' : 'Abandoned'}
                        </span>
                        {typeof s.overall_score === 'number' && (
                          <span className="dash-row__score">{s.overall_score}</span>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <section className="dash-card" aria-labelledby="dash-scenarios">
            <div className="dash-card__head">
              <h2 id="dash-scenarios" className="dash-card__title">Scenarios</h2>
            </div>
            {scenarios.length === 0 && <p className="dash-muted">No scenarios are available yet.</p>}
            <ul className="dash-list">
              {scenarios.map((sc) => (
                <li key={sc.id} className="dash-row">
                  <div className="dash-row__main">
                    <div className="dash-row__title">{sc.title}</div>
                    <div className="dash-row__meta">
                      With {sc.persona_name}, {sc.persona_role}, {sc.est_minutes} min
                    </div>
                  </div>
                  <Link to={user ? '/practice' : '/signup'} className="dash-btn dash-btn--small">Start</Link>
                </li>
              ))}
            </ul>
            {!user && (
              <p className="dash-muted dash-card__foot">
                <Link to="/signup" className="dash-link">Create an account</Link> to save your sessions and scores.
              </p>
            )}
          </section>
        </div>

        <section id="how-it-works" className="dash-how" aria-labelledby="dash-how-title">
          <h2 id="dash-how-title" className="dash-section-title">How DryRun works</h2>
          <div className="dash-steps">
            <div className="dash-step">
              <h3>Set the scene</h3>
              <p>Pick a scenario, or describe your own situation, and choose how hard the other person pushes.</p>
            </div>
            <div className="dash-step">
              <h3>Practice live</h3>
              <p>Talk with an AI persona, or invite a friend to play the other side. Coaching stays with you.</p>
            </div>
            <div className="dash-step">
              <h3>Review the scorecard</h3>
              <p>See what landed, where you lost ground, and a better way to say the line that did not work.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="dash-footer">
        <span className="dash-footer__name">DryRun</span>
        <span className="dash-muted">Practice the conversation first.</span>
        <Link to={user ? '/practice' : '/signup'} className="dash-link">{user ? 'Open practice' : 'Create an account'}</Link>
      </footer>
    </div>
  )
}
