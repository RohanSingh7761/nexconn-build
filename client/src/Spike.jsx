// Phase 0 spike: exercises lib/nexconn.js end to end. Shown when VITE_SPIKE=1 (see App.jsx).
import { useState } from 'react'
import * as nx from './lib/nexconn'

const field = { width: '100%', padding: 8, margin: '4px 0', boxSizing: 'border-box' }

export default function Spike() {
  const [f, setF] = useState({ appKey: '', areaCode: '3', token: '', type: 'direct', targetId: '', text: 'hello' })
  const [log, setLog] = useState([])
  const add = (m) => setLog((l) => [`${new Date().toLocaleTimeString()} ${m}`, ...l])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const run = (fn) => async () => { try { await fn() } catch (e) { add(`ERROR ${e.code ?? ''} ${e.message}`) } }
  const ref = { type: f.type, targetId: f.targetId.trim() }

  const connect = run(async () => {
    nx.init(f.appKey.trim(), Number(f.areaCode) || undefined)
    nx.onConnectionStatus((s, c) => add(`status ${s} (${c ?? '-'})`))
    nx.onMessage((m) => add(`RECV ${m.channel.type}:${m.channel.targetId} from ${m.senderId}: ${m.text} [uid ${m.uid}]`))
    const r = await nx.connect(f.token.trim())
    add(`connected as ${r?.userId}`)
  })
  const send = run(async () => add(`sent uid ${(await nx.sendText(ref, f.text)).uid}`))
  const history = run(async () => {
    const msgs = await nx.getHistory(ref, { limit: 20 })
    add(`history ${msgs.length}: ${msgs.map((m) => `${m.senderId}: ${m.text}`).join(' | ')}`)
  })

  return (
    <div style={{ padding: 16, fontFamily: 'system-ui', maxWidth: 640, margin: '0 auto' }}>
      <h3>Nexconn spike</h3>
      <input style={field} placeholder="App Key" value={f.appKey} onChange={set('appKey')} />
      <select style={field} value={f.areaCode} onChange={set('areaCode')}>
        <option value="3">NA (api-us domains)</option>
        <option value="2">SG (SDK default)</option>
      </select>
      <textarea style={field} placeholder="Access token (from server spike)" value={f.token} onChange={set('token')} />
      <button onClick={connect}>Connect</button>
      <hr />
      <select style={field} value={f.type} onChange={set('type')}>
        <option value="direct">direct</option>
        <option value="group">group</option>
      </select>
      <input style={field} placeholder="Target user id or group id" value={f.targetId} onChange={set('targetId')} />
      <input style={field} placeholder="Text" value={f.text} onChange={set('text')} />
      <button onClick={send}>Send</button> <button onClick={history}>History</button>
      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, background: 'var(--color-paper-3)', color: 'var(--color-ok)', padding: 8, minHeight: 200 }}>
        {log.join('\n')}
      </pre>
    </div>
  )
}
