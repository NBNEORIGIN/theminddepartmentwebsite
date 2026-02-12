'use client'

import { useEffect, useState } from 'react'
import { getIntakeProfiles, getDisclaimers, getActiveDisclaimer, createDisclaimer, updateDisclaimer, expireIntake } from '@/lib/api'

export default function AdminDisclaimersPage() {
  const [intakes, setIntakes] = useState<any[]>([])
  const [disclaimers, setDisclaimers] = useState<any[]>([])
  const [activeDisclaimer, setActiveDisclaimer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<'intakes' | 'disclaimers'>('intakes')
  const [showForm, setShowForm] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
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
    if (iRes.error) setError(iRes.error)
    setLoading(false)
  }

  async function handleExpire(id: number) {
    if (!confirm('Expire this intake? The client will need to complete a new form.')) return
    await expireIntake(id)
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
    if (res.data) {
      setShowForm(false)
      load()
    } else if (res.error) {
      setError(res.error)
    }
  }

  async function handleActivate(id: number) {
    await updateDisclaimer(id, { active: true })
    load()
  }

  if (loading) return <div className="empty-state">Loading…</div>

  return (
    <div>
      <div className="page-header">
        <h1>Intake &amp; Disclaimers</h1>
      </div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem' }}>{error}</div>}

      <div className="tabs" style={{ overflowX: 'auto' }}>
        <button className={`tab ${tab === 'intakes' ? 'active' : ''}`} onClick={() => setTab('intakes')}>
          Intake Profiles ({intakes.length})
        </button>
        <button className={`tab ${tab === 'disclaimers' ? 'active' : ''}`} onClick={() => setTab('disclaimers')}>
          Disclaimer Versions ({disclaimers.length})
        </button>
      </div>

      {/* === INTAKE PROFILES === */}
      {tab === 'intakes' && (
        <div>
          {activeDisclaimer && (
            <div className="card" style={{ marginBottom: '1.5rem', borderLeft: '4px solid var(--color-primary)' }}>
              <strong>Active Disclaimer:</strong> v{activeDisclaimer.version}
              <div style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '0.25rem' }}>
                {(activeDisclaimer.content || '').substring(0, 150)}…
              </div>
            </div>
          )}

          {intakes.length === 0 ? (
            <div className="empty-state">No intake profiles yet. Clients complete these before their first booking.</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Emergency Contact</th>
                    <th>Completed</th>
                    <th>Expires</th>
                    <th>Valid</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {intakes.map((p: any) => {
                    const expired = p.expires_at && new Date(p.expires_at) < new Date()
                    const valid = p.completed && p.consent_booking && p.consent_privacy && !expired
                    return (
                      <tr key={p.id}>
                        <td style={{ fontWeight: 600 }}>{p.full_name}</td>
                        <td style={{ fontSize: '0.85rem' }}>{p.email}</td>
                        <td style={{ fontSize: '0.85rem' }}>{p.phone}</td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {p.emergency_contact_name}
                          {p.emergency_contact_phone && <div style={{ color: 'var(--color-text-muted)' }}>{p.emergency_contact_phone}</div>}
                        </td>
                        <td>
                          <span className={`badge ${p.completed ? 'badge-success' : 'badge-warning'}`}>
                            {p.completed ? 'Yes' : 'No'}
                          </span>
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          {p.expires_at ? new Date(p.expires_at).toLocaleDateString('en-GB') : '—'}
                          {expired && <span className="badge badge-danger" style={{ marginLeft: '0.25rem' }}>Expired</span>}
                        </td>
                        <td>
                          <span className={`badge ${valid ? 'badge-success' : 'badge-danger'}`}>
                            {valid ? 'Valid' : 'Invalid'}
                          </span>
                        </td>
                        <td>
                          {valid && (
                            <button className="btn btn-sm btn-ghost" style={{ color: 'var(--color-danger)' }} onClick={() => handleExpire(p.id)}>
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
            Intake forms expire after 1 year and must be renewed.
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
                    <th>Status</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {disclaimers.map((d: any) => (
                    <tr key={d.id}>
                      <td style={{ fontWeight: 600 }}>v{d.version}</td>
                      <td style={{ fontSize: '0.85rem', maxWidth: 400 }}>
                        {(d.content || '').substring(0, 120)}{(d.content || '').length > 120 ? '…' : ''}
                      </td>
                      <td>
                        <span className={`badge ${d.active ? 'badge-success' : 'badge-neutral'}`}>
                          {d.active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ fontSize: '0.85rem' }}>
                        {d.created_at ? new Date(d.created_at).toLocaleDateString('en-GB') : '—'}
                      </td>
                      <td>
                        {!d.active && (
                          <button className="btn btn-sm btn-outline" onClick={() => handleActivate(d.id)}>
                            Activate
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
