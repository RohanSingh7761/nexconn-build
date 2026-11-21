import { Award, CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react'

export default function ScorecardModal({ scorecard, scenario, onDone }) {
  if (!scorecard) return null

  const {
    overall_score = 0,
    summary = '',
    dimensions = [],
    strengths = [],
    improvements = [],
    key_moments = [],
    next_practice = '',
  } = scorecard

  const isIncomplete = overall_score < 35
  const scoreColor =
    overall_score >= 80 ? 'var(--color-ok)' : overall_score >= 60 ? 'var(--color-warn)' : 'var(--color-bad)'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'color-mix(in oklch, var(--color-ink) 88%, transparent)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16
    }}>
      <div style={{
        background: 'var(--color-paper)', border: '1px solid var(--color-rule)', borderRadius: 14,
        maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        padding: 28, color: 'var(--color-ink)', fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Incomplete warning banner */}
        {isIncomplete && (
          <div style={{
            background: 'color-mix(in oklch, var(--color-bad) 12%, transparent)', border: '1px solid var(--color-bad)',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16, color: 'var(--color-bad)',
            fontSize: 13, display: 'flex', alignItems: 'center', gap: 10
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>
              <strong>Incomplete session:</strong> This session was ended prematurely before substantive conversation took place.
            </span>
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--color-paper-3)', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={20} color={isIncomplete ? 'var(--color-bad)' : 'var(--color-warn)'} />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Performance Scorecard</h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--color-muted)' }}>
              {scenario?.title || 'Practice session'}
            </p>
          </div>
          <div style={{
            background: 'color-mix(in oklch, var(--color-ink) 40%, transparent)', border: `2px solid ${scoreColor}`,
            borderRadius: 12, padding: '8px 18px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor }}>
              {overall_score}
            </div>
            <div style={{ fontSize: 10, color: 'var(--color-muted)' }}>
              Score / 100
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{
          background: 'var(--color-paper)',
          border: isIncomplete ? '1px solid color-mix(in oklch, var(--color-bad) 30%, transparent)' : '1px solid var(--color-rule)',
          borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 14, lineHeight: 1.5
        }}>
          {summary}
        </div>

        {/* Rubric Dimensions */}
        {dimensions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 12px' }}>
              Rubric Assessment
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dimensions.map((d, i) => (
                <div key={i} style={{ background: 'var(--color-paper)', border: '1px solid var(--color-paper-3)', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-ink-2)' }}>{d.label || d.key}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.score >= 4 ? 'var(--color-ok)' : d.score === 3 ? 'var(--color-warn)' : 'var(--color-bad)' }}>
                      {d.score} / 5
                    </span>
                  </div>
                  {d.comment && (
                    <p style={{ margin: 0, fontSize: 12, color: 'var(--color-muted)', lineHeight: 1.4 }}>
                      {d.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Strengths & Improvements */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
          {strengths.length > 0 && (
            <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-accent)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--color-ok)', fontSize: 13, fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Strengths
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                {strengths.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {improvements.length > 0 && (
            <div style={{ background: 'var(--color-paper)', border: '1px solid var(--color-warn)', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--color-warn)', fontSize: 13, fontWeight: 600 }}>
                <AlertCircle size={16} /> Key Improvements
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--color-ink-2)', lineHeight: 1.5 }}>
                {improvements.map((im, idx) => (
                  <li key={idx}>{im}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Key Moments */}
        {key_moments.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: 'var(--color-ink)', margin: '0 0 10px' }}>
              Key Moments & Alternative Phrasing
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {key_moments.map((km, idx) => (
                <div key={idx} style={{ background: 'var(--color-paper)', border: '1px solid var(--color-paper-3)', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 4 }}>
                    <strong>Observation:</strong> {km.what_happened}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--color-accent)' }}>
                    <strong>Better phrasing:</strong> "{km.better_option}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Practice Recommendation */}
        {next_practice && (
          <div style={{ background: 'color-mix(in oklch, var(--color-accent) 10%, transparent)', border: '1px solid var(--color-accent)', borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 13, color: 'var(--color-accent)' }}>
            <strong>Recommended Next Drill:</strong> {next_practice}
          </div>
        )}

        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: 'var(--color-accent)', color: 'var(--color-accent-ink)',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <RotateCcw size={16} /> Return to Scenario Catalog
        </button>
      </div>
    </div>
  )
}
