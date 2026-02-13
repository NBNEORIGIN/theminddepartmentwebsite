'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  getIntakeProfiles, getDisclaimers, getActiveDisclaimer,
  createDisclaimer, updateDisclaimer, expireIntake,
  requireRenewal, clearRenewal, requireRenewalForVersion,
} from '@/lib/api'

const C = {
  bg: '#0f172a', card: '#1e293b', cardAlt: '#273548', text: '#f8fafc', muted: '#94a3b8',
  border: '#334155', accent: '#6366f1', green: '#22c55e', amber: '#f59e0b', red: '#ef4444',
  blue: '#3b82f6', purple: '#8b5cf6', slate: '#475569',
}

const STATUS_MAP: Record<string, { color: string; label: string }> = {
  valid: { color: C.green, label: 'Valid' },
  renewal: { color: C.amber, label: 'Renewal Required' },
  expired: { color: C.red, label: 'Expired' },
  incomplete: { color: C.slate, label: 'Incomplete' },
  invalid: { color: C.red, label: 'Invalid' },
}

function getIntakeStatus(p: any) {
  if (p.renewal_required) return 'renewal'
  if (p.is_expired) return 'expired'
  if (!p.completed) return 'incomplete'
  if (!p.is_valid_for_booking) return 'invalid'
  return 'valid'
}

const FILTERS = [
  { key: '', label: 'All', icon: '📋' },
  { key: 'valid', label: 'Valid', icon: '✅' },
  { key: 'renewal', label: 'Renewal', icon: '🔄' },
  { key: 'expired', label: 'Expired', icon: '⏰' },
  { key: 'incomplete', label: 'Incomplete', icon: '📝' },
]

