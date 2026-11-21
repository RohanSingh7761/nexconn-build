function formatTime(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
}

export default function Bubble({ message }) {
  if (!message || !message.content || !message.content.trim()) {
    return null
  }
  // In partner mode both sides are human, so "mine" decides the side; otherwise fall back to the sender type.
  const isLearner = message.isMine ?? message.senderType === 'learner'

  return (
    <div
      className={`bubble-row bubble-row--${isLearner ? 'learner' : 'persona'}`}
      aria-label={isLearner ? 'Your message' : `Message from ${message.senderName ?? 'Persona'}`}
    >
      <div
        className={`bubble-avatar bubble-avatar--${isLearner ? 'learner' : 'persona'}`}
        aria-hidden="true"
      >
        {isLearner ? 'You' : (message.senderName ?? 'AI').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <div className={`bubble bubble--${isLearner ? 'learner' : 'persona'}`}>
          {message.content}
        </div>
        <time className="bubble-time" dateTime={message.createdAt ? new Date(message.createdAt).toISOString() : undefined}>
          {formatTime(message.createdAt)}
        </time>
      </div>
    </div>
  )
}
