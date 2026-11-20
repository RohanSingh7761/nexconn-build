import { useRef, useEffect } from 'react'
import { Send } from 'lucide-react'

export default function Composer({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder = 'Type a message…',
  variant = 'scene',   /* 'scene' | 'coach' */
}) {
  const ref = useRef(null)

  /* auto-resize */
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [value])

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const isCoach = variant === 'coach'

  return (
    <div className={isCoach ? 'coach-composer' : 'composer'}>
      <textarea
        ref={ref}
        className={isCoach ? 'coach-composer__input' : 'composer__input'}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        disabled={disabled}
        rows={1}
        aria-label={isCoach ? 'Ask the coach' : 'Your message'}
        aria-disabled={disabled}
      />
      <button
        type="button"
        className="btn btn--primary btn--icon"
        onClick={onSend}
        disabled={disabled || !value.trim()}
        aria-label="Send message"
        style={isCoach ? { width: 32, height: 32 } : {}}
      >
        <Send size={isCoach ? 13 : 15} aria-hidden="true" />
      </button>
    </div>
  )
}
