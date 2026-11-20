import { Award, CheckCircle2, AlertCircle, ArrowRight, RotateCcw } from 'lucide-react'

export default function ScorecardModal({ scorecard, scenario, onDone }) {
  if (!scorecard) return null

  const {
    overall_score = 75,
    summary = '',
    dimensions = [],
    strengths = [],
    improvements = [],
    key_moments = [],
    next_practice = '',
  } = scorecard

  const scoreColor =
    overall_score >= 80 ? '#3fb950' : overall_score >= 60 ? '#d29922' : '#f85149'

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0, 0, 0, 0.88)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100, padding: 16
    }}>
      <div style={{
        background: '#161b22', border: '1px solid #30363d', borderRadius: 14,
        maxWidth: 680, width: '100%', maxHeight: '90vh', overflowY: 'auto',
        padding: 28, color: '#e6edf3', fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #21262d', paddingBottom: 16, marginBottom: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={20} color="#e3b341" />
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Performance Scorecard</h2>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#8b949e' }}>
              {scenario?.title || 'Rehearsal Session'}
            </p>
          </div>
          <div style={{
            background: 'rgba(0,0,0,0.4)', border: `2px solid ${scoreColor}`,
            borderRadius: 12, padding: '8px 18px', textAlign: 'center'
          }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: scoreColor }}>
              {overall_score}
            </div>
            <div style={{ fontSize: 10, textTransform: 'uppercase', color: '#8b949e', letterSpacing: 0.5 }}>
              Score / 100
            </div>
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: 14, marginBottom: 20, fontSize: 14, lineHeight: 1.5 }}>
          {summary}
        </div>

        {/* Rubric Dimensions */}
        {dimensions.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0f6fc', margin: '0 0 12px' }}>
              Rubric Assessment
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {dimensions.map((d, i) => (
                <div key={i} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#c9d1d9' }}>{d.label || d.key}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: d.score >= 4 ? '#3fb950' : d.score === 3 ? '#d29922' : '#f85149' }}>
                      {d.score} / 5
                    </span>
                  </div>
                  {d.comment && (
                    <p style={{ margin: 0, fontSize: 12, color: '#8b949e', lineHeight: 1.4 }}>
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
            <div style={{ background: '#0d1117', border: '1px solid #238636', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#3fb950', fontSize: 13, fontWeight: 600 }}>
                <CheckCircle2 size={16} /> Strengths
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#c9d1d9', lineHeight: 1.5 }}>
                {strengths.map((s, idx) => (
                  <li key={idx}>{s}</li>
                ))}
              </ul>
            </div>
          )}

          {improvements.length > 0 && (
            <div style={{ background: '#0d1117', border: '1px solid #d29922', borderRadius: 8, padding: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: '#d29922', fontSize: 13, fontWeight: 600 }}>
                <AlertCircle size={16} /> Key Improvements
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#c9d1d9', lineHeight: 1.5 }}>
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
            <h3 style={{ fontSize: 14, fontWeight: 600, color: '#f0f6fc', margin: '0 0 10px' }}>
              Key Moments & Alternative Phrasing
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {key_moments.map((km, idx) => (
                <div key={idx} style={{ background: '#0d1117', border: '1px solid #21262d', borderRadius: 8, padding: 12 }}>
                  <div style={{ fontSize: 12, color: '#8b949e', marginBottom: 4 }}>
                    <strong>Observation:</strong> {km.what_happened}
                  </div>
                  <div style={{ fontSize: 12, color: '#58a6ff' }}>
                    <strong>Better phrasing:</strong> "{km.better_option}"
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Next Practice Recommendation */}
        {next_practice && (
          <div style={{ background: 'rgba(88, 166, 255, 0.1)', border: '1px solid #388bfd', borderRadius: 8, padding: 12, marginBottom: 24, fontSize: 13, color: '#79c0ff' }}>
            <strong>Recommended Next Drill:</strong> {next_practice}
          </div>
        )}

        <button
          onClick={onDone}
          style={{
            width: '100%', padding: '12px', borderRadius: 8, border: 'none',
            background: 'linear-gradient(135deg, #238636, #2ea043)', color: '#fff',
            fontWeight: 700, fontSize: 14, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8
          }}
        >
          <RotateCcw size={16} /> Return to Scenario Catalog
        </button>
      </div>
    </div>
  )
}
