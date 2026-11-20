export default function TypingDots({ name = 'Persona' }) {
  return (
    <div className="typing-row" aria-live="polite" aria-label={`${name} is typing`}>
      <div className="bubble-avatar bubble-avatar--persona" aria-hidden="true">
        {name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div className="typing-dots" aria-hidden="true">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
    </div>
  )
}
