import { useEffect, useMemo, useState, useRef } from 'react'

const apiBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'

function Avatar({ name, url, size = 40 }) {
  const initials = name?.split(' ').map(s => s[0]).join('').slice(0, 2).toUpperCase() || '?'
  const colors = [
    'bg-indigo-500','bg-blue-500','bg-emerald-500','bg-fuchsia-500','bg-rose-500','bg-amber-500'
  ]
  const color = useMemo(() => colors[Math.abs(name?.charCodeAt(0) || 0) % colors.length], [name])
  return (
    <div className={`rounded-full ${color} text-white flex items-center justify-center`} style={{width: size, height: size}}>
      {url ? (
        <img alt={name} src={url} className="w-full h-full rounded-full object-cover" />
      ) : (
        <span className="font-semibold">{initials}</span>
      )}
    </div>
  )
}

export default function ChatLayout() {
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [conversations, setConversations] = useState([])
  const [activeConvo, setActiveConvo] = useState(null)
  const [messages, setMessages] = useState([])
  const [text, setText] = useState('')
  const messagesEndRef = useRef(null)

  useEffect(() => {
    bootstrap()
  }, [])

  useEffect(() => {
    if (!activeConvo) return
    fetch(`${apiBase}/messages?conversation_id=${activeConvo.id}&limit=100`)
      .then(r => r.json())
      .then(setMessages)
  }, [activeConvo])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function bootstrap() {
    // Create or get demo users
    const u1 = await ensureUser('alice', 'Alice Johnson')
    const u2 = await ensureUser('bob', 'Bob Smith')
    setMe(u1)
    setUsers([u1, u2])

    // Ensure a direct conversation exists
    const convo = await ensureDirectConvo(u1.id, u2.id)
    setActiveConvo(convo)

    // Load conversation list for sidebar
    const convos = await fetch(`${apiBase}/conversations?user_id=${u1.id}`).then(r => r.json())
    setConversations(convos)
  }

  async function ensureUser(username, displayName) {
    const res = await fetch(`${apiBase}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, display_name: displayName })
    })
    return await res.json()
  }

  async function ensureDirectConvo(a, b) {
    const res = await fetch(`${apiBase}/conversations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'direct', participant_ids: [a, b] })
    })
    return await res.json()
  }

  async function send() {
    if (!text.trim() || !activeConvo || !me) return
    const payload = {
      conversation_id: activeConvo.id,
      sender_id: me.id,
      content: text.trim(),
      type: 'text'
    }
    const res = await fetch(`${apiBase}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const msg = await res.json()
    setMessages(m => [...m, msg])
    setText('')
    // refresh sidebar previews
    const convos = await fetch(`${apiBase}/conversations?user_id=${me.id}`).then(r => r.json())
    setConversations(convos)
  }

  return (
    <div className="min-h-screen grid grid-cols-12 bg-slate-900 text-slate-100">
      <aside className="col-span-4 md:col-span-3 lg:col-span-2 border-r border-slate-800 p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Avatar name={me?.display_name} size={40} />
          <div>
            <div className="font-semibold leading-tight">{me?.display_name || '...'}</div>
            <div className="text-xs text-slate-400">{me?.username}</div>
          </div>
        </div>
        <div className="text-xs uppercase tracking-wider text-slate-400">Chats</div>
        <div className="space-y-1">
          {conversations.map(c => (
            <button key={c.id} onClick={() => setActiveConvo(c)} className={`w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800 transition ${activeConvo?.id===c.id ? 'bg-slate-800' : ''}`}>
              <Avatar name={c.name || users.find(u=>u.id!==me?.id)?.display_name} size={36} />
              <div className="text-left">
                <div className="font-medium truncate">{c.name || users.find(u=>u.id!==me?.id)?.display_name}</div>
                <div className="text-xs text-slate-400 truncate">{c.last_message_preview || 'No messages yet'}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="col-span-8 md:col-span-9 lg:col-span-10 flex flex-col">
        <header className="p-4 border-b border-slate-800 flex items-center gap-3">
          <Avatar name={activeConvo?.name || users.find(u=>u.id!==me?.id)?.display_name} />
          <div>
            <div className="font-semibold">{activeConvo?.name || users.find(u=>u.id!==me?.id)?.display_name || '...'}</div>
            <div className="text-xs text-slate-400">Direct Message</div>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 space-y-2 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.08),transparent_40%)]">
          {messages.map(m => (
            <div key={m.id} className={`flex ${m.sender_id===me?.id ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] px-3 py-2 rounded-2xl ${m.sender_id===me?.id ? 'bg-blue-600 text-white rounded-br-sm' : 'bg-slate-800 text-slate-100 rounded-bl-sm'}`}>
                <div className="whitespace-pre-wrap break-words">{m.content}</div>
                <div className="text-[10px] opacity-70 mt-1">{new Date(m.created_at || Date.now()).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </section>

        <footer className="p-4 border-t border-slate-800 flex gap-2">
          <input
            className="flex-1 bg-slate-800 text-slate-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/50"
            placeholder="Write a message..."
            value={text}
            onChange={e=>setText(e.target.value)}
            onKeyDown={e=>{ if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); send() } }}
          />
          <button onClick={send} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-medium">Send</button>
        </footer>
      </main>
    </div>
  )
}
