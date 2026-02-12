'use client'

import { useEffect, useState, useCallback } from 'react'
import { getServices, createService, updateService, deleteService, assignStaffToService, getStaffList } from '@/lib/api'

function formatPrice(pence: number) { return '£' + (pence / 100).toFixed(2) }
function poundsToDisplay(price: string | number) { return '£' + Number(price).toFixed(2) }
function poundsToPence(pounds: string) { return Math.round(parseFloat(pounds || '0') * 100) }

function depositDisplay(s: any) {
  if (s.deposit_percentage && s.deposit_percentage > 0) return `${s.deposit_percentage}%`
  if (s.deposit_pence && s.deposit_pence > 0) return formatPrice(s.deposit_pence)
  return '—'
}

function paymentLabel(s: any) {
  if (s.payment_type === 'free') return 'Free'
  if (s.payment_type === 'deposit') return 'Deposit'
  return 'Full'
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

  const fetchAll = useCallback(async () => {
    const [sRes, stRes] = await Promise.all([getServices(true), getStaffList()])
    setServices(sRes.data || [])
    setAllStaff(stRes.data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <div className="empty-state">Loading services…</div>

  // ===== CREATE / EDIT FORM HELPERS =====
  function openCreate() {
    setCreating(true)
    setEditing({ name: '', description: '', category: '', duration_minutes: 60, payment_type: 'full', colour: '', sort_order: 0, active: true })
    setPriceInput('')
    setDepositInput('')
    setDepositMode('fixed')
  }

  function openEdit(s: any) {
    setCreating(false)
    setEditing({ ...s })
    setPriceInput(String(s.price || '0'))
    if (s.deposit_percentage && s.deposit_percentage > 0) {
      setDepositMode('percent')
      setDepositInput(String(s.deposit_percentage))
    } else {
      setDepositMode('fixed')
      setDepositInput(s.deposit_pence ? String((s.deposit_pence / 100).toFixed(2)) : '')
    }
  }

  async function saveService() {
    if (!editing) return
    setSaving(true)
    setError('')

    const payload: any = {
      name: editing.name,
      description: editing.description,
      category: editing.category || '',
      duration_minutes: editing.duration_minutes,
      price_pence: poundsToPence(priceInput),
      payment_type: editing.payment_type,
      colour: editing.colour || '',
      active: editing.active !== false,
      sort_order: editing.sort_order || 0,
    }
    if (editing.payment_type === 'deposit') {
      if (depositMode === 'percent') {
        payload.deposit_percentage = parseInt(depositInput || '0', 10)
        payload.deposit_pence = 0
      } else {
        payload.deposit_pence = poundsToPence(depositInput)
        payload.deposit_percentage = 0
      }
    } else {
      payload.deposit_pence = 0
      payload.deposit_percentage = 0
    }

    let res
    if (creating) {
      res = await createService(payload)
    } else {
      res = await updateService(editing.id, payload)
    }
    setSaving(false)

    if (res.data) {
      setSuccess(creating ? 'Service created' : 'Service updated')
      setEditing(null)
      setCreating(false)
      fetchAll()
    } else {
      setError(res.error || 'Failed to save')
    }
  }

  async function handleDelete(id: number, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return
    const res = await deleteService(id)
    if (res.status === 204 || res.data) {
      setSuccess(`"${name}" deleted`)
      fetchAll()
    } else {
      setError(res.error || 'Failed to delete')
    }
  }

  async function toggleActive(id: number, currentlyActive: boolean) {
    const res = await updateService(id, { active: !currentlyActive })
    if (res.data) {
      setServices(prev => prev.map(s => s.id === id ? res.data : s))
    }
  }

  // ===== STAFF ASSIGNMENT =====
  function openStaffAssign(s: any) {
    setStaffModal(s)
    setSelectedStaffIds(s.staff_ids || [])
  }

  async function saveStaffAssignment() {
    if (!staffModal) return
    setSaving(true)
    const res = await assignStaffToService(staffModal.id, selectedStaffIds)
    setSaving(false)
    if (res.data) {
      setSuccess('Staff assignment updated')
      setStaffModal(null)
      fetchAll()
    } else {
      setError(res.error || 'Failed to assign staff')
    }
  }

  function toggleStaffSelection(staffId: number) {
    setSelectedStaffIds(prev =>
      prev.includes(staffId) ? prev.filter(id => id !== staffId) : [...prev, staffId]
    )
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Services &amp; Pricing</h1>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Service</button>
      </div>

      {error && <div className="card" style={{ background: '#fef2f2', color: '#991b1b', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {error} <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}
      {success && <div className="card" style={{ background: '#f0fdf4', color: '#166534', marginBottom: '1rem', padding: '0.75rem 1rem' }}>
        {success} <button onClick={() => setSuccess('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>×</button>
      </div>}

      {services.length === 0 ? (
        <div className="empty-state">No services yet. Click &quot;+ Add Service&quot; to create one.</div>
      ) : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Service</th><th>Category</th><th>Duration</th><th>Price</th><th>Payment</th><th>Deposit</th><th>Staff</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {services.map(s => (
                <tr key={s.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{s.name}</div>
                    {s.description && <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: 200 }}>{s.description.substring(0, 80)}{s.description.length > 80 ? '…' : ''}</div>}
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{s.category || '—'}</td>
                  <td>{s.duration_minutes} min</td>
                  <td style={{ fontWeight: 600 }}>{poundsToDisplay(s.price)}</td>
                  <td><span className={`badge ${s.payment_type === 'deposit' ? 'badge-warning' : s.payment_type === 'free' ? 'badge-info' : 'badge-success'}`}>{paymentLabel(s)}</span></td>
                  <td style={{ fontSize: '0.85rem' }}>{depositDisplay(s)}</td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => openStaffAssign(s)} style={{ fontSize: '0.8rem' }}>
                      {(s.staff_ids?.length || 0) > 0 ? `${s.staff_ids.length} assigned` : 'Assign'}
                    </button>
                  </td>
                  <td><span className={`badge ${(s.active || s.is_active) ? 'badge-success' : 'badge-neutral'}`}>{(s.active || s.is_active) ? 'Active' : 'Inactive'}</span></td>
                  <td style={{ whiteSpace: 'nowrap' }}>
                    <button className="btn btn-outline btn-sm" onClick={() => openEdit(s)}>Edit</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => toggleActive(s.id, s.active || s.is_active)} style={{ marginLeft: 4 }}>{(s.active || s.is_active) ? 'Disable' : 'Enable'}</button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(s.id, s.name)} style={{ marginLeft: 4, color: 'var(--color-danger)' }}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ===== CREATE / EDIT MODAL ===== */}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 560, width: '100%', padding: '2rem', position: 'relative', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => { setEditing(null); setCreating(false) }} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <h2 style={{ marginBottom: '1rem' }}>{creating ? 'New Service' : 'Edit Service'}</h2>
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              <div><label>Name *</label><input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="e.g. 1:1 Mindfulness Session" /></div>
              <div><label>Description</label><textarea rows={2} value={editing.description || ''} onChange={e => setEditing({ ...editing, description: e.target.value })} placeholder="Brief description of the service" /></div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label>Category</label><input value={editing.category || ''} onChange={e => setEditing({ ...editing, category: e.target.value })} placeholder="e.g. Mindfulness, Group" /></div>
                <div><label>Duration (min)</label><input type="number" min="1" value={editing.duration_minutes} onChange={e => setEditing({ ...editing, duration_minutes: +e.target.value })} /></div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label>Price (£)</label><input type="number" step="0.01" min="0" value={priceInput} onChange={e => setPriceInput(e.target.value)} placeholder="0.00" /></div>
                <div>
                  <label>Payment Type</label>
                  <select value={editing.payment_type || 'full'} onChange={e => setEditing({ ...editing, payment_type: e.target.value })}>
                    <option value="full">Full Payment</option>
                    <option value="deposit">Deposit Required</option>
                    <option value="free">Free / No Payment</option>
                  </select>
                </div>
              </div>

              {editing.payment_type === 'deposit' && (
                <div>
                  <label style={{ marginBottom: 6, display: 'block' }}>Deposit Amount</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <button type="button" className={`btn btn-sm ${depositMode === 'fixed' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDepositMode('fixed')}>£ Fixed</button>
                    <button type="button" className={`btn btn-sm ${depositMode === 'percent' ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDepositMode('percent')}>% Percentage</button>
                  </div>
                  {depositMode === 'fixed' ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontWeight: 600 }}>£</span>
                      <input type="number" step="0.01" min="0" value={depositInput} onChange={e => setDepositInput(e.target.value)} placeholder="0.00" style={{ flex: 1 }} />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="number" min="0" max="100" value={depositInput} onChange={e => setDepositInput(e.target.value)} placeholder="50" style={{ flex: 1 }} />
                      <span style={{ fontWeight: 600 }}>%</span>
                      {priceInput && depositInput && (
                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                          = {formatPrice(Math.round(poundsToPence(priceInput) * parseInt(depositInput || '0', 10) / 100))}
                        </span>
                      )}
                    </div>
                  )}
                  {depositMode === 'fixed' && priceInput && depositInput && poundsToPence(priceInput) > 0 && (
                    <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: 4 }}>
                      = {Math.round(poundsToPence(depositInput) / poundsToPence(priceInput) * 100)}% of price
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                <div><label>Sort Order</label><input type="number" value={editing.sort_order || 0} onChange={e => setEditing({ ...editing, sort_order: +e.target.value })} /></div>
                <div><label>Colour</label><input type="color" value={editing.colour || '#4f46e5'} onChange={e => setEditing({ ...editing, colour: e.target.value })} style={{ height: 38, padding: 2 }} /></div>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-outline" onClick={() => { setEditing(null); setCreating(false) }}>Cancel</button>
                <button className="btn btn-primary" onClick={saveService} disabled={saving || !editing.name}>{saving ? 'Saving…' : creating ? 'Create Service' : 'Save Changes'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== STAFF ASSIGNMENT MODAL ===== */}
      {staffModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div className="card" style={{ maxWidth: 480, width: '100%', padding: '2rem', position: 'relative' }} onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setStaffModal(null)} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            <h2 style={{ marginBottom: '0.5rem' }}>Assign Staff to: {staffModal.name}</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>Select which staff members can deliver this service.</p>

            {allStaff.length === 0 ? (
              <div className="empty-state">No staff members found. Add staff first.</div>
            ) : (
              <div style={{ display: 'grid', gap: '0.5rem', maxHeight: 300, overflowY: 'auto' }}>
                {allStaff.map((st: any) => (
                  <label key={st.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 0.75rem', borderRadius: 'var(--radius)', cursor: 'pointer', background: selectedStaffIds.includes(st.id) ? 'var(--color-primary-light)' : 'transparent', border: '1px solid var(--color-border)' }}>
                    <input type="checkbox" checked={selectedStaffIds.includes(st.id)} onChange={() => toggleStaffSelection(st.id)} style={{ width: 'auto' }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{st.name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>{st.email}</div>
                    </div>
                  </label>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setStaffModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveStaffAssignment} disabled={saving}>{saving ? 'Saving…' : 'Save Assignment'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
