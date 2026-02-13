'use client'

import { useEffect, useState, useCallback } from 'react'
import { getLeads, createLead, updateLeadStatus, updateLead, syncLeadsFromBookings } from '@/lib/api'

const C = {
  bg: '#0f172a', card: '#1e293b', cardAlt: '#273548', text: '#f8fafc', muted: '#94a3b8',
  border: '#475569', accent: '#6366f1', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#a78bfa',
}

function fmtPrice(pence: number) { return '£' + (pence / 100).toFixed(2) }

const STATUS_COLORS: Record<string, string> = { NEW: C.blue, CONTACTED: C.amber, QUALIFIED: C.purple, CONVERTED: C.green, LOST: C.red }
const SOURCE_LABELS: Record<string, string> = { booking: 'Booking', website: 'Website', referral: 'Referral', social: 'Social', manual: 'Manual', other: 'Other' }

export default function AdminClientsPage() {
  const [allLeads, setAllLeads] = useState<any[]>([])
  const [filter, setFilter] = useState('ALL')
  const [tagFilter, setTagFilter] = useState('')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [selected, setSelected] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null)

  const loadLeads = useCallback(async () => {
    const r = await getLeads()
    setAllLeads(r.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { loadLeads() }, [loadLeads])
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 3000); return () => clearTimeout(t) } }, [toast])

  async function handleSync() {
    setSyncing(true)
    const res = await syncLeadsFromBookings()
    if (res.data) {
      setToast({ msg: res.data.message || `${res.data.created} leads synced`, type: 'ok' })
      loadLeads()
    } else {
      setToast({ msg: res.error || 'Sync failed', type: 'err' })
    }
    setSyncing(false)
  }

  function handleExportCSV() {
    const statusParam = filter !== 'ALL' ? `?status=${filter}` : ''
    const base = process.env.NEXT_PUBLIC_API_BASE || 'https://theminddepartment-api.fly.dev/api'
    window.open(`${base}/crm/leads/export/${statusParam}`, '_blank')
  }

  async function handleAddLead(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await createLead({
      name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
      source: fd.get('source'), value_pence: Math.round(parseFloat(fd.get('value') as string || '0') * 100),
      notes: fd.get('notes'),
    })
    if (res.data) { setToast({ msg: 'Lead added', type: 'ok' }); setShowAdd(false); loadLeads() }
    else setToast({ msg: res.error || 'Failed', type: 'err' })
  }

  async function handleStatusChange(id: number, newStatus: string) {
    const res = await updateLeadStatus(id, newStatus)
    if (res.data) {
      setAllLeads(prev => prev.map(l => l.id === id ? res.data : l))
      if (selected?.id === id) setSelected(res.data)
    }
  }

  function openDetail(lead: any) {
    setSelected(lead)
    setEditForm({
      name: lead.name, email: lead.email, phone: lead.phone,
      tags: lead.tags || '', follow_up_date: lead.follow_up_date || '',
      last_contact_date: lead.last_contact_date || '', notes: lead.notes || '',
      value_pence: lead.value_pence || 0,
    })
  }

  async function saveDetail() {
    if (!selected) return
    setSaving(true)
    const res = await updateLead(selected.id, {
      ...editForm,
      status: selected.status,
    })
    if (res.data) {
      setAllLeads(prev => prev.map(l => l.id === selected.id ? res.data : l))
      setSelected(res.data)
      setToast({ msg: 'Saved', type: 'ok' })
    } else {
      setToast({ msg: res.error || 'Save failed', type: 'err' })
    }
    setSaving(false)
  }

  // Styles
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.4rem 0.5rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.85rem', colorScheme: 'dark' }
  const labelStyle: React.CSSProperties = { fontSize: '0.75rem', color: C.muted, marginBottom: 2, display: 'block', fontWeight: 600 }
  const btnStyle: React.CSSProperties = { padding: '0.45rem 1rem', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', transition: 'opacity 0.15s' }
  const btnPrimary: React.CSSProperties = { ...btnStyle, background: C.accent, color: '#fff' }
  const btnGhost: React.CSSProperties = { ...btnStyle, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted }
  const btnSm: React.CSSProperties = { padding: '0.3rem 0.7rem', fontSize: '0.75rem' }
  const thStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, borderBottom: `1px solid ${C.border}`, fontWeight: 600 }
  const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: `1px solid ${C.border}30`, fontSize: '0.85rem', color: C.text }
  const badgeStyle = (color: string): React.CSSProperties => ({ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: color + '25', color })
  const optStyle: React.CSSProperties = { background: C.bg, color: C.text }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📋</div><div>Loading CRM…</div></div></div>

  // Compute stats
  const today = new Date().toISOString().slice(0, 10)
  const allTags = Array.from(new Set(allLeads.flatMap(l => (l.tags || '').split(',').map((t: string) => t.trim()).filter(Boolean))))
  const overdue = allLeads.filter(l => l.follow_up_date && l.follow_up_date < today && !['CONVERTED', 'LOST'].includes(l.status))

  const filtered = allLeads
    .filter(l => filter === 'ALL' || l.status === filter)
    .filter(l => !tagFilter || (l.tags || '').toLowerCase().includes(tagFilter.toLowerCase()))
    .filter(l => !search || (l.name || '').toLowerCase().includes(search.toLowerCase()) || (l.email || '').toLowerCase().includes(search.toLowerCase()) || (l.phone || '').includes(search))

  const stats = {
    total: allLeads.length,
    new: allLeads.filter(l => l.status === 'NEW').length,
    contacted: allLeads.filter(l => l.status === 'CONTACTED').length,
    qualified: allLeads.filter(l => l.status === 'QUALIFIED').length,
    converted: allLeads.filter(l => l.status === 'CONVERTED').length,
    lost: allLeads.filter(l => l.status === 'LOST').length,
    pipeline: allLeads.filter(l => !['CONVERTED', 'LOST'].includes(l.status)).reduce((s: number, l: any) => s + (l.value_pence || 0), 0),
    overdue: overdue.length,
  }

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 2000, padding: '0.6rem 1.2rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, background: toast.type === 'ok' ? C.green + '20' : '#7f1d1d', color: toast.type === 'ok' ? C.green : '#fca5a5', border: `1px solid ${toast.type === 'ok' ? C.green + '40' : '#991b1b'}` }}>
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>CRM</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Leads, pipeline &amp; client relationships</div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button style={{ ...btnGhost, ...btnSm }} onClick={handleSync} disabled={syncing}>{syncing ? 'Syncing…' : 'Sync from Bookings'}</button>
          <button style={{ ...btnGhost, ...btnSm }} onClick={handleExportCSV}>CSV Export</button>
          <button style={btnPrimary} onClick={() => setShowAdd(true)}>+ Add Lead</button>
        </div>
      </div>

      {/* KPI Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
        {[
          { label: 'Total', value: String(stats.total), color: C.text },
          { label: 'New', value: String(stats.new), color: C.blue },
          { label: 'Contacted', value: String(stats.contacted), color: C.amber },
          { label: 'Qualified', value: String(stats.qualified), color: C.purple },
          { label: 'Converted', value: String(stats.converted), color: C.green },
          { label: 'Pipeline', value: fmtPrice(stats.pipeline), color: C.accent },
          { label: 'Overdue Follow-ups', value: String(stats.overdue), color: stats.overdue > 0 ? C.red : C.muted },
        ].map(k => (
          <div key={k.label} style={{ background: C.card, borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.3rem', fontWeight: 700, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: '0.6rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <input placeholder="Search name, email, phone…" value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputStyle, maxWidth: 240 }} />
        <select value={filter} onChange={e => setFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 150 }}>
          <option value="ALL" style={optStyle}>All Status</option>
          <option value="NEW" style={optStyle}>New</option>
          <option value="CONTACTED" style={optStyle}>Contacted</option>
          <option value="QUALIFIED" style={optStyle}>Qualified</option>
          <option value="CONVERTED" style={optStyle}>Converted</option>
          <option value="LOST" style={optStyle}>Lost</option>
        </select>
        {allTags.length > 0 && (
          <select value={tagFilter} onChange={e => setTagFilter(e.target.value)} style={{ ...inputStyle, maxWidth: 150 }}>
            <option value="" style={optStyle}>All Tags</option>
            {allTags.map(t => <option key={t} value={t} style={optStyle}>{t}</option>)}
          </select>
        )}
        <span style={{ fontSize: '0.75rem', color: C.muted }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Leads Table */}
      <div style={{ background: C.card, borderRadius: 12, overflow: 'auto', marginBottom: '1rem' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
          <thead><tr>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Source</th>
            <th style={thStyle}>Value</th>
            <th style={thStyle}>Tags</th>
            <th style={thStyle}>Follow-up</th>
            <th style={thStyle}>Created</th>
            <th style={thStyle}>Status</th>
          </tr></thead>
          <tbody>
            {filtered.map(l => {
              const isOverdue = l.follow_up_date && l.follow_up_date < today && !['CONVERTED', 'LOST'].includes(l.status)
              return (
                <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => openDetail(l)} onMouseEnter={e => (e.currentTarget.style.background = C.cardAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>
                    <div>{l.name}</div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>{l.email}{l.phone ? ` · ${l.phone}` : ''}</div>
                  </td>
                  <td style={tdStyle}><span style={badgeStyle(C.muted)}>{SOURCE_LABELS[l.source] || l.source}</span></td>
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{fmtPrice(l.value_pence || 0)}</td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                      {(l.tags || '').split(',').filter((t: string) => t.trim()).map((t: string) => (
                        <span key={t.trim()} style={{ ...badgeStyle(C.accent), fontSize: '0.6rem' }}>{t.trim()}</span>
                      ))}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: isOverdue ? C.red : C.muted, fontWeight: isOverdue ? 700 : 400, fontSize: '0.8rem' }}>
                    {l.follow_up_date ? new Date(l.follow_up_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '—'}
                    {isOverdue && <span style={{ fontSize: '0.6rem', marginLeft: 4 }}>OVERDUE</span>}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.8rem' }}>{new Date(l.created_at).toLocaleDateString('en-GB')}</td>
                  <td style={tdStyle} onClick={e => e.stopPropagation()}>
                    <select value={l.status} onChange={e => handleStatusChange(l.id, e.target.value)} style={{ ...inputStyle, width: 'auto', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 600, color: STATUS_COLORS[l.status] || C.text, background: (STATUS_COLORS[l.status] || C.muted) + '15', border: `1px solid ${(STATUS_COLORS[l.status] || C.muted)}40`, borderRadius: 6 }}>
                      <option value="NEW" style={optStyle}>New</option>
                      <option value="CONTACTED" style={optStyle}>Contacted</option>
                      <option value="QUALIFIED" style={optStyle}>Qualified</option>
                      <option value="CONVERTED" style={optStyle}>Converted</option>
                      <option value="LOST" style={optStyle}>Lost</option>
                    </select>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && <tr><td colSpan={7} style={{ textAlign: 'center', padding: '2rem', color: C.muted, fontSize: '0.85rem' }}>No leads found. Click &quot;Sync from Bookings&quot; to import existing clients.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Add Lead Modal */}
      {showAdd && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAdd(false)}>
          <form onSubmit={handleAddLead} onClick={e => e.stopPropagation()} style={{ maxWidth: 500, width: '100%', padding: '2rem', background: C.cardAlt, borderRadius: 16, color: C.text }}>
            <h2 style={{ margin: '0 0 1rem', color: C.text }}>Add New Lead</h2>
            <div style={{ display: 'grid', gap: 12, gridTemplateColumns: '1fr 1fr' }}>
              <div><label style={labelStyle}>Name *</label><input name="name" required placeholder="Full name" style={inputStyle} /></div>
              <div><label style={labelStyle}>Email</label><input name="email" type="email" placeholder="email@example.com" style={inputStyle} /></div>
              <div><label style={labelStyle}>Phone</label><input name="phone" placeholder="07700 900000" style={inputStyle} /></div>
              <div><label style={labelStyle}>Source</label>
                <select name="source" style={inputStyle}>
                  <option value="manual" style={optStyle}>Manual Entry</option>
                  <option value="website" style={optStyle}>Website</option>
                  <option value="referral" style={optStyle}>Referral</option>
                  <option value="social" style={optStyle}>Social Media</option>
                  <option value="other" style={optStyle}>Other</option>
                </select>
              </div>
              <div><label style={labelStyle}>Value (£)</label><input name="value" type="number" step="0.01" defaultValue="0" style={inputStyle} /></div>
              <div><label style={labelStyle}>Notes</label><input name="notes" placeholder="Any notes…" style={inputStyle} /></div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button type="button" style={btnGhost} onClick={() => setShowAdd(false)}>Cancel</button>
              <button type="submit" style={btnPrimary}>Add Lead</button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Slide-out Panel */}
      {selected && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }} onClick={() => setSelected(null)}>
          <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 480, background: C.card, height: '100vh', overflowY: 'auto', padding: '1.5rem', borderLeft: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: C.text }}>{selected.name}</h2>
              <button style={{ ...btnGhost, ...btnSm }} onClick={() => setSelected(null)}>✕</button>
            </div>

            {/* Quick info */}
            <div style={{ display: 'flex', gap: 6, marginBottom: '1rem', flexWrap: 'wrap' }}>
              <span style={badgeStyle(STATUS_COLORS[selected.status] || C.muted)}>{selected.status}</span>
              <span style={badgeStyle(C.muted)}>{SOURCE_LABELS[selected.source] || selected.source}</span>
              <span style={{ ...badgeStyle(C.accent), fontWeight: 700 }}>{fmtPrice(selected.value_pence || 0)}</span>
            </div>

            {/* Contact quick actions */}
            <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem' }}>
              {selected.email && <a href={`mailto:${selected.email}`} style={{ ...btnGhost, ...btnSm, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>✉ Email</a>}
              {selected.phone && <a href={`tel:${selected.phone}`} style={{ ...btnGhost, ...btnSm, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>📞 Call</a>}
            </div>

            {/* Editable fields */}
            <div style={{ display: 'grid', gap: 12, marginBottom: '1.25rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Name</label><input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Email</label><input value={editForm.email} onChange={e => setEditForm({ ...editForm, email: e.target.value })} style={inputStyle} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Phone</label><input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Value (£)</label><input type="number" step="0.01" value={(editForm.value_pence / 100).toFixed(2)} onChange={e => setEditForm({ ...editForm, value_pence: Math.round(parseFloat(e.target.value || '0') * 100) })} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Tags (comma-separated)</label><input value={editForm.tags} onChange={e => setEditForm({ ...editForm, tags: e.target.value })} placeholder="VIP, Lapsed, New client offer" style={inputStyle} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div><label style={labelStyle}>Follow-up Date</label><input type="date" value={editForm.follow_up_date} onChange={e => setEditForm({ ...editForm, follow_up_date: e.target.value })} style={inputStyle} /></div>
                <div><label style={labelStyle}>Last Contact</label><input type="date" value={editForm.last_contact_date} onChange={e => setEditForm({ ...editForm, last_contact_date: e.target.value })} style={inputStyle} /></div>
              </div>
              <div><label style={labelStyle}>Notes</label><textarea value={editForm.notes} onChange={e => setEditForm({ ...editForm, notes: e.target.value })} rows={4} style={{ ...inputStyle, resize: 'vertical' }} /></div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button style={btnGhost} onClick={() => setSelected(null)}>Close</button>
              <button style={btnPrimary} onClick={saveDetail} disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
            </div>

            {/* Timeline */}
            <div style={{ marginTop: '1.5rem', borderTop: `1px solid ${C.border}30`, paddingTop: '1rem' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Timeline</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: '0.8rem', color: C.muted, padding: '0.4rem 0.6rem', background: C.bg, borderRadius: 6 }}>
                  <span style={{ fontWeight: 600, color: C.text }}>Created</span> — {new Date(selected.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
                {selected.last_contact_date && (
                  <div style={{ fontSize: '0.8rem', color: C.muted, padding: '0.4rem 0.6rem', background: C.bg, borderRadius: 6 }}>
                    <span style={{ fontWeight: 600, color: C.text }}>Last Contact</span> — {new Date(selected.last_contact_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
                {selected.follow_up_date && (
                  <div style={{ fontSize: '0.8rem', color: selected.follow_up_date < today ? C.red : C.amber, padding: '0.4rem 0.6rem', background: C.bg, borderRadius: 6 }}>
                    <span style={{ fontWeight: 600 }}>Follow-up {selected.follow_up_date < today ? '(OVERDUE)' : ''}</span> — {new Date(selected.follow_up_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