export default function AdminDisclaimersPage() {
  const [intakes, setIntakes] = useState<any[]>([])
  const [disclaimers, setDisclaimers] = useState<any[]>([])
  const [activeDisclaimer, setActiveDisclaimer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'intakes' | 'disclaimers'>('intakes')
  const [showForm, setShowForm] = useState(false)
  const [toast, setToast] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [viewDisclaimer, setViewDisclaimer] = useState<any>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [iRes, dRes, aRes] = await Promise.all([
      getIntakeProfiles(),
      getDisclaimers(),
      getActiveDisclaimer(),
    ])
    if (iRes.data) {
      const d: any = iRes.data
      setIntakes(Array.isArray(d) ? d : (d.results || []))
    }
    if (dRes.data) {
      const d: any = dRes.data
      setDisclaimers(Array.isArray(d) ? d : (d.results || []))
    }
    if (aRes.data && !aRes.error) setActiveDisclaimer(aRes.data)
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  async function handleExpire(id: number) {
    if (!confirm('Expire this intake? The client will need to complete a new form.')) return
    await expireIntake(id)
    showToast('Intake expired')
    load()
  }

  async function handleRequireRenewal(id: number, name: string) {
    if (!confirm(`Require ${name} to re-sign the disclaimer on their next booking?`)) return
    const res = await requireRenewal(id)
    if (res.data) { showToast(res.data.message || 'Renewal required'); load() }
    else if (res.error) showToast(`Error: ${res.error}`)
  }

  async function handleClearRenewal(id: number) {
    await clearRenewal(id)
    showToast('Renewal flag cleared')
    load()
  }

  async function handleActivateAndRequireRenewal(disclaimerId: number, version: string) {
    if (!confirm(`Activate v${version} and require all clients on older versions to re-sign?`)) return
    const res = await requireRenewalForVersion(disclaimerId)
    if (res.data) { showToast(res.data.message || 'Activated & renewals required'); load() }
    else if (res.error) showToast(`Error: ${res.error}`)
  }

  async function handleActivate(id: number) {
    await updateDisclaimer(id, { active: true })
    showToast('Disclaimer activated')
    load()
  }

  async function handleCreateDisclaimer(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const res = await createDisclaimer({
      version: fd.get('version') as string,
      content: fd.get('content') as string,
      active: fd.get('active') === 'on',
    })
    if (res.data) { setShowForm(false); showToast('Disclaimer created'); load() }
    else if (res.error) showToast(`Error: ${res.error}`)
  }

  function fmtDate(d: string | null) {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Derived data
  const completedIntakes = intakes.filter((p: any) => p.completed)
  const renewalNeeded = intakes.filter((p: any) => p.renewal_required)
  const expiredIntakes = intakes.filter((p: any) => p.is_expired)
  const consentRate = intakes.length > 0 ? Math.round((intakes.filter((p: any) => p.consent_marketing).length / intakes.length) * 100) : 0

  // Filtered intakes
  const filtered = intakes.filter((p: any) => {
    if (statusFilter && getIntakeStatus(p) !== statusFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return (p.full_name || '').toLowerCase().includes(q) || (p.email || '').toLowerCase().includes(q)
    }
    return true
  })

  // Styles
  const badge = (color: string): React.CSSProperties => ({
    display: 'inline-block', padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem',
    fontWeight: 700, background: color + '20', color, border: `1px solid ${color}40`,
    textTransform: 'uppercase' as const, letterSpacing: '0.03em',
  })

  const statCard = (label: string, value: string | number, color: string, icon: string) => (
    <div key={label} style={{ background: C.card, borderRadius: 10, padding: '0.75rem 1rem', border: `1px solid ${C.border}`, flex: '1 1 120px', minWidth: 120 }}>
      <div style={{ fontSize: '0.65rem', color: C.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{icon} {label}</div>
      <div style={{ fontSize: '1.5rem', fontWeight: 800, color, marginTop: 2 }}>{value}</div>
    </div>
  )

  const consentDot = (ok: boolean, label: string) => (
    <span key={label} title={label} style={{
      display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: '0.6rem', color: ok ? C.green : C.slate,
      fontWeight: 600, textTransform: 'uppercase' as const,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: ok ? C.green : C.slate + '60', display: 'inline-block' }} />
      {label}
    </span>
  )

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto', padding: '0 1rem' }}>
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', top: 20, right: 20, background: C.accent, color: '#fff', padding: '0.6rem 1.2rem', borderRadius: 10, fontSize: '0.85rem', fontWeight: 600, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>{toast}</div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, margin: 0 }}>Intake & Disclaimers</h1>
          <p style={{ fontSize: '0.75rem', color: C.muted, margin: '2px 0 0' }}>Client intake profiles, consent tracking & disclaimer version management</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: '1rem' }}>
        {statCard('Completed', completedIntakes.length, C.text, '📋')}
        {statCard('Valid', intakes.filter(p => getIntakeStatus(p) === 'valid').length, C.green, '✅')}
        {statCard('Renewal', renewalNeeded.length, renewalNeeded.length > 0 ? C.amber : C.muted, '🔄')}
        {statCard('Expired', expiredIntakes.length, expiredIntakes.length > 0 ? C.red : C.muted, '⏰')}
        {statCard('Disclaimer', activeDisclaimer ? `v${activeDisclaimer.version}` : '—', C.accent, '📜')}
        {statCard('Marketing Opt-in', `${consentRate}%`, C.purple, '📧')}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: '1rem' }}>
        {(['intakes', 'disclaimers'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.45rem 1rem', borderRadius: 8, border: `1px solid ${tab === t ? C.accent : C.border}`,
            background: tab === t ? C.accent + '20' : 'transparent',
            color: tab === t ? C.accent : C.muted, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
          }}>
            {t === 'intakes' ? `📋 Client Intakes (${intakes.length})` : `📜 Disclaimer Versions (${disclaimers.length})`}
          </button>
        ))}
      </div>

      {/* ═══ INTAKES TAB ═══ */}
      {tab === 'intakes' && (
        <div>
          {/* Filter bar */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
              {FILTERS.map(f => (
                <button key={f.key} onClick={() => setStatusFilter(f.key)} style={{
                  padding: '0.35rem 0.7rem', borderRadius: 8, border: `1px solid ${statusFilter === f.key ? C.accent : C.border}`,
                  background: statusFilter === f.key ? C.accent + '20' : 'transparent',
                  color: statusFilter === f.key ? C.accent : C.muted, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                  whiteSpace: 'nowrap' as const,
                }}>
                  {f.icon} {f.label}
                </button>
              ))}
            </div>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name or email…"
              style={{ padding: '0.4rem 0.75rem', borderRadius: 8, border: `1px solid ${C.border}`, background: C.card, color: C.text, fontSize: '0.8rem', width: 220, outline: 'none', colorScheme: 'dark' }}
            />
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>Loading…</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📋</div>
              <div style={{ fontWeight: 600 }}>No intake profiles found</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>
                {statusFilter || search ? 'Try a different filter or search term.' : 'Clients complete intake forms before their first booking.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filtered.map((p: any) => {
                const st = getIntakeStatus(p)
                const stInfo = STATUS_MAP[st]
                const isExpanded = expandedId === p.id
                return (
                  <div key={p.id} style={{
                    background: C.card, borderRadius: 10, border: `1px solid ${st === 'expired' ? C.red + '40' : st === 'renewal' ? C.amber + '30' : C.border}`,
                    overflow: 'hidden',
                  }}>
                    {/* Main row */}
                    <div
                      onClick={() => setExpandedId(isExpanded ? null : p.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0.7rem 1rem', cursor: 'pointer' }}
                    >
                      {/* Avatar */}
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%', background: C.accent + '20', color: C.accent,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem', flexShrink: 0,
                      }}>
                        {(p.full_name || '?')[0].toUpperCase()}
                      </div>

                      {/* Name + email */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{p.full_name}</div>
                        <div style={{ fontSize: '0.7rem', color: C.muted }}>{p.email}</div>
                      </div>

                      {/* Consents */}
                      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                        {consentDot(p.consent_booking, 'Booking')}
                        {consentDot(p.consent_privacy, 'Privacy')}
                        {consentDot(p.consent_marketing, 'Marketing')}
                      </div>

                      {/* Disclaimer version */}
                      <div style={{ flexShrink: 0 }}>
                        {p.disclaimer_version_str ? (
                          <span style={badge(C.blue)}>{p.disclaimer_version_str}</span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: C.slate }}>No disclaimer</span>
                        )}
                      </div>

                      {/* Expiry */}
                      <div style={{ fontSize: '0.65rem', color: st === 'expired' ? C.red : C.muted, fontWeight: 600, flexShrink: 0, minWidth: 70, textAlign: 'right' as const }}>
                        {p.expires_at ? fmtDate(p.expires_at) : '—'}
                      </div>

                      {/* Status badge */}
                      <span style={{ ...badge(stInfo.color), flexShrink: 0 }}>{stInfo.label}</span>

                      {/* Chevron */}
                      <span style={{ fontSize: '0.7rem', color: C.muted, transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>▼</span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div style={{ borderTop: `1px solid ${C.border}`, padding: '0.8rem 1rem', background: C.cardAlt }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 12 }}>
                          {/* Emergency contact */}
                          <div>
                            <div style={labelSt}>Emergency Contact</div>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{p.emergency_contact_name || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: C.muted }}>{p.emergency_contact_phone || '—'}</div>
                          </div>
                          {/* Phone */}
                          <div>
                            <div style={labelSt}>Phone</div>
                            <div style={{ fontSize: '0.8rem' }}>{p.phone || '—'}</div>
                          </div>
                          {/* Experience */}
                          <div>
                            <div style={labelSt}>Experience Level</div>
                            <div style={{ fontSize: '0.8rem' }}>{p.experience_level || '—'}</div>
                          </div>
                          {/* Completed date */}
                          <div>
                            <div style={labelSt}>Completed</div>
                            <div style={{ fontSize: '0.8rem' }}>{fmtDate(p.completed_date)}</div>
                          </div>
                        </div>

                        {/* Goals & Preferences */}
                        {(p.goals || p.preferences) && (
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 12 }}>
                            {p.goals && (
                              <div>
                                <div style={labelSt}>Goals</div>
                                <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.4 }}>{p.goals}</div>
                              </div>
                            )}
                            {p.preferences && (
                              <div>
                                <div style={labelSt}>Preferences</div>
                                <div style={{ fontSize: '0.75rem', color: C.muted, lineHeight: 1.4 }}>{p.preferences}</div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Actions */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {p.completed && !p.renewal_required && (
                            <button onClick={(e) => { e.stopPropagation(); handleRequireRenewal(p.id, p.full_name) }} style={{
                              padding: '0.35rem 0.8rem', borderRadius: 8, border: `1px solid ${C.amber}40`, background: C.amber + '15',
                              color: C.amber, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                              🔄 Require Renewal
                            </button>
                          )}
                          {p.renewal_required && (
                            <button onClick={(e) => { e.stopPropagation(); handleClearRenewal(p.id) }} style={{
                              padding: '0.35rem 0.8rem', borderRadius: 8, border: `1px solid ${C.accent}40`, background: C.accent + '15',
                              color: C.accent, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                              ✅ Clear Renewal
                            </button>
                          )}
                          {p.completed && !p.is_expired && (
                            <button onClick={(e) => { e.stopPropagation(); handleExpire(p.id) }} style={{
                              padding: '0.35rem 0.8rem', borderRadius: 8, border: `1px solid ${C.red}40`, background: C.red + '15',
                              color: C.red, fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer',
                            }}>
                              ⏰ Expire Now
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Info footer */}
          <div style={{ marginTop: '1rem', padding: '0.6rem 0.8rem', background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.7rem', color: C.muted, lineHeight: 1.5 }}>
            <strong style={{ color: C.text }}>Consents tracked:</strong> Booking consent, Privacy policy, Marketing (optional).
            Intake forms expire after <strong style={{ color: C.text }}>1 year</strong> and must be renewed.
            Clients flagged for renewal will be prompted to re-sign on their next booking.
          </div>
        </div>
      )}

      {/* ═══ DISCLAIMERS TAB ═══ */}
      {tab === 'disclaimers' && (
        <div>
          {/* New disclaimer button */}
          <div style={{ marginBottom: '1rem' }}>
            <button onClick={() => setShowForm(!showForm)} style={{
              padding: '0.5rem 1.2rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff',
              fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem',
            }}>
              {showForm ? 'Cancel' : '+ New Disclaimer Version'}
            </button>
          </div>

          {/* Create form */}
          {showForm && (
            <form onSubmit={handleCreateDisclaimer} style={{
              background: C.card, borderRadius: 10, padding: '1.2rem', border: `1px solid ${C.border}`, marginBottom: '1rem',
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.8rem' }}>Create New Disclaimer</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div>
                  <label style={labelSt}>Version *</label>
                  <input name="version" required placeholder="e.g. 2.0" style={inputSt} />
                </div>
                <div>
                  <label style={labelSt}>Disclaimer Text *</label>
                  <textarea name="content" required rows={5} placeholder="Full disclaimer text shown to clients during intake…" style={{ ...inputSt, resize: 'vertical' as const }} />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8rem', color: C.muted }}>
                  <input type="checkbox" name="active" style={{ width: 'auto', accentColor: C.accent }} /> Set as active immediately
                </label>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
                <button type="button" onClick={() => setShowForm(false)} style={{
                  padding: '0.4rem 1rem', borderRadius: 8, border: `1px solid ${C.border}`, background: 'transparent',
                  color: C.muted, fontWeight: 600, cursor: 'pointer', fontSize: '0.8rem',
                }}>Cancel</button>
                <button type="submit" style={{
                  padding: '0.4rem 1.2rem', borderRadius: 8, border: 'none', background: C.accent, color: '#fff',
                  fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem',
                }}>Create</button>
              </div>
            </form>
          )}

          {/* Disclaimer list */}
          {disclaimers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: C.muted }}>
              <div style={{ fontSize: '2rem', marginBottom: 8 }}>📜</div>
              <div style={{ fontWeight: 600 }}>No disclaimer versions yet</div>
              <div style={{ fontSize: '0.8rem', marginTop: 4 }}>Create your first disclaimer to get started.</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {disclaimers.map((d: any) => (
                <div key={d.id} style={{
                  background: C.card, borderRadius: 10, padding: '0.8rem 1rem',
                  border: `1px solid ${d.active ? C.green + '40' : C.border}`,
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    {/* Version */}
                    <div style={{ fontWeight: 800, fontSize: '1rem', color: d.active ? C.green : C.muted, minWidth: 50 }}>
                      v{d.version}
                    </div>

                    {/* Content preview */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.75rem', color: C.muted, lineHeight: 1.4,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const, overflow: 'hidden',
                        cursor: 'pointer',
                      }} onClick={() => setViewDisclaimer(viewDisclaimer?.id === d.id ? null : d)}>
                        {d.content || 'No content'}
                      </div>
                    </div>

                    {/* Signed count */}
                    <div style={{ textAlign: 'center' as const, flexShrink: 0 }}>
                      <div style={{ fontSize: '1rem', fontWeight: 700, color: C.text }}>{d.signed_count ?? 0}</div>
                      <div style={{ fontSize: '0.55rem', color: C.muted, textTransform: 'uppercase' as const }}>signed</div>
                    </div>

                    {/* Status */}
                    <span style={{ ...badge(d.active ? C.green : C.slate), flexShrink: 0 }}>
                      {d.active ? 'Active' : 'Inactive'}
                    </span>

                    {/* Created */}
                    <div style={{ fontSize: '0.65rem', color: C.muted, flexShrink: 0, minWidth: 70, textAlign: 'right' as const }}>
                      {fmtDate(d.created_at)}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                      {!d.active && (
                        <>
                          <button onClick={() => handleActivate(d.id)} style={{
                            padding: '0.3rem 0.6rem', borderRadius: 6, border: `1px solid ${C.border}`, background: 'transparent',
                            color: C.muted, fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                          }}>Activate</button>
                          <button onClick={() => handleActivateAndRequireRenewal(d.id, d.version)} style={{
                            padding: '0.3rem 0.6rem', borderRadius: 6, border: 'none', background: C.accent,
                            color: '#fff', fontSize: '0.65rem', fontWeight: 600, cursor: 'pointer',
                          }} title="Activate and require all clients on older versions to re-sign">
                            Activate & Renew All
                          </button>
                        </>
                      )}
                      {d.active && (
                        <span style={{ fontSize: '0.7rem', color: C.green, fontWeight: 600 }}>✓ Current</span>
                      )}
                    </div>
                  </div>

                  {/* Expanded content view */}
                  {viewDisclaimer?.id === d.id && (
                    <div style={{ marginTop: 10, padding: '0.8rem', background: C.bg, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.8rem', color: C.muted, lineHeight: 1.6, whiteSpace: 'pre-wrap' as const, maxHeight: 300, overflowY: 'auto' as const }}>
                      {d.content}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Info footer */}
          <div style={{ marginTop: '1rem', padding: '0.6rem 0.8rem', background: C.card, borderRadius: 8, border: `1px solid ${C.border}`, fontSize: '0.7rem', color: C.muted, lineHeight: 1.5 }}>
            <strong style={{ color: C.text }}>Activate & Renew All</strong> will set the new version as active and flag all clients
            who signed an older version to re-sign on their next booking.
          </div>
        </div>
      )}
    </div>
  )
}

const labelSt: React.CSSProperties = { display: 'block', fontSize: '0.65rem', fontWeight: 600, color: '#94a3b8', marginBottom: 3, textTransform: 'uppercase', letterSpacing: '0.04em' }
const inputSt: React.CSSProperties = { width: '100%', padding: '0.45rem 0.65rem', borderRadius: 8, border: '1px solid #334155', background: '#0f172a', color: '#f8fafc', fontSize: '0.85rem', outline: 'none', colorScheme: 'dark', boxSizing: 'border-box' as const }
