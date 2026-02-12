'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/django/compliance'

interface DashboardData {
  score: number
  previous_score: number
  colour: string
  interpretation: string
  change_message: string | null
  total_items: number
  compliant_count: number
  due_soon_count: number
  overdue_count: number
  legal_items: number
  best_practice_items: number
  open_incidents: number
  overdue_equipment: number
  last_calculated_at: string
}

interface CategoryBreakdown {
  category: string
  total_items: number
  compliant: number
  due_soon: number
  overdue: number
  score_pct: number
  max_score: number
  current_score: number
}

interface PriorityAction {
  id: number
  title: string
  category: string
  item_type: string
  status: string
  due_date: string | null
  regulatory_ref: string
  weight: number
}

interface AuditEntry {
  score: number
  previous_score: number
  change: number
  total_items: number
  compliant_count: number
  due_soon_count: number
  overdue_count: number
  trigger: string
  calculated_at: string
}

export default function AdminHSEPage() {
  const [tab, setTab] = useState<'dashboard' | 'breakdown' | 'priorities' | 'audit'>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [breakdown, setBreakdown] = useState<CategoryBreakdown[]>([])
  const [typeFilter, setTypeFilter] = useState<string>('')
  const [priorities, setPriorities] = useState<PriorityAction[]>([])
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchDashboard = useCallback(async () => {
    try {
      const res = await fetch(`${API}/dashboard/`)
      if (!res.ok) throw new Error('Failed to load dashboard')
      const data = await res.json()
      setDashboard(data)
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchBreakdown = useCallback(async () => {
    try {
      const url = typeFilter ? `${API}/breakdown/?type=${typeFilter}` : `${API}/breakdown/`
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to load breakdown')
      const data = await res.json()
      setBreakdown(data.categories || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [typeFilter])

  const fetchPriorities = useCallback(async () => {
    try {
      const res = await fetch(`${API}/priorities/`)
      if (!res.ok) throw new Error('Failed to load priorities')
      const data = await res.json()
      setPriorities(data.actions || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  const fetchAudit = useCallback(async () => {
    try {
      const res = await fetch(`${API}/audit-log/?limit=20`)
      if (!res.ok) throw new Error('Failed to load audit log')
      const data = await res.json()
      setAuditLog(data.logs || [])
    } catch (err: any) {
      setError(err.message)
    }
  }, [])

  useEffect(() => {
    Promise.all([fetchDashboard(), fetchPriorities()]).then(() => setLoading(false))
  }, [fetchDashboard, fetchPriorities])

  useEffect(() => {
    if (tab === 'breakdown') fetchBreakdown()
    if (tab === 'audit') fetchAudit()
  }, [tab, fetchBreakdown, fetchAudit])

  const handleMarkComplete = async (itemId: number) => {
    try {
      const res = await fetch(`${API}/items/${itemId}/complete/`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to mark complete')
      await Promise.all([fetchDashboard(), fetchPriorities()])
      if (tab === 'breakdown') fetchBreakdown()
    } catch (err: any) {
      setError(err.message)
    }
  }

  function scoreColor(pct: number) {
    if (pct >= 80) return 'var(--color-success)'
    if (pct >= 60) return 'var(--color-warning)'
    return 'var(--color-danger)'
  }

  if (loading) return <div className="empty-state">Loading compliance data…</div>

  const d = dashboard

  return (
    <div>
      <div className="page-header">
        <h1>Health &amp; Safety</h1>
        <span className="badge badge-danger">Tier 3 — Owner</span>
      </div>

      {error && (
        <div className="card" style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#991b1b', marginBottom: '1rem' }}>
          {error}
          <button onClick={() => setError('')} className="btn btn-ghost" style={{ float: 'right' }}>×</button>
        </div>
      )}

      <div className="tabs hse-tabs">
        {(['dashboard', 'breakdown', 'priorities', 'audit'] as const).map(t => (
          <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
            {t === 'audit' ? 'Audit Log' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD TAB ===== */}
      {tab === 'dashboard' && d && (
        <div>
          <div className="hse-gauge-grid">
            <div style={{ textAlign: 'center', padding: '1.5rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
              <div className="score-circle" style={{ borderColor: scoreColor(d.score), margin: '0 auto', color: scoreColor(d.score) }}>
                {d.score}%
              </div>
              <div style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '1rem' }}>Peace of Mind</div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: 'var(--color-text-muted)', lineHeight: 1.4 }}>{d.interpretation}</p>
              {d.change_message && (
                <p style={{
                  margin: '0.75rem 0 0', fontSize: '0.8rem', fontStyle: 'italic',
                  color: d.score >= d.previous_score ? 'var(--color-success)' : 'var(--color-danger)',
                  padding: '6px 10px', borderRadius: 'var(--radius)', background: 'var(--color-surface)',
                }}>{d.change_message}</p>
              )}
            </div>

            <div>
              <div className="stats-grid" style={{ marginBottom: '1rem' }}>
                <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-danger)' }}>{d.overdue_count}</div><div className="stat-label">Overdue Items</div></div>
                <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-warning)' }}>{d.due_soon_count}</div><div className="stat-label">Due Soon</div></div>
                <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-success)' }}>{d.compliant_count}</div><div className="stat-label">Compliant</div></div>
                <div className="stat-card"><div className="stat-number">{d.open_incidents}</div><div className="stat-label">Open Incidents</div></div>
                <div className="stat-card"><div className="stat-number" style={{ color: 'var(--color-danger)' }}>{d.overdue_equipment}</div><div className="stat-label">Overdue Equipment</div></div>
                <div className="stat-card"><div className="stat-number">{d.total_items}</div><div className="stat-label">Total Items</div></div>
              </div>
              <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                <span>Legal items: <strong>{d.legal_items}</strong> (weight 2×)</span>
                <span>Best practice: <strong>{d.best_practice_items}</strong> (weight 1×)</span>
              </div>
            </div>
          </div>

          {priorities.length > 0 && (
            <div style={{ marginTop: '1.5rem' }}>
              <h2 style={{ marginBottom: '0.75rem' }}>Priority Actions</h2>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Item</th><th>Category</th><th>Type</th><th>Due</th><th>Status</th><th>Action</th></tr>
                  </thead>
                  <tbody>
                    {priorities.map((action) => (
                      <tr key={action.id}>
                        <td style={{ fontWeight: 600 }}>{action.title}</td>
                        <td>{action.category}</td>
                        <td><span className={`badge ${action.item_type === 'LEGAL' ? 'badge-danger' : 'badge-info'}`}>{action.item_type === 'LEGAL' ? 'Legal' : 'Best Practice'}</span></td>
                        <td>{action.due_date || '—'}</td>
                        <td><span className={`badge ${action.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}`}>{action.status}</span></td>
                        <td><button className="btn btn-sm" onClick={() => handleMarkComplete(action.id)}>Complete</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== BREAKDOWN TAB ===== */}
      {tab === 'breakdown' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <h2 style={{ margin: 0 }}>Score Breakdown by Category</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[{ label: 'All', value: '' }, { label: 'Legal', value: 'LEGAL' }, { label: 'Best Practice', value: 'BEST_PRACTICE' }].map(f => (
                <button key={f.value} className={`tab ${typeFilter === f.value ? 'active' : ''}`} onClick={() => setTypeFilter(f.value)}>
                  {f.label}
                </button>
              ))}
            </div>
          </div>
          <div className="table-wrap">
            <table className="hse-breakdown-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Total</th>
                  <th style={{ color: 'var(--color-danger)' }}>Overdue</th>
                  <th style={{ color: 'var(--color-warning)' }}>Due Soon</th>
                  <th style={{ color: 'var(--color-success)' }}>Compliant</th>
                  <th>Score</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((cat) => (
                  <tr key={cat.category}>
                    <td style={{ fontWeight: 600 }}>{cat.category}</td>
                    <td>{cat.total_items}</td>
                    <td style={{ color: cat.overdue > 0 ? 'var(--color-danger)' : undefined, fontWeight: cat.overdue > 0 ? 700 : 400 }}>{cat.overdue}</td>
                    <td style={{ color: cat.due_soon > 0 ? 'var(--color-warning)' : undefined, fontWeight: cat.due_soon > 0 ? 700 : 400 }}>{cat.due_soon}</td>
                    <td style={{ color: 'var(--color-success)' }}>{cat.compliant}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <div className="compliance-bar-track" style={{ width: 60 }}>
                          <div className="compliance-bar-fill" style={{ width: `${cat.score_pct}%`, background: scoreColor(cat.score_pct) }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: scoreColor(cat.score_pct) }}>{cat.score_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {breakdown.length === 0 && (
                  <tr><td colSpan={6} className="empty-state">No compliance items found. Add items via the Django admin panel.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== PRIORITIES TAB ===== */}
      {tab === 'priorities' && (
        <div>
          <h2 style={{ marginBottom: '0.5rem' }}>All Priority Actions</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
            Sorted by urgency: Overdue Legal → Overdue Best Practice → Due Soon Legal → Due Soon Best Practice
          </p>
          {priorities.length > 0 ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Item</th><th>Category</th><th>Type</th><th>Weight</th><th>Due</th><th>Status</th><th>Action</th></tr>
                </thead>
                <tbody>
                  {priorities.map((action) => (
                    <tr key={action.id}>
                      <td style={{ fontWeight: 600 }}>{action.title}</td>
                      <td>{action.category}</td>
                      <td><span className={`badge ${action.item_type === 'LEGAL' ? 'badge-danger' : 'badge-info'}`}>{action.item_type === 'LEGAL' ? 'Legal' : 'Best Practice'}</span></td>
                      <td>{action.weight}×</td>
                      <td>{action.due_date || '—'}</td>
                      <td><span className={`badge ${action.status === 'OVERDUE' ? 'badge-danger' : 'badge-warning'}`}>{action.status}</span></td>
                      <td><button className="btn btn-sm" onClick={() => handleMarkComplete(action.id)}>Complete</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state" style={{ color: 'var(--color-success)' }}>
              All compliance items are up to date. No actions required.
            </div>
          )}
        </div>
      )}

      {/* ===== AUDIT LOG TAB ===== */}
      {tab === 'audit' && (
        <div>
          <h2 style={{ marginBottom: '0.75rem' }}>Score Audit Log</h2>
          <div className="table-wrap">
            <table className="hse-breakdown-table">
              <thead>
                <tr><th>Date</th><th>Score</th><th>Change</th><th>Trigger</th><th>Items</th><th>Compliant</th><th>Overdue</th></tr>
              </thead>
              <tbody>
                {auditLog.map((log, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{new Date(log.calculated_at).toLocaleString()}</td>
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
                {auditLog.length === 0 && (
                  <tr><td colSpan={7} className="empty-state">No audit entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
