'use client'

import { useState, useEffect, useCallback } from 'react'

const API = '/api/django/compliance'

/* ================================================================
   HEALTH & SAFETY — Intelligence Dashboard v2
   Visual, risk-driven compliance interface
   ================================================================ */

// ── Colour system (aligned with booking dashboard) ──
const C = {
  green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
  bg: '#0f172a', card: '#1e293b', cardAlt: '#334155', text: '#f8fafc', muted: '#94a3b8',
  border: '#475569', accent: '#6366f1', surface: '#1e293b',
}

function scoreGradient(pct: number): string {
  if (pct >= 80) return C.green
  if (pct >= 60) return C.amber
  return C.red
}

function fmtDate(d: string | null) {
  if (!d) return '—'
  return new Date(d + 'T00:00:00').toLocaleDateString('en-GB')
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']

type Tab = 'dashboard' | 'register' | 'calendar' | 'accidents' | 'audit'

// ════════════════════════════════════════════════════════════════
// ZONE 1 — RISK SUMMARY (Animated Ring Gauge)
// ════════════════════════════════════════════════════════════════
function RiskSummary({ dash, onResolve }: { dash: any; onResolve: () => void }) {
  const score = dash.score || 0
  const color = scoreGradient(score)
  const R = 70, CX = 80, CY = 80, SW = 12
  const circ = 2 * Math.PI * R
  const offset = circ - (score / 100) * circ

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600 }}>Compliance Risk Level</div>
      <svg width={160} height={160} viewBox="0 0 160 160">
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.cardAlt} strokeWidth={SW} />
        <circle cx={CX} cy={CY} r={R} fill="none" stroke={color} strokeWidth={SW}
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
          transform={`rotate(-90 ${CX} ${CY})`}
          style={{ transition: 'stroke-dashoffset 1s ease, stroke 0.5s ease' }} />
        <text x={CX} y={CY - 6} textAnchor="middle" fill={color} fontSize={32} fontWeight={800}>{score}</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fill={C.muted} fontSize={10}>Peace of Mind</text>
      </svg>
      <div style={{ textAlign: 'center', fontSize: '0.85rem', color: C.text, lineHeight: 1.5, maxWidth: 300 }}>
        {dash.summary_text || dash.interpretation}
      </div>
      {(dash.overdue_count > 0 || dash.due_soon_count > 0) && (
        <button onClick={onResolve} style={{
          padding: '0.6rem 1.5rem', borderRadius: 10, border: 'none', fontWeight: 700,
          background: color, color: '#fff', cursor: 'pointer', fontSize: '0.85rem',
          transition: 'transform 0.15s', marginTop: '0.25rem',
        }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >Resolve Priority Items</button>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ZONE 2 — TIME HORIZON VISUALISATION
// ════════════════════════════════════════════════════════════════
function TimeHorizon({ horizon, onFilter }: { horizon: any; onFilter: (items: any[], label: string) => void }) {
  const segments = [
    { key: 'overdue', label: 'Overdue', count: horizon.overdue, items: horizon.overdue_items, color: C.red },
    { key: 'next_7', label: 'Next 7 days', count: horizon.next_7, items: horizon.next_7_items, color: C.amber },
    { key: 'next_30', label: '8–30 days', count: horizon.next_30, items: horizon.next_30_items, color: C.blue },
    { key: 'next_90', label: '31–90 days', count: horizon.next_90, items: horizon.next_90_items, color: C.green },
  ]
  const maxCount = Math.max(1, ...segments.map(s => s.count))

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '1rem' }}>Time Horizon</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {segments.map(s => (
          <div key={s.key} onClick={() => s.count > 0 && onFilter(s.items, s.label)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: s.count > 0 ? 'pointer' : 'default', padding: '0.3rem 0' }}
            onMouseEnter={e => s.count > 0 && (e.currentTarget.style.opacity = '0.8')}
            onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
          >
            <div style={{ width: 90, fontSize: '0.75rem', color: C.muted, textAlign: 'right', flexShrink: 0 }}>{s.label}</div>
            <div style={{ flex: 1, height: 24, background: C.bg, borderRadius: 6, overflow: 'hidden', position: 'relative' }}>
              <div style={{
                height: '100%', width: `${Math.max(2, (s.count / maxCount) * 100)}%`,
                background: s.color, borderRadius: 6, transition: 'width 0.6s ease',
                display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 8,
              }}>
                {s.count > 0 && <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fff' }}>{s.count}</span>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// ZONE 3 — TREND INTELLIGENCE (SVG Line Chart)
// ════════════════════════════════════════════════════════════════
function TrendChart({ trend }: { trend: any[] }) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  if (!trend || trend.length === 0) return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem', textAlign: 'center', color: C.muted, fontSize: '0.85rem' }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: '0.5rem' }}>Score Trend — Last 30 Days</div>
      No trend data yet. Score changes will appear here.
    </div>
  )

  const W = 500, H = 140, PAD = 30
  const minScore = Math.max(0, Math.min(...trend.map(t => t.score)) - 10)
  const maxScore = Math.min(100, Math.max(...trend.map(t => t.score)) + 10)
  const range = maxScore - minScore || 1

  const points = trend.map((t, i) => ({
    x: PAD + (i / Math.max(1, trend.length - 1)) * (W - PAD * 2),
    y: PAD + (1 - (t.score - minScore) / range) * (H - PAD * 2),
    ...t,
  }))
  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Score Trend — Last 30 Days</div>
      <svg width="100%" viewBox={`0 0 ${W} ${H + 20}`} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[minScore, Math.round((minScore + maxScore) / 2), maxScore].map(v => {
          const y = PAD + (1 - (v - minScore) / range) * (H - PAD * 2)
          return <g key={v}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke={C.border} strokeWidth={0.5} strokeDasharray="4 4" />
            <text x={PAD - 6} y={y + 3} textAnchor="end" fill={C.muted} fontSize={9}>{v}%</text>
          </g>
        })}
        {/* Line */}
        <path d={pathD} fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinejoin="round" />
        {/* Area fill */}
        <path d={`${pathD} L ${points[points.length - 1].x} ${H - PAD + 10} L ${points[0].x} ${H - PAD + 10} Z`}
          fill={`${C.accent}15`} />
        {/* Dots */}
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={hoverIdx === i ? 5 : 3}
            fill={scoreGradient(p.score)} stroke={C.text} strokeWidth={hoverIdx === i ? 2 : 0}
            style={{ cursor: 'pointer', transition: 'r 0.15s' }}
            onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} />
        ))}
        {/* Tooltip */}
        {hoverIdx !== null && points[hoverIdx] && (
          <g>
            <rect x={points[hoverIdx].x - 70} y={points[hoverIdx].y - 42} width={140} height={32} rx={6} fill={C.cardAlt} stroke={C.border} strokeWidth={0.5} />
            <text x={points[hoverIdx].x} y={points[hoverIdx].y - 28} textAnchor="middle" fill={C.text} fontSize={10} fontWeight={600}>
              {points[hoverIdx].score}% — {points[hoverIdx].trigger}
            </text>
            <text x={points[hoverIdx].x} y={points[hoverIdx].y - 16} textAnchor="middle" fill={C.muted} fontSize={8}>
              {new Date(points[hoverIdx].date).toLocaleDateString('en-GB')} {points[hoverIdx].change > 0 ? `+${points[hoverIdx].change}` : points[hoverIdx].change}%
            </text>
          </g>
        )}
      </svg>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PRIORITY BADGE
