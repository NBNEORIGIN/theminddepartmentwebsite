'use client'

import { useEffect, useState, useCallback } from 'react'
import { getServices, createService, updateService, deleteService, assignStaffToService, getStaffList, applyServiceRecommendation, logServiceOverride, recalculateServiceIntelligence, getServiceOptimisationLogs } from '@/lib/api'

/* ================================================================
   SERVICES — Smart Services Engine v2
   Adaptive pricing, deposit intelligence, commercial optimisation
   ================================================================ */

const C = {
  green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
  bg: '#0f172a', card: '#1e293b', cardAlt: '#334155', text: '#f8fafc',
  muted: '#94a3b8', border: '#475569', accent: '#6366f1', surface: '#1e293b',
}

function poundsToPence(p: string) { return Math.round(parseFloat(p || '0') * 100) }
function fmtPrice(v: number | string) { return '£' + Number(v).toFixed(2) }
function pctColor(v: number, threshHigh = 80, threshMed = 40) {
  if (v >= threshHigh) return C.green
  if (v >= threshMed) return C.amber
  return C.red
}
function riskIcon(ri: string) {
  if (ri === 'high_no_show') return { icon: '🔴', label: 'High No-Show', color: C.red }
  if (ri === 'high_demand') return { icon: '🔥', label: 'High Demand', color: C.amber }
  if (ri === 'moderate_risk') return { icon: '🟡', label: 'Moderate Risk', color: C.amber }
  return { icon: '🟢', label: 'Stable', color: C.green }
}

