'use client'

import { useEffect, useState, useCallback } from 'react'
import { getAnalyticsDashboard, getLeads, getIntakeProfiles, getDisclaimers, getActiveDisclaimer, getDocumentSummary, getDashboardSummary } from '@/lib/api'

const C = {
  bg: '#0f172a', card: '#1e293b', cardAlt: '#273548', text: '#f8fafc', muted: '#94a3b8',
  border: '#334155', accent: '#6366f1', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', slate: '#475569',
}

function fmtPence(p: number) { return '£' + (p / 100).toFixed(2) }
function fmtGBP(v: number) { return '£' + v.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) }
function pct(part: number, total: number) { return total > 0 ? Math.round((part / total) * 100) : 0 }

export default function AdminAnalyticsPage() {
  const [analytics, setAnalytics] = useState<any>({})
  const [leads, setLeads] = useState<any[]>([])
  const [intakes, setIntakes] = useState<any[]>([])
  const [disclaimers, setDisclaimers] = useState<any[]>([])
  const [activeDisclaimer, setActiveDisclaimer] = useState<any>(null)
  const [docSummary, setDocSummary] = useState<any>(null)
  const [dashboard, setDashboard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const [aRes, lRes, iRes, dRes, adRes, dsRes, dbRes] = await Promise.all([
      getAnalyticsDashboard(),
      getLeads(),
      getIntakeProfiles(),
      getDisclaimers(),
      getActiveDisclaimer(),
      getDocumentSummary().catch(() => ({ data: null, error: null, status: 0 })),
      getDashboardSummary(),
    ])
    setAnalytics(aRes.data || {})
    setLeads(Array.isArray(lRes.data) ? lRes.data : (lRes.data as any)?.results || [])
    const iData: any = iRes.data
    setIntakes(Array.isArray(iData) ? iData : iData?.results || [])
    const dData: any = dRes.data
    setDisclaimers(Array.isArray(dData) ? dData : dData?.results || [])
    if (adRes.data && !adRes.error) setActiveDisclaimer(adRes.data)
    if (dsRes.data) setDocSummary(dsRes.data)
    if (dbRes.data) setDashboard(dbRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  // ── Derived metrics ──
  const bk = analytics.bookings || {}
  const rev = analytics.revenue || {}
  const crm = analytics.crm || {}

  const totalRevenue = rev.total_pence || 0
  const avgBooking = rev.average_pence || 0
  const totalBookings = bk.total || 0
  const completedBookings = bk.completed || 0
  const cancelledBookings = bk.cancelled || 0
  const noShowBookings = bk.no_show || 0
  const completionRate = pct(completedBookings, totalBookings)
  const cancellationRate = pct(cancelledBookings, totalBookings)
  const noShowRate = pct(noShowBookings, totalBookings)

  // CRM
  const totalLeads = leads.length
  const convertedLeads = leads.filter(l => l.status === 'CONVERTED').length
  const lostLeads = leads.filter(l => l.status === 'LOST').length
  const conversionRate = pct(convertedLeads, totalLeads)
  const pipelineValue = leads.filter(l => !['CONVERTED', 'LOST'].includes(l.status)).reduce((s: number, l: any) => s + (l.value_pence || 0), 0)
  const leadSources = leads.reduce((acc: Record<string, number>, l: any) => { acc[l.source || 'other'] = (acc[l.source || 'other'] || 0) + 1; return acc }, {})

  const PIPELINE_STAGES = [
    { key: 'NEW', label: 'New', color: C.blue },
    { key: 'CONTACTED', label: 'Contacted', color: C.accent },
    { key: 'QUALIFIED', label: 'Qualified', color: C.amber },
    { key: 'CONVERTED', label: 'Converted', color: C.green },
    { key: 'LOST', label: 'Lost', color: C.red },
  ]

  // Compliance
  const completedIntakes = intakes.filter((p: any) => p.completed).length
  const validIntakes = intakes.filter((p: any) => p.is_valid_for_booking).length
  const expiredIntakes = intakes.filter((p: any) => p.is_expired).length
  const renewalIntakes = intakes.filter((p: any) => p.renewal_required).length
  const marketingConsent = intakes.length > 0 ? pct(intakes.filter((p: any) => p.consent_marketing).length, intakes.length) : 0
  const disclaimerCoverage = intakes.length > 0 ? pct(intakes.filter((p: any) => p.disclaimer_version_str).length, intakes.length) : 0

  // Documents
  const docValid = docSummary?.by_status?.VALID || 0
  const docExpiring = docSummary?.by_status?.EXPIRING || 0
  const docExpired = docSummary?.by_status?.EXPIRED || 0
  const docTotal = docSummary?.total || 0

  // Dashboard data
  const revenueToday = dashboard?.revenue_today || 0
  const upcomingBookings = dashboard?.total_upcoming_bookings || 0
  const avgReliability = dashboard?.average_reliability_score || 0

  // ── Business Health Score ──
  const healthFactors = [
    { label: 'Completion Rate', score: completionRate, weight: 25 },
    { label: 'Low No-Shows', score: Math.max(0, 100 - noShowRate * 5), weight: 20 },
    { label: 'Lead Conversion', score: conversionRate, weight: 15 },
    { label: 'Intake Compliance', score: intakes.length > 0 ? pct(validIntakes, intakes.length) : 100, weight: 15 },
    { label: 'Disclaimer Coverage', score: disclaimerCoverage, weight: 10 },
    { label: 'Client Reliability', score: avgReliability, weight: 15 },
  ]
  const healthScore = Math.round(healthFactors.reduce((s, f) => s + (f.score * f.weight / 100), 0))
  const healthColor = healthScore >= 75 ? C.green : healthScore >= 50 ? C.amber : C.red
  const healthLabel = healthScore >= 75 ? 'Healthy' : healthScore >= 50 ? 'Needs Attention' : 'At Risk'

  // ── Style helpers ──
  const badge = (color: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem',
    fontWeight: 700, background: color + '20', color, border: `1px solid ${color}40`,
    textTransform: 'uppercase' as const, letterSpacing: '0.03em',
  })

  const sectionTitle = (icon: string, title: string) => (
    <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, fontWeight: 600, marginBottom: '0.75rem' }}>
      {icon} {title}
    </div>
  )

  const metricRow = (label: string, value: string | number, color?: string) => (
    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: `1px solid ${C.border}30` }}>
      <span style={{ fontSize: '0.8rem', color: C.muted }}>{label}</span>
      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: color || C.text }}>{value}</span>
    </div>
  )

  const miniCard = (label: string, value: string | number, color: string, icon: string) => (
    <div key={label} style={{ background: C.card, borderRadius: 10, padding: '0.75rem 1rem', border: `1px solid ${C.border}`, flex: '1 1 130px', minWidth: 130 }}>
      <div style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
      <div style={{ fontSize: '1.4rem', fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📈</div>
        <div>Loading business insights…</div>
      </div>
    </div>
  )

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Business Insights</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, margin: '2px 0 0' }}>Cross-module health overview for your business</p>
        </div>
        <button onClick={() => load()} style={{
          padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${C.border}`,
          background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.8rem',
        }}>↻ Refresh</button>
      </div>

      {/* ═══ HEALTH SCORE + TOP KPIs ═══ */}
      <div style={{ display: 'flex', gap: 12, marginBottom: '1rem', flexWrap: 'wrap' }}>
        {/* Health Score */}
        <div style={{ background: C.card, borderRadius: 12, padding: '1.2rem', border: `1px solid ${C.border}`, flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 100, height: 100 }}>
            <svg width={100} height={100} viewBox="0 0 100 100">
              <circle cx={50} cy={50} r={42} fill="none" stroke={C.border} strokeWidth={8} />
              <circle cx={50} cy={50} r={42} fill="none" stroke={healthColor} strokeWidth={8}
                strokeDasharray={`${healthScore * 2.64} 264`} strokeLinecap="round"
                transform="rotate(-90 50 50)" style={{ transition: 'stroke-dasharray 0.8s ease' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: healthColor }}>{healthScore}</div>
              <div style={{ fontSize: '0.55rem', color: C.muted, textTransform: 'uppercase' }}>/ 100</div>
            </div>
          </div>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: healthColor, marginTop: 6 }}>{healthLabel}</div>
          <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: 2 }}>Business Health</div>
        </div>

        {/* Top KPIs */}
        <div style={{ flex: 1, display: 'flex', gap: 10, flexWrap: 'wrap', minWidth: 0 }}>
          {miniCard('Revenue Today', fmtGBP(revenueToday), C.green, '💷')}
          {miniCard('Total Revenue', fmtPence(totalRevenue), C.text, '📊')}
          {miniCard('Upcoming', upcomingBookings, C.blue, '📅')}
          {miniCard('Avg Booking', fmtPence(avgBooking), C.accent, '🎯')}
          {miniCard('Pipeline', fmtPence(pipelineValue), C.purple, '📋')}
          {miniCard('Reliability', `${avgReliability}%`, avgReliability >= 70 ? C.green : C.amber, '⭐')}
        </div>
      </div>

      {/* ═══ MAIN GRID ═══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* ── Booking Health ── */}
        <div style={{ background: C.card, borderRadius: 12, padding: '1.2rem', border: `1px solid ${C.border}` }}>
          {sectionTitle('📅', 'Booking Health')}
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <RateGauge label="Completed" value={completionRate} color={C.green} />
            <RateGauge label="Cancelled" value={cancellationRate} color={C.amber} />
            <RateGauge label="No-Show" value={noShowRate} color={C.red} />
          </div>
          {metricRow('Total Bookings', totalBookings)}
          {metricRow('Completed', completedBookings, C.green)}
          {metricRow('Confirmed', bk.confirmed || 0, C.blue)}
          {metricRow('Pending', bk.pending || 0, C.amber)}
          {metricRow('Cancelled', cancelledBookings, cancelledBookings > 0 ? C.red : undefined)}
          {metricRow('No-Shows', noShowBookings, noShowBookings > 0 ? C.red : undefined)}
        </div>

        {/* ── CRM Funnel ── */}
        <div style={{ background: C.card, borderRadius: 12, padding: '1.2rem', border: `1px solid ${C.border}` }}>
          {sectionTitle('📋', 'CRM Funnel')}
          {/* Visual funnel */}
          <div style={{ marginBottom: 12 }}>
            {PIPELINE_STAGES.map((stage, i) => {
              const count = leads.filter(l => l.status === stage.key).length
              const value = leads.filter(l => l.status === stage.key).reduce((s: number, l: any) => s + (l.value_pence || 0), 0)
              const maxCount = Math.max(1, ...PIPELINE_STAGES.map(s => leads.filter(l => l.status === s.key).length))
              const barW = Math.max(8, (count / maxCount) * 100)
              return (
                <div key={stage.key} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 70, fontSize: '0.7rem', color: C.muted, textAlign: 'right', flexShrink: 0 }}>{stage.label}</div>
                  <div style={{ flex: 1, height: 20, background: C.bg, borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
                    <div style={{ width: `${barW}%`, height: '100%', background: stage.color, borderRadius: 4, transition: 'width 0.4s', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                      {count > 0 && <span style={{ fontSize: '0.6rem', fontWeight: 700, color: '#fff' }}>{count}</span>}
                    </div>
                  </div>
                  <div style={{ width: 60, fontSize: '0.65rem', color: C.muted, textAlign: 'right', flexShrink: 0 }}>{fmtPence(value)}</div>
                </div>
              )
            })}
          </div>
          {metricRow('Total Leads', totalLeads)}
          {metricRow('Conversion Rate', `${conversionRate}%`, conversionRate >= 30 ? C.green : conversionRate >= 15 ? C.amber : C.red)}
          {metricRow('Pipeline Value', fmtPence(pipelineValue), C.purple)}
          {metricRow('Lost', lostLeads, lostLeads > 0 ? C.red : undefined)}

          {/* Lead sources */}
          {Object.keys(leadSources).length > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Lead Sources</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {Object.entries(leadSources).sort((a, b) => b[1] - a[1]).map(([src, count]) => (
                  <span key={src} style={badge(C.accent)}>{src}: {count}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Client Insights ── */}
        <div style={{ background: C.card, borderRadius: 12, padding: '1.2rem', border: `1px solid ${C.border}` }}>
          {sectionTitle('👥', 'Client Insights')}
          {metricRow('Total Clients (Intakes)', intakes.length)}
          {metricRow('Valid for Booking', validIntakes, C.green)}
          {metricRow('Marketing Opt-in', `${marketingConsent}%`, marketingConsent >= 50 ? C.green : C.amber)}
          {metricRow('Avg Client Reliability', `${avgReliability}%`, avgReliability >= 70 ? C.green : avgReliability >= 50 ? C.amber : C.red)}

          {/* Reliability distribution from dashboard */}
          {dashboard?.reliability_distribution && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.6rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 6 }}>Reliability Distribution</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: 'Excellent', value: dashboard.reliability_distribution.excellent, color: C.green },
                  { label: 'Good', value: dashboard.reliability_distribution.good, color: C.blue },
                  { label: 'Fair', value: dashboard.reliability_distribution.fair, color: C.amber },
                  { label: 'Poor', value: dashboard.reliability_distribution.poor, color: C.red },
                ].map(d => (
                  <div key={d.label} style={{ flex: 1, textAlign: 'center', padding: '0.4rem', background: C.bg, borderRadius: 6 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: d.color }}>{d.value}</div>
                    <div style={{ fontSize: '0.55rem', color: C.muted, textTransform: 'uppercase' }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── Compliance Snapshot ── */}
        <div style={{ background: C.card, borderRadius: 12, padding: '1.2rem', border: `1px solid ${C.border}` }}>
          {sectionTitle('🛡️', 'Compliance Snapshot')}

          {/* Intake status */}
          <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Intake Forms</div>
          {metricRow('Completed', completedIntakes, C.green)}
          {metricRow('Valid', validIntakes, C.green)}
          {metricRow('Renewal Required', renewalIntakes, renewalIntakes > 0 ? C.amber : undefined)}
          {metricRow('Expired', expiredIntakes, expiredIntakes > 0 ? C.red : undefined)}
          {metricRow('Disclaimer Coverage', `${disclaimerCoverage}%`, disclaimerCoverage >= 80 ? C.green : disclaimerCoverage >= 50 ? C.amber : C.red)}

          {/* Active disclaimer */}
          <div style={{ marginTop: 10, padding: '0.5rem 0.75rem', background: C.bg, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: C.muted }}>Active Disclaimer</span>
            <span style={{ ...badge(activeDisclaimer ? C.green : C.red) }}>
              {activeDisclaimer ? `v${activeDisclaimer.version}` : 'None'}
            </span>
          </div>

          {/* Documents */}
          {docTotal > 0 && (
            <div style={{ marginTop: 10 }}>
              <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Documents</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[
                  { label: 'Valid', value: docValid, color: C.green },
                  { label: 'Expiring', value: docExpiring, color: C.amber },
                  { label: 'Expired', value: docExpired, color: C.red },
                ].map(d => (
                  <div key={d.label} style={{ flex: 1, textAlign: 'center', padding: '0.4rem', background: C.bg, borderRadius: 6 }}>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: d.value > 0 ? d.color : C.muted }}>{d.value}</div>
                    <div style={{ fontSize: '0.55rem', color: C.muted, textTransform: 'uppercase' }}>{d.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══ HEALTH BREAKDOWN ═══ */}
      <div style={{ background: C.card, borderRadius: 12, padding: '1.2rem', border: `1px solid ${C.border}`, marginBottom: 12 }}>
        {sectionTitle('💡', 'Health Score Breakdown')}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {healthFactors.map(f => (
            <div key={f.label} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 140, fontSize: '0.75rem', color: C.muted, flexShrink: 0 }}>{f.label}</div>
              <div style={{ flex: 1, height: 10, background: C.bg, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{
                  width: `${Math.min(100, f.score)}%`, height: '100%', borderRadius: 5,
                  background: f.score >= 70 ? C.green : f.score >= 40 ? C.amber : C.red,
                  transition: 'width 0.4s',
                }} />
              </div>
              <div style={{ width: 40, fontSize: '0.75rem', fontWeight: 700, color: f.score >= 70 ? C.green : f.score >= 40 ? C.amber : C.red, textAlign: 'right', flexShrink: 0 }}>
                {Math.round(f.score)}%
              </div>
              <div style={{ width: 30, fontSize: '0.6rem', color: C.muted, textAlign: 'right', flexShrink: 0 }}>
                ×{f.weight}%
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══ QUICK LINKS ═══ */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {[
          { href: '/admin', label: 'Dashboard', icon: '📊', desc: 'Real-time booking intelligence' },
          { href: '/admin/reports', label: 'Reports', icon: '💰', desc: 'Revenue, daily & monthly breakdowns' },
          { href: '/admin/clients', label: 'CRM', icon: '📋', desc: 'Lead management & pipeline' },
          { href: '/admin/disclaimers', label: 'Intake', icon: '📝', desc: 'Client intake & disclaimers' },
          { href: '/admin/documents', label: 'Documents', icon: '📁', desc: 'Document vault & compliance' },
        ].map(link => (
          <a key={link.href} href={link.href} style={{
            flex: '1 1 180px', background: C.card, borderRadius: 10, padding: '0.75rem 1rem',
            border: `1px solid ${C.border}`, textDecoration: 'none', color: C.text,
            transition: 'border-color 0.2s',
          }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = C.accent)}
            onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
          >
            <div style={{ fontSize: '1rem', marginBottom: 2 }}>{link.icon}</div>
            <div style={{ fontSize: '0.8rem', fontWeight: 700 }}>{link.label}</div>
            <div style={{ fontSize: '0.65rem', color: C.muted }}>{link.desc}</div>
          </a>
        ))}
      </div>

      <style>{`
        @media (max-width: 768px) {
          div[style*="grid-template-columns: 1fr 1fr"] { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  )
}

function RateGauge({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ flex: 1, textAlign: 'center' }}>
      <div style={{ position: 'relative', width: 56, height: 56, margin: '0 auto' }}>
        <svg width={56} height={56} viewBox="0 0 56 56">
          <circle cx={28} cy={28} r={22} fill="none" stroke="#334155" strokeWidth={5} />
          <circle cx={28} cy={28} r={22} fill="none" stroke={color} strokeWidth={5}
            strokeDasharray={`${value * 1.38} 138`} strokeLinecap="round"
            transform="rotate(-90 28 28)" style={{ transition: 'stroke-dasharray 0.6s ease' }} />
        </svg>
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontWeight: 800, color }}>
          {value}%
        </div>
      </div>
      <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: 3, textTransform: 'uppercase', fontWeight: 600 }}>{label}</div>
    </div>
  )
}
