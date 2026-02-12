'use client'

import { useEffect, useState, useCallback } from 'react'
import { getDashboardSummary } from '@/lib/api'

/* ================================================================
   SMART BOOKING DASHBOARD — Visual Intelligence Interface
   Phases 1-5: Revenue Gauge, Reliability Quadrant, Demand Calendar,
               Risk Stack, Action Panel
   ================================================================ */

// ── Helpers ──
const fmt = (v: number) => `£${v.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
const pct = (part: number, total: number) => total > 0 ? Math.round((part / total) * 100) : 0

// ── Colour tokens ──
const C = {
  secured: '#22c55e', deposit: '#f59e0b', atRisk: '#ef4444',
  vip: '#6366f1', stable: '#22c55e', watch: '#f59e0b', highRisk: '#ef4444',
  bg: '#0f172a', card: '#1e293b', cardAlt: '#334155', text: '#f8fafc', muted: '#94a3b8',
  border: '#475569', accent: '#6366f1',
}

const SEVERITY: Record<string, { bg: string; border: string; icon: string }> = {
  critical: { bg: '#7f1d1d', border: '#ef4444', icon: '🔴' },
  high:     { bg: '#78350f', border: '#f59e0b', icon: '🟠' },
  warning:  { bg: '#713f12', border: '#eab308', icon: '🟡' },
  info:     { bg: '#1e3a5f', border: '#3b82f6', icon: '🔵' },
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 13 }, (_, i) => i + 7) // 7am-7pm

// ── Types ──
interface DashData {
  revenue_today: number
  revenue_next_7_days: number
  revenue_breakdown: { total: number; secured: number; deposit: number; at_risk: number; bookings: any[] }
  high_risk_bookings_today: number
  reliability_distribution: { excellent: number; good: number; fair: number; poor: number }
  client_quadrant: { id: number; name: string; email: string; reliability: number; frequency: number; zone: string; total_bookings: number; no_shows: number; lifetime_value: number }[]
  demand_calendar: { cells: { hour: number; day_of_week: number; total_bookings: number; no_shows: number; no_show_rate: number; demand_intensity: number }[]; services: any[] }
  owner_actions: { severity: string; message: string; link: string; booking_id?: number }[]
  total_upcoming_bookings: number
  average_reliability_score: number
}

// ════════════════════════════════════════════════════════════════
// PHASE 1 — Revenue Protection Gauge
// ════════════════════════════════════════════════════════════════
function RevenueGauge({ data }: { data: DashData['revenue_breakdown'] }) {
  const total = data.total || 1
  const secPct = pct(data.secured, total)
  const depPct = pct(data.deposit, total)
  const riskPct = pct(data.at_risk, total)

  // SVG arc gauge
  const R = 90, CX = 110, CY = 110, SW = 18
  const circumference = Math.PI * R // half circle
  const secLen = (secPct / 100) * circumference
  const depLen = (depPct / 100) * circumference
  const riskLen = (riskPct / 100) * circumference

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600 }}>Revenue Protection — Next 7 Days</div>

      <svg width={220} height={130} viewBox="0 0 220 130">
        {/* Background arc */}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke={C.cardAlt} strokeWidth={SW} strokeLinecap="round" />
        {/* Secured (green) */}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke={C.secured} strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={`${secLen} ${circumference}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        {/* Deposit (amber) */}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke={C.deposit} strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={`0 ${secLen} ${depLen} ${circumference}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        {/* At risk (red) */}
        <path d={`M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`} fill="none" stroke={C.atRisk} strokeWidth={SW} strokeLinecap="round"
          strokeDasharray={`0 ${secLen + depLen} ${riskLen} ${circumference}`} style={{ transition: 'stroke-dasharray 0.8s ease' }} />
        {/* Centre text */}
        <text x={CX} y={CY - 20} textAnchor="middle" fill={C.text} fontSize={28} fontWeight={700}>{fmt(total)}</text>
        <text x={CX} y={CY} textAnchor="middle" fill={C.muted} fontSize={11}>total revenue</text>
      </svg>

      <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', justifyContent: 'center' }}>
        <LegendDot color={C.secured} label="Secured" value={fmt(data.secured)} pct={secPct} />
        <LegendDot color={C.deposit} label="Deposit" value={fmt(data.deposit)} pct={depPct} />
        <LegendDot color={C.atRisk} label="At Risk" value={fmt(data.at_risk)} pct={riskPct} />
      </div>
    </div>
  )
}

function LegendDot({ color, label, value, pct: p }: { color: string; label: string; value: string; pct: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
      <div style={{ width: 10, height: 10, borderRadius: '50%', background: color, flexShrink: 0 }} />
      <div>
        <div style={{ fontSize: '0.7rem', color: C.muted }}>{label}</div>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: C.text }}>{value} <span style={{ fontSize: '0.7rem', color: C.muted }}>({p}%)</span></div>
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PHASE 2 — Reliability Quadrant
// ════════════════════════════════════════════════════════════════
function ReliabilityQuadrant({ clients }: { clients: DashData['client_quadrant'] }) {
  const [selected, setSelected] = useState<typeof clients[0] | null>(null)
  const maxFreq = Math.max(5, ...clients.map(c => c.frequency))

  const zoneColor = (z: string) => z === 'VIP' ? C.vip : z === 'Stable' ? C.stable : z === 'Watch' ? C.watch : C.highRisk

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem', position: 'relative' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Client Reliability Quadrant</div>

      <div style={{ position: 'relative', width: '100%', height: 260, background: C.bg, borderRadius: 12, overflow: 'hidden' }}>
        {/* Zone labels */}
        <div style={{ position: 'absolute', top: 8, right: 12, fontSize: '0.65rem', color: C.vip, fontWeight: 700, opacity: 0.6 }}>VIP</div>
        <div style={{ position: 'absolute', bottom: 8, right: 12, fontSize: '0.65rem', color: C.stable, fontWeight: 700, opacity: 0.6 }}>Stable</div>
        <div style={{ position: 'absolute', top: 8, left: 12, fontSize: '0.65rem', color: C.watch, fontWeight: 700, opacity: 0.6 }}>Watch</div>
        <div style={{ position: 'absolute', bottom: 8, left: 12, fontSize: '0.65rem', color: C.highRisk, fontWeight: 700, opacity: 0.6 }}>High Risk</div>

        {/* Grid lines */}
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: C.border, opacity: 0.3 }} />
        <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: C.border, opacity: 0.3 }} />

        {/* Axis labels */}
        <div style={{ position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)', fontSize: '0.6rem', color: C.muted }}>Reliability →</div>
        <div style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', fontSize: '0.6rem', color: C.muted, whiteSpace: 'nowrap' }}>Frequency →</div>

        {/* Client dots */}
        {clients.map(c => {
          const x = (c.reliability / 100) * 90 + 5 // 5-95%
          const y = 95 - (c.frequency / maxFreq) * 90 // inverted, 5-95%
          return (
            <div key={c.id} onClick={() => setSelected(c)} title={c.name}
              style={{
                position: 'absolute', left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)',
                width: 14, height: 14, borderRadius: '50%', background: zoneColor(c.zone),
                border: `2px solid ${C.text}`, cursor: 'pointer', transition: 'transform 0.2s',
                zIndex: 2, boxShadow: `0 0 8px ${zoneColor(c.zone)}60`,
              }}
              onMouseEnter={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.5)')}
              onMouseLeave={e => (e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)')}
            />
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
        {['VIP', 'Stable', 'Watch', 'High Risk'].map(z => (
          <div key={z} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: zoneColor(z) }} />{z} ({clients.filter(c => c.zone === z).length})
          </div>
        ))}
      </div>

      {/* Client modal */}
      {selected && (
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)',
          borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10,
        }} onClick={() => setSelected(null)}>
          <div style={{ background: C.cardAlt, borderRadius: 12, padding: '1.5rem', minWidth: 280, maxWidth: 340 }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: C.text }}>{selected.name}</div>
              <div style={{
                padding: '2px 10px', borderRadius: 999, fontSize: '0.7rem', fontWeight: 700,
                background: zoneColor(selected.zone) + '20', color: zoneColor(selected.zone), border: `1px solid ${zoneColor(selected.zone)}`,
              }}>{selected.zone}</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontSize: '0.85rem' }}>
              <MiniStat label="Reliability" value={`${selected.reliability}%`} />
              <MiniStat label="Bookings (90d)" value={String(selected.frequency)} />
              <MiniStat label="Total Bookings" value={String(selected.total_bookings)} />
              <MiniStat label="No-Shows" value={String(selected.no_shows)} />
              <MiniStat label="Lifetime Value" value={fmt(selected.lifetime_value)} />
              <MiniStat label="Email" value={selected.email} small />
            </div>
            <div style={{ marginTop: '1rem', padding: '0.6rem', background: C.bg, borderRadius: 8, fontSize: '0.8rem', color: C.muted }}>
              <strong style={{ color: C.text }}>Suggested:</strong>{' '}
              {selected.zone === 'VIP' ? 'Offer loyalty discount. Priority booking access.' :
               selected.zone === 'Stable' ? 'Maintain current terms. Encourage rebooking.' :
               selected.zone === 'Watch' ? 'Monitor closely. Consider deposit requirement.' :
               'Require full prepayment. Flag for manual review.'}
            </div>
            <button onClick={() => setSelected(null)} style={{
              marginTop: '0.75rem', width: '100%', padding: '0.5rem', borderRadius: 8, border: 'none',
              background: C.accent, color: '#fff', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem',
            }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}

function MiniStat({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontWeight: 600, color: C.text, fontSize: small ? '0.75rem' : '0.95rem', wordBreak: 'break-all' }}>{value}</div>
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PHASE 3 — Interactive Demand Calendar
// ════════════════════════════════════════════════════════════════
function DemandCalendar({ data }: { data: DashData['demand_calendar'] }) {
  const [activeCell, setActiveCell] = useState<{ hour: number; dow: number } | null>(null)
  const cellMap: Record<string, typeof data.cells[0]> = {}
  data.cells.forEach(c => { cellMap[`${c.day_of_week}-${c.hour}`] = c })

  const active = activeCell ? cellMap[`${activeCell.dow}-${activeCell.hour}`] : null

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Demand Calendar — Last 30 Days</div>

      <div style={{ overflowX: 'auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `50px repeat(7, 1fr)`, gap: 3, minWidth: 420 }}>
          {/* Header row */}
          <div />
          {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: '0.7rem', color: C.muted, fontWeight: 600, padding: '4px 0' }}>{d}</div>)}

          {/* Hour rows */}
          {HOURS.map(h => (
            <div key={`row-${h}`} style={{ display: 'contents' }}>
              <div style={{ fontSize: '0.7rem', color: C.muted, display: 'flex', alignItems: 'center', justifyContent: 'flex-end', paddingRight: 6 }}>
                {h.toString().padStart(2, '0')}:00
              </div>
              {DAYS.map((_, di) => {
                const cell = cellMap[`${di}-${h}`]
                const intensity = cell?.demand_intensity || 0
                const hasNoShow = (cell?.no_show_rate || 0) > 20
                const isActive = activeCell?.dow === di && activeCell?.hour === h
                return (
                  <div key={`${di}-${h}`}
                    onClick={() => setActiveCell(cell ? { hour: h, dow: di } : null)}
                    style={{
                      height: 28, borderRadius: 4, cursor: cell ? 'pointer' : 'default',
                      background: intensity > 0 ? `rgba(99, 102, 241, ${Math.min(0.9, intensity / 100)})` : C.bg,
                      border: hasNoShow ? `2px solid ${C.atRisk}` : isActive ? `2px solid ${C.text}` : `1px solid ${C.border}30`,
                      transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', color: intensity > 40 ? '#fff' : C.muted,
                    }}
                  >
                    {cell ? cell.total_bookings : ''}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(99, 102, 241, 0.2)` }} />Low
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, background: `rgba(99, 102, 241, 0.7)` }} />High
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}>
          <div style={{ width: 14, height: 14, borderRadius: 3, border: `2px solid ${C.atRisk}`, background: C.bg }} />No-show risk
        </div>
      </div>

      {/* Active cell detail */}
      {active && (
        <div style={{ marginTop: '0.75rem', padding: '0.75rem', background: C.bg, borderRadius: 8, fontSize: '0.85rem' }}>
          <div style={{ fontWeight: 700, color: C.text, marginBottom: '0.3rem' }}>
            {DAYS[activeCell!.dow]} at {activeCell!.hour.toString().padStart(2, '0')}:00
          </div>
          <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div><span style={{ color: C.muted }}>Bookings:</span> <strong style={{ color: C.text }}>{active.total_bookings}</strong></div>
            <div><span style={{ color: C.muted }}>No-shows:</span> <strong style={{ color: active.no_show_rate > 20 ? C.atRisk : C.text }}>{active.no_shows} ({active.no_show_rate}%)</strong></div>
            <div><span style={{ color: C.muted }}>Demand:</span> <strong style={{ color: C.accent }}>{active.demand_intensity}%</strong></div>
          </div>
          {active.demand_intensity < 30 && (
            <div style={{ marginTop: '0.5rem', padding: '0.4rem 0.6rem', background: C.deposit + '15', border: `1px solid ${C.deposit}40`, borderRadius: 6, fontSize: '0.8rem', color: C.deposit }}>
              💡 Low demand slot — suggest 10% off-peak discount. Expected +15% uplift.
            </div>
          )}
          <button style={{
            marginTop: '0.5rem', padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${C.accent}`,
            background: 'transparent', color: C.accent, fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600,
          }}>Apply Incentive</button>
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PHASE 4 — Visual Risk Stack (Horizontal Stacked Bar)
// ════════════════════════════════════════════════════════════════
function RiskStack({ data }: { data: DashData['revenue_breakdown'] }) {
  const total = data.total || 1
  const [hover, setHover] = useState<string | null>(null)

  const segments = [
    { key: 'secured', label: 'Secured', value: data.secured, color: C.secured },
    { key: 'deposit', label: 'Deposit Covered', value: data.deposit, color: C.deposit },
    { key: 'at_risk', label: 'At Risk', value: data.at_risk, color: C.atRisk },
  ]

  const hoverBookings = hover ? data.bookings.filter(b => b.category === hover) : []

  return (
    <div style={{ background: C.card, borderRadius: 16, padding: '1.5rem' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>Revenue Risk Stack</div>

      {/* Stacked bar */}
      <div style={{ display: 'flex', height: 36, borderRadius: 8, overflow: 'hidden', background: C.bg }}>
        {segments.map(s => {
          const w = pct(s.value, total)
          if (w === 0) return null
          return (
            <div key={s.key}
              onMouseEnter={() => setHover(s.key)}
              onMouseLeave={() => setHover(null)}
              style={{
                width: `${w}%`, background: s.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 700, color: '#fff', cursor: 'pointer',
                transition: 'opacity 0.2s', opacity: hover && hover !== s.key ? 0.4 : 1,
                minWidth: w > 5 ? undefined : 4,
              }}
            >
              {w > 12 ? `${fmt(s.value)} (${w}%)` : w > 5 ? `${w}%` : ''}
            </div>
          )
        })}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
        {segments.map(s => (
          <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: C.muted, cursor: 'pointer' }}
            onMouseEnter={() => setHover(s.key)} onMouseLeave={() => setHover(null)}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: s.color }} />
            {s.label}: <strong style={{ color: C.text }}>{fmt(s.value)}</strong>
          </div>
        ))}
      </div>

      {/* Hover breakdown */}
      {hover && hoverBookings.length > 0 && (
        <div style={{ marginTop: '0.75rem', maxHeight: 140, overflowY: 'auto', fontSize: '0.8rem' }}>
          {hoverBookings.map(b => (
            <div key={b.id} style={{
              display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0.5rem',
              borderBottom: `1px solid ${C.border}30`, color: C.text,
            }}>
              <span>{b.client_name} — {b.service_name}</span>
              <span style={{ fontWeight: 600 }}>{fmt(b.price)} <span style={{
                fontSize: '0.65rem', padding: '1px 6px', borderRadius: 4, marginLeft: 4,
                background: b.risk_level === 'HIGH' || b.risk_level === 'CRITICAL' ? C.atRisk + '30' : C.secured + '30',
                color: b.risk_level === 'HIGH' || b.risk_level === 'CRITICAL' ? C.atRisk : C.secured,
              }}>{b.risk_level}</span></span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// PHASE 5 — Action Panel
// ════════════════════════════════════════════════════════════════
function ActionPanel({ actions }: { actions: DashData['owner_actions'] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.25rem' }}>Actions Required</div>
      {actions.length === 0 && (
        <div style={{ background: C.card, borderRadius: 12, padding: '1.5rem', textAlign: 'center', color: C.muted, fontSize: '0.9rem' }}>
          ✅ No actions needed right now
        </div>
      )}
      {actions.map((a, i) => {
        const sev = SEVERITY[a.severity] || SEVERITY.info
        return (
          <a key={i} href={a.link} style={{
            display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.75rem 1rem',
            background: sev.bg, border: `1px solid ${sev.border}40`, borderLeft: `4px solid ${sev.border}`,
            borderRadius: 10, textDecoration: 'none', color: C.text, transition: 'transform 0.15s, box-shadow 0.15s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform = 'translateX(4px)'; e.currentTarget.style.boxShadow = `0 2px 12px ${sev.border}30` }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = 'none' }}
          >
            <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{sev.icon}</span>
            <div style={{ fontSize: '0.85rem', lineHeight: 1.5 }}>{a.message}</div>
          </a>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// HERO STATS ROW
// ════════════════════════════════════════════════════════════════
function HeroStats({ data }: { data: DashData }) {
  const stats = [
    { label: 'Revenue Today', value: fmt(data.revenue_today), color: C.secured },
    { label: 'Upcoming Bookings', value: String(data.total_upcoming_bookings), color: C.accent },
    { label: 'High Risk Today', value: String(data.high_risk_bookings_today), color: data.high_risk_bookings_today > 0 ? C.atRisk : C.secured },
    { label: 'Avg Reliability', value: `${data.average_reliability_score}%`, color: data.average_reliability_score >= 70 ? C.secured : C.deposit },
  ]
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: C.card, borderRadius: 12, padding: '1rem 1.25rem', borderTop: `3px solid ${s.color}` }}>
          <div style={{ fontSize: '1.5rem', fontWeight: 800, color: C.text }}>{s.value}</div>
          <div style={{ fontSize: '0.7rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  )
}

// ════════════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(() => {
    getDashboardSummary().then(res => {
      if (res.data) setData(res.data)
      else setError(res.error || 'Failed to load')
      setLoading(false)
    })
  }, [])

  useEffect(() => { load() }, [load])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚡</div>
        <div>Loading intelligence…</div>
      </div>
    </div>
  )

  if (error || !data) return (
    <div style={{ padding: '2rem', textAlign: 'center', color: C.atRisk }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>⚠️</div>
      <div>{error || 'No data'}</div>
      <button onClick={() => { setLoading(true); setError(''); load() }} style={{ marginTop: '1rem', padding: '0.5rem 1.5rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer' }}>Retry</button>
    </div>
  )

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>Smart Dashboard</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Booking Intelligence — Real-time</div>
        </div>
        <button onClick={() => { setLoading(true); load() }} style={{
          padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${C.border}`,
          background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.8rem',
        }}>↻ Refresh</button>
      </div>

      {/* Hero stats */}
      <HeroStats data={data} />

      {/* Phase 5: Action Panel — shown first on mobile */}
      <div className="sbe-actions-mobile" style={{ display: 'none', marginTop: '1rem' }}>
        <ActionPanel actions={data.owner_actions} />
      </div>

      {/* Main grid: left content + right action panel */}
      <div className="sbe-main-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '1rem', marginTop: '1rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', minWidth: 0 }}>
          {/* Phase 1: Revenue Gauge */}
          <RevenueGauge data={data.revenue_breakdown} />

          {/* Phase 4: Risk Stack */}
          <RiskStack data={data.revenue_breakdown} />

          {/* Phase 2: Reliability Quadrant */}
          <ReliabilityQuadrant clients={data.client_quadrant} />

          {/* Phase 3: Demand Calendar */}
          <DemandCalendar data={data.demand_calendar} />
        </div>

        {/* Phase 5: Action Panel (right side — desktop) */}
        <div className="sbe-actions-desktop">
          <ActionPanel actions={data.owner_actions} />
        </div>
      </div>

      <style>{`
        @media (max-width: 900px) {
          .sbe-main-grid { grid-template-columns: 1fr !important; }
          .sbe-actions-desktop { display: none !important; }
          .sbe-actions-mobile { display: block !important; }
        }
      `}</style>
    </div>
  )
}