export default function AdminServicesPage() {
  const [services, setServices] = useState<any[]>([])
  const [allStaff, setAllStaff] = useState<any[]>([])
  const [editing, setEditing] = useState<any | null>(null)
  const [creating, setCreating] = useState(false)
  const [staffModal, setStaffModal] = useState<any | null>(null)
  const [selectedStaffIds, setSelectedStaffIds] = useState<number[]>([])
  const [depositMode, setDepositMode] = useState<'fixed' | 'percent'>('fixed')
  const [priceInput, setPriceInput] = useState('')
  const [depositInput, setDepositInput] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [logsModal, setLogsModal] = useState<any | null>(null)
  const [logs, setLogs] = useState<any[]>([])

  const fetchAll = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([getServices(true), getStaffList()])
    setServices(sRes.data || [])
    setAllStaff(stRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // ===== CREATE / EDIT =====
  function openCreate() {
    setCreating(true)
    setEditing({ name: '', description: '', category: '', duration_minutes: 60, payment_type: 'full', colour: '', sort_order: 0, active: true, deposit_strategy: 'fixed', smart_pricing_enabled: false, auto_optimise_enabled: false })
    setPriceInput(''); setDepositInput(''); setDepositMode('fixed')
  }

  function openEdit(s: any) {
    setCreating(false)
    setEditing({ ...s })
    setPriceInput(String(s.price || '0'))
    if (s.deposit_percentage && s.deposit_percentage > 0) {
      setDepositMode('percent'); setDepositInput(String(s.deposit_percentage))
    } else {
      setDepositMode('fixed'); setDepositInput(s.deposit_pence ? String((s.deposit_pence / 100).toFixed(2)) : '')
    }
  }

  async function saveService() {
    if (!editing) return
    setSaving(true); setError('')
    const prevPrice = editing.id ? services.find(s => s.id === editing.id)?.price : null

    const payload: any = {
      name: editing.name, description: editing.description, category: editing.category || '',
      duration_minutes: editing.duration_minutes, price_pence: poundsToPence(priceInput),
      payment_type: editing.payment_type, colour: editing.colour || '',
      active: editing.active !== false, sort_order: editing.sort_order || 0,
      deposit_strategy: editing.deposit_strategy || 'fixed',
      smart_pricing_enabled: !!editing.smart_pricing_enabled,
      auto_optimise_enabled: !!editing.auto_optimise_enabled,
      off_peak_discount_percent: editing.off_peak_discount_percent || 0,
    }
    if (editing.payment_type === 'deposit') {
      if (depositMode === 'percent') { payload.deposit_percentage = parseInt(depositInput || '0', 10); payload.deposit_pence = 0 }
      else { payload.deposit_pence = poundsToPence(depositInput); payload.deposit_percentage = 0 }
    } else { payload.deposit_pence = 0; payload.deposit_percentage = 0 }

    let res
    if (creating) { res = await createService(payload) }
    else { res = await updateService(editing.id, payload) }
    setSaving(false)

    if (res.data) {
      // Log override if price changed
      if (!creating && prevPrice && parseFloat(prevPrice) !== parseFloat(priceInput)) {
        logServiceOverride(editing.id, {
          previous_price: parseFloat(prevPrice),
          new_price: parseFloat(priceInput),
          reason: 'Manual price change via edit modal',
        })
      }
      setSuccess(creating ? 'Service created' : 'Service updated')
      setEditing(null); setCreating(false); fetchAll()
    } else { setError(res.error || 'Failed to save') }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const res = await deleteService(id)
    if (res.status === 204 || res.data) { setSuccess(`"${name}" deleted`); fetchAll() }
    else { setError(res.error || 'Failed to delete') }
  }

  async function toggleActive(id: number, active: boolean) {
    const res = await updateService(id, { active: !active })
    if (res.data) setServices(prev => prev.map(s => s.id === id ? res.data : s))
  }

  async function handleApplyRec(id: number) {
    if (!confirm('Apply AI recommendation to this service?')) return
    const res = await applyServiceRecommendation(id)
    if (res.data) { setSuccess('Recommendation applied'); setServices(prev => prev.map(s => s.id === id ? res.data : s)) }
    else { setError(res.error || 'Failed to apply') }
  }

  async function handleRecalculate() {
    setSuccess('Recalculating…')
    const res = await recalculateServiceIntelligence()
    if (res.data) { setSuccess(res.data.message || 'Intelligence updated'); fetchAll() }
    else { setError(res.error || 'Failed') }
  }

  async function openLogs(s: any) {
    setLogsModal(s)
    const res = await getServiceOptimisationLogs(s.id)
    setLogs(res.data || [])
  }

  // Staff assignment
  function openStaffAssign(s: any) { setStaffModal(s); setSelectedStaffIds(s.staff_ids || []) }
  async function saveStaffAssignment() {
    if (!staffModal) return; setSaving(true)
    const res = await assignStaffToService(staffModal.id, selectedStaffIds); setSaving(false)
    if (res.data) { setSuccess('Staff updated'); setStaffModal(null); fetchAll() }
    else { setError(res.error || 'Failed') }
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}>
      <div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>⚙️</div><div>Loading services…</div></div>
    </div>
  )

  // Dashboard summary stats
  const underperforming = services.filter(s => s.active && s.off_peak_utilisation_rate < 30 && s.total_bookings > 0)
  const overbooked = services.filter(s => s.active && s.peak_utilisation_rate > 80)
  const highNoShow = services.filter(s => s.active && s.no_show_rate > 10)
  const hasRecs = services.filter(s => s.recommendation_reason)

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800 }}>Services & Pricing</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Smart Services Engine</div>
        </div>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          <button onClick={handleRecalculate} style={{ padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.75rem' }}>⟳ Recalculate</button>
          <a href="/api/django/services/optimisation-csv/" target="_blank" style={{ padding: '0.35rem 0.75rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.75rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>↓ CSV Export</a>
          <button onClick={openCreate} style={{ padding: '0.35rem 0.75rem', borderRadius: 6, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>+ Add Service</button>
        </div>
      </div>

      {/* Alerts */}
      {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        {error} <span onClick={() => setError('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
      </div>}
      {success && <div style={{ background: '#14532d', color: '#86efac', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: '0.75rem', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
        {success} <span onClick={() => setSuccess('')} style={{ cursor: 'pointer', fontWeight: 700 }}>×</span>
      </div>}

      {/* PHASE 8 — Dashboard Intelligence Widgets */}
      {(underperforming.length > 0 || overbooked.length > 0 || highNoShow.length > 0 || hasRecs.length > 0) && (
        <div className="svc-widgets" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.5rem', marginBottom: '1rem' }}>
          {underperforming.length > 0 && (
            <div style={{ background: C.card, borderRadius: 10, padding: '0.75rem', borderLeft: `3px solid ${C.amber}` }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: C.amber }}>{underperforming.length}</div>
              <div style={{ fontSize: '0.7rem', color: C.muted }}>Underperforming</div>
            </div>
          )}
          {overbooked.length > 0 && (
            <div style={{ background: C.card, borderRadius: 10, padding: '0.75rem', borderLeft: `3px solid ${C.red}` }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: C.red }}>{overbooked.length}</div>
              <div style={{ fontSize: '0.7rem', color: C.muted }}>Overbooked (↑ price)</div>
            </div>
          )}
          {highNoShow.length > 0 && (
            <div style={{ background: C.card, borderRadius: 10, padding: '0.75rem', borderLeft: `3px solid ${C.red}` }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: C.red }}>{highNoShow.length}</div>
              <div style={{ fontSize: '0.7rem', color: C.muted }}>High No-Show</div>
            </div>
          )}
          {hasRecs.length > 0 && (
            <div style={{ background: C.card, borderRadius: 10, padding: '0.75rem', borderLeft: `3px solid ${C.accent}` }}>
              <div style={{ fontSize: '1.2rem', fontWeight: 800, color: C.accent }}>{hasRecs.length}</div>
              <div style={{ fontSize: '0.7rem', color: C.muted }}>Optimisation Opportunities</div>
            </div>
          )}
        </div>
      )}

      {/* Service cards */}
      {services.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>No services yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {services.map(s => {
            const isExpanded = expandedId === s.id
            const ri = riskIcon(s.risk_indicator || 'stable')
            const isActive = s.active || s.is_active

            return (
              <div key={s.id}>
                {/* Main row */}
                <div onClick={() => setExpandedId(isExpanded ? null : s.id)} style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 0.75rem',
                  background: isExpanded ? C.cardAlt : C.card, borderRadius: isExpanded ? '10px 10px 0 0' : 10,
                  cursor: 'pointer', transition: 'background 0.15s', opacity: isActive ? 1 : 0.5,
                }} onMouseEnter={e => { if (!isExpanded) e.currentTarget.style.background = C.cardAlt }}
                   onMouseLeave={e => { if (!isExpanded) e.currentTarget.style.background = C.card }}>

                  {/* PHASE 7 — Risk indicator */}
                  <div style={{ width: 28, textAlign: 'center', flexShrink: 0 }} title={ri.label}>
                    <span style={{ fontSize: '0.9rem' }}>{ri.icon}</span>
                  </div>

                  {/* Name + category */}
                  <div style={{ flex: '1 1 160px', minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{s.name}</div>
                    <div style={{ fontSize: '0.65rem', color: C.muted }}>{s.category || 'Uncategorised'} · {s.duration_minutes}min</div>
                  </div>

                  {/* Price */}
                  <div style={{ flex: '0 0 auto', minWidth: 60, fontWeight: 700, fontSize: '0.9rem' }}>{fmtPrice(s.price)}</div>

                  {/* Payment type */}
                  <div style={{ flex: '0 0 auto', minWidth: 55 }}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 700,
                      background: s.payment_type === 'deposit' ? C.amber + '25' : s.payment_type === 'free' ? C.blue + '25' : C.green + '25',
                      color: s.payment_type === 'deposit' ? C.amber : s.payment_type === 'free' ? C.blue : C.green,
                    }}>{s.payment_type === 'deposit' ? 'Deposit' : s.payment_type === 'free' ? 'Free' : 'Full'}</span>
                  </div>

                  {/* Demand bar */}
                  <div style={{ flex: '0 0 auto', minWidth: 60 }}>
                    <div style={{ fontSize: '0.6rem', color: C.muted, marginBottom: 2 }}>Demand</div>
                    <div style={{ width: 50, height: 4, background: C.cardAlt, borderRadius: 2 }}>
                      <div style={{ width: `${Math.min(100, s.demand_index || 0)}%`, height: '100%', background: pctColor(s.demand_index || 0), borderRadius: 2 }} />
                    </div>
                  </div>

                  {/* Staff count */}
                  <div style={{ flex: '0 0 auto', fontSize: '0.7rem', color: C.muted, minWidth: 40 }} onClick={e => { e.stopPropagation(); openStaffAssign(s) }}>
                    {(s.staff_ids?.length || 0) > 0 ? `${s.staff_ids.length} staff` : 'Assign'}
                  </div>

                  {/* Status */}
                  <div style={{ flex: '0 0 auto', minWidth: 50 }}>
                    <span style={{ padding: '2px 6px', borderRadius: 6, fontSize: '0.6rem', fontWeight: 600, background: isActive ? C.green + '25' : C.muted + '25', color: isActive ? C.green : C.muted }}>{isActive ? 'Active' : 'Off'}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ flex: '0 0 auto', display: 'flex', gap: '0.2rem' }} onClick={e => e.stopPropagation()}>
                    <button onClick={() => openEdit(s)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.6rem' }}>Edit</button>
                    <button onClick={() => toggleActive(s.id, isActive)} style={{ padding: '2px 6px', borderRadius: 4, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.6rem' }}>{isActive ? 'Off' : 'On'}</button>
                  </div>

                  <div style={{ fontSize: '0.7rem', color: C.muted, flexShrink: 0 }}>{isExpanded ? '▲' : '▼'}</div>
                </div>

                {/* PHASE 2 — Expandable Performance Panel */}
                {isExpanded && (
                  <div style={{ background: C.card, borderRadius: '0 0 10px 10px', padding: '1rem', borderTop: `1px solid ${C.border}30` }}>
                    <div className="svc-perf-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>

                      {/* Performance Metrics */}
                      <div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>Performance (90d)</div>
                        <div style={{ display: 'grid', gap: '0.3rem', fontSize: '0.8rem' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: C.muted }}>Total Revenue</span>
                            <span style={{ fontWeight: 700 }}>{fmtPrice(s.total_revenue || 0)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: C.muted }}>Total Bookings</span>
                            <span>{s.total_bookings || 0}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: C.muted }}>Avg Booking Value</span>
                            <span>{fmtPrice(s.avg_booking_value || 0)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: C.muted }}>No-Show Rate</span>
                            <span style={{ fontWeight: 600, color: (s.no_show_rate || 0) > 15 ? C.red : (s.no_show_rate || 0) > 8 ? C.amber : C.green }}>{(s.no_show_rate || 0).toFixed(1)}%</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: C.muted }}>Avg Risk Score</span>
                            <span style={{ color: (s.avg_risk_score || 0) > 50 ? C.red : (s.avg_risk_score || 0) > 25 ? C.amber : C.green }}>{(s.avg_risk_score || 0).toFixed(1)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Utilisation */}
                      <div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>Utilisation</div>
                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                              <span style={{ color: C.muted }}>Peak (10am–2pm)</span>
                              <span style={{ fontWeight: 600, color: pctColor(s.peak_utilisation_rate || 0) }}>{(s.peak_utilisation_rate || 0).toFixed(0)}%</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: C.cardAlt, borderRadius: 3 }}>
                              <div style={{ width: `${Math.min(100, s.peak_utilisation_rate || 0)}%`, height: '100%', background: pctColor(s.peak_utilisation_rate || 0), borderRadius: 3, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                              <span style={{ color: C.muted }}>Off-Peak</span>
                              <span style={{ fontWeight: 600, color: pctColor(s.off_peak_utilisation_rate || 0) }}>{(s.off_peak_utilisation_rate || 0).toFixed(0)}%</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: C.cardAlt, borderRadius: 3 }}>
                              <div style={{ width: `${Math.min(100, s.off_peak_utilisation_rate || 0)}%`, height: '100%', background: pctColor(s.off_peak_utilisation_rate || 0), borderRadius: 3, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: 3 }}>
                              <span style={{ color: C.muted }}>Demand Index</span>
                              <span style={{ fontWeight: 600 }}>{(s.demand_index || 0).toFixed(0)}/100</span>
                            </div>
                            <div style={{ width: '100%', height: 6, background: C.cardAlt, borderRadius: 3 }}>
                              <div style={{ width: `${Math.min(100, s.demand_index || 0)}%`, height: '100%', background: C.accent, borderRadius: 3, transition: 'width 0.3s' }} />
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PHASE 3 — AI Recommendation */}
                      <div>
                        <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: C.muted, fontWeight: 600, marginBottom: '0.5rem' }}>AI Recommendation</div>
                        {s.recommendation_reason ? (
                          <div>
                            {s.recommended_base_price && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                <span style={{ color: C.muted }}>Suggested Price</span>
                                <span style={{ fontWeight: 700, color: C.accent }}>{fmtPrice(s.recommended_base_price)}</span>
                              </div>
                            )}
                            {s.recommended_deposit_percent != null && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                <span style={{ color: C.muted }}>Suggested Deposit</span>
                                <span style={{ fontWeight: 600 }}>{s.recommended_deposit_percent}%</span>
                              </div>
                            )}
                            {s.recommended_payment_type && (
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                                <span style={{ color: C.muted }}>Payment Type</span>
                                <span style={{ fontWeight: 600 }}>{s.recommended_payment_type}</span>
                              </div>
                            )}
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem' }}>
                              <span style={{ color: C.muted }}>Confidence</span>
                              <span style={{ fontWeight: 600, color: pctColor(s.recommendation_confidence || 0, 70, 50) }}>{(s.recommendation_confidence || 0).toFixed(0)}%</span>
                            </div>
                            <div style={{ fontSize: '0.7rem', color: C.muted, fontStyle: 'italic', marginTop: '0.3rem', lineHeight: 1.4 }}>{s.recommendation_reason}</div>
                            <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.5rem' }}>
                              <button onClick={() => handleApplyRec(s.id)} style={{ padding: '3px 10px', borderRadius: 6, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>Apply</button>
                              <button onClick={() => openLogs(s)} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.7rem' }}>History</button>
                            </div>
                          </div>
                        ) : (
                          <div style={{ fontSize: '0.8rem', color: C.muted }}>No recommendations yet. Run recalculate or wait for nightly update.</div>
                        )}
                        {s.last_optimised_at && (
                          <div style={{ fontSize: '0.6rem', color: C.muted, marginTop: '0.4rem' }}>Last analysed: {new Date(s.last_optimised_at).toLocaleDateString('en-GB')}</div>
                        )}
                      </div>
                    </div>

                    {/* Bottom actions */}
                    <div style={{ display: 'flex', gap: '0.3rem', marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: `1px solid ${C.border}30`, flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(s)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.text, cursor: 'pointer', fontSize: '0.7rem', fontWeight: 600 }}>Edit Service</button>
                      <button onClick={() => openStaffAssign(s)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.7rem' }}>Staff ({s.staff_ids?.length || 0})</button>
                      <button onClick={() => openLogs(s)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.7rem' }}>Optimisation Log</button>
                      <button onClick={() => handleDelete(s.id, s.name)} style={{ padding: '4px 12px', borderRadius: 6, border: `1px solid ${C.red}30`, background: 'transparent', color: C.red, cursor: 'pointer', fontSize: '0.7rem', marginLeft: 'auto' }}>Delete</button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ===== CREATE / EDIT MODAL ===== */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => { setEditing(null); setCreating(false) }}>
          <div style={{ maxWidth: 580, width: '100%', background: C.card, borderRadius: 16, padding: '1.5rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <button onClick={() => { setEditing(null); setCreating(false) }} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.muted }}>×</button>
            <h2 style={{ marginBottom: '1rem', fontSize: '1.1rem', color: C.text }}>{creating ? 'New Service' : 'Edit Service'}</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Name *</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. 1:1 Mindfulness Session" style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
              <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Description</label><textarea rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, resize: 'vertical' }} /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Category</label><input value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Duration (min)</label><input type="number" min="1" value={editing.duration_minutes} onChange={e => setEditing({ ...editing, duration_minutes: +e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Price (£)</label><input type="number" step="0.01" min="0" value={priceInput} onChange={e => setPriceInput(e.target.value)} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: C.muted }}>Payment Type</label>
                  <select value={editing.payment_type || 'full'} onChange={e => setEditing({ ...editing, payment_type: e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }}>
                    <option value="full">Full Payment</option>
                    <option value="deposit">Deposit Required</option>
                    <option value="free">Free / No Payment</option>
                  </select>
                </div>
              </div>

              {editing.payment_type === 'deposit' && (
                <div style={{ background: C.cardAlt, borderRadius: 10, padding: '0.75rem' }}>
                  <label style={{ fontSize: '0.8rem', color: C.muted, marginBottom: 6, display: 'block' }}>Deposit Amount</label>
                  <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.5rem' }}>
                    <button type="button" onClick={() => setDepositMode('fixed')} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${depositMode === 'fixed' ? C.accent : C.border}`, background: depositMode === 'fixed' ? C.accent : 'transparent', color: depositMode === 'fixed' ? '#fff' : C.muted, cursor: 'pointer', fontSize: '0.75rem' }}>£ Fixed</button>
                    <button type="button" onClick={() => setDepositMode('percent')} style={{ padding: '3px 10px', borderRadius: 6, border: `1px solid ${depositMode === 'percent' ? C.accent : C.border}`, background: depositMode === 'percent' ? C.accent : 'transparent', color: depositMode === 'percent' ? '#fff' : C.muted, cursor: 'pointer', fontSize: '0.75rem' }}>% Percentage</button>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    {depositMode === 'fixed' && <span style={{ fontWeight: 600, color: C.muted }}>£</span>}
                    <input type="number" step={depositMode === 'fixed' ? '0.01' : '1'} min="0" max={depositMode === 'percent' ? '100' : undefined} value={depositInput} onChange={e => setDepositInput(e.target.value)} style={{ flex: 1, padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} />
                    {depositMode === 'percent' && <span style={{ fontWeight: 600, color: C.muted }}>%</span>}
                  </div>
                </div>
              )}

              {/* PHASE 4 — Deposit Strategy */}
              <div style={{ background: C.cardAlt, borderRadius: 10, padding: '0.75rem' }}>
                <label style={{ fontSize: '0.8rem', color: C.muted, marginBottom: 6, display: 'block' }}>Deposit Strategy</label>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[{ k: 'fixed', l: 'Fixed' }, { k: 'percentage', l: 'Percentage' }, { k: 'dynamic', l: 'Dynamic (AI)' }].map(o => (
                    <button key={o.k} type="button" onClick={() => setEditing({ ...editing, deposit_strategy: o.k })} style={{
                      padding: '4px 12px', borderRadius: 6, fontSize: '0.75rem', cursor: 'pointer',
                      border: `1px solid ${editing.deposit_strategy === o.k ? C.accent : C.border}`,
                      background: editing.deposit_strategy === o.k ? C.accent : 'transparent',
                      color: editing.deposit_strategy === o.k ? '#fff' : C.muted,
                    }}>{o.l}</button>
                  ))}
                </div>
                {editing.deposit_strategy === 'dynamic' && (
                  <div style={{ marginTop: '0.5rem', fontSize: '0.7rem', color: C.muted, background: C.bg, borderRadius: 6, padding: '0.5rem' }}>
                    Dynamic mode adjusts deposits per client: Reliable → 25% | Medium → 50% | Low → 100% | Repeat no-show → full + review flag
                  </div>
                )}
              </div>

              {/* PHASE 5 — Smart Pricing Toggle */}
              <div style={{ background: C.cardAlt, borderRadius: 10, padding: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label style={{ fontSize: '0.8rem', color: C.muted }}>Smart Time Pricing</label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer' }}>
                    <input type="checkbox" checked={!!editing.smart_pricing_enabled} onChange={e => setEditing({ ...editing, smart_pricing_enabled: e.target.checked })} style={{ width: 'auto' }} />
                    <span style={{ fontSize: '0.75rem', color: C.muted }}>Enable</span>
                  </label>
                </div>
                {editing.smart_pricing_enabled && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.7rem', color: C.muted }}>Off-Peak Discount %</label>
                    <input type="number" min="0" max="50" value={editing.off_peak_discount_percent || 0} onChange={e => setEditing({ ...editing, off_peak_discount_percent: +e.target.value })} style={{ width: '100%', padding: '0.35rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, marginTop: 3 }} />
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Sort Order</label><input type="number" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} style={{ width: '100%', padding: '0.4rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text }} /></div>
                <div><label style={{ fontSize: '0.8rem', color: C.muted }}>Colour</label><input type="color" value={editing.colour || '#4f46e5'} onChange={e => setEditing({ ...editing, colour: e.target.value })} style={{ width: '100%', height: 38, padding: 2, borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg }} /></div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button onClick={() => { setEditing(null); setCreating(false) }} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                <button onClick={saveService} disabled={saving || !editing.name} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, opacity: saving || !editing.name ? 0.5 : 1 }}>{saving ? 'Saving…' : creating ? 'Create' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STAFF ASSIGNMENT MODAL ===== */}
      {staffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setStaffModal(null)}>
          <div style={{ maxWidth: 480, width: '100%', background: C.card, borderRadius: 16, padding: '1.5rem', position: 'relative', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setStaffModal(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.muted }}>×</button>
            <h2 style={{ marginBottom: '0.5rem', fontSize: '1rem', color: C.text }}>Staff: {staffModal.name}</h2>
            {allStaff.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>No staff found.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.4rem', maxHeight: 300, overflowY: 'auto' }}>
                {allStaff.map((st: any) => (
                  <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.4rem 0.6rem', borderRadius: 8, cursor: 'pointer', background: selectedStaffIds.includes(st.id) ? C.accent + '20' : 'transparent', border: `1px solid ${selectedStaffIds.includes(st.id) ? C.accent : C.border}` }}>
                    <input type="checkbox" checked={selectedStaffIds.includes(st.id)} onChange={() => setSelectedStaffIds(prev => prev.includes(st.id) ? prev.filter(i => i !== st.id) : [...prev, st.id])} style={{ width: 'auto' }} />
                    <div><div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{st.name}</div><div style={{ fontSize: '0.7rem', color: C.muted }}>{st.email}</div></div>
                  </label>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button onClick={() => setStaffModal(null)} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent', color: C.muted, cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
              <button onClick={saveStaffAssignment} disabled={saving} style={{ padding: '0.4rem 1rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>{saving ? 'Saving…' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== OPTIMISATION LOG MODAL (Phase 9) ===== */}
      {logsModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setLogsModal(null)}>
          <div style={{ maxWidth: 600, width: '100%', background: C.card, borderRadius: 16, padding: '1.5rem', position: 'relative', maxHeight: '80vh', overflowY: 'auto', border: `1px solid ${C.border}` }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setLogsModal(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.3rem', cursor: 'pointer', color: C.muted }}>×</button>
            <h2 style={{ marginBottom: '0.75rem', fontSize: '1rem', color: C.text }}>Optimisation Log: {logsModal.name}</h2>
            {logs.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: C.muted }}>No optimisation history yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {logs.map((l: any) => (
                  <div key={l.id} style={{ background: C.cardAlt, borderRadius: 8, padding: '0.6rem', fontSize: '0.8rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 600, color: l.ai_recommended ? C.accent : C.amber }}>{l.ai_recommended ? 'AI' : 'Manual'}{l.owner_override ? ' (Override)' : ''}</span>
                      <span style={{ fontSize: '0.65rem', color: C.muted }}>{new Date(l.timestamp).toLocaleDateString('en-GB')}</span>
                    </div>
                    {l.previous_price && l.new_price && (
                      <div style={{ fontSize: '0.75rem', color: C.muted }}>Price: {fmtPrice(l.previous_price)} → {fmtPrice(l.new_price)}</div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: C.muted, fontStyle: 'italic' }}>{l.reason}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .svc-perf-grid { grid-template-columns: 1fr !important; }
          .svc-widgets { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </div>
  )
}
