'use client'

import { useEffect, useState, useCallback } from 'react'
import { getReportsOverview, getReportsDaily, getReportsMonthly, getReportsStaff, getReportsInsights, getStaffList, getServices, seedDemoData, deleteDemoData, getDemoStatus } from '@/lib/api'

/* ================================================================
   REPORTS — Intelligence Dashboard (Light Theme)
   Consistent with Staff / Services / Bookings admin pages
   ================================================================ */

const CLR = {
  green: '#16a34a', amber: '#d97706', red: '#dc2626', blue: '#2563eb',
  purple: '#7c3aed', primary: '#2563eb', muted: '#64748b', border: '#e2e8f0',
  surface: '#ffffff', bg: '#f8fafc', text: '#1e293b', barTrack: '#f1f5f9',
}

function fmtP(v: number) { return '£' + v.toFixed(2) }
function fmtK(v: number) { return v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : fmtP(v) }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function pctClr(v: number, hi = 80, med = 40) { return v >= hi ? CLR.green : v >= med ? CLR.amber : CLR.red }

type Tab = 'overview' | 'daily' | 'monthly' | 'staff'
type Filters = { date_from: string; date_to: string; staff_id?: number; service_id?: number; risk_level?: string; payment_status?: string }

export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>('overview')
  const [filters, setFilters] = useState<Filters>({ date_from: daysAgo(30), date_to: todayStr() })
  const [overview, setOverview] = useState<any>(null)
  const [daily, setDaily] = useState<any>(null)
  const [monthly, setMonthly] = useState<any>(null)
  const [staffData, setStaffData] = useState<any>(null)
  const [insights, setInsights] = useState<any>(null)
  const [staffList, setStaffList] = useState<any[]>([])
  const [serviceList, setServiceList] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [staffDrill, setStaffDrill] = useState<any>(null)
  const [demoStatus, setDemoStatus] = useState<{ has_demo: boolean; has_real: boolean; demo_count: number }>({ has_demo: false, has_real: false, demo_count: 0 })
  const [demoLoading, setDemoLoading] = useState(false)

  useEffect(() => {
    Promise.all([getStaffList(), getServices(true), getDemoStatus()]).then(([s, sv, ds]) => {
      setStaffList(s.data || [])
      setServiceList(sv.data || [])
      if (ds.data) setDemoStatus(ds.data)
    })
    getReportsInsights().then(r => setInsights(r.data))
  }, [])

  const fetchTab = useCallback(async () => {
    setLoading(true)
    const p = { ...filters }
    if (tab === 'overview') { const r = await getReportsOverview(p); setOverview(r.data) }
    else if (tab === 'daily') { const r = await getReportsDaily(p); setDaily(r.data) }
    else if (tab === 'monthly') { const r = await getReportsMonthly(p); setMonthly(r.data) }
    else if (tab === 'staff') { const r = await getReportsStaff(p); setStaffData(r.data) }
    setLoading(false)
  }, [tab, filters])

  useEffect(() => { fetchTab() }, [fetchTab])

  function setF(k: string, v: any) { setFilters(prev => ({ ...prev, [k]: v || undefined })) }
  function setRange(days: number) { setFilters(prev => ({ ...prev, date_from: daysAgo(days), date_to: todayStr() })) }

  async function handleSeedDemo() {
    setDemoLoading(true)
    const res = await seedDemoData()
    if (res.data) { setDemoStatus(res.data); fetchTab() }
    setDemoLoading(false)
  }

  async function handleDeleteDemo() {
    if (!confirm('Remove all demo data? This cannot be undone.')) return
    setDemoLoading(true)
    const res = await deleteDemoData()
    if (res.data) { setDemoStatus({ has_demo: false, has_real: res.data.has_real ?? false, demo_count: 0 }); fetchTab() }
    setDemoLoading(false)
  }

  function exportCSV(rows: any[], filename: string) {
    if (!rows.length) return
    const keys = Object.keys(rows[0])
    const csv = [keys.join(','), ...rows.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  const kpi = overview?.kpi || {}
  const tabs: { key: Tab; label: string }[] = [
    { key: 'overview', label: 'Overview' },
    { key: 'daily', label: 'Daily Takings' },
    { key: 'monthly', label: 'Monthly' },
    { key: 'staff', label: 'Per Staff' },
  ]

  const isEmpty = !loading && tab === 'overview' && (!overview || (kpi.total_bookings || 0) === 0)

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <h1>Reports</h1>
        <span className="badge badge-danger">Tier 3</span>
      </div>

      {/* Demo data banner */}
      {demoStatus.has_demo && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.625rem 1rem', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.85rem' }}>
          <span style={{ color: '#92400e', fontWeight: 600 }}>Showing demo data ({demoStatus.demo_count} bookings)</span>
          <button className="btn btn-sm btn-outline" onClick={handleDeleteDemo} disabled={demoLoading} style={{ color: '#dc2626', borderColor: '#fca5a5' }}>
            {demoLoading ? 'Removing…' : 'Remove demo data'}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="filter-bar">
        {[{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }, { d: 365, l: '1yr' }].map(r => (
          <button key={r.d} className="btn btn-sm btn-outline" onClick={() => setRange(r.d)}>{r.l}</button>
        ))}
        <input type="date" value={filters.date_from} onChange={e => setF('date_from', e.target.value)} style={{ maxWidth: 160 }} />
        <input type="date" value={filters.date_to} onChange={e => setF('date_to', e.target.value)} style={{ maxWidth: 160 }} />
        <select value={filters.staff_id || ''} onChange={e => setF('staff_id', e.target.value ? Number(e.target.value) : undefined)} style={{ maxWidth: 180 }}>
          <option value="">All Staff</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.service_id || ''} onChange={e => setF('service_id', e.target.value ? Number(e.target.value) : undefined)} style={{ maxWidth: 180 }}>
          <option value="">All Services</option>
          {serviceList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.risk_level || ''} onChange={e => setF('risk_level', e.target.value)} style={{ maxWidth: 140 }}>
          <option value="">All Risk</option>
          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {tabs.map(t => (
          <button key={t.key} className={`tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="empty-state">Loading analytics…</div>
      ) : isEmpty ? (
        <div className="empty-state">
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📊</div>
          <h3 style={{ marginBottom: '0.5rem' }}>No report data yet</h3>
          <p style={{ marginBottom: '1rem', maxWidth: 400, margin: '0 auto 1rem' }}>
            Create your first booking to see revenue, risk, and performance data here. Or load demo data to explore what reports look like.
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={handleSeedDemo} disabled={demoLoading}>
              {demoLoading ? 'Loading…' : 'Add demo data'}
            </button>
            <a href="/admin/bookings" className="btn btn-outline">Create a booking</a>
          </div>
        </div>
      ) : (
        <>
          {/* ═══════════ OVERVIEW TAB ═══════════ */}
          {tab === 'overview' && overview && (
            <div>
              {/* KPI Row */}
              <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                <KpiCard label="Revenue" value={fmtK(kpi.revenue || 0)} color={CLR.green} />
                <KpiCard label="At Risk" value={fmtK(kpi.revenue_at_risk || 0)} color={CLR.red} />
                <KpiCard label="Bookings" value={String(kpi.total_bookings || 0)} color={CLR.blue} />
                <KpiCard label="No-Show %" value={`${kpi.no_show_rate || 0}%`} color={(kpi.no_show_rate || 0) > 10 ? CLR.red : CLR.green} />
                <KpiCard label="Reliability" value={`${kpi.avg_reliability || 0}%`} color={pctClr(kpi.avg_reliability || 0)} />
                <KpiCard label="Avg Risk" value={String((kpi.avg_risk_score || 0).toFixed(1))} color={(kpi.avg_risk_score || 0) > 50 ? CLR.red : CLR.green} />
                <KpiCard label="Repeat %" value={`${kpi.repeat_client_pct || 0}%`} color={CLR.purple} />
              </div>

              <div className="rpt-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="card">
                  <CardTitle>Revenue Over Time</CardTitle>
                  <BarChart data={(overview.revenue_timeline || []).map((d: any) => ({ label: d.date.slice(5), value: d.revenue }))} color={CLR.green} height={140} />
                </div>
                <div className="card">
                  <CardTitle>Risk Distribution</CardTitle>
                  <DonutChart data={(overview.risk_distribution || []).map((d: any) => ({
                    label: d.level, value: d.count,
                    color: d.level === 'CRITICAL' ? '#991b1b' : d.level === 'HIGH' ? CLR.red : d.level === 'MEDIUM' ? CLR.amber : CLR.green,
                  }))} />
                </div>
              </div>

              <div className="rpt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div className="card">
                  <CardTitle>Demand Heatmap</CardTitle>
                  <HeatmapChart data={overview.demand_heatmap || []} />
                </div>
                <div className="card">
                  <CardTitle>Service Revenue</CardTitle>
                  <HBarChart data={(overview.service_breakdown || []).slice(0, 6).map((s: any) => ({ label: s.name, value: s.revenue }))} color={CLR.blue} />
                </div>
              </div>

              {insights && (
                <div className="rpt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="card">
                    <CardTitle>Smart Engine Insights</CardTitle>
                    {(insights.insights || []).length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: CLR.muted }}>No insights yet — more data needed.</p>
                    ) : (insights.insights || []).map((ins: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.5rem 0', borderBottom: i < insights.insights.length - 1 ? `1px solid ${CLR.border}` : 'none' }}>
                        <span style={{ flexShrink: 0 }}>{ins.type === 'danger' ? '🔴' : ins.type === 'warning' ? '🟡' : ins.type === 'success' ? '🟢' : '🔵'}</span>
                        <div>
                          <div style={{ fontSize: '0.85rem', fontWeight: 600, color: CLR.text }}>{ins.message}</div>
                          <div style={{ fontSize: '0.75rem', color: CLR.muted }}>{ins.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="card">
                    <CardTitle>Recommended Actions</CardTitle>
                    {(insights.actions || []).length === 0 ? (
                      <p style={{ fontSize: '0.85rem', color: CLR.muted }}>No actions needed right now.</p>
                    ) : (insights.actions || []).map((act: any, i: number) => (
                      <div key={i} style={{ padding: '0.625rem 0.75rem', background: CLR.bg, borderRadius: 'var(--radius)', marginBottom: '0.5rem', borderLeft: `3px solid ${act.severity === 'high' ? CLR.red : CLR.amber}` }}>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: CLR.text }}>{act.action}</div>
                        <div style={{ fontSize: '0.75rem', color: CLR.green, fontWeight: 600 }}>{act.impact}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ═══════════ DAILY TAB ═══════════ */}
          {tab === 'daily' && daily && (
            <div>
              {(() => {
                const rows = daily.rows || []
                const totalRev = rows.reduce((s: number, r: any) => s + r.revenue, 0)
                const totalNS = rows.reduce((s: number, r: any) => s + r.no_shows, 0)
                const totalBk = rows.reduce((s: number, r: any) => s + r.bookings, 0)
                return (
                  <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                      <KpiCard label="Period Revenue" value={fmtK(totalRev)} color={CLR.green} />
                      <KpiCard label="Bookings" value={String(totalBk)} color={CLR.blue} />
                      <KpiCard label="No Shows" value={String(totalNS)} color={totalNS > 0 ? CLR.red : CLR.green} />
                      <KpiCard label="Active Days" value={String(rows.length)} color={CLR.primary} />
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                      <CardTitle>Daily Revenue</CardTitle>
                      <BarChart data={rows.map((r: any) => ({ label: r.date.slice(5), value: r.revenue }))} color={CLR.green} height={160} />
                    </div>

                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <CardTitle>Daily Breakdown</CardTitle>
                        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(rows, 'daily_takings.csv')}>↓ CSV</button>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr>
                            <th>Date</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>At Risk</th>
                            <th style={{ textAlign: 'right' }}>Deposits</th><th style={{ textAlign: 'right' }}>Bookings</th>
                            <th style={{ textAlign: 'right' }}>No Shows</th><th style={{ textAlign: 'right' }}>Cancelled</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.date}>
                                <td>{r.date}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtP(r.revenue)}</td>
                                <td style={{ textAlign: 'right', color: r.at_risk > 0 ? CLR.red : CLR.muted }}>{fmtP(r.at_risk)}</td>
                                <td style={{ textAlign: 'right' }}>{fmtP(r.deposits)}</td>
                                <td style={{ textAlign: 'right' }}>{r.bookings}</td>
                                <td style={{ textAlign: 'right', color: r.no_shows > 0 ? CLR.red : CLR.muted }}>{r.no_shows}</td>
                                <td style={{ textAlign: 'right' }}>{r.cancelled}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ═══════════ MONTHLY TAB ═══════════ */}
          {tab === 'monthly' && monthly && (
            <div>
              {(() => {
                const rows = monthly.rows || []
                const totalRev = rows.reduce((s: number, r: any) => s + r.revenue, 0)
                const totalBk = rows.reduce((s: number, r: any) => s + r.bookings, 0)
                return (
                  <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                      <KpiCard label="Total Revenue" value={fmtK(totalRev)} color={CLR.green} />
                      <KpiCard label="Bookings" value={String(totalBk)} color={CLR.blue} />
                      <KpiCard label="Months" value={String(rows.length)} color={CLR.primary} />
                      <KpiCard label="Avg Monthly" value={rows.length > 0 ? fmtK(totalRev / rows.length) : '£0'} color={CLR.purple} />
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                      <CardTitle>Monthly Revenue</CardTitle>
                      <BarChart data={rows.map((r: any) => ({ label: r.month, value: r.revenue }))} color={CLR.green} height={160} />
                    </div>

                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <CardTitle>Monthly Breakdown</CardTitle>
                        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(rows, 'monthly_report.csv')}>↓ CSV</button>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr>
                            <th>Month</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>MoM</th>
                            <th style={{ textAlign: 'right' }}>Bookings</th><th style={{ textAlign: 'right' }}>No Shows</th><th style={{ textAlign: 'right' }}>Reliability</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.month}>
                                <td style={{ fontWeight: 600 }}>{r.month}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtP(r.revenue)}</td>
                                <td style={{ textAlign: 'right' }}>
                                  {r.mom_growth != null ? (
                                    <span style={{ color: r.mom_growth >= 0 ? CLR.green : CLR.red, fontWeight: 600 }}>
                                      {r.mom_growth >= 0 ? '▲' : '▼'} {Math.abs(r.mom_growth)}%
                                    </span>
                                  ) : <span style={{ color: CLR.muted }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'right' }}>{r.bookings}</td>
                                <td style={{ textAlign: 'right', color: r.no_shows > 0 ? CLR.red : CLR.muted }}>{r.no_shows}</td>
                                <td style={{ textAlign: 'right', color: pctClr(r.avg_reliability) }}>{r.avg_reliability}%</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}

          {/* ═══════════ STAFF TAB ═══════════ */}
          {tab === 'staff' && staffData && (
            <div>
              {(() => {
                const rows = staffData.rows || []
                const totalRev = rows.reduce((s: number, r: any) => s + r.revenue, 0)
                const totalBk = rows.reduce((s: number, r: any) => s + r.bookings, 0)
                return (
                  <>
                    <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))' }}>
                      <KpiCard label="Total Revenue" value={fmtK(totalRev)} color={CLR.green} />
                      <KpiCard label="Bookings" value={String(totalBk)} color={CLR.blue} />
                      <KpiCard label="Active Staff" value={String(rows.length)} color={CLR.primary} />
                      <KpiCard label="Avg per Staff" value={rows.length > 0 ? fmtK(totalRev / rows.length) : '£0'} color={CLR.purple} />
                    </div>

                    <div className="card" style={{ marginBottom: '1rem' }}>
                      <CardTitle>Revenue per Staff</CardTitle>
                      <HBarChart data={rows.map((r: any) => ({ label: r.staff_name, value: r.revenue }))} color={CLR.blue} />
                    </div>

                    <div className="card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <CardTitle>Staff Performance</CardTitle>
                        <button className="btn btn-sm btn-outline" onClick={() => exportCSV(rows, 'staff_report.csv')}>↓ CSV</button>
                      </div>
                      <div className="table-wrap">
                        <table>
                          <thead><tr>
                            <th>Staff</th><th style={{ textAlign: 'right' }}>Revenue</th><th style={{ textAlign: 'right' }}>Bookings</th>
                            <th style={{ textAlign: 'right' }}>No Shows</th><th style={{ textAlign: 'right' }}>NS %</th>
                            <th style={{ textAlign: 'right' }}>Reliability</th><th style={{ textAlign: 'right' }}>At Risk</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.staff_id} style={{ cursor: 'pointer' }} onClick={() => setStaffDrill(r)}>
                                <td style={{ fontWeight: 600 }}>{r.staff_name}</td>
                                <td style={{ textAlign: 'right', fontWeight: 600 }}>{fmtP(r.revenue)}</td>
                                <td style={{ textAlign: 'right' }}>{r.bookings}</td>
                                <td style={{ textAlign: 'right', color: r.no_shows > 0 ? CLR.red : CLR.muted }}>{r.no_shows}</td>
                                <td style={{ textAlign: 'right', color: r.no_show_rate > 10 ? CLR.red : CLR.green, fontWeight: 600 }}>{r.no_show_rate}%</td>
                                <td style={{ textAlign: 'right', color: pctClr(r.avg_reliability) }}>{r.avg_reliability}%</td>
                                <td style={{ textAlign: 'right', color: r.at_risk > 0 ? CLR.red : CLR.muted }}>{fmtP(r.at_risk)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )
              })()}
            </div>
          )}
        </>
      )}

      {/* Staff Drilldown Modal */}
      {staffDrill && (
        <div className="modal-overlay" onClick={() => setStaffDrill(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ margin: 0 }}>{staffDrill.staff_name}</h2>
              <button className="btn btn-ghost" onClick={() => setStaffDrill(null)} style={{ fontSize: '1.3rem' }}>×</button>
            </div>
            <div style={{ display: 'grid', gap: '0.5rem', fontSize: '0.9rem' }}>
              <Row label="Revenue" value={fmtP(staffDrill.revenue)} bold />
              <Row label="Bookings" value={staffDrill.bookings} />
              <Row label="No Shows" value={staffDrill.no_shows} color={staffDrill.no_shows > 0 ? CLR.red : undefined} />
              <Row label="No-Show Rate" value={`${staffDrill.no_show_rate}%`} color={staffDrill.no_show_rate > 10 ? CLR.red : CLR.green} bold />
              <Row label="Avg Client Reliability" value={`${staffDrill.avg_reliability}%`} color={pctClr(staffDrill.avg_reliability)} />
              <Row label="Avg Risk Score" value={staffDrill.avg_risk} color={staffDrill.avg_risk > 50 ? CLR.red : CLR.green} />
              <Row label="Revenue at Risk" value={fmtP(staffDrill.at_risk)} color={staffDrill.at_risk > 0 ? CLR.red : undefined} bold />
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .rpt-grid-2 { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════ SHARED COMPONENTS ═══════════ */

function Row({ label, value, color, bold }: { label: string; value: any; color?: string; bold?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', borderBottom: `1px solid ${CLR.border}` }}>
      <span style={{ color: CLR.muted }}>{label}</span>
      <span style={{ fontWeight: bold ? 700 : 400, color: color || CLR.text }}>{value}</span>
    </div>
  )
}

function CardTitle({ children }: { children: React.ReactNode }) {
  return <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: CLR.muted, fontWeight: 600, marginBottom: '0.75rem' }}>{children}</div>
}

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="stat-card" style={{ textAlign: 'left', borderLeft: `3px solid ${color}` }}>
      <div style={{ fontSize: '1.35rem', fontWeight: 700, color }}>{value}</div>
      <div className="stat-label" style={{ textAlign: 'left' }}>{label}</div>
    </div>
  )
}

function BarChart({ data, color, height = 120 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  if (!data.length) return <div className="empty-state" style={{ height, padding: '1rem' }}>No data</div>
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(4, Math.min(20, Math.floor(600 / data.length) - 2))
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 1, overflow: 'hidden' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${d.label}: £${d.value.toFixed(2)}`}>
          <div style={{
            width: '80%', maxWidth: barW, borderRadius: '3px 3px 0 0',
            height: `${Math.max(2, (d.value / max) * 100)}%`,
            background: color, transition: 'height 0.3s ease',
          }} />
        </div>
      ))}
    </div>
  )
}

function HBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  if (!data.length) return <div className="empty-state" style={{ padding: '1rem' }}>No data</div>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 90, fontSize: '0.8rem', color: CLR.muted, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
          <div style={{ flex: 1, height: 16, background: CLR.barTrack, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ width: 60, fontSize: '0.75rem', color: CLR.text, textAlign: 'right', flexShrink: 0, fontWeight: 600 }}>£{d.value.toFixed(0)}</div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div className="empty-state" style={{ padding: '1.5rem' }}>No risk data</div>
  let cumPct = 0
  const segments = data.map(d => {
    const pct = (d.value / total) * 100
    const start = cumPct
    cumPct += pct
    return { ...d, pct, start }
  })
  const gradientStops = segments.map(s => `${s.color} ${s.start}% ${s.start + s.pct}%`).join(', ')
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
      <div style={{
        width: 100, height: 100, borderRadius: '50%', flexShrink: 0,
        background: `conic-gradient(${gradientStops})`,
        position: 'relative',
      }}>
        <div style={{ position: 'absolute', inset: '25%', borderRadius: '50%', background: CLR.surface }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: CLR.muted }}>{s.label}</span>
            <span style={{ fontWeight: 600, color: CLR.text }}>{s.value}</span>
            <span style={{ color: CLR.muted }}>({s.pct.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeatmapChart({ data }: { data: { hour: number; dow: number; count: number }[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 12 }, (_, i) => i + 8)
  const max = Math.max(...data.map(d => d.count), 1)
  const lookup: Record<string, number> = {}
  data.forEach(d => { lookup[`${d.dow}-${d.hour}`] = d.count })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${hours.length}, 1fr)`, gap: 2, minWidth: 300 }}>
        <div />
        {hours.map(h => <div key={h} style={{ fontSize: '0.65rem', color: CLR.muted, textAlign: 'center' }}>{h}:00</div>)}
        {days.map((day, di) => (
          <div key={`row-${di}`} style={{ display: 'contents' }}>
            <div style={{ fontSize: '0.7rem', color: CLR.muted, display: 'flex', alignItems: 'center' }}>{day}</div>
            {hours.map(h => {
              const v = lookup[`${di + 1}-${h}`] || 0
              const intensity = v / max
              return (
                <div key={`${di}-${h}`} title={`${day} ${h}:00 — ${v} bookings`} style={{
                  height: 18, borderRadius: 3,
                  background: v === 0 ? CLR.barTrack : `rgba(37, 99, 235, ${0.12 + intensity * 0.75})`,
                  transition: 'background 0.2s',
                }} />
              )
            })}
          </div>
        ))}
      </div>
    </div>
  )
}
