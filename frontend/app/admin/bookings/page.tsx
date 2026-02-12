'use client'

import { useEffect, useState, useCallback } from 'react'
import { getBookings, cancelBooking, completeBooking, markNoShow, getStaffBlocks, createStaffBlock, deleteStaffBlock, getStaffList } from '@/lib/api'

function statusBadge(s: string) {
  const cls = s === 'confirmed' ? 'badge-success'
    : s === 'completed' ? 'badge-info'
    : s === 'cancelled' || s === 'no_show' ? 'badge-danger'
    : 'badge-warning'
  return <span className={`badge ${cls}`}>{s.replace('_', ' ')}</span>
}

function paymentBadge(s: string) {
  const cls = s === 'paid' ? 'badge-success'
    : s === 'refunded' ? 'badge-info'
    : s === 'failed' ? 'badge-danger'
    : 'badge-warning'
  return <span className={`badge ${cls}`}>{s.replace('_', ' ')}</span>
}

function formatDateTime(iso: string) {
  if (!iso) return { date: '—', time: '—' }
  const d = new Date(iso)
  return {
    date: d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }),
    time: d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
  }
}

export default function AdminBookingsPage() {
  const [allBookings, setAllBookings] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'bookings' | 'blocks'>('bookings')

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
      setSuccess(`Booking #${id} cancelled. Slot is now available.`)
      setAllBookings(prev => prev.map(b => b.id === id ? res.data : b))
    } else {
      setError(res.error || 'Failed to cancel')
    }
  }

  async function handleComplete(id: number) {
    const res = await completeBooking(id)
    if (res.data) {
      setSuccess(`Booking #${id} marked as completed.`)
      setAllBookings(prev => prev.map(b => b.id === id ? res.data : b))
    }
  }

  async function handleNoShow(id: number) {
    const res = await markNoShow(id)
    if (res.data) {
      setSuccess(`Booking #${id} marked as no-show.`)
      setAllBookings(prev => prev.map(b => b.id === id ? res.data : b))
    }
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

  if (loading) return <div className="empty-state">Loading bookings…</div>

  const filtered = allBookings
    .filter(b => filter === 'all' || b.status === filter)
    .filter(b => {
      if (!search) return true
      const q = search.toLowerCase()
      return (b.client_name || '').toLowerCase().includes(q)
        || (b.service_name || '').toLowerCase().includes(q)
        || (b.staff_name || '').toLowerCase().includes(q)
    })

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Bookings</h1>
        <span className="badge badge-info">{allBookings.length} total</span>
      </div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}
      {success && <div className="card" style={{ background: '#f0fdf4', color: '#166534', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {success} <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}

      <div className="tabs" style={{ marginBottom: '1rem' }}>
        <button className={`tab ${tab === 'bookings' ? 'active' : ''}`} onClick={() => setTab('bookings')}>Bookings</button>
        <button className={`tab ${tab === 'blocks' ? 'active' : ''}`} onClick={() => setTab('blocks')}>Block Out Time</button>
      </div>

      {/* ===== BOOKINGS TAB ===== */}
      {tab === 'bookings' && (
        <>
          <div className="filter-bar">
            <input placeholder="Search client, service or staff..." value={search} onChange={e => setSearch(e.target.value)} />
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Pending</option>
              <option value="completed">Completed</option>
              <option value="no_show">No Show</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Client</th>
                  <th>Service</th>
                  <th>Date / Time</th>
                  <th>Staff</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(b => {
                  const start = formatDateTime(b.start_time)
                  const end = b.end_time ? formatDateTime(b.end_time) : null
                  const isActive = b.status === 'confirmed' || b.status === 'pending'
                  return (
                    <tr key={b.id}>
                      <td>#{b.id}</td>
                      <td style={{ fontWeight: 600 }}>{b.client_name || `Client #${b.client}`}</td>
                      <td>{b.service_name || `Service #${b.service}`}</td>
                      <td>
                        <div>{start.date}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          {start.time}{end ? ` – ${end.time}` : ''}
                        </div>
                      </td>
                      <td>{b.staff_name || `Staff #${b.staff}`}</td>
                      <td>
                        {b.payment_status && paymentBadge(b.payment_status)}
                        {b.payment_amount && <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>£{parseFloat(b.payment_amount).toFixed(2)}</div>}
                      </td>
                      <td>{statusBadge(b.status)}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {isActive && (
                          <>
                            <button className="btn btn-sm btn-outline" style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }} onClick={() => handleCancel(b.id, b.client_name)}>Cancel</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleComplete(b.id)} style={{ marginLeft: 4 }}>Complete</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => handleNoShow(b.id)} style={{ marginLeft: 4 }}>No Show</button>
                          </>
                        )}
                        {!isActive && <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>—</span>}
                      </td>
                    </tr>
                  )
                })}
                {filtered.length === 0 && <tr><td colSpan={8} className="empty-state">No bookings found</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ===== BLOCK OUT TIME TAB ===== */}
      {tab === 'blocks' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowBlockForm(!showBlockForm)}>
              {showBlockForm ? 'Cancel' : '+ Block Out Time'}
            </button>
          </div>

          {showBlockForm && (
            <form onSubmit={handleCreateBlock} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Block Out Unavailable Time</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                <div>
                  <label>Staff Member *</label>
                  <select value={blockStaff} onChange={e => setBlockStaff(e.target.value)} required>
                    <option value="">Select staff...</option>
                    {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label>Date *</label>
                  <input type="date" value={blockDate} onChange={e => setBlockDate(e.target.value)} required />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={blockAllDay} onChange={e => setBlockAllDay(e.target.checked)} style={{ width: 'auto' }} />
                    Block entire day
                  </label>
                </div>
                {!blockAllDay && (
                  <>
                    <div><label>From</label><input type="time" value={blockStart} onChange={e => setBlockStart(e.target.value)} /></div>
                    <div><label>To</label><input type="time" value={blockEnd} onChange={e => setBlockEnd(e.target.value)} /></div>
                  </>
                )}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label>Reason (optional)</label>
                  <input value={blockReason} onChange={e => setBlockReason(e.target.value)} placeholder="e.g. Personal appointment, Training, Holiday" />
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Block Time</button>
              </div>
            </form>
          )}

          {blocks.length === 0 ? (
            <div className="empty-state">No blocked time. Use the button above to block out unavailable time.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Staff</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {blocks.map((bl: any) => (
                    <tr key={bl.id}>
                      <td style={{ fontWeight: 600 }}>{bl.staff_name}</td>
                      <td>{new Date(bl.date + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td>{bl.all_day ? <span className="badge badge-warning">All Day</span> : `${bl.start_time} – ${bl.end_time}`}</td>
                      <td style={{ fontSize: '0.85rem' }}>{bl.reason || '—'}</td>
                      <td>
                        <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteBlock(bl.id)}>Remove</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            Blocked time will not appear as available on the public booking page. Clients will not be able to book during these times.
          </div>
        </div>
      )}
    </div>
  )
}
