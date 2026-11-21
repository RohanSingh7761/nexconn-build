// Shown to the human partner instead of the coach panel: who they are playing and how to play it.
function Section({ title, children }) {
  return (
    <section>
      <div className="measured" style={{ fontSize: '11px', marginBottom: 4 }}>
        {title}
      </div>
      <div style={{ fontSize: 'var(--text-sm)', lineHeight: 1.5, color: 'var(--color-ink)' }}>{children}</div>
    </section>
  )
}

export default function RoleCard({ scenario }) {
  return (
    <>
      <div className="coach-panel__header">
        <span className="coach-panel__title">Your role</span>
      </div>
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflowY: 'auto',
          padding: 'var(--space-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-md)',
        }}
      >
        <Section title="You are playing">
          <strong>{scenario?.persona_name ?? 'the other person'}</strong>
          {scenario?.persona_role ? `, ${scenario.persona_role}` : ''}
        </Section>
        {scenario?.description && <Section title="The scene">{scenario.description}</Section>}
        {scenario?.persona_public_brief && <Section title="How you come across">{scenario.persona_public_brief}</Section>}
        {scenario?.persona_private_brief && (
          <Section title="Keep this to yourself">{scenario.persona_private_brief}</Section>
        )}
        <p className="measured" style={{ margin: 0, fontSize: '12px', lineHeight: 1.5 }}>
          Stay in character and react to what they actually say. An AI coach is giving the interviewee private tips;
          you can't see them.
        </p>
      </div>
    </>
  )
}
