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

  function gaugeColour(score: number): string {
    if (score >= 80) return '#2d6a4f'
    if (score >= 60) return '#e09f3e'
    return '#c1121f'
  }

  function gaugeColourBg(score: number): string {
    if (score >= 80) return 'rgba(45,106,79,0.1)'
    if (score >= 60) return 'rgba(224,159,62,0.1)'
    return 'rgba(193,18,31,0.1)'
  }

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center', color: '#666' }}>Loading compliance data...</div>

  const d = dashboard

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.6rem', color: '#1a1a2e' }}>Health &amp; Safety</h1>
          <p style={{ margin: '0.25rem 0 0', color: '#666', fontSize: '0.9rem' }}>Compliance Intelligence Dashboard</p>
        </div>
        <span style={{ background: '#c1121f', color: '#fff', padding: '4px 12px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600 }}>Tier 3 — Owner</span>
      </div>

      {error && (
        <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1rem', color: '#991b1b', fontSize: '0.9rem' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>×</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', borderBottom: '2px solid #e5e7eb', paddingBottom: '0.5rem' }}>
        {(['dashboard', 'breakdown', 'priorities', 'audit'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '0.5rem 1rem',
              border: 'none',
              borderRadius: '6px 6px 0 0',
              cursor: 'pointer',
              fontWeight: tab === t ? 700 : 400,
              background: tab === t ? '#2d6a4f' : 'transparent',
              color: tab === t ? '#fff' : '#555',
              fontSize: '0.85rem',
              transition: 'all 0.2s',
            }}
          >
            {t === 'audit' ? 'Audit Log' : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ===== DASHBOARD TAB ===== */}
      {tab === 'dashboard' && d && (
        <div>
          {/* Peace of Mind Gauge */}
          <div style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ textAlign: 'center', padding: '1.5rem', background: gaugeColourBg(d.score), borderRadius: 16 }}>
              <div style={{
                width: 140, height: 140, borderRadius: '50%',
                border: `8px solid ${gaugeColour(d.score)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto', flexDirection: 'column',
              }}>
                <span style={{ fontSize: '2.5rem', fontWeight: 800, color: gaugeColour(d.score), lineHeight: 1 }}>{d.score}</span>
                <span style={{ fontSize: '0.75rem', color: gaugeColour(d.score), fontWeight: 600 }}>/ 100</span>
              </div>
              <div style={{ marginTop: '0.75rem', fontWeight: 700, fontSize: '1rem', color: '#1a1a2e' }}>Peace of Mind</div>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', color: '#555', lineHeight: 1.4 }}>{d.interpretation}</p>
              {d.change_message && (
                <p style={{
                  margin: '0.75rem 0 0', fontSize: '0.8rem', fontStyle: 'italic',
                  color: d.score >= d.previous_score ? '#2d6a4f' : '#c1121f',
                  background: d.score >= d.previous_score ? 'rgba(45,106,79,0.08)' : 'rgba(193,18,31,0.08)',
                  padding: '6px 10px', borderRadius: 6,
                }}>{d.change_message}</p>
              )}
            </div>

            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                <StatCard value={d.overdue_count} label="Overdue Items" color="#c1121f" />
                <StatCard value={d.due_soon_count} label="Due Soon" color="#e09f3e" />
                <StatCard value={d.compliant_count} label="Compliant" color="#2d6a4f" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                <StatCard value={d.open_incidents} label="Open Incidents" color="#7b2cbf" />
                <StatCard value={d.overdue_equipment} label="Overdue Equipment" color="#c1121f" />
                <StatCard value={d.total_items} label="Total Items" color="#555" />
              </div>
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: '#888' }}>
                <span>Legal items: <strong>{d.legal_items}</strong> (weight 2×)</span>
                <span>Best practice: <strong>{d.best_practice_items}</strong> (weight 1×)</span>
              </div>
            </div>
          </div>

          {/* Priority Actions (Phase 5) */}
          {priorities.length > 0 && (
            <div style={{ marginTop: '1rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#1a1a2e' }}>Priority Actions</h2>
              <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                {priorities.map((action, i) => (
                  <div key={action.id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.75rem 1rem',
                    borderBottom: i < priorities.length - 1 ? '1px solid #f3f4f6' : 'none',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{action.title}</div>
                      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>
                        {action.category} · {action.item_type === 'LEGAL' ? '⚖️ Legal' : '✨ Best Practice'}
                        {action.due_date && ` · Due: ${action.due_date}`}
                        {action.regulatory_ref && ` · ${action.regulatory_ref}`}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                        background: action.status === 'OVERDUE' ? '#fef2f2' : '#fffbeb',
                        color: action.status === 'OVERDUE' ? '#c1121f' : '#92400e',
                      }}>{action.status}</span>
                      <button
                        onClick={() => handleMarkComplete(action.id)}
                        style={{
                          padding: '4px 12px', borderRadius: 4, border: '1px solid #2d6a4f',
                          background: '#fff', color: '#2d6a4f', cursor: 'pointer',
                          fontSize: '0.8rem', fontWeight: 600, transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => { e.currentTarget.style.background = '#2d6a4f'; e.currentTarget.style.color = '#fff' }}
                        onMouseOut={(e) => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#2d6a4f' }}
                      >
                        Mark Complete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== BREAKDOWN TAB ===== */}
      {tab === 'breakdown' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0, color: '#1a1a2e' }}>Score Breakdown by Category</h2>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {[{ label: 'All', value: '' }, { label: 'Legal Only', value: 'LEGAL' }, { label: 'Best Practice', value: 'BEST_PRACTICE' }].map(f => (
                <button
                  key={f.value}
                  onClick={() => setTypeFilter(f.value)}
                  style={{
                    padding: '4px 12px', borderRadius: 4, border: '1px solid #d1d5db',
                    background: typeFilter === f.value ? '#2d6a4f' : '#fff',
                    color: typeFilter === f.value ? '#fff' : '#555',
                    cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500,
                  }}
                >{f.label}</button>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 600 }}>Category</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Total</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#c1121f' }}>Overdue</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#e09f3e' }}>Due Soon</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: '#2d6a4f' }}>Compliant</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600 }}>Score</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.map((cat, i) => (
                  <tr key={cat.category} style={{ borderBottom: i < breakdown.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem', fontWeight: 600 }}>{cat.category}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>{cat.total_items}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: cat.overdue > 0 ? '#c1121f' : '#999', fontWeight: cat.overdue > 0 ? 700 : 400 }}>{cat.overdue}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: cat.due_soon > 0 ? '#e09f3e' : '#999', fontWeight: cat.due_soon > 0 ? 700 : 400 }}>{cat.due_soon}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#2d6a4f' }}>{cat.compliant}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                        <div style={{ width: 60, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{ width: `${cat.score_pct}%`, height: '100%', background: gaugeColour(cat.score_pct), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: gaugeColour(cat.score_pct) }}>{cat.score_pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
                {breakdown.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No compliance items found. Add items via the admin panel.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ===== PRIORITIES TAB ===== */}
      {tab === 'priorities' && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#1a1a2e' }}>All Priority Actions</h2>
          <p style={{ fontSize: '0.85rem', color: '#888', marginBottom: '1rem' }}>
            Sorted by urgency: Overdue Legal → Overdue Best Practice → Due Soon Legal → Due Soon Best Practice
          </p>
          {priorities.length > 0 ? (
            <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {priorities.map((action, i) => (
                <div key={action.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '0.75rem 1rem',
                  borderBottom: i < priorities.length - 1 ? '1px solid #f3f4f6' : 'none',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      <span style={{ marginRight: 6 }}>{action.item_type === 'LEGAL' ? '⚖️' : '✨'}</span>
                      {action.title}
                      <span style={{ marginLeft: 8, fontSize: '0.75rem', color: '#888' }}>({action.weight}× weight)</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#888', marginTop: 2 }}>
                      {action.category}
                      {action.due_date && ` · Due: ${action.due_date}`}
                      {action.regulatory_ref && ` · Ref: ${action.regulatory_ref}`}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600,
                      background: action.status === 'OVERDUE' ? '#fef2f2' : '#fffbeb',
                      color: action.status === 'OVERDUE' ? '#c1121f' : '#92400e',
                    }}>{action.status}</span>
                    <button
                      onClick={() => handleMarkComplete(action.id)}
                      style={{
                        padding: '4px 12px', borderRadius: 4, border: '1px solid #2d6a4f',
                        background: '#fff', color: '#2d6a4f', cursor: 'pointer',
                        fontSize: '0.8rem', fontWeight: 600,
                      }}
                    >Mark Complete</button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#2d6a4f', background: 'rgba(45,106,79,0.05)', borderRadius: 8 }}>
              All compliance items are up to date. No actions required.
            </div>
          )}
        </div>
      )}

      {/* ===== AUDIT LOG TAB ===== */}
      {tab === 'audit' && (
        <div>
          <h2 style={{ fontSize: '1.1rem', marginBottom: '0.75rem', color: '#1a1a2e' }}>Score Audit Log</h2>
          <div style={{ background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'left' }}>Date</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Score</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Change</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Trigger</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Items</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Compliant</th>
                  <th style={{ padding: '0.75rem', textAlign: 'center' }}>Overdue</th>
                </tr>
              </thead>
              <tbody>
                {auditLog.map((log, i) => (
                  <tr key={i} style={{ borderBottom: i < auditLog.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <td style={{ padding: '0.75rem 1rem' }}>{new Date(log.calculated_at).toLocaleString()}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 700, color: gaugeColour(log.score) }}>{log.score}%</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', fontWeight: 600, color: log.change > 0 ? '#2d6a4f' : log.change < 0 ? '#c1121f' : '#999' }}>
                      {log.change > 0 ? `+${log.change}%` : log.change < 0 ? `${log.change}%` : '—'}
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                      <span style={{ padding: '2px 8px', borderRadius: 4, fontSize: '0.75rem', background: '#f3f4f6' }}>{log.trigger}</span>
                    </td>
                    <td style={{ padding: '0.75rem', textAlign: 'center' }}>{log.total_items}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: '#2d6a4f' }}>{log.compliant_count}</td>
                    <td style={{ padding: '0.75rem', textAlign: 'center', color: log.overdue_count > 0 ? '#c1121f' : '#999' }}>{log.overdue_count}</td>
                  </tr>
                ))}
                {auditLog.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>No audit entries yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div style={{
      background: '#fff', borderRadius: 8, border: '1px solid #e5e7eb',
      padding: '1rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: '0.8rem', color: '#888', marginTop: '0.25rem' }}>{label}</div>
    </div>
  )
}
