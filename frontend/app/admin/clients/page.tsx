'use client'

import { useEffect, useState, useCallback } from 'react'
import { getLeads, createLead, updateLeadStatus } from '@/lib/api'

function formatPrice(pence: number) { return '£' + (pence / 100).toFixed(2) }

export default function AdminClientsPage() {
  const [allLeads, setAllLeads] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const loadLeads = useCallback(async () => {
    const r = await getLeads()
    setAllLeads(r.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])

  async function handleSync() {
    setSyncing(true)
    setError('')
    try {
      const res = await fetch('/api/django/crm/sync/', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      setSuccess(data.message || `${data.created} leads synced`)
      loadLeads()
    } catch (e: any) {
      setError(e.message || 'Sync failed')
    }
    setSyncing(false)
  }

  function handleExportCSV() {
    const statusParam = filter !== 'ALL' ? `?status=${filter}` : ''
    window.open(`/api/django/crm/leads/export/${statusParam}`, '_blank')
  }

  async function handleAddLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await createLead({
      name: fd.get('name'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      source: fd.get('source'),
      value_pence: Math.round(parseFloat(fd.get('value') as string || '0') * 100),
      notes: fd.get('notes'),
    })
    if (res.data) {
      setSuccess('Lead added')
      setShowAdd(false)
      loadLeads()
    } else {
      setError(res.error || 'Failed to add lead')
    }
  }

  async function handleStatusChange(id: number, newStatus: string) {
    const res = await updateLeadStatus(id, newStatus)
    if (res.data) {
      setAllLeads(prev => prev.map(l => l.id === id ? res.data : l))
    }
  }

  if (loading) return <div className="empty-state">Loading leads…</div>

  const filtered = allLeads
    .filter(l => filter === 'ALL' || l.status === filter)
    .filter(l => !search || (l.name || '').toLowerCase().includes(search.toLowerCase()))

  const stats = {
    total: allLeads.length,
    new: allLeads.filter(l => l.status === 'NEW').length,
    converted: allLeads.filter(l => l.status === 'CONVERTED').length,
    pipeline: formatPrice(allLeads.filter(l => !['CONVERTED', 'LOST'].includes(l.status)).reduce((s: number, l: any) => s + (l.value_pence || 0), 0)),
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>CRM — Leads</h1>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-sm" onClick={handleSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync from Bookings'}</button>
          <button className="btn btn-sm" onClick={handleExportCSV}>Download CSV</button>
          <button className="btn btn-sm btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add Lead</button>
        </div>
      </div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}
      {success && <div className="card" style={{ background: '#f0fdf4', color: '#166534', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {success} <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}

      {showAdd && (
        <form onSubmit={handleAddLead} className="card" style={{ marginBottom: '1rem' }}>
          <h3 style={{ marginBottom: '0.75rem' }}>Add New Lead</h3>
          <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
            <div><label>Name *</label><input name="name" required placeholder="Full name" /></div>
            <div><label>Email</label><input name="email" type="email" placeholder="email@example.com" /></div>
            <div><label>Phone</label><input name="phone" placeholder="07700 900000" /></div>
            <div><label>Source</label>
              <select name="source">
                <option value="manual">Manual Entry</option>
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="social">Social Media</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div><label>Value (£)</label><input name="value" type="number" step="0.01" defaultValue="0" /></div>
            <div><label>Notes</label><input name="notes" placeholder="Any notes..." /></div>
          </div>
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '0.5rem' }}>
            <button type="submit" className="btn btn-primary btn-sm">Add Lead</button>
            <button type="button" className="btn btn-sm" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </form>
      )}

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-number">{stats.total}</div><div className="stat-label">Total Leads</div></div>
        <div className="stat-card"><div className="stat-number">{stats.new}</div><div className="stat-label">New</div></div>
        <div className="stat-card"><div className="stat-number">{stats.converted}</div><div className="stat-label">Converted</div></div>
        <div className="stat-card"><div className="stat-number">{stats.pipeline}</div><div className="stat-label">Pipeline Value</div></div>
      </div>
      <div className="filter-bar">
        <input placeholder="Search leads..." value={search} onChange={e => setSearch(e.target.value)} />
        <select value={filter} onChange={e => setFilter(e.target.value)}>
          <option value="ALL">All Status</option>
          <option value="NEW">New</option>
          <option value="CONTACTED">Contacted</option>
          <option value="QUALIFIED">Qualified</option>
          <option value="CONVERTED">Converted</option>
          <option value="LOST">Lost</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Source</th><th>Value</th><th>Notes</th><th>Created</th><th>Status</th></tr></thead>
          <tbody>
            {filtered.map(l => (
              <tr key={l.id}>
                <td><div style={{ fontWeight: 600 }}>{l.name}</div><div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{l.email}{l.phone ? ` · ${l.phone}` : ''}</div></td>
                <td><span className="badge badge-neutral">{l.source}</span></td>
                <td style={{ fontWeight: 600 }}>{formatPrice(l.value_pence || 0)}</td>
                <td style={{ maxWidth: 200, fontSize: '0.85rem' }}>{l.notes}</td>
                <td style={{ fontSize: '0.85rem' }}>{new Date(l.created_at).toLocaleDateString('en-GB')}</td>
                <td>
                  <select
                    value={l.status}
                    onChange={e => handleStatusChange(l.id, e.target.value)}
                    className={`badge ${l.status === 'CONVERTED' ? 'badge-success' : l.status === 'LOST' ? 'badge-danger' : l.status === 'NEW' ? 'badge-info' : 'badge-warning'}`}
                    style={{ cursor: 'pointer', border: 'none', fontSize: '0.8rem', padding: '0.25rem 0.5rem' }}
                  >
                    <option value="NEW">New</option>
                    <option value="CONTACTED">Contacted</option>
                    <option value="QUALIFIED">Qualified</option>
                    <option value="CONVERTED">Converted</option>
                    <option value="LOST">Lost</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && <tr><td colSpan={6} className="empty-state">No leads found. Click "Sync from Bookings" to import existing clients.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  )
}
