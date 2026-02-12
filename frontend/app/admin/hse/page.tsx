'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/django/compliance'

type Tab = 'dashboard' | 'register' | 'calendar' | 'accidents' | 'audit'

function scoreColor(pct: number) {
  if (pct >= 80) return 'var(--color-success)'
  if (pct >= 60) return 'var(--color-warning)'
  return 'var(--color-danger)'
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB')
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

export default function AdminHSEPage() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [dash, setDash] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [accidents, setAccidents] = useState<any[]>([])
  const [calData, setCalData] = useState<any>(null)
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  // Filters
  const [statusFilter, setStatusFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  // Calendar nav
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  // Completion modal
  const [completeItem, setCompleteItem] = useState<any>(null)
  // Accident form
  const [showAccidentForm, setShowAccidentForm] = useState(false)

  // ===== FETCHERS =====
  const fetchDash = useCallback(async () => {
    try {
      const r = await fetch(`${API}/dashboard/`)
      if (r.ok) setDash(await r.json())
    } catch {}
  }, [])

  const fetchItems = useCallback(async () => {
    try {
      const qs = new URLSearchParams()
      if (statusFilter) qs.set('status', statusFilter)
      if (typeFilter) qs.set('type', typeFilter)
      const r = await fetch(`${API}/items/?${qs}`)
      if (r.ok) setItems(await r.json())
    } catch {}
  }, [statusFilter, typeFilter])

  const fetchAccidents = useCallback(async () => {
    try {
      const r = await fetch(`${API}/accidents/`)
      if (r.ok) setAccidents(await r.json())
    } catch {}
  }, [])

  const fetchCalendar = useCallback(async () => {
    try {
      const r = await fetch(`${API}/calendar/?year=${calYear}&month=${calMonth}`)
      if (r.ok) setCalData(await r.json())
    } catch {}
  }, [calYear, calMonth])

  const fetchAudit = useCallback(async () => {
    try {
      const r = await fetch(`${API}/audit-log/?limit=20`)
      if (r.ok) { const d = await r.json(); setAuditLog(d.logs || []) }
    } catch {}
  }, [])

  useEffect(() => { fetchDash().then(() => setLoading(false)) }, [fetchDash])
  useEffect(() => { if (tab === 'register') fetchItems() }, [tab, fetchItems])
  useEffect(() => { if (tab === 'calendar') fetchCalendar() }, [tab, fetchCalendar])
  useEffect(() => { if (tab === 'accidents') fetchAccidents() }, [tab, fetchAccidents])
  useEffect(() => { if (tab === 'audit') fetchAudit() }, [tab, fetchAudit])

  // ===== COMPLETION MODAL HANDLER =====
  async function handleComplete(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!completeItem) return
    const fd = new FormData(e.currentTarget)
    try {
      const r = await fetch(`${API}/items/${completeItem.id}/complete/`, { method: 'POST', body: fd })
      if (r.ok) {
        const data = await r.json()
        setSuccess(data.message)
        setCompleteItem(null)
        fetchItems(); fetchDash()
      } else {
        setError('Failed to complete item')
      }
    } catch { setError('Network error') }
  }

  // ===== ACCIDENT CREATE =====
  async function handleCreateAccident(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body: any = {}
    fd.forEach((v, k) => { body[k] = v })
    body.riddor_reportable = fd.get('riddor_reportable') === 'on'
    body.follow_up_required = fd.get('follow_up_required') === 'on'
    try {
      const r = await fetch(`${API}/accidents/create/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      })
      if (r.ok) { setShowAccidentForm(false); setSuccess('Accident report created.'); fetchAccidents(); fetchDash() }
      else setError('Failed to create accident report')
    } catch { setError('Network error') }
  }

  // ===== ACCIDENT STATUS UPDATE =====
  async function handleAccidentStatus(id: number, newStatus: string) {
    try {
      const r = await fetch(`${API}/accidents/${id}/update/`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      })
      if (r.ok) { fetchAccidents(); fetchDash() }
    } catch {}
  }

  if (loading) return <div className="empty-state">Loading compliance data…</div>
  const d = dash

  // Calendar grid helpers
  function buildCalGrid(year: number, month: number) {
    const first = new Date(year, month - 1, 1)
    const startDay = (first.getDay() + 6) % 7 // Monday=0
    const daysInMonth = new Date(year, month, 0).getDate()
    const weeks: (number | null)[][] = []
    let week: (number | null)[] = Array(startDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
      week.push(d)
      if (week.length === 7) { weeks.push(week); week = [] }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }
    return weeks
  }

  const calDays = calData?.days || {}

  return (
    <div>
      <div className="page-header">
        <h1>Health &amp; Safety</h1>
      </div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}
      {success && <div className="card" style={{ background: '#f0fdf4', color: '#166534', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {success} <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}

      <div className="tabs" style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
        {([['dashboard','Dashboard'],['register','Compliance Register'],['calendar','Calendar'],['accidents','Accident Log'],['audit','Audit Log']] as [Tab,string][]).map(([k,l]) => (
          <button key={k} className={`tab ${tab === k ? 'active' : ''}`} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>

      {/* ===== COMPLETION MODAL ===== */}
      {completeItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <form onSubmit={handleComplete} className="card" style={{ maxWidth: 500, width: '100%', padding: '2rem', position: 'relative' }}>
            <button type="button" onClick={() => setCompleteItem(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <h2 style={{ marginBottom: '0.5rem' }}>Complete: {completeItem.title}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
              {completeItem.legal_reference || completeItem.regulatory_ref || ''}
            </p>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div>
                <label>Completion Date *</label>
                <input name="completed_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <label>Completed By</label>
                <input name="completed_by" placeholder="Name of person" />
              </div>
              <div>
                <label>Comments</label>
                <textarea name="comments" rows={3} placeholder="Any notes about this completion..." />
              </div>
              {completeItem.evidence_required && (
                <div>
                  <label>Evidence Upload {completeItem.evidence_required ? '*' : ''}</label>
                  <input name="evidence" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                  <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>PDF, image, or document</div>
                </div>
              )}
              {!completeItem.evidence_required && (
                <div>
                  <label>Evidence Upload (optional)</label>
                  <input name="evidence" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                </div>
              )}
            </div>
            <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary">Mark Complete</button>
              <button type="button" className="btn btn-ghost" onClick={() => setCompleteItem(null)}>Cancel</button>
            </div>
            {completeItem.frequency_type !== 'ad_hoc' && (
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '0.75rem' }}>
                Next due date will be auto-calculated based on <strong>{completeItem.frequency_type}</strong> frequency.
              </p>
            )}
          </form>
        </div>
      )}

      {/* ===== DASHBOARD ===== */}
      {tab === 'dashboard' && d && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)', minWidth: 200 }}>
              <div className="score-circle" style={{ borderColor: scoreColor(d.score), margin: '0 auto', color: scoreColor(d.score) }}>{d.score}%</div>
              <div style={{ marginTop: '0.75rem', fontWeight: 700 }}>Peace of Mind</div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{d.interpretation}</p>
              {d.change_message && <p style={{ margin: '0.5rem 0 0', fontSize: '0.8rem', fontStyle: 'italic', color: d.score >= d.previous_score ? 'var(--color-success)' : 'var(--color-danger)' }}>{d.change_message}</p>}
            </div>
            <div className="stats-grid">
              <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-danger)' }}>{d.overdue_count}</div><div className="stat-label">Overdue</div></div>
              <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-warning)' }}>{d.due_soon_count}</div><div className="stat-label">Due Soon</div></div>
              <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-success)' }}>{d.compliant_count}</div><div className="stat-label">Compliant</div></div>
              <div className="stat-card"><div className="stat-number">{d.total_items}</div><div className="stat-label">Total Items</div></div>
              <div className="stat-card"><div className="stat-number" style={{ color: d.open_accidents > 0 ? 'var(--color-danger)' : undefined }}>{d.open_accidents || 0}</div><div className="stat-label">Open Accidents</div></div>
              <div className="stat-card"><div className="stat-number" style={{ color: d.riddor_count > 0 ? 'var(--color-danger)' : undefined }}>{d.riddor_count || 0}</div><div className="stat-label">RIDDOR Reports</div></div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            <span>Legal: <strong>{d.legal_items}</strong> (2× weight)</span>
            <span>Best Practice: <strong>{d.best_practice_items}</strong> (1× weight)</span>
          </div>
        </div>
      )}

      {/* ===== COMPLIANCE REGISTER ===== */}
      {tab === 'register' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
            {[{l:'All',v:''},{l:'Overdue',v:'OVERDUE'},{l:'Due Soon',v:'DUE_SOON'},{l:'Compliant',v:'COMPLIANT'}].map(f => (
              <button key={f.v} className={`tab ${statusFilter === f.v ? 'active' : ''}`} onClick={() => setStatusFilter(f.v)}>{f.l}</button>
            ))}
            <span style={{ margin: '0 0.5rem', borderLeft: '1px solid var(--color-border)' }} />
            {[{l:'All Types',v:''},{l:'Legal',v:'LEGAL'},{l:'Best Practice',v:'BEST_PRACTICE'}].map(f => (
              <button key={f.v} className={`tab ${typeFilter === f.v ? 'active' : ''}`} onClick={() => setTypeFilter(f.v)}>{f.l}</button>
            ))}
          </div>

          {items.length === 0 ? (
            <div className="empty-state">No compliance items found. Items will be seeded automatically.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Category</th>
                    <th>Type</th>
                    <th>Frequency</th>
                    <th>Next Due</th>
                    <th>Last Completed</th>
                    <th>Status</th>
                    <th>Ref</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any) => (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                        {item.evidence_required && <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Evidence required</span>}
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>{item.category}</td>
                      <td><span className={`badge ${item.item_type === 'LEGAL' ? 'badge-danger' : 'badge-info'}`}>{item.item_type === 'LEGAL' ? 'Legal' : 'Best Practice'}</span></td>
                      <td style={{ fontSize: '0.85rem' }}>{item.frequency_type}</td>
                      <td style={{ fontSize: '0.85rem' }}>{fmtDate(item.next_due_date)}</td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {fmtDate(item.last_completed_date)}
                        {item.completed_by && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>by {item.completed_by}</div>}
                      </td>
                      <td><span className={`badge ${item.status === 'OVERDUE' ? 'badge-danger' : item.status === 'DUE_SOON' ? 'badge-warning' : 'badge-success'}`}>{item.status}</span></td>
                      <td style={{ fontSize: '0.75rem', maxWidth: 120 }}>{item.regulatory_ref}</td>
                      <td>
                        <button className="btn btn-sm btn-primary" onClick={() => setCompleteItem(item)}>Complete</button>
                        {item.document && <a href={item.document} target="_blank" rel="noopener" className="btn btn-sm btn-ghost" style={{ marginLeft: '0.25rem' }}>View</a>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== CALENDAR ===== */}
      {tab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button className="btn btn-sm btn-ghost" onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }}>← Prev</button>
            <h2 style={{ margin: 0 }}>{MONTH_NAMES[calMonth - 1]} {calYear}</h2>
            <button className="btn btn-sm btn-ghost" onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }}>Next →</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px', background: 'var(--color-border)', borderRadius: 'var(--radius)' }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.8rem', background: 'var(--color-surface)' }}>{d}</div>
            ))}
            {buildCalGrid(calYear, calMonth).flat().map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ padding: '0.5rem', background: 'var(--color-bg)', minHeight: 60 }} />
              const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const dayItems = calDays[dateStr] || []
              const hasRed = dayItems.some((x: any) => x.colour === 'red')
              const hasAmber = dayItems.some((x: any) => x.colour === 'amber')
              const hasGreen = dayItems.some((x: any) => x.colour === 'green')
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSelected = dateStr === selectedDay

              return (
                <div key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)} style={{
                  padding: '0.35rem', background: isSelected ? 'var(--color-primary-light)' : 'var(--color-surface)',
                  minHeight: 60, cursor: dayItems.length > 0 ? 'pointer' : 'default',
                  borderTop: isToday ? '3px solid var(--color-primary)' : undefined,
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, marginBottom: '0.25rem' }}>{day}</div>
                  <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' }}>
                    {hasRed && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', display: 'inline-block' }} />}
                    {hasAmber && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706', display: 'inline-block' }} />}
                    {hasGreen && <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />}
                  </div>
                  {dayItems.length > 0 && <div style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>{dayItems.length} item{dayItems.length > 1 ? 's' : ''}</div>}
                </div>
              )
            })}
          </div>

          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#dc2626', marginRight: 4 }} />Overdue</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#d97706', marginRight: 4 }} />Due within 30 days</span>
            <span><span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: '#16a34a', marginRight: 4 }} />Compliant</span>
          </div>

          {selectedDay && calDays[selectedDay] && (
            <div className="card" style={{ marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem' }}>Items due {fmtDate(selectedDay)}</h3>
              {calDays[selectedDay].map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--color-border)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{item.title}</span>
                    <span className={`badge ${item.item_type === 'LEGAL' ? 'badge-danger' : 'badge-info'}`} style={{ marginLeft: '0.5rem' }}>{item.item_type === 'LEGAL' ? 'Legal' : 'BP'}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginLeft: '0.5rem' }}>{item.category}</span>
                  </div>
                  <span className={`badge ${item.status === 'OVERDUE' ? 'badge-danger' : item.status === 'DUE_SOON' ? 'badge-warning' : 'badge-success'}`}>{item.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== ACCIDENT LOG ===== */}
      {tab === 'accidents' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAccidentForm(!showAccidentForm)}>
              {showAccidentForm ? 'Cancel' : '+ Report Accident'}
            </button>
          </div>

          {showAccidentForm && (
            <form onSubmit={handleCreateAccident} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>New Accident Report</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                <div><label>Date *</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} /></div>
                <div><label>Time</label><input name="time" type="time" /></div>
                <div><label>Person Involved *</label><input name="person_involved" required placeholder="Full name" /></div>
                <div><label>Role</label><input name="person_role" placeholder="e.g. Staff, Client, Visitor" /></div>
                <div><label>Location</label><input name="location" placeholder="Where did it happen?" /></div>
                <div><label>Severity *</label>
                  <select name="severity" required>
                    <option value="MINOR">Minor (First Aid)</option>
                    <option value="MODERATE">Moderate (Medical Attention)</option>
                    <option value="MAJOR">Major (Hospital)</option>
                    <option value="FATAL">Fatal</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}><label>Description *</label><textarea name="description" required rows={3} placeholder="Full description of the accident..." /></div>
                <div><label>Reported By</label><input name="reported_by" placeholder="Your name" /></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="riddor_reportable" style={{ width: 'auto' }} /> RIDDOR Reportable
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                    <input type="checkbox" name="follow_up_required" style={{ width: 'auto' }} /> Follow-up Required
                  </label>
                </div>
              </div>
              <div style={{ marginTop: '1rem' }}><button type="submit" className="btn btn-primary">Submit Report</button></div>
            </form>
          )}

          {accidents.length === 0 ? (
            <div className="empty-state">No accident reports. Use the button above to log an incident.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Person</th>
                    <th>Description</th>
                    <th>Severity</th>
                    <th>RIDDOR</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {accidents.map((a: any) => (
                    <tr key={a.id}>
                      <td style={{ fontSize: '0.85rem', whiteSpace: 'nowrap' }}>{fmtDate(a.date)}{a.time && <div style={{ color: 'var(--color-text-muted)' }}>{a.time}</div>}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{a.person_involved}</div>
                        {a.person_role && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{a.person_role}</div>}
                      </td>
                      <td style={{ fontSize: '0.85rem', maxWidth: 250 }}>{a.description.substring(0, 100)}{a.description.length > 100 ? '…' : ''}</td>
                      <td><span className={`badge ${a.severity === 'MINOR' ? 'badge-info' : a.severity === 'MODERATE' ? 'badge-warning' : 'badge-danger'}`}>{a.severity}</span></td>
                      <td>
                        {a.riddor_reportable ? (
                          <span className="badge badge-danger">RIDDOR</span>
                        ) : (
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>No</span>
                        )}
                        {a.hse_reference && <div style={{ fontSize: '0.75rem' }}>Ref: {a.hse_reference}</div>}
                      </td>
                      <td><span className={`badge ${a.status === 'CLOSED' ? 'badge-success' : a.status === 'OPEN' ? 'badge-danger' : 'badge-warning'}`}>{a.status}</span></td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {a.status !== 'CLOSED' && (
                          <select defaultValue="" onChange={e => { if (e.target.value) handleAccidentStatus(a.id, e.target.value); e.target.value = '' }} style={{ fontSize: '0.8rem', padding: '0.25rem' }}>
                            <option value="" disabled>Update…</option>
                            <option value="INVESTIGATING">Investigating</option>
                            <option value="FOLLOW_UP">Follow-up</option>
                            <option value="CLOSED">Close</option>
                          </select>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <strong>RIDDOR:</strong> Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013.
            Certain accidents must be reported to HSE within 10 days (or 15 days for over-7-day incapacitation).
          </div>
        </div>
      )}

      {/* ===== AUDIT LOG ===== */}
      {tab === 'audit' && (
        <div>
          <h2 style={{ marginBottom: '0.75rem' }}>Score Audit Log</h2>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Date</th><th>Score</th><th>Change</th><th>Trigger</th><th>Items</th><th>Compliant</th><th>Overdue</th></tr>
              </thead>
              <tbody>
                {auditLog.map((log: any, i: number) => (
                  <tr key={i}>
                    <td style={{ fontSize: '0.85rem' }}>{new Date(log.calculated_at).toLocaleString('en-GB')}</td>
                    <td style={{ fontWeight: 700, color: scoreColor(log.score) }}>{log.score}%</td>
                    <td style={{ fontWeight: 600, color: log.change > 0 ? 'var(--color-success)' : log.change < 0 ? 'var(--color-danger)' : undefined }}>
                      {log.change > 0 ? `+${log.change}%` : log.change < 0 ? `${log.change}%` : '—'}
                    </td>
                    <td><span className="badge badge-info">{log.trigger}</span></td>
                    <td>{log.total_items}</td>
                    <td style={{ color: 'var(--color-success)' }}>{log.compliant_count}</td>
                    <td style={{ color: log.overdue_count > 0 ? 'var(--color-danger)' : undefined }}>{log.overdue_count}</td>
                  </tr>
                ))}
                {auditLog.length === 0 && <tr><td colSpan={7} className="empty-state">No audit entries yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
