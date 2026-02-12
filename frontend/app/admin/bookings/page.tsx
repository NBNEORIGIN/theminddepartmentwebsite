'use client'

import { useEffect, useState, useCallback } from 'react'
import { getBookings, cancelBooking, completeBooking, markNoShow, getStaffBlocks, createStaffBlock, deleteStaffBlock, getStaffList, updateBookingNotes, updateClientNotes } from '@/lib/api'

/* ================================================================
   BOOKINGS — Smart Operations Dashboard v2
   Risk-driven, expandable, intelligent booking control centre
   ================================================================ */

const C = {
  green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
  darkRed: '#991b1b', bg: '#0f172a', card: '#1e293b', cardAlt: '#334155',
  text: '#f8fafc', muted: '#94a3b8', border: '#475569', accent: '#6366f1', surface: '#1e293b',
}

function riskColor(level: string) {
  if (level === 'CRITICAL') return C.darkRed
  if (level === 'HIGH') return C.red
  if (level === 'MEDIUM') return C.amber
  return C.green
}

function paymentChipColor(ps: string) {
  if (ps === 'paid') return C.green
  if (ps === 'refunded') return C.blue
  if (ps === 'failed') return C.red
  return C.amber
}

function formatDT(iso: string) {
  if (!iso) return { date: '—', time: '—' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}

function isToday(iso: string) {
  if (!iso) return false
  const d = new Date(iso).toDateString()
  return d === new Date().toDateString()
}

type SmartFilter = 'all' | 'high_risk' | 'due_today' | 'unpaid' | 'needs_attention'

export default function AdminBookingsPage() {
  const [allBookings, setAllBookings] = useState<any[]>([])
  const [smartFilter, setSmartFilter] = useState<SmartFilter>('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'bookings' | 'blocks'>('bookings')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  // Notes editing
  const [editingBookingNotes, setEditingBookingNotes] = useState<number | null>(null)
  const [editingClientNotes, setEditingClientNotes] = useState<number | null>(null)
  const [noteDraft, setNoteDraft] = useState('')

  // Block-out state
  const [blocks, setBlocks] = useState<any[]>([])
  const [staffList, setStaffList] = useState<any[]>([])
  const [showBlockForm, setShowBlockForm] = useState(false)
  const [blockStaff, setBlockStaff] = useState('')
  const [blockDate, setBlockDate] = useState(new Date().toISOString().split('T')[0])
  const [blockAllDay, setBlockAllDay] = useState(false)
  const [blockStart, setBlockStart] = useState('09:00')
  const [blockEnd, setBlockEnd] = useState('17:00')
  const [blockReason, setBlockReason] = useState('')

  const fetchBookings = useCallback(async () => {
    const res = await getBookings()
    if (res.data) {
      const d: any = res.data
      setAllBookings(Array.isArray(d) ? d : (d.results || []))
    }
    if (res.error) setError(res.error)
    setLoading(false)
  }, [])

  const fetchBlocks = useCallback(async () => {
    const today = new Date().toISOString().split('T')[0]
    const [bRes, sRes] = await Promise.all([
      getStaffBlocks({ date_from: today }),
      getStaffList()
    ])
    setBlocks(bRes.data || [])
    setStaffList(sRes.data || [])
  }, [])

  useEffect(() => { fetchBookings() }, [fetchBookings])
  useEffect(() => { if (tab === 'blocks') fetchBlocks() }, [tab, fetchBlocks])

  async function handleCancel(id: number, clientName: string) {
    if (!confirm(`Cancel booking #${id} for ${clientName}? The time slot will become available again.`)) return
    const res = await cancelBooking(id)
    if (res.data) {
      setSuccess(`Booking #${id} cancelled.`)
      setAllBookings(prev => prev.map(b => b.id === id ? res.data : b))
    } else {
      setError(res.error || 'Failed to cancel')
    }
  }

  async function handleComplete(id: number) {
    const res = await completeBooking(id)
    if (res.data) {
      setSuccess(`Booking #${id} completed.`)
      setAllBookings(prev => prev.map(b => b.id === id ? res.data : b))
    }
  }

  async function handleNoShow(id: number) {
    const res = await markNoShow(id)
    if (res.data) {
      setSuccess(`Booking #${id} marked no-show.`)
      setAllBookings(prev => prev.map(b => b.id === id ? res.data : b))
    }
  }

  async function handleSaveBookingNotes(bookingId: number) {
    const res = await updateBookingNotes(bookingId, noteDraft)
    if (res.data) {
      setAllBookings(prev => prev.map(b => b.id === bookingId ? res.data : b))
      setEditingBookingNotes(null)
      setSuccess('Booking notes saved.')
    } else { setError(res.error || 'Failed to save notes') }
  }

  async function handleSaveClientNotes(bookingId: number) {
    const res = await updateClientNotes(bookingId, noteDraft)
    if (res.data) {
      setAllBookings(prev => prev.map(b => b.id === bookingId ? res.data : b))
      setEditingClientNotes(null)
      setSuccess('Client notes saved.')
    } else { setError(res.error || 'Failed to save notes') }
  }

  async function handleCreateBlock(e: React.FormEvent) {
    e.preventDefault()
    if (!blockStaff) { setError('Select a staff member'); return }
    const res = await createStaffBlock({
      staff_id: Number(blockStaff),
      date: blockDate,
      start_time: blockAllDay ? '00:00' : blockStart,
      end_time: blockAllDay ? '23:59' : blockEnd,
      reason: blockReason,
      all_day: blockAllDay,
    })
    if (res.data) {
      setSuccess('Time blocked out successfully')
      setShowBlockForm(false)
      setBlockReason('')
      fetchBlocks()
    } else {
      setError(res.error || 'Failed to create block')
    }
  }

  async function handleDeleteBlock(id: number) {
    if (!confirm('Remove this block? The time will become available again.')) return
    const res = await deleteStaffBlock(id)
    if (res.status === 204 || res.data) {
      setSuccess('Block removed')
      fetchBlocks()
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div>
        <div>Loading bookings…</div>
      </div>
    </div>
  )

  // ── Smart filtering ──
  const todayStr = new Date().toDateString()
  const filtered = allBookings
    .filter(b => {
      if (smartFilter === 'high_risk') return b.risk_level === 'HIGH' || b.risk_level === 'CRITICAL'
      if (smartFilter === 'due_today') return new Date(b.start_time).toDateString() === todayStr
      if (smartFilter === 'unpaid') return b.payment_status === 'pending' || b.payment_status === 'failed'
      if (smartFilter === 'needs_attention') {
        return (b.risk_level === 'HIGH' || b.risk_level === 'CRITICAL')
          || (b.payment_status === 'pending' && (b.status === 'confirmed' || b.status === 'pending'))
          || (b.client_consecutive_no_shows > 0)
      }
      return true
    })
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return (b.client_name || '').toLowerCase().includes(q)
        || (b.service_name || '').toLowerCase().includes(q)
        || (b.staff_name || '').toLowerCase().includes(q)
    })

  // ── Smart alert banner ──
  const highRiskToday = allBookings.filter(b =>
    (b.risk_level === 'HIGH' || b.risk_level === 'CRITICAL')
    && new Date(b.start_time).toDateString() === todayStr
    && (b.status === 'confirmed' || b.status === 'pending')
  )
  const revenueAtRisk = highRiskToday.reduce((sum: number, b: any) => sum + (parseFloat(b.revenue_at_risk) || 0), 0)

  const smartFilters: { key: SmartFilter; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: allBookings.length },
    { key: 'high_risk', label: 'High Risk', count: allBookings.filter(b => b.risk_level === 'HIGH' || b.risk_level === 'CRITICAL').length },
    { key: 'due_today', label: 'Due Today', count: allBookings.filter(b => new Date(b.start_time).toDateString() === todayStr).length },
    { key: 'unpaid', label: 'Unpaid', count: allBookings.filter(b => b.payment_status === 'pending' || b.payment_status === 'failed').length },
    { key: 'needs_attention', label: 'Needs Attention' },
  ]

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>Bookings</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Smart Operations Centre</div>
        </div>
        <div style={{ fontSize: '0.8rem', color: C.muted }}>{allBookings.length} total bookings</div>
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        {error} <span onClick={() => setError('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
      </div>}
      {success && <div style={{ background: '#14532d', color: '#86efac', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        {success} <span onClick={() => setSuccess('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
      </div>}

      {/* PHASE 6 — Smart Alert Banner */}
      {highRiskToday.length > 0 && (
        <div onClick={() => setSmartFilter('high_risk')} style={{
          background: `linear-gradient(135deg, ${C.red}20, ${C.darkRed}30)`, border: `1px solid ${C.red}50`,
          borderRadius: 12, padding: '0.75rem 1rem', marginBottom: '0.75rem', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.1rem' }}>⚠</span>
            <span style={{ fontWeight: 700, color: C.red, fontSize: '0.9rem' }}>
              {highRiskToday.length} high-risk booking{highRiskToday.length !== 1 ? 's' : ''} today
            </span>
            {revenueAtRisk > 0 && (
              <span style={{ color: C.muted, fontSize: '0.8rem' }}>— £{revenueAtRisk.toFixed(2)} revenue at risk</span>
            )}
          </div>
          <span style={{ fontSize: '0.75rem', color: C.muted }}>Click to filter →</span>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: `2px solid ${C.border}30`, paddingBottom: '0.5rem' }}>
        {[{ k: 'bookings', l: 'Bookings' }, { k: 'blocks', l: 'Block Out Time' }].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} style={{
            padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === t.k ? C.accent : 'transparent', color: tab === t.k ? '#fff' : C.muted,
            fontWeight: tab === t.k ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.15s',
          }}>{t.l}</button>
        ))}
      </div>

      {/* ═══════════ BOOKINGS TAB ═══════════ */}
      {tab === 'bookings' && (
        <>
          {/* PHASE 5 — Intelligent Filters */}
          <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {smartFilters.map(f => (
              <button key={f.key} onClick={() => setSmartFilter(f.key)} style={{
                padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${smartFilter === f.key ? C.accent : C.border}`,
                background: smartFilter === f.key ? C.accent : 'transparent', color: smartFilter === f.key ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem',
              }}>
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span style={{ background: smartFilter === f.key ? 'rgba(255,255,255,0.2)' : C.cardAlt, padding: '0 5px', borderRadius: 4, fontSize: '0.65rem' }}>{f.count}</span>
                )}
              </button>
            ))}
            <span style={{ width: 1, height: 20, background: C.border, margin: '0 0.25rem' }} />
            <input placeholder="Search client, service, staff..." value={search} onChange={e => setSearch(e.target.value)}
              style={{ padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.8rem', flex: '1 1 180px', minWidth: 140 }} />
          </div>

          {/* Booking rows */}
          {filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>No bookings match your filters.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {filtered.map(b => {
                const start = formatDT(b.start_time)
                const end = b.end_time ? formatDT(b.end_time) : null
                const isActive = b.status === 'confirmed' || b.status === 'pending'
                const isExpanded = expandedId === b.id
                const rl = (b.risk_level || '').toUpperCase()
                const hasNotes = !!(b.notes || b.client_notes)

                return (
                  <div key={b.id}>
                    {/* Main row */}
                    <div onClick={() => setExpandedId(isExpanded ? null : b.id)} style={{
                      display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem',
                      background: isExpanded ? C.cardAlt : C.card, borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                      cursor: 'pointer', transition: 'background 0.15s',
                      borderLeft: rl ? `4px solid ${riskColor(rl)}` : `4px solid ${C.border}`,
                    }} onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.cardAlt }}
                       onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = C.card }}>

                      {/* ID */}
                      <div style={{ width: 40, fontSize: '0.7rem', color: C.muted, flexShrink: 0 }}>#{b.id}</div>

                      {/* Client + notes indicator */}
                      <div style={{ flex: '1 1 140px', minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                          {b.client_name || `Client #${b.client}`}
                          {hasNotes && <span title="Has notes" style={{ fontSize: '0.7rem', color: C.amber }}>📝</span>}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: C.muted }}>{b.service_name}</div>
                      </div>

                      {/* Date/Time */}
                      <div style={{ flex: '0 0 auto', textAlign: 'center', minWidth: 90 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: isToday(b.start_time) ? 700 : 400, color: isToday(b.start_time) ? C.accent : C.text }}>{start.date}</div>
                        <div style={{ fontSize: '0.7rem', color: C.muted }}>{start.time}{end ? ` – ${end.time}` : ''}</div>
                      </div>

                      {/* Staff */}
                      <div style={{ flex: '0 0 auto', fontSize: '0.8rem', color: C.muted, minWidth: 70 }}>{b.staff_name}</div>

                      {/* PHASE 1 — Risk badge with tooltip */}
                      <div style={{ flex: '0 0 auto', minWidth: 60, position: 'relative' }} className="risk-cell">
                        {rl ? (
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
                            background: riskColor(rl) + '25', color: riskColor(rl), textTransform: 'uppercase',
                          }}>{rl}</span>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: C.muted }}>—</span>
                        )}
                        {/* Tooltip on hover (CSS-driven) */}
                        {rl && (
                          <div className="risk-tooltip" style={{
                            display: 'none', position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                            background: C.cardAlt, border: `1px solid ${C.border}`, borderRadius: 8, padding: '0.5rem 0.75rem',
                            zIndex: 100, whiteSpace: 'nowrap', fontSize: '0.7rem', color: C.text, minWidth: 180,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                          }}>
                            <div style={{ marginBottom: 3 }}><span style={{ color: C.muted }}>Reliability:</span> {b.client_reliability_score?.toFixed(0) ?? '—'}%</div>
                            <div style={{ marginBottom: 3 }}><span style={{ color: C.muted }}>Risk Score:</span> {b.risk_score?.toFixed(1) ?? '—'}</div>
                            <div style={{ marginBottom: 3 }}><span style={{ color: C.muted }}>Recommendation:</span> {b.recommended_payment_type || '—'}</div>
                            {b.recommendation_reason && <div style={{ color: C.muted, fontStyle: 'italic', maxWidth: 220, whiteSpace: 'normal' }}>{b.recommendation_reason}</div>}
                          </div>
                        )}
                      </div>

                      {/* PHASE 4 — Payment chip */}
                      <div style={{ flex: '0 0 auto', minWidth: 70 }}>
                        {b.payment_status ? (
                          <span style={{
                            padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
                            background: paymentChipColor(b.payment_status) + '25', color: paymentChipColor(b.payment_status),
                          }}>{b.payment_status === 'paid' ? 'Paid' : b.payment_status === 'refunded' ? 'Refunded' : b.payment_status === 'failed' ? 'Failed' : 'Unpaid'}</span>
                        ) : <span style={{ fontSize: '0.7rem', color: C.muted }}>—</span>}
                        {b.payment_amount && <div style={{ fontSize: '0.65rem', color: C.muted }}>£{parseFloat(b.payment_amount).toFixed(2)}</div>}
                      </div>

                      {/* Status */}
                      <div style={{ flex: '0 0 auto', minWidth: 70 }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700,
                          background: b.status === 'confirmed' ? C.green + '25' : b.status === 'completed' ? C.blue + '25' : b.status === 'cancelled' || b.status === 'no_show' ? C.red + '25' : C.amber + '25',
                          color: b.status === 'confirmed' ? C.green : b.status === 'completed' ? C.blue : b.status === 'cancelled' || b.status === 'no_show' ? C.red : C.amber,
                        }}>{b.status.replace('_', ' ')}</span>
                      </div>

                      {/* Actions */}
                      <div style={{ flex: '0 0 auto', display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                        {isActive && (
                          <>
                            <button onClick={() => handleComplete(b.id)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.green}40`, background: 'transparent', color: C.green, cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}>✓</button>
                            <button onClick={() => handleNoShow(b.id)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.amber}40`, background: 'transparent', color: C.amber, cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}>NS</button>
                            <button onClick={() => handleCancel(b.id, b.client_name)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.red}40`, background: 'transparent', color: C.red, cursor: 'pointer', fontSize: '0.65rem', fontWeight: 600 }}>✕</button>
                          </>
                        )}
                      </div>

                      {/* Expand indicator */}
                      <div style={{ fontSize: '0.7rem', color: C.muted, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</div>
                    </div>

                    {/* PHASE 2 — Expandable detail panel */}
                    {isExpanded && (
                      <div style={{ background: C.card, borderRadius: '0 0 10px 10px', padding: '1rem', borderTop: `1px solid ${C.border}30` }}>
                        <div className="bk-detail-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                          {/* Client Intelligence */}
                          <div>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>Client Intelligence</div>
                            <div style={{ display: 'grid', gap: '0.3rem', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Reliability</span>
                                <span style={{ fontWeight: 700, color: (b.client_reliability_score ?? 100) >= 80 ? C.green : (b.client_reliability_score ?? 100) >= 60 ? C.amber : C.red }}>
                                  {b.client_reliability_score?.toFixed(0) ?? '—'}%
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Lifetime Value</span>
                                <span style={{ fontWeight: 600 }}>£{parseFloat(b.client_lifetime_value || '0').toFixed(2)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Total Bookings</span>
                                <span>{b.client_total_bookings ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Completed</span>
                                <span style={{ color: C.green }}>{b.client_completed_bookings ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>No Shows</span>
                                <span style={{ color: (b.client_no_show_count ?? 0) > 0 ? C.red : C.muted }}>{b.client_no_show_count ?? 0}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Consecutive No Shows</span>
                                <span style={{ color: (b.client_consecutive_no_shows ?? 0) > 0 ? C.red : C.muted, fontWeight: (b.client_consecutive_no_shows ?? 0) > 0 ? 700 : 400 }}>
                                  {b.client_consecutive_no_shows ?? 0}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Risk & Recommendation */}
                          <div>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>Risk & Recommendation</div>
                            <div style={{ display: 'grid', gap: '0.3rem', fontSize: '0.8rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Risk Level</span>
                                {rl ? <span style={{ fontWeight: 700, color: riskColor(rl) }}>{rl}</span> : <span style={{ color: C.muted }}>—</span>}
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Risk Score</span>
                                <span>{b.risk_score?.toFixed(1) ?? '—'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Revenue at Risk</span>
                                <span style={{ color: b.revenue_at_risk > 0 ? C.red : C.muted, fontWeight: 600 }}>
                                  {b.revenue_at_risk ? `£${parseFloat(b.revenue_at_risk).toFixed(2)}` : '—'}
                                </span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span style={{ color: C.muted }}>Deposit Status</span>
                                <span style={{ color: b.payment_status === 'paid' ? C.green : C.amber }}>{b.payment_status || 'pending'}</span>
                              </div>
                              {b.recommended_payment_type && (
                                <div style={{ marginTop: '0.25rem', padding: '0.4rem 0.6rem', background: C.accent + '15', borderRadius: 6, fontSize: '0.75rem' }}>
                                  <span style={{ color: C.accent, fontWeight: 600 }}>SBE Recommendation:</span> {b.recommended_payment_type}
                                  {b.recommended_deposit_percent && <span> ({b.recommended_deposit_percent}% deposit)</span>}
                                </div>
                              )}
                              {b.recommendation_reason && (
                                <div style={{ fontSize: '0.75rem', color: C.muted, fontStyle: 'italic' }}>{b.recommendation_reason}</div>
                              )}
                            </div>
                          </div>

                          {/* PHASE 3 — Notes */}
                          <div>
                            <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>Notes</div>

                            {/* Booking notes */}
                            <div style={{ marginBottom: '0.5rem' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.7rem', color: C.muted }}>Booking Notes</span>
                                {editingBookingNotes !== b.id ? (
                                  <span onClick={() => { setEditingBookingNotes(b.id); setNoteDraft(b.notes || ''); setEditingClientNotes(null) }}
                                    style={{ fontSize: '0.65rem', color: C.accent, cursor: 'pointer' }}>Edit</span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <span onClick={() => handleSaveBookingNotes(b.id)} style={{ fontSize: '0.65rem', color: C.green, cursor: 'pointer', fontWeight: 600 }}>Save</span>
                                    <span onClick={() => setEditingBookingNotes(null)} style={{ fontSize: '0.65rem', color: C.muted, cursor: 'pointer' }}>Cancel</span>
                                  </div>
                                )}
                              </div>
                              {editingBookingNotes === b.id ? (
                                <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={2}
                                  style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.8rem', resize: 'vertical' }} />
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: b.notes ? C.text : C.muted, padding: '0.3rem 0' }}>
                                  {b.notes || 'No booking notes.'}
                                </div>
                              )}
                            </div>

                            {/* Client profile notes */}
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                                <span style={{ fontSize: '0.7rem', color: C.muted }}>Client Profile Notes</span>
                                {editingClientNotes !== b.id ? (
                                  <span onClick={() => { setEditingClientNotes(b.id); setNoteDraft(b.client_notes || ''); setEditingBookingNotes(null) }}
                                    style={{ fontSize: '0.65rem', color: C.accent, cursor: 'pointer' }}>Edit</span>
                                ) : (
                                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                                    <span onClick={() => handleSaveClientNotes(b.id)} style={{ fontSize: '0.65rem', color: C.green, cursor: 'pointer', fontWeight: 600 }}>Save</span>
                                    <span onClick={() => setEditingClientNotes(null)} style={{ fontSize: '0.65rem', color: C.muted, cursor: 'pointer' }}>Cancel</span>
                                  </div>
                                )}
                              </div>
                              {editingClientNotes === b.id ? (
                                <textarea value={noteDraft} onChange={e => setNoteDraft(e.target.value)} rows={2}
                                  style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.8rem', resize: 'vertical' }} />
                              ) : (
                                <div style={{ fontSize: '0.8rem', color: b.client_notes ? C.text : C.muted, padding: '0.3rem 0' }}>
                                  {b.client_notes || 'No client notes.'}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ═══════════ BLOCK OUT TIME TAB ═══════════ */}
      {tab === 'blocks' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => setShowBlockForm(!showBlockForm)} style={{
              padding: '0.4rem 1rem', borderRadius: 8, border: 'none',
              background: showBlockForm ? C.red : C.accent, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
            }}>{showBlockForm ? 'Cancel' : '+ Block Out Time'}</button>
          </div>

          {showBlockForm && (
            <form onSubmit={handleCreateBlock} style={{ background: C.card, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: C.text }}>Block Out Unavailable Time</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: C.muted }}>Staff Member *</label>
                  <select value={blockStaff} onChange={e => setBlockStaff(e.target.value)} required
                    style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }}>
                    <option value="">Select staff...</option>
                    {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: C.muted }}>Date *</label>
                  <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} required
                    style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.8rem', color: C.muted }}>
                    <input type="checkbox" checked={blockAllDay} onChange={e => setBlockAllDay(e.target.checked)} style={{ width: 'auto' }} />
                    Block entire day
                  </label>
                </div>
                {!blockAllDay && (
                  <>
                    <div><label style={{ fontSize: '0.8rem', color: C.muted }}>From</label><input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                    <div><label style={{ fontSize: '0.8rem', color: C.muted }}>To</label><input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                  </>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.8rem', color: C.muted }}>Reason (optional)</label>
                  <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Personal appointment, Training, Holiday"
                    style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}>
                <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Block Time</button>
              </div>
            </form>
          )}

          {blocks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>No blocked time.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              {blocks.map((bl: any) => (
                <div key={bl.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.6rem 0.75rem', background: C.card, borderRadius: 8 }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{bl.staff_name}</span>
                    <span style={{ fontSize: '0.8rem', color: C.muted, marginLeft: '0.5rem' }}>
                      {new Date(bl.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: C.muted, marginLeft: '0.5rem' }}>
                      {bl.all_day ? 'All Day' : `${bl.start_time} – ${bl.end_time}`}
                    </span>
                    {bl.reason && <span style={{ fontSize: '0.75rem', color: C.muted, marginLeft: '0.5rem' }}>({bl.reason})</span>}
                  </div>
                  <button onClick={() => handleDeleteBlock(bl.id)} style={{ padding: '2px 8px', borderRadius: 4, border: `1px solid ${C.red}40`, background: 'transparent', color: C.red, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>Remove</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: C.muted, padding: '0.75rem', background: C.card, borderRadius: 8 }}>
            Blocked time will not appear as available on the public booking page.
          </div>
        </div>
      )}

      {/* CSS for risk tooltip hover */}
      <style>{`
        .risk-cell:hover .risk-tooltip { display: block !important; }
        @media (max-width: 768px) {
          .bk-detail-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
