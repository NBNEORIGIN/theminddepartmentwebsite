'use client'

import { useEffect, useState, useCallback } from 'react'
import { getReportsOverview, getReportsDaily, getReportsMonthly, getReportsStaff, getReportsInsights, getStaffList, getServices } from '@/lib/api'

/* ================================================================
   REPORTS — Visual Intelligence Dashboard
   Stripe-grade analytics for small business owners
   ================================================================ */

const C = {
  green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
  purple: '#a855f7', cyan: '#06b6d4', pink: '#ec4899',
  bg: '#0f172a', card: '#1e293b', cardAlt: '#334155', text: '#f8fafc',
  muted: '#94a3b8', border: '#475569', accent: '#6366f1',
}

function fmtP(v: number) { return '£' + v.toFixed(2) }
function fmtK(v: number) { return v >= 1000 ? `£${(v / 1000).toFixed(1)}k` : fmtP(v) }
function todayStr() { return new Date().toISOString().slice(0, 10) }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10) }
function pctColor(v: number, hi = 80, med = 40) { return v >= hi ? C.green : v >= med ? C.amber : C.red }

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

  useEffect(() => {
    Promise.all([getStaffList(), getServices(true)]).then(([s, sv]) => {
      setStaffList(s.data || [])
      setServiceList(sv.data || [])
    })
    getReportsInsights().then(r => setInsights(r.data))
  }, [])

  const fetchTab = useCallback(async () => {
    setLoading(true)
    const p = { ...filters, staff_id: filters.staff_id, service_id: filters.service_id, risk_level: filters.risk_level, payment_status: filters.payment_status }
    if (tab === 'overview') { const r = await getReportsOverview(p); setOverview(r.data) }
    else if (tab === 'daily') { const r = await getReportsDaily(p); setDaily(r.data) }
    else if (tab === 'monthly') { const r = await getReportsMonthly(p); setMonthly(r.data) }
    else if (tab === 'staff') { const r = await getReportsStaff(p); setStaffData(r.data) }
    setLoading(false)
  }, [tab, filters])

  useEffect(() => { fetchTab() }, [fetchTab])

  function setF(k: string, v: any) { setFilters(prev => ({ ...prev, [k]: v || undefined })) }
  function setRange(days: number) { setFilters(prev => ({ ...prev, date_from: daysAgo(days), date_to: todayStr() })) }

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

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Reports</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Visual Intelligence Dashboard</div>
        </div>
      </div>

      {/* PHASE 6 — Global Filters */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem', alignItems: 'center' }}>
        {[{ d: 7, l: '7d' }, { d: 30, l: '30d' }, { d: 90, l: '90d' }, { d: 365, l: '1yr' }].map(r => (
          <button key={r.d} onClick={() => setRange(r.d)} style={{
            padding: '0.3rem 0.6rem', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
            border: `1px solid ${C.border}`, background: 'transparent', color: C.muted,
          }}>{r.l}</button>
        ))}
        <span style={{ width: 1, height: 18, background: C.border }} />
        <input type="date" value={filters.date_from} onChange={e => setF('date_from', e.target.value)} style={{ padding: '0.25rem 0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.75rem' }} />
        <span style={{ color: C.muted, fontSize: '0.7rem' }}>to</span>
        <input type="date" value={filters.date_to} onChange={e => setF('date_to', e.target.value)} style={{ padding: '0.25rem 0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.75rem' }} />
        <select value={filters.staff_id || ''} onChange={e => setF('staff_id', e.target.value ? Number(e.target.value) : undefined)} style={{ padding: '0.25rem 0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.75rem' }}>
          <option value="">All Staff</option>
          {staffList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.service_id || ''} onChange={e => setF('service_id', e.target.value ? Number(e.target.value) : undefined)} style={{ padding: '0.25rem 0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.75rem' }}>
          <option value="">All Services</option>
          {serviceList.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select value={filters.risk_level || ''} onChange={e => setF('risk_level', e.target.value)} style={{ padding: '0.25rem 0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.75rem' }}>
          <option value="">All Risk</option>
          <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="CRITICAL">Critical</option>
        </select>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1rem', borderBottom: `2px solid ${C.border}30`, paddingBottom: '0.5rem' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === t.key ? C.accent : 'transparent', color: tab === t.key ? '#fff' : C.muted,
            fontWeight: tab === t.key ? 700 : 500, fontSize: '0.85rem',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '40vh', color: C.muted }}>
          <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📊</div><div>Loading analytics…</div></div>
        </div>
      ) : (
        <>
          {/* ═══════════ OVERVIEW TAB ═══════════ */}
          {tab === 'overview' && overview && (
            <div>
              {/* KPI Row */}
              <div className="rpt-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                <KpiCard label="Revenue" value={fmtK(kpi.revenue || 0)} color={C.green} />
                <KpiCard label="At Risk" value={fmtK(kpi.revenue_at_risk || 0)} color={C.red} />
                <KpiCard label="Bookings" value={String(kpi.total_bookings || 0)} color={C.blue} />
                <KpiCard label="No-Show %" value={`${kpi.no_show_rate || 0}%`} color={(kpi.no_show_rate || 0) > 10 ? C.red : C.green} />
                <KpiCard label="Reliability" value={`${kpi.avg_reliability || 0}%`} color={pctColor(kpi.avg_reliability || 0)} />
                <KpiCard label="Avg Risk" value={String((kpi.avg_risk_score || 0).toFixed(1))} color={(kpi.avg_risk_score || 0) > 50 ? C.red : C.green} />
                <KpiCard label="Repeat %" value={`${kpi.repeat_client_pct || 0}%`} color={C.purple} />
              </div>

              <div className="rpt-grid-2" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {/* Revenue Line Chart */}
                <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Revenue Over Time</div>
                  <BarChart data={(overview.revenue_timeline || []).map((d: any) => ({ label: d.date.slice(5), value: d.revenue }))} color={C.green} height={140} />
                </div>

                {/* Risk Donut */}
                <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Risk Distribution</div>
                  <DonutChart data={(overview.risk_distribution || []).map((d: any) => ({
                    label: d.level, value: d.count,
                    color: d.level === 'CRITICAL' ? '#991b1b' : d.level === 'HIGH' ? C.red : d.level === 'MEDIUM' ? C.amber : C.green,
                  }))} />
                </div>
              </div>

              <div className="rpt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '0.75rem' }}>
                {/* Demand Heatmap */}
                <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Demand Heatmap</div>
                  <HeatmapChart data={overview.demand_heatmap || []} />
                </div>

                {/* Service Breakdown */}
                <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Service Revenue</div>
                  <HBarChart data={(overview.service_breakdown || []).slice(0, 6).map((s: any) => ({ label: s.name, value: s.revenue }))} color={C.accent} />
                </div>
              </div>

              {/* Smart Insights + Actions */}
              {insights && (
                <div className="rpt-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                  <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Smart Engine Insights</div>
                    {(insights.insights || []).length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: C.muted }}>No insights yet — more data needed.</div>
                    ) : (insights.insights || []).map((ins: any, i: number) => (
                      <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start', padding: '0.4rem 0', borderBottom: i < insights.insights.length - 1 ? `1px solid ${C.border}20` : 'none' }}>
                        <span style={{ fontSize: '0.8rem', flexShrink: 0 }}>{ins.type === 'danger' ? '🔴' : ins.type === 'warning' ? '🟡' : ins.type === 'success' ? '🟢' : '🔵'}</span>
                        <div>
                          <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{ins.message}</div>
                          <div style={{ fontSize: '0.65rem', color: C.muted }}>{ins.metric}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* PHASE 9 — Recommended Actions */}
                  <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                    <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Recommended Actions</div>
                    {(insights.actions || []).length === 0 ? (
                      <div style={{ fontSize: '0.8rem', color: C.muted }}>No actions needed right now.</div>
                    ) : (insights.actions || []).map((act: any, i: number) => (
                      <div key={i} style={{ padding: '0.5rem', background: C.cardAlt, borderRadius: 8, marginBottom: '0.4rem', borderLeft: `3px solid ${act.severity === 'high' ? C.red : C.amber}` }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{act.action}</div>
                        <div style={{ fontSize: '0.65rem', color: C.green, fontWeight: 600 }}>{act.impact}</div>
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
                    <div className="rpt-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                      <KpiCard label="Period Revenue" value={fmtK(totalRev)} color={C.green} />
                      <KpiCard label="Bookings" value={String(totalBk)} color={C.blue} />
                      <KpiCard label="No Shows" value={String(totalNS)} color={totalNS > 0 ? C.red : C.green} />
                      <KpiCard label="Active Days" value={String(rows.length)} color={C.accent} />
                    </div>

                    {/* Bar chart */}
                    <div style={{ background: C.card, borderRadius: 12, padding: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Daily Revenue</div>
                      <BarChart data={rows.map((r: any) => ({ label: r.date.slice(5), value: r.revenue }))} color={C.green} height={160} />
                    </div>

                    {/* Table */}
                    <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600 }}>Daily Breakdown</div>
                        <button onClick={() => exportCSV(rows, 'daily_takings.csv')} style={{ padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.65rem' }}>↓ CSV</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead><tr style={{ borderBottom: `1px solid ${C.border}30` }}>
                            <th style={{ textAlign: 'left', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Date</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Revenue</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>At Risk</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Deposits</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Bookings</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>No Shows</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Cancelled</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.date} style={{ borderBottom: `1px solid ${C.border}15` }}>
                                <td style={{ padding: '0.4rem' }}>{r.date}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', fontWeight: 600 }}>{fmtP(r.revenue)}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: r.at_risk > 0 ? C.red : C.muted }}>{fmtP(r.at_risk)}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem' }}>{fmtP(r.deposits)}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem' }}>{r.bookings}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: r.no_shows > 0 ? C.red : C.muted }}>{r.no_shows}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem' }}>{r.cancelled}</td>
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
                    <div className="rpt-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                      <KpiCard label="Total Revenue" value={fmtK(totalRev)} color={C.green} />
                      <KpiCard label="Bookings" value={String(totalBk)} color={C.blue} />
                      <KpiCard label="Months" value={String(rows.length)} color={C.accent} />
                      <KpiCard label="Avg Monthly" value={rows.length > 0 ? fmtK(totalRev / rows.length) : '£0'} color={C.purple} />
                    </div>

                    <div style={{ background: C.card, borderRadius: 12, padding: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Monthly Revenue</div>
                      <BarChart data={rows.map((r: any) => ({ label: r.month, value: r.revenue }))} color={C.green} height={160} />
                    </div>

                    <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600 }}>Monthly Breakdown</div>
                        <button onClick={() => exportCSV(rows, 'monthly_report.csv')} style={{ padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.65rem' }}>↓ CSV</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead><tr style={{ borderBottom: `1px solid ${C.border}30` }}>
                            <th style={{ textAlign: 'left', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Month</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Revenue</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>MoM</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Bookings</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>No Shows</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Reliability</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.month} style={{ borderBottom: `1px solid ${C.border}15` }}>
                                <td style={{ padding: '0.4rem', fontWeight: 600 }}>{r.month}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', fontWeight: 600 }}>{fmtP(r.revenue)}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem' }}>
                                  {r.mom_growth != null ? (
                                    <span style={{ color: r.mom_growth >= 0 ? C.green : C.red, fontWeight: 600 }}>
                                      {r.mom_growth >= 0 ? '▲' : '▼'} {Math.abs(r.mom_growth)}%
                                    </span>
                                  ) : <span style={{ color: C.muted }}>—</span>}
                                </td>
                                <td style={{ textAlign: 'right', padding: '0.4rem' }}>{r.bookings}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: r.no_shows > 0 ? C.red : C.muted }}>{r.no_shows}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: pctColor(r.avg_reliability) }}>{r.avg_reliability}%</td>
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
                    <div className="rpt-kpi-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
                      <KpiCard label="Total Revenue" value={fmtK(totalRev)} color={C.green} />
                      <KpiCard label="Bookings" value={String(totalBk)} color={C.blue} />
                      <KpiCard label="Active Staff" value={String(rows.length)} color={C.accent} />
                      <KpiCard label="Avg per Staff" value={rows.length > 0 ? fmtK(totalRev / rows.length) : '£0'} color={C.purple} />
                    </div>

                    {/* Staff revenue bar chart */}
                    <div style={{ background: C.card, borderRadius: 12, padding: '1rem', marginBottom: '0.75rem' }}>
                      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Revenue per Staff</div>
                      <HBarChart data={rows.map((r: any) => ({ label: r.staff_name, value: r.revenue }))} color={C.accent} />
                    </div>

                    {/* Staff table */}
                    <div style={{ background: C.card, borderRadius: 12, padding: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600 }}>Staff Performance</div>
                        <button onClick={() => exportCSV(rows, 'staff_report.csv')} style={{ padding: '2px 8px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.65rem' }}>↓ CSV</button>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                          <thead><tr style={{ borderBottom: `1px solid ${C.border}30` }}>
                            <th style={{ textAlign: 'left', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Staff</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Revenue</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Bookings</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>No Shows</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>NS %</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>Reliability</th>
                            <th style={{ textAlign: 'right', padding: '0.4rem', color: C.muted, fontWeight: 600 }}>At Risk</th>
                          </tr></thead>
                          <tbody>
                            {rows.map((r: any) => (
                              <tr key={r.staff_id} style={{ borderBottom: `1px solid ${C.border}15`, cursor: 'pointer' }}
                                onClick={() => setStaffDrill(r)}
                                onMouseEnter={e => e.currentTarget.style.background = C.cardAlt}
                                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                <td style={{ padding: '0.4rem', fontWeight: 700 }}>{r.staff_name}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', fontWeight: 600 }}>{fmtP(r.revenue)}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem' }}>{r.bookings}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: r.no_shows > 0 ? C.red : C.muted }}>{r.no_shows}</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: r.no_show_rate > 10 ? C.red : C.green, fontWeight: 600 }}>{r.no_show_rate}%</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: pctColor(r.avg_reliability) }}>{r.avg_reliability}%</td>
                                <td style={{ textAlign: 'right', padding: '0.4rem', color: r.at_risk > 0 ? C.red : C.muted }}>{fmtP(r.at_risk)}</td>
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
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setStaffDrill(null)}>
          <div style={{ maxWidth: 480, width: '100%', background: C.card, borderRadius: 16, padding: '1.5rem', position: 'relative', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setStaffDrill(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.muted }}>×</button>
            <h2 style={{ margin: 0, fontSize: '1.1rem', marginBottom: '1rem' }}>{staffDrill.staff_name}</h2>
            <div style={{ display: 'grid', gap: '0.4rem', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Revenue</span><span style={{ fontWeight: 700 }}>{fmtP(staffDrill.revenue)}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Bookings</span><span>{staffDrill.bookings}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>No Shows</span><span style={{ color: staffDrill.no_shows > 0 ? C.red : C.muted }}>{staffDrill.no_shows}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>No-Show Rate</span><span style={{ color: staffDrill.no_show_rate > 10 ? C.red : C.green, fontWeight: 600 }}>{staffDrill.no_show_rate}%</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Avg Client Reliability</span><span style={{ color: pctColor(staffDrill.avg_reliability) }}>{staffDrill.avg_reliability}%</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Avg Risk Score</span><span style={{ color: staffDrill.avg_risk > 50 ? C.red : C.green }}>{staffDrill.avg_risk}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: C.muted }}>Revenue at Risk</span><span style={{ color: staffDrill.at_risk > 0 ? C.red : C.muted, fontWeight: 600 }}>{fmtP(staffDrill.at_risk)}</span></div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .rpt-grid-2 { grid-template-columns: 1fr !important; }
          .rpt-kpi-row { grid-template-columns: repeat(2, 1fr) !important; overflow-x: auto; }
        }
      `}</style>
    </div>
  )
}

/* ═══════════ CHART COMPONENTS ═══════════ */

function KpiCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ background: C.card, borderRadius: 10, padding: '0.75rem', borderLeft: `3px solid ${color}`, transition: 'transform 0.15s' }}
      onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color }}>{value}</div>
      <div style={{ fontSize: '0.65rem', color: C.muted, marginTop: 2 }}>{label}</div>
    </div>
  )
}

function BarChart({ data, color, height = 120 }: { data: { label: string; value: number }[]; color: string; height?: number }) {
  if (!data.length) return <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.muted, fontSize: '0.8rem' }}>No data</div>
  const max = Math.max(...data.map(d => d.value), 1)
  const barW = Math.max(4, Math.min(20, Math.floor(600 / data.length) - 2))
  return (
    <div style={{ height, display: 'flex', alignItems: 'flex-end', gap: 1, overflow: 'hidden' }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }} title={`${d.label}: £${d.value.toFixed(2)}`}>
          <div style={{
            width: '80%', maxWidth: barW, borderRadius: '3px 3px 0 0',
            height: `${Math.max(2, (d.value / max) * 100)}%`,
            background: `${color}cc`, transition: 'height 0.3s ease',
          }} />
        </div>
      ))}
    </div>
  )
}

function HBarChart({ data, color }: { data: { label: string; value: number }[]; color: string }) {
  if (!data.length) return <div style={{ padding: '1rem', color: C.muted, fontSize: '0.8rem', textAlign: 'center' }}>No data</div>
  const max = Math.max(...data.map(d => d.value), 1)
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {data.map((d, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <div style={{ width: 80, fontSize: '0.7rem', color: C.muted, textAlign: 'right', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
          <div style={{ flex: 1, height: 14, background: C.cardAlt, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ width: `${(d.value / max) * 100}%`, height: '100%', background: color, borderRadius: 4, transition: 'width 0.4s ease' }} />
          </div>
          <div style={{ width: 55, fontSize: '0.65rem', color: C.muted, textAlign: 'right', flexShrink: 0 }}>£{d.value.toFixed(0)}</div>
        </div>
      ))}
    </div>
  )
}

function DonutChart({ data }: { data: { label: string; value: number; color: string }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  if (total === 0) return <div style={{ padding: '2rem', color: C.muted, fontSize: '0.8rem', textAlign: 'center' }}>No risk data</div>
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
        <div style={{ position: 'absolute', inset: '25%', borderRadius: '50%', background: C.card }} />
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {segments.map((s, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color, flexShrink: 0 }} />
            <span style={{ color: C.muted }}>{s.label}</span>
            <span style={{ fontWeight: 600 }}>{s.value}</span>
            <span style={{ color: C.muted }}>({s.pct.toFixed(0)}%)</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function HeatmapChart({ data }: { data: { hour: number; dow: number; count: number }[] }) {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8am-7pm
  const max = Math.max(...data.map(d => d.count), 1)
  const lookup: Record<string, number> = {}
  data.forEach(d => { lookup[`${d.dow}-${d.hour}`] = d.count })

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'grid', gridTemplateColumns: `40px repeat(${hours.length}, 1fr)`, gap: 2, minWidth: 300 }}>
        <div />
        {hours.map(h => <div key={h} style={{ fontSize: '0.55rem', color: C.muted, textAlign: 'center' }}>{h}:00</div>)}
        {days.map((day, di) => (
          <>
            <div key={`l-${di}`} style={{ fontSize: '0.6rem', color: C.muted, display: 'flex', alignItems: 'center' }}>{day}</div>
            {hours.map(h => {
              const v = lookup[`${di + 1}-${h}`] || 0
              const intensity = v / max
              return (
                <div key={`${di}-${h}`} title={`${day} ${h}:00 — ${v} bookings`} style={{
                  height: 16, borderRadius: 3,
                  background: v === 0 ? C.cardAlt : `rgba(99, 102, 241, ${0.15 + intensity * 0.85})`,
                  transition: 'background 0.2s',
                }} />
              )
            })}
          </>
        ))}
      </div>
    </div>
  )
}
