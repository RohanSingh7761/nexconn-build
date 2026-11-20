import { WifiOff } from 'lucide-react'

export default function ConnectionBanner({ status }) {
  if (status === 'connected') return null

  const label =
    status === 'connecting'      ? 'Reconnecting…'       :
    status === 'token_expired'   ? 'Session expired — reconnecting…' :
    'Connection lost — messages will queue and deliver when reconnected.'

  return (
    <div
      className="connection-banner"
      role="status"
      aria-live="assertive"
      aria-label={label}
    >
      <WifiOff size={12} aria-hidden="true" />
      {label}
    </div>
  )
}
