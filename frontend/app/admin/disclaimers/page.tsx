'use client'

import { useEffect, useState } from 'react'
import {
  getIntakeProfiles, getDisclaimers, getActiveDisclaimer,
  createDisclaimer, updateDisclaimer, expireIntake,
  requireRenewal, clearRenewal, requireRenewalForVersion,
} from '@/lib/api'

export default function AdminDisclaimersPage() {
  const [intakes, setIntakes] = useState<any[]>([])
  const [disclaimers, setDisclaimers] = useState<any[]>([])
  const [activeDisclaimer, setActiveDisclaimer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [tab, setTab] = useState<'intakes' | 'disclaimers'>('intakes')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    setError('')
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
    if (iRes.error) setError(iRes.error)
    setLoading(false)
  }

  async function handleExpire(id: number) {
    if (!confirm('Expire this intake? The client will need to complete a new form.')) return
    await expireIntake(id)
    load()
  }

  async function handleRequireRenewal(id: number, name: string) {
    if (!confirm(`Require ${name} to re-sign the disclaimer on their next booking?`)) return
    const res = await requireRenewal(id)
    if (res.data) { setSuccess(res.data.message); load() }
    else if (res.error) setError(res.error)
  }

  async function handleClearRenewal(id: number) {
    await clearRenewal(id)
    load()
  }

  async function handleActivateAndRequireRenewal(disclaimerId: number, version: string) {
    if (!confirm(`Activate v${version} and require all clients on older versions to re-sign?`)) return
    const res = await requireRenewalForVersion(disclaimerId)
    if (res.data) { setSuccess(res.data.message); load() }
    else if (res.error) setError(res.error)
  }

  async function handleActivate(id: number) {
    await updateDisclaimer(id, { active: true })
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
    if (res.data) { setShowForm(false); load() }
    else if (res.error) setError(res.error)
  }

  if (loading) return <div className="empty-state">Loading…</div>

  const completedIntakes = intakes.filter((p: any) => p.completed)
  const renewalNeeded = intakes.filter((p: any) => p.renewal_required)
  const expiredIntakes = intakes.filter((p: any) => p.is_expired)

  return (
    <div>
      <div className="page-header">
        <h1>Intake &amp; Disclaimers</h1>
      </div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem', padding: '0.75rem 1rem' }}>Error: {error}</div>}
      {success && <div className="card" style={{ background: '#f0fdf4', color: '#166534', marginBottom: '1rem', padding: '0.75rem 1rem' }}>{success}</div>}

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{completedIntakes.length}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Completed Intakes</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: renewalNeeded.length > 0 ? '#d97706' : 'var(--color-primary)' }}>{renewalNeeded.length}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Renewal Required</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: expiredIntakes.length > 0 ? '#dc2626' : 'var(--color-primary)' }}>{expiredIntakes.length}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Expired</div>
        </div>
        <div className="card" style={{ textAlign: 'center', padding: '1rem' }}>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-primary)' }}>{activeDisclaimer ? `v${activeDisclaimer.version}` : '—'}</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Active Disclaimer</div>
        </div>
      </div>

      <div className="tabs" style={{ overflowX: 'auto' }}>
        <button className={`tab ${tab === 'intakes' ? 'active' : ''}`} onClick={() => setTab('intakes')}>
          Client Intake Profiles ({intakes.length})
        </button>
        <button className={`tab ${tab === 'disclaimers' ? 'active' : ''}`} onClick={() => setTab('disclaimers')}>
          Disclaimer Versions ({disclaimers.length})
        </button>
      </div>

      {/* === CLIENT INTAKE PROFILES === */}
      {tab === 'intakes' && (
        <div>
          {intakes.length === 0 ? (
            <div className="empty-state">No intake profiles yet. Clients complete these before their first booking.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Emergency Contact</th>
                    <th>Disclaimer Signed</th>
                    <th>Completed</th>
                    <th>Expires</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((p: any) => {
                    const expired = p.is_expired
                    const valid = p.is_valid_for_booking
                    const needsRenewal = p.renewal_required
                    let statusBadge = 'badge-success'
                    let statusText = 'Valid'
                    if (needsRenewal) { statusBadge = 'badge-warning'; statusText = 'Renewal Required' }
                    else if (expired) { statusBadge = 'badge-danger'; statusText = 'Expired' }
                    else if (!p.completed) { statusBadge = 'badge-neutral'; statusText = 'Incomplete' }
                    else if (!valid) { statusBadge = 'badge-danger'; statusText = 'Invalid' }

                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{p.email}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {p.emergency_contact_name}
                          {p.emergency_contact_phone && <div style={{ color: 'var(--color-text-muted)' }}>{p.emergency_contact_phone}</div>}
                        </td>
                        <td>
                          {p.disclaimer_version_str ? (
                            <span className="badge badge-info">{p.disclaimer_version_str}</span>
                          ) : (
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem' }}>—</span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {p.completed_date ? new Date(p.completed_date).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-GB') : '—'}
                        </td>
                        <td><span className={`badge ${statusBadge}`}>{statusText}</span></td>
                        <td style={{ whiteSpace: 'nowrap' }}>
                          {p.completed && !needsRenewal && (
                            <button className="btn btn-sm btn-ghost" style={{ color: '#d97706' }} onClick={() => handleRequireRenewal(p.id, p.full_name)} title="Require re-sign on next booking">
                              Require Renewal
                            </button>
                          )}
                          {needsRenewal && (
                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-primary)' }} onClick={() => handleClearRenewal(p.id)} title="Clear renewal flag">
                              Clear Renewal
                            </button>
                          )}
                          {p.completed && !expired && (
                            <button className="btn btn-sm btn-ghost" style={{ color: '#dc2626' }} onClick={() => handleExpire(p.id)} title="Expire this intake immediately">
                              Expire
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <strong>Consents tracked:</strong> Booking consent, Privacy policy, Marketing (optional).
            Intake forms expire after <strong>1 year</strong> and must be renewed.
            Clients flagged for renewal will be prompted to re-sign on their next booking.
          </div>
        </div>
      )}

      {/* === DISCLAIMER VERSIONS === */}
      {tab === 'disclaimers' && (
        <div>
          <div style={{ marginBottom: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancel' : '+ New Disclaimer Version'}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreateDisclaimer} className="card" style={{ marginBottom: '1.5rem' }}>
              <h3 style={{ marginBottom: '1rem' }}>Create New Disclaimer</h3>
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                <div>
                  <label>Version *</label>
                  <input name="version" required placeholder="e.g. 2.0" />
                </div>
                <div>
                  <label>Disclaimer Text *</label>
                  <textarea name="content" required rows={6} placeholder="Full disclaimer text shown to clients during intake..." />
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                  <input type="checkbox" name="active" style={{ width: 'auto' }} /> Set as active immediately
                </label>
              </div>
              <div style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn btn-primary">Create</button>
              </div>
            </form>
          )}

          {disclaimers.length === 0 ? (
            <div className="empty-state">No disclaimer versions created yet.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Version</th>
                    <th>Content Preview</th>
                    <th>Clients Signed</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {disclaimers.map((d: any) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>v{d.version}</td>
                      <td style={{ fontSize: '0.85rem', maxWidth: 350 }}>
                        {(d.content || '').substring(0, 100)}{(d.content || '').length > 100 ? '…' : ''}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className="badge badge-info">{d.signed_count ?? 0}</span>
                      </td>
                      <td>
                        <span className={`badge ${d.active ? 'badge-success' : 'badge-neutral'}`}>
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {!d.active && (
                          <>
                            <button className="btn btn-sm btn-outline" onClick={() => handleActivate(d.id)} style={{ marginRight: '0.5rem' }}>
                              Activate
                            </button>
                            <button className="btn btn-sm btn-primary" onClick={() => handleActivateAndRequireRenewal(d.id, d.version)} title="Activate and require all clients on older versions to re-sign">
                              Activate &amp; Require Renewal
                            </button>
                          </>
                        )}
                        {d.active && (
                          <span style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Current version</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <strong>Activate &amp; Require Renewal</strong> will set the new version as active and flag all clients
            who signed an older version to re-sign on their next booking.
          </div>
        </div>
      )}
    </div>
  )
}
