'use client'

import { useEffect, useState } from 'react'
import { getBookings } from '@/lib/api'

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

  useEffect(() => {
    getBookings().then(res => {
      if (res.data) {
        const d: any = res.data
        const bookings = Array.isArray(d) ? d : (d.results || [])
        setAllBookings(bookings)
      }
      if (res.error) setError(res.error)
      setLoading(false)
    })
  }, [])

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
      <div className="page-header"><h1>Bookings</h1><span className="badge badge-info">{allBookings.length} total</span></div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>{error}</div>}

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
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => {
              const start = formatDateTime(b.start_time)
              const end = b.end_time ? formatDateTime(b.end_time) : null
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
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="empty-state">No bookings found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
