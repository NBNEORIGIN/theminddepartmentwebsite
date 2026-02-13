'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { getChannels, getMessages, sendMessage as apiSendMessage, getCurrentUser, getMediaUrl, isImageFile, isVideoFile } from '@/lib/api'

const C = {
  bg: '#0f172a', card: '#1e293b', cardAlt: '#273548', text: '#f8fafc', muted: '#94a3b8',
  border: '#475569', accent: '#6366f1', green: '#22c55e', red: '#ef4444',
  bubbleYou: '#6366f1', bubbleThem: '#334155',
}

export default function AdminChatPage() {
  const [channel, setChannel] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [input, setInput] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const currentUser = getCurrentUser()
  const currentUserId = currentUser?.id

  // Auto-create / load the General channel
  const init = useCallback(async () => {
    setLoading(true)
    // Try to ensure general channel exists
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('nbne_access') : null
      const base = process.env.NEXT_PUBLIC_API_BASE || 'https://theminddepartment-api.fly.dev/api'
      await fetch(`${base}/comms/ensure-general/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      })
    } catch {}
    const r = await getChannels()
    const chs = r.data || []
    if (chs.length > 0) {
      setChannel(chs[0])
    } else {
      setError('No chat channel available.')
    }
    setLoading(false)
  }, [])

  useEffect(() => { init() }, [init])

  // Load messages when channel is set
  useEffect(() => {
    if (!channel) return
    getMessages(channel.id).then(r => setMessages(r.data || []))
  }, [channel?.id])

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // Poll every 4 seconds
  useEffect(() => {
    if (!channel) return
    const interval = setInterval(() => {
      getMessages(channel.id).then(r => { if (r.data) setMessages(r.data) })
    }, 4000)
    return () => clearInterval(interval)
  }, [channel?.id])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if ((!input.trim() && files.length === 0) || !channel) return
    setSending(true)
    const res = await apiSendMessage(channel.id, input.trim(), files.length > 0 ? files : undefined)
    if (res.data) {
      setMessages(prev => [...prev, res.data])
    }
    setInput('')
    setFiles([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    setSending(false)
    inputRef.current?.focus()
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) setFiles(Array.from(e.target.files))
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  function fmtTime(iso: string) {
    return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
  }

  function fmtDate(iso: string) {
    const d = new Date(iso)
    const today = new Date()
    const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function renderAttachments(attachments: any[]) {
    if (!attachments || attachments.length === 0) return null
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
        {attachments.map((att: any) => {
          const url = getMediaUrl(att.url)
          const isImg = att.content_type?.startsWith('image/') || isImageFile(att.filename || '')
          const isVid = att.content_type?.startsWith('video/') || isVideoFile(att.filename || '')
          if (isImg) return <a key={att.id} href={url} target="_blank" rel="noopener"><img src={url} alt={att.filename} style={{ maxWidth: 220, maxHeight: 160, borderRadius: 8, objectFit: 'cover' }} /></a>
          if (isVid) return <video key={att.id} src={url} controls style={{ maxWidth: 260, maxHeight: 180, borderRadius: 8 }} />
          return <a key={att.id} href={url} target="_blank" rel="noopener" style={{ fontSize: '0.8rem', color: C.accent, textDecoration: 'none' }}>📎 {att.filename}</a>
        })}
      </div>
    )
  }

  // Group messages by date for separators
  function getDateKey(iso: string) { return new Date(iso).toDateString() }

  // Styles
  const containerStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', maxWidth: 800, margin: '0 auto', color: C.text }
  const headerStyle: React.CSSProperties = { padding: '0.75rem 1rem', borderBottom: `1px solid ${C.border}30`, display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }
  const messagesStyle: React.CSSProperties = { flex: 1, overflowY: 'auto', padding: '0.75rem 1rem', display: 'flex', flexDirection: 'column', gap: 2 }
  const inputBarStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: '0.6rem 1rem', borderTop: `1px solid ${C.border}30`, background: C.card, flexShrink: 0 }
  const inputStyle: React.CSSProperties = { flex: 1, padding: '0.55rem 0.75rem', borderRadius: 20, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.9rem', outline: 'none', colorScheme: 'dark' }
  const sendBtnStyle: React.CSSProperties = { width: 38, height: 38, borderRadius: '50%', border: 'none', background: C.accent, color: '#fff', fontSize: '1.1rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s' }
  const attachBtnStyle: React.CSSProperties = { background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: 4, color: C.muted, flexShrink: 0 }
  const dateSepStyle: React.CSSProperties = { textAlign: 'center', padding: '0.5rem 0', fontSize: '0.65rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💬</div><div>Loading chat…</div></div></div>
  if (error) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.red }}>{error}</div>

  let lastDateKey = ''

  return (
    <div style={containerStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <div style={{ width: 36, height: 36, borderRadius: '50%', background: C.accent + '30', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>💬</div>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem' }}>Team Chat</div>
          <div style={{ fontSize: '0.7rem', color: C.muted }}>{channel?.member_count || 0} members</div>
        </div>
      </div>

      {/* Messages */}
      <div ref={messagesContainerRef} style={messagesStyle}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.muted, padding: '3rem 1rem', fontSize: '0.85rem' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>👋</div>
            <div style={{ fontWeight: 600 }}>Welcome to Team Chat</div>
            <div style={{ marginTop: 4 }}>Send the first message to get started.</div>
          </div>
        )}
        {messages.map((msg: any, i: number) => {
          const isYou = msg.sender_id === currentUserId
          const dateKey = getDateKey(msg.created_at)
          const showDate = dateKey !== lastDateKey
          lastDateKey = dateKey

          // Check if previous message was from same sender within 2 minutes
          const prev = i > 0 ? messages[i - 1] : null
          const isGrouped = prev && prev.sender_id === msg.sender_id && !showDate &&
            (new Date(msg.created_at).getTime() - new Date(prev.created_at).getTime()) < 120000

          return (
            <div key={msg.id}>
              {showDate && <div style={dateSepStyle}>{fmtDate(msg.created_at)}</div>}
              <div style={{ display: 'flex', justifyContent: isYou ? 'flex-end' : 'flex-start', marginTop: isGrouped ? 1 : 8 }}>
                <div style={{ maxWidth: '80%', minWidth: 60 }}>
                  {/* Sender name for others, only on first in group */}
                  {!isYou && !isGrouped && (
                    <div style={{ fontSize: '0.65rem', fontWeight: 700, color: C.accent, marginBottom: 2, paddingLeft: 10 }}>{msg.sender_name}</div>
                  )}
                  <div style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: isYou
                      ? (isGrouped ? '16px 16px 4px 16px' : '16px 16px 4px 16px')
                      : (isGrouped ? '16px 16px 16px 4px' : '16px 16px 16px 4px'),
                    background: isYou ? C.bubbleYou : C.bubbleThem,
                    color: C.text,
                    fontSize: '0.85rem',
                    lineHeight: 1.45,
                    wordBreak: 'break-word' as const,
                  }}>
                    {msg.body && <div>{msg.body}</div>}
                    {renderAttachments(msg.attachments)}
                    <div style={{ fontSize: '0.55rem', color: isYou ? 'rgba(255,255,255,0.5)' : C.muted, textAlign: 'right', marginTop: 2 }}>{fmtTime(msg.created_at)}</div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* File preview */}
      {files.length > 0 && (
        <div style={{ padding: '0.4rem 1rem', borderTop: `1px solid ${C.border}30`, display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', background: C.cardAlt, flexShrink: 0 }}>
          {files.map((f, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 4, background: C.bg, border: `1px solid ${C.border}`, borderRadius: 8, padding: '3px 8px', fontSize: '0.75rem', color: C.text }}>
              {f.type.startsWith('image/') ? '🖼️' : f.type.startsWith('video/') ? '🎬' : '📎'} {f.name.length > 18 ? f.name.slice(0, 15) + '…' : f.name}
              <button type="button" onClick={() => removeFile(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontWeight: 700, fontSize: '0.9rem', lineHeight: 1, padding: 0, marginLeft: 2 }}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form onSubmit={handleSend} style={inputBarStyle}>
        <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple accept="image/*,video/*,.pdf,.doc,.docx" style={{ display: 'none' }} />
        <button type="button" onClick={() => fileInputRef.current?.click()} style={attachBtnStyle} title="Attach files">📎</button>
        <input ref={inputRef} value={input} onChange={e => setInput(e.target.value)} placeholder="Type a message…" autoFocus style={inputStyle} />
        <button type="submit" disabled={sending || (!input.trim() && files.length === 0)} style={{ ...sendBtnStyle, opacity: (sending || (!input.trim() && files.length === 0)) ? 0.4 : 1 }} title="Send">
          {sending ? '…' : '➤'}
        </button>
      </form>
    </div>
  )
}