// ════════════════════════════════════════════════════════════════
function PriorityBadge({ level }: { level: string }) {
  const cfg: Record<string, { bg: string; color: string }> = {
    high: { bg: C.red + '25', color: C.red },
    medium: { bg: C.amber + '25', color: C.amber },
    low: { bg: C.blue + '25', color: C.blue },
  }
  const c = cfg[level] || cfg.low
  return (
    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: c.bg, color: c.color, textTransform: 'uppercase' }}>
      {level}
    </span>
  )
}

// ════════════════════════════════════════════════════════════════
// SEVERITY HELPERS (Accident Log)
// ════════════════════════════════════════════════════════════════
function severityColor(s: string) {
  if (s === 'MINOR') return C.blue
  if (s === 'MODERATE') return C.amber
  return C.red
}

function riddorDaysRemaining(accidentDate: string): number | null {
  if (!accidentDate) return null
  const d = new Date(accidentDate + 'T00:00:00')
  const deadline = new Date(d.getTime() + 10 * 86400000)
  const now = new Date()
  const diff = Math.ceil((deadline.getTime() - now.getTime()) / 86400000)
  return diff
}

// ════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ════════════════════════════════════════════════════════════════
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
  const [resolveMode, setResolveMode] = useState(false)
  // Accident filters
  const [accSeverityFilter, setAccSeverityFilter] = useState('')
  const [accStatusFilter, setAccStatusFilter] = useState('')
  const [accRiddorFilter, setAccRiddorFilter] = useState(false)
  // Calendar nav
  const now = new Date()
  const [calYear, setCalYear] = useState(now.getFullYear())
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  // Completion modal
  const [completeItem, setCompleteItem] = useState<any>(null)
  // Accident form
  const [showAccidentForm, setShowAccidentForm] = useState(false)
  // Time horizon filter panel
  const [horizonItems, setHorizonItems] = useState<any[] | null>(null)
  const [horizonLabel, setHorizonLabel] = useState('')

  // ===== FETCHERS =====
  const fetchDash = useCallback(async () => {
    try {
      const r = await fetch(`${API}/dashboard-v2/`)
      if (r.ok) setDash(await r.json())
      else {
        const r2 = await fetch(`${API}/dashboard/`)
        if (r2.ok) setDash(await r2.json())
      }
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
      const qs = new URLSearchParams()
      if (accStatusFilter) qs.set('status', accStatusFilter)
      if (accRiddorFilter) qs.set('riddor', '1')
      const r = await fetch(`${API}/accidents/?${qs}`)
      if (r.ok) setAccidents(await r.json())
    } catch {}
  }, [accStatusFilter, accRiddorFilter])

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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🛡️</div>
        <div>Loading compliance intelligence…</div>
      </div>
    </div>
  )

  const d = dash

  // Calendar grid helpers
  function buildCalGrid(year: number, month: number) {
    const first = new Date(year, month - 1, 1)
    const startDay = (first.getDay() + 6) % 7
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

  // Priority items for register
  const priorityItems = d?.priority_items || []

  // Filtered items for register
  const registerItems = resolveMode
    ? priorityItems.filter((i: any) => i.priority_score > 0)
    : items

  // Filtered accidents
  const filteredAccidents = accSeverityFilter
    ? accidents.filter(a => a.severity === accSeverityFilter)
    : accidents

  const tabItems: [Tab, string][] = [
    ['dashboard', 'Risk Radar'],
    ['register', 'Compliance Register'],
    ['calendar', 'Calendar'],
    ['accidents', 'Accident Log'],
    ['audit', 'Audit Trail'],
  ]

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>Health &amp; Safety</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Operational Risk Radar</div>
        </div>
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        {error} <span onClick={() => setError('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
      </div>}
      {success && <div style={{ background: '#14532d', color: '#86efac', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        {success} <span onClick={() => setSuccess('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
      </div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', overflowX: 'auto', borderBottom: `2px solid ${C.border}30`, paddingBottom: '0.5rem' }}>
        {tabItems.map(([k, l]) => (
          <button key={k} onClick={() => { setTab(k); setHorizonItems(null) }} style={{
            padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === k ? C.accent : 'transparent', color: tab === k ? '#fff' : C.muted,
            fontWeight: tab === k ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{l}</button>
        ))}
      </div>

      {/* ===== COMPLETION MODAL ===== */}
      {completeItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ maxWidth: 600, width: '100%', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto', background: C.cardAlt, borderRadius: 16, color: C.text }}>
            <button type="button" onClick={() => setCompleteItem(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: C.muted }}>×</button>
            <h2 style={{ marginBottom: '0.25rem', color: C.text }}>{completeItem.title}</h2>
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: completeItem.item_type === 'LEGAL' ? C.red + '25' : C.blue + '25', color: completeItem.item_type === 'LEGAL' ? C.red : C.blue }}>{completeItem.item_type === 'LEGAL' ? 'Legal' : 'Best Practice'}</span>
              <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: completeItem.status === 'OVERDUE' ? C.red + '25' : completeItem.status === 'DUE_SOON' ? C.amber + '25' : C.green + '25', color: completeItem.status === 'OVERDUE' ? C.red : completeItem.status === 'DUE_SOON' ? C.amber : C.green }}>{completeItem.status}</span>
            </div>
            {completeItem.description && <p style={{ fontSize: '0.85rem', color: C.muted, marginBottom: '0.75rem' }}>{completeItem.description}</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '1rem', fontSize: '0.85rem' }}>
              <div><span style={{ color: C.muted }}>Category:</span> {completeItem.category}</div>
              <div><span style={{ color: C.muted }}>Frequency:</span> {completeItem.frequency_type}</div>
              <div><span style={{ color: C.muted }}>Next Due:</span> {fmtDate(completeItem.next_due_date)}</div>
              <div><span style={{ color: C.muted }}>Last Completed:</span> {fmtDate(completeItem.last_completed_date)}</div>
              {(completeItem.regulatory_ref || completeItem.legal_reference) && (
                <div style={{ gridColumn: '1 / -1' }}><span style={{ color: C.muted }}>Legal Ref:</span> {completeItem.legal_reference || completeItem.regulatory_ref}</div>
              )}
            </div>
            {completeItem.document && (
              <div style={{ padding: '0.6rem', background: C.bg, borderRadius: 8, marginBottom: '0.75rem', fontSize: '0.85rem' }}>
                <strong>Certificate:</strong> <a href={completeItem.document} target="_blank" rel="noopener" style={{ color: C.accent, textDecoration: 'underline' }}>View Document</a>
              </div>
            )}
            <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: '1rem', marginTop: '0.5rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: C.text, fontSize: '1rem' }}>{completeItem.status === 'COMPLIANT' ? 'Record New Completion' : 'Mark as Complete'}</h3>
              <form onSubmit={handleComplete}>
                <div style={{ display: 'grid', gap: '0.75rem' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Completion Date *</label><input name="completed_date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                    <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Completed By</label><input name="completed_by" placeholder="Name" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                  </div>
                  <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Upload Evidence {completeItem.evidence_required ? '*' : '(optional)'}</label><input name="evidence" type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" style={{ color: C.muted, fontSize: '0.85rem' }} /></div>
                  <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Comments</label><textarea name="comments" rows={2} placeholder="Notes..." style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, resize: 'vertical' }} /></div>
                </div>
                <div style={{ marginTop: '1rem', display: 'flex', gap: '0.5rem' }}>
                  <button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>{completeItem.status === 'COMPLIANT' ? 'Record' : 'Mark Complete'}</button>
                  <button type="button" onClick={() => setCompleteItem(null)} style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>Cancel</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ DASHBOARD TAB ═══════════ */}
      {tab === 'dashboard' && d && (
        <div>
          {/* 3-Zone Layout */}
          <div className="hse-dash-grid" style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '1rem', marginBottom: '1rem' }}>
            <RiskSummary dash={d} onResolve={() => { setTab('register'); setResolveMode(true) }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <TimeHorizon horizon={d.time_horizon || { overdue: 0, next_7: 0, next_30: 0, next_90: 0, overdue_items: [], next_7_items: [], next_30_items: [], next_90_items: [] }}
                onFilter={(items, label) => { setHorizonItems(items); setHorizonLabel(label) }} />
              <TrendChart trend={d.trend || []} />
            </div>
          </div>

          {/* Horizon filter results */}
          {horizonItems && horizonItems.length > 0 && (
            <div style={{ background: C.card, borderRadius: 16, padding: '1.25rem', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: 700, color: C.text }}>{horizonLabel} — {horizonItems.length} item{horizonItems.length !== 1 ? 's' : ''}</div>
                <span onClick={() => setHorizonItems(null)} style={{ cursor: 'pointer', color: C.muted, fontSize: '0.8rem' }}>✕ Close</span>
              </div>
              {horizonItems.map((item: any) => (
                <div key={item.id} onClick={() => setCompleteItem(item)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0.75rem',
                  borderBottom: `1px solid ${C.border}30`, cursor: 'pointer', borderRadius: 6,
                }} onMouseEnter={e => (e.currentTarget.style.background = C.bg)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</span>
                    <span style={{ fontSize: '0.75rem', color: C.muted, marginLeft: '0.5rem' }}>{item.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', color: C.muted }}>{fmtDate(item.next_due_date)}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: item.item_type === 'LEGAL' ? C.red + '25' : C.blue + '25', color: item.item_type === 'LEGAL' ? C.red : C.blue }}>{item.item_type === 'LEGAL' ? 'Legal' : 'BP'}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Quick stats row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem' }}>
            {[
              { label: 'Overdue', value: d.overdue_count, color: C.red },
              { label: 'Due Soon', value: d.due_soon_count, color: C.amber },
              { label: 'Compliant', value: d.compliant_count, color: C.green },
              { label: 'Total Items', value: d.total_items, color: C.accent },
              { label: 'Open Accidents', value: d.open_accidents || 0, color: (d.open_accidents || 0) > 0 ? C.red : C.green },
              { label: 'RIDDOR', value: d.riddor_count || 0, color: (d.riddor_count || 0) > 0 ? C.red : C.green },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, borderRadius: 12, padding: '0.75rem 1rem', borderTop: `3px solid ${s.color}` }}>
                <div style={{ fontSize: '1.3rem', fontWeight: 800, color: C.text }}>{s.value}</div>
                <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ═══════════ COMPLIANCE REGISTER ═══════════ */}
      {tab === 'register' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            {[{l:'All',v:''},{l:'Overdue',v:'OVERDUE'},{l:'Due Soon',v:'DUE_SOON'},{l:'Compliant',v:'COMPLIANT'}].map(f => (
              <button key={f.v} onClick={() => { setStatusFilter(f.v); setResolveMode(false) }} style={{
                padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${statusFilter === f.v && !resolveMode ? C.accent : C.border}`,
                background: statusFilter === f.v && !resolveMode ? C.accent : 'transparent', color: statusFilter === f.v && !resolveMode ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              }}>{f.l}</button>
            ))}
            <span style={{ width: 1, height: 20, background: C.border, margin: '0 0.25rem' }} />
            {[{l:'All Types',v:''},{l:'Legal',v:'LEGAL'},{l:'Best Practice',v:'BEST_PRACTICE'}].map(f => (
              <button key={f.v} onClick={() => setTypeFilter(f.v)} style={{
                padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${typeFilter === f.v ? C.accent : C.border}`,
                background: typeFilter === f.v ? C.accent : 'transparent', color: typeFilter === f.v ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600,
              }}>{f.l}</button>
            ))}
            <span style={{ width: 1, height: 20, background: C.border, margin: '0 0.25rem' }} />
            <button onClick={() => setResolveMode(!resolveMode)} style={{
              padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${resolveMode ? C.red : C.border}`,
              background: resolveMode ? C.red + '20' : 'transparent', color: resolveMode ? C.red : C.muted,
              cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700,
            }}>{resolveMode ? '✓ Resolve Mode' : 'Resolve Mode'}</button>
          </div>

          {registerItems.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
              {resolveMode ? 'No items need action right now.' : 'No compliance items found.'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {registerItems.map((item: any) => (
                <div key={item.id} onClick={() => setCompleteItem(item)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem 1rem',
                  background: C.card, borderRadius: 10, cursor: 'pointer',
                  borderLeft: `4px solid ${item.status === 'OVERDUE' ? C.red : item.status === 'DUE_SOON' ? C.amber : C.green}`,
                  transition: 'background 0.15s',
                }} onMouseEnter={e => (e.currentTarget.style.background = C.cardAlt)} onMouseLeave={e => (e.currentTarget.style.background = C.card)}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{item.title}</span>
                      {item.priority_level && <PriorityBadge level={item.priority_level} />}
                      <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: item.item_type === 'LEGAL' ? C.red + '20' : C.blue + '20', color: item.item_type === 'LEGAL' ? C.red : C.blue }}>{item.item_type === 'LEGAL' ? 'Legal' : 'BP'}</span>
                      {item.document && <span style={{ fontSize: '0.7rem', color: C.green }}>✓ cert</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: C.muted, marginTop: 2 }}>
                      {item.category} · {item.frequency_type} {item.regulatory_ref ? `· ${item.regulatory_ref}` : ''}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: '0.8rem', color: item.status === 'OVERDUE' ? C.red : item.status === 'DUE_SOON' ? C.amber : C.green, fontWeight: 600 }}>
                      {item.status === 'OVERDUE' ? `Overdue` : item.status === 'DUE_SOON' ? 'Due soon' : 'Compliant'}
                    </div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>{fmtDate(item.next_due_date)}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ CALENDAR ═══════════ */}
      {tab === 'calendar' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <button onClick={() => { if (calMonth === 1) { setCalMonth(12); setCalYear(calYear - 1) } else setCalMonth(calMonth - 1) }} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>← Prev</button>
            <h2 style={{ margin: 0, color: C.text, fontSize: '1.1rem' }}>{MONTH_NAMES[calMonth - 1]} {calYear}</h2>
            <button onClick={() => { if (calMonth === 12) { setCalMonth(1); setCalYear(calYear + 1) } else setCalMonth(calMonth + 1) }} style={{ padding: '0.4rem 0.75rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer' }}>Next →</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, borderRadius: 12, overflow: 'hidden' }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} style={{ padding: '0.5rem', textAlign: 'center', fontWeight: 700, fontSize: '0.75rem', background: C.cardAlt, color: C.muted }}>{d}</div>
            ))}
            {buildCalGrid(calYear, calMonth).flat().map((day, i) => {
              if (day === null) return <div key={`e${i}`} style={{ padding: '0.5rem', background: C.bg, minHeight: 64 }} />
              const dateStr = `${calYear}-${String(calMonth).padStart(2,'0')}-${String(day).padStart(2,'0')}`
              const dayItems = calDays[dateStr] || []
              const hasRed = dayItems.some((x: any) => x.colour === 'red')
              const hasAmber = dayItems.some((x: any) => x.colour === 'amber')
              const hasGreen = dayItems.some((x: any) => x.colour === 'green')
              const isToday = dateStr === new Date().toISOString().split('T')[0]
              const isSelected = dateStr === selectedDay

              return (
                <div key={dateStr} onClick={() => setSelectedDay(isSelected ? null : dateStr)} style={{
                  padding: '0.4rem', background: hasAmber && !hasRed ? C.amber + '10' : isSelected ? C.accent + '20' : C.card,
                  minHeight: 64, cursor: dayItems.length > 0 ? 'pointer' : 'default',
                  borderTop: isToday ? `3px solid ${C.accent}` : undefined,
                  border: hasRed ? `2px solid ${C.red}` : isSelected ? `2px solid ${C.accent}` : `1px solid ${C.border}20`,
                  transition: 'all 0.15s',
                }}>
                  <div style={{ fontSize: '0.8rem', fontWeight: isToday ? 700 : 400, color: isToday ? C.accent : C.text, marginBottom: '0.2rem' }}>{day}</div>
                  <div style={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                    {dayItems.map((item: any, idx: number) => (
                      <span key={idx} style={{ width: 7, height: 7, borderRadius: '50%', background: item.colour === 'red' ? C.red : item.colour === 'amber' ? C.amber : C.green, display: 'inline-block' }} />
                    ))}
                  </div>
                  {dayItems.length > 0 && <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 2 }}>{dayItems.length}</div>}
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div style={{ marginTop: '0.75rem', display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
            {[{ label: 'Overdue', color: C.red }, { label: 'Due ≤30d', color: C.amber }, { label: 'Compliant', color: C.green }].map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 4, color: C.muted }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }} />{l.label}
              </div>
            ))}
          </div>

          {/* Side panel for selected day */}
          {selectedDay && calDays[selectedDay] && (
            <div style={{ background: C.card, borderRadius: 12, padding: '1rem', marginTop: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: C.text, fontSize: '0.95rem' }}>Items due {fmtDate(selectedDay)}</h3>
              {calDays[selectedDay].map((item: any) => (
                <div key={item.id} onClick={() => setCompleteItem(item)} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0',
                  borderBottom: `1px solid ${C.border}30`, cursor: 'pointer',
                }}>
                  <div>
                    <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>{item.title}</span>
                    <span style={{ fontSize: '0.7rem', color: C.muted, marginLeft: '0.5rem' }}>{item.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: item.item_type === 'LEGAL' ? C.red + '25' : C.blue + '25', color: item.item_type === 'LEGAL' ? C.red : C.blue }}>{item.item_type === 'LEGAL' ? 'Legal' : 'BP'}</span>
                    <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.6rem', fontWeight: 700, background: item.status === 'OVERDUE' ? C.red + '25' : item.status === 'DUE_SOON' ? C.amber + '25' : C.green + '25', color: item.status === 'OVERDUE' ? C.red : item.status === 'DUE_SOON' ? C.amber : C.green }}>{item.status}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ═══════════ ACCIDENT LOG ═══════════ */}
      {tab === 'accidents' && (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <button onClick={() => setShowAccidentForm(!showAccidentForm)} style={{
              padding: '0.4rem 1rem', borderRadius: 8, border: 'none',
              background: showAccidentForm ? C.red : C.accent, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
            }}>{showAccidentForm ? 'Cancel' : '+ Report Accident'}</button>
            <span style={{ width: 1, height: 20, background: C.border, margin: '0 0.25rem' }} />
            {[{l:'All',v:''},{l:'Open',v:'OPEN'},{l:'Investigating',v:'INVESTIGATING'},{l:'Closed',v:'CLOSED'}].map(f => (
              <button key={f.v} onClick={() => setAccStatusFilter(f.v)} style={{
                padding: '0.3rem 0.6rem', borderRadius: 6, border: `1px solid ${accStatusFilter === f.v ? C.accent : C.border}`,
                background: accStatusFilter === f.v ? C.accent : 'transparent', color: accStatusFilter === f.v ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}>{f.l}</button>
            ))}
            <span style={{ width: 1, height: 20, background: C.border, margin: '0 0.25rem' }} />
            {[{l:'All Severity',v:''},{l:'Minor',v:'MINOR'},{l:'Moderate',v:'MODERATE'},{l:'Major',v:'MAJOR'}].map(f => (
              <button key={f.v} onClick={() => setAccSeverityFilter(f.v)} style={{
                padding: '0.3rem 0.6rem', borderRadius: 6, border: `1px solid ${accSeverityFilter === f.v ? C.accent : C.border}`,
                background: accSeverityFilter === f.v ? C.accent : 'transparent', color: accSeverityFilter === f.v ? '#fff' : C.muted,
                cursor: 'pointer', fontSize: '0.75rem', fontWeight: 600,
              }}>{f.l}</button>
            ))}
            <button onClick={() => setAccRiddorFilter(!accRiddorFilter)} style={{
              padding: '0.3rem 0.6rem', borderRadius: 6, border: `1px solid ${accRiddorFilter ? C.red : C.border}`,
              background: accRiddorFilter ? C.red + '20' : 'transparent', color: accRiddorFilter ? C.red : C.muted,
              cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700,
            }}>{accRiddorFilter ? '✓ RIDDOR Only' : 'RIDDOR'}</button>
          </div>

          {showAccidentForm && (
            <form onSubmit={handleCreateAccident} style={{ background: C.card, borderRadius: 12, padding: '1.25rem', marginBottom: '1rem' }}>
              <h3 style={{ marginBottom: '0.75rem', color: C.text }}>New Accident Report</h3>
              <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: '1fr 1fr' }}>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Date *</label><input name="date" type="date" required defaultValue={new Date().toISOString().split('T')[0]} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Time</label><input name="time" type="time" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Person Involved *</label><input name="person_involved" required placeholder="Full name" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Role</label><input name="person_role" placeholder="e.g. Staff, Client" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Location</label><input name="location" placeholder="Where?" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Severity *</label>
                  <select name="severity" required style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }}>
                    <option value="MINOR">Minor (First Aid)</option>
                    <option value="MODERATE">Moderate (Medical Attention)</option>
                    <option value="MAJOR">Major (Hospital)</option>
                    <option value="FATAL">Fatal</option>
                  </select>
                </div>
                <div style={{ gridColumn: '1 / -1' }}><label style={{ fontSize: '0.8rem', color: C.muted }}>Description *</label><textarea name="description" required rows={3} placeholder="Full description..." style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, resize: 'vertical' }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Reported By</label><input name="reported_by" placeholder="Your name" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'end' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: C.muted }}>
                    <input type="checkbox" name="riddor_reportable" style={{ width: 'auto' }} /> RIDDOR
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.8rem', color: C.muted }}>
                    <input type="checkbox" name="follow_up_required" style={{ width: 'auto' }} /> Follow-up
                  </label>
                </div>
              </div>
              <div style={{ marginTop: '0.75rem' }}><button type="submit" style={{ padding: '0.5rem 1.25rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Submit Report</button></div>
            </form>
          )}

          {filteredAccidents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>No accident reports match your filters.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {filteredAccidents.map((a: any) => {
                const days = a.riddor_reportable && !a.riddor_reported_date ? riddorDaysRemaining(a.date) : null
                return (
                  <div key={a.id} style={{ background: C.card, borderRadius: 10, padding: '0.75rem 1rem', borderLeft: `4px solid ${severityColor(a.severity)}` }}>
                    {a.riddor_reportable && (
                      <div style={{ background: C.red + '20', border: `1px solid ${C.red}40`, borderRadius: 6, padding: '0.4rem 0.75rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: C.red, fontWeight: 600, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span>⚠ RIDDOR Reporting Required</span>
                        {days !== null && days > 0 && <span style={{ padding: '2px 8px', borderRadius: 999, background: C.red, color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>{days} days left</span>}
                        {days !== null && days <= 0 && <span style={{ padding: '2px 8px', borderRadius: 999, background: C.red, color: '#fff', fontSize: '0.7rem', fontWeight: 700 }}>OVERDUE</span>}
                        {a.hse_reference && <span style={{ fontSize: '0.7rem', color: C.muted }}>Ref: {a.hse_reference}</span>}
                      </div>
                    )}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{a.person_involved}</span>
                          {a.person_role && <span style={{ fontSize: '0.75rem', color: C.muted }}>({a.person_role})</span>}
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: severityColor(a.severity) + '25', color: severityColor(a.severity) }}>{a.severity}</span>
                          <span style={{ padding: '2px 6px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 700, background: a.status === 'CLOSED' ? C.green + '25' : a.status === 'OPEN' ? C.red + '25' : C.amber + '25', color: a.status === 'CLOSED' ? C.green : a.status === 'OPEN' ? C.red : C.amber }}>{a.status}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: C.muted }}>{a.description.substring(0, 120)}{a.description.length > 120 ? '…' : ''}</div>
                        <div style={{ fontSize: '0.7rem', color: C.muted, marginTop: '0.25rem' }}>{fmtDate(a.date)} {a.time || ''} {a.location ? `· ${a.location}` : ''}</div>
                      </div>
                      {a.status !== 'CLOSED' && (
                        <select defaultValue="" onChange={e => { if (e.target.value) handleAccidentStatus(a.id, e.target.value); e.target.value = '' }}
                          style={{ padding: '0.3rem 0.5rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.75rem' }}>
                          <option value="" disabled>Update…</option>
                          <option value="INVESTIGATING">Investigating</option>
                          <option value="FOLLOW_UP">Follow-up</option>
                          <option value="CLOSED">Close</option>
                        </select>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.75rem', color: C.muted, padding: '0.75rem', background: C.card, borderRadius: 8 }}>
            <strong>RIDDOR:</strong> Reporting of Injuries, Diseases and Dangerous Occurrences Regulations 2013.
            Certain accidents must be reported to HSE within 10 days (or 15 days for over-7-day incapacitation).
          </div>
        </div>
      )}

      {/* ═══════════ AUDIT LOG ═══════════ */}
      {tab === 'audit' && (
        <div>
          <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Score Audit Trail</div>
          {auditLog.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>No audit entries yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {auditLog.map((log: any, i: number) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', background: C.card, borderRadius: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: scoreGradient(log.score) + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '0.85rem', color: scoreGradient(log.score), flexShrink: 0 }}>{log.score}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: C.text }}>
                      {log.score}%
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.75rem', fontWeight: 700, color: log.change > 0 ? C.green : log.change < 0 ? C.red : C.muted }}>
                        {log.change > 0 ? `+${log.change}%` : log.change < 0 ? `${log.change}%` : '—'}
                      </span>
                    </div>
                    <div style={{ fontSize: '0.7rem', color: C.muted }}>{new Date(log.calculated_at).toLocaleString('en-GB')} · {log.trigger}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', color: C.muted, flexShrink: 0 }}>
                    <span style={{ color: C.green }}>{log.compliant_count} ✓</span>
                    <span style={{ color: log.overdue_count > 0 ? C.red : C.muted }}>{log.overdue_count} !</span>
                    <span>{log.total_items} total</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @media (max-width: 900px) {
          .hse-dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}
