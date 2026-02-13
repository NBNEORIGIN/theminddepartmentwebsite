'use client'

import React, { useEffect, useState } from 'react'
import { getStaffList, getShifts, getLeaveRequests, getTrainingRecords, createStaff, updateStaff, deleteStaff, createShift, updateShift, deleteShift, getWorkingHours, bulkSetWorkingHours, getTimesheets, updateTimesheet, generateTimesheets, getLeaveRequestsAvail, createLeaveRequestAvail, approveLeaveRequest, rejectLeaveRequest, cancelLeaveRequest } from '@/lib/api'

const C = {
  green: '#22c55e', amber: '#f59e0b', red: '#ef4444', blue: '#3b82f6',
  bg: '#0f172a', card: '#1e293b', cardAlt: '#334155', text: '#f8fafc', muted: '#94a3b8',
  border: '#475569', accent: '#6366f1', surface: '#1e293b',
}

interface StaffForm {
  first_name: string
  last_name: string
  email: string
  phone: string
  role: string
}

const emptyForm: StaffForm = { first_name: '', last_name: '', email: '', phone: '', role: 'staff' }

export default function AdminStaffPage() {
  const [tab, setTab] = useState<'profiles' | 'hours' | 'timesheets' | 'shifts' | 'leave' | 'training'>('profiles')
  const [staff, setStaff] = useState<any[]>([])
  const [shifts, setShifts] = useState<any[]>([])
  const [leave, setLeave] = useState<any[]>([])
  const [training, setTraining] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [showAddModal, setShowAddModal] = useState(false)
  const [editingStaff, setEditingStaff] = useState<any | null>(null)
  const [form, setForm] = useState<StaffForm>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdCreds, setCreatedCreds] = useState<{ name: string; username: string; email: string; temp_password: string } | null>(null)

  // Shift modal state
  const [showShiftModal, setShowShiftModal] = useState(false)
  const [editingShift, setEditingShift] = useState<any | null>(null)
  const [shiftSegments, setShiftSegments] = useState<{ start_time: string; end_time: string }[]>([{ start_time: '09:00', end_time: '17:00' }])
  const [shiftForm, setShiftForm] = useState({ staff: '', date: '', location: '', notes: '', is_published: true })
  const [shiftSaving, setShiftSaving] = useState(false)
  const [shiftError, setShiftError] = useState('')

  // Working Hours state
  const [workingHours, setWorkingHours] = useState<any[]>([])
  const [whStaffId, setWhStaffId] = useState<number | null>(null)
  const [whGrid, setWhGrid] = useState<Record<number, { start_time: string; end_time: string; break_minutes: number }[]>>({})
  const [whSaving, setWhSaving] = useState(false)

  // Timesheet state
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [tsDateFrom, setTsDateFrom] = useState('')
  const [tsDateTo, setTsDateTo] = useState('')
  const [tsStaffFilter, setTsStaffFilter] = useState('')
  const [tsGenerating, setTsGenerating] = useState(false)
  const [editingTs, setEditingTs] = useState<any | null>(null)
  const [tsForm, setTsForm] = useState({ actual_start: '', actual_end: '', actual_break_minutes: 0, status: '', notes: '' })
  const [tsSaving, setTsSaving] = useState(false)

  // Leave calendar state
  const [leaveCalData, setLeaveCalData] = useState<any[]>([])
  const [leaveCalYear, setLeaveCalYear] = useState(new Date().getFullYear())
  const [showLeaveForm, setShowLeaveForm] = useState(false)
  const [leaveForm, setLeaveForm] = useState({ staff_member: '', leave_type: 'ANNUAL', start_date: '', end_date: '', reason: '' })
  const [leaveSaving, setLeaveSaving] = useState(false)
  const [leaveError, setLeaveError] = useState('')

  const loadLeaveCalendar = async (year?: number) => {
    const y = year || leaveCalYear
    const res = await getLeaveRequestsAvail({ date_from: `${y}-01-01`, date_to: `${y}-12-31` })
    if (res.data) setLeaveCalData(res.data)
  }

  const handleRequestLeave = async () => {
    setLeaveError('')
    if (!leaveForm.staff_member || !leaveForm.start_date || !leaveForm.end_date) { setLeaveError('Staff, start and end dates are required.'); return }
    setLeaveSaving(true)
    const res = await createLeaveRequestAvail({
      staff_member: Number(leaveForm.staff_member),
      leave_type: leaveForm.leave_type,
      start_datetime: `${leaveForm.start_date}T00:00:00Z`,
      end_datetime: `${leaveForm.end_date}T23:59:00Z`,
      reason: leaveForm.reason,
    })
    if (res.error) { setLeaveError(res.error); setLeaveSaving(false); return }
    setLeaveSaving(false)
    setShowLeaveForm(false)
    setLeaveForm({ staff_member: '', leave_type: 'ANNUAL', start_date: '', end_date: '', reason: '' })
    loadLeaveCalendar()
    loadData()
  }

  const handleLeaveAction = async (id: number, action: 'approve' | 'reject' | 'cancel') => {
    if (action === 'approve') await approveLeaveRequest(id)
    else if (action === 'reject') await rejectLeaveRequest(id)
    else await cancelLeaveRequest(id)
    loadLeaveCalendar()
    loadData()
  }

  const loadData = () => {
    setLoading(true)
    Promise.all([getStaffList(), getShifts(), getLeaveRequests(), getTrainingRecords()]).then(([s, sh, lv, tr]) => {
      setStaff(s.data || [])
      setShifts(sh.data || [])
      setLeave(lv.data || [])
      setTraining(tr.data || [])
      setLoading(false)
    })
  }

  useEffect(() => { loadData() }, [])

  const openAdd = () => {
    setForm(emptyForm)
    setError('')
    setEditingStaff(null)
    setShowAddModal(true)
  }

  const openEdit = (s: any) => {
    const nameParts = (s.display_name || s.name || '').split(' ')
    setForm({
      first_name: nameParts[0] || '',
      last_name: nameParts.slice(1).join(' ') || '',
      email: s.email || '',
      phone: s.phone || '',
      role: s.role || 'staff',
    })
    setError('')
    setEditingStaff(s)
    setShowAddModal(true)
  }

  const handleAuthError = (res: { error: string | null; status: number }) => {
    if (res.status === 401 || res.error?.toLowerCase().includes('inactive') || res.error?.toLowerCase().includes('expired')) {
      window.location.href = '/login'
      return true
    }
    return false
  }

  const handleSave = async () => {
    setError('')
    if (!form.first_name.trim() || !form.last_name.trim()) { setError('First and last name are required.'); return }
    if (!form.email.trim()) { setError('Email is required.'); return }
    setSaving(true)
    if (editingStaff) {
      const res = await updateStaff(editingStaff.id, form)
      if (res.error) { if (handleAuthError(res)) return; setError(res.error); setSaving(false); return }
    } else {
      const res = await createStaff(form)
      if (res.error) { if (handleAuthError(res)) return; setError(res.error); setSaving(false); return }
      // Show temp credentials to admin
      if (res.data) {
        setCreatedCreds({
          name: `${form.first_name} ${form.last_name}`,
          username: res.data.username || form.email.split('@')[0],
          email: form.email,
          temp_password: res.data.temp_password || '',
        })
      }
    }
    setSaving(false)
    setShowAddModal(false)
    loadData()
  }

  const handleDelete = async (s: any) => {
    if (!confirm(`Deactivate ${s.display_name || s.name}? They will no longer be able to log in.`)) return
    const res = await deleteStaff(s.id)
    if (res.error) { alert(res.error); return }
    loadData()
  }

  // --- Shift handlers ---
  const today = new Date().toISOString().split('T')[0]

  const openAddShift = () => {
    setShiftForm({ staff: staff.length > 0 ? String(staff[0].id) : '', date: today, location: '', notes: '', is_published: true })
    setShiftSegments([{ start_time: '09:00', end_time: '17:00' }])
    setShiftError('')
    setEditingShift(null)
    setShowShiftModal(true)
  }

  const openEditShift = (s: any) => {
    setShiftForm({ staff: String(s.staff), date: s.date, location: s.location || '', notes: s.notes || '', is_published: s.is_published })
    setShiftSegments([{ start_time: s.start_time?.slice(0, 5) || '09:00', end_time: s.end_time?.slice(0, 5) || '17:00' }])
    setShiftError('')
    setEditingShift(s)
    setShowShiftModal(true)
  }

  const addSegment = () => setShiftSegments(prev => [...prev, { start_time: '13:00', end_time: '17:00' }])
  const removeSegment = (i: number) => setShiftSegments(prev => prev.filter((_, idx) => idx !== i))
  const updateSegment = (i: number, field: string, val: string) => {
    setShiftSegments(prev => prev.map((seg, idx) => idx === i ? { ...seg, [field]: val } : seg))
  }

  const handleSaveShift = async () => {
    setShiftError('')
    if (!shiftForm.staff) { setShiftError('Select a staff member.'); return }
    if (!shiftForm.date) { setShiftError('Date is required.'); return }
    for (const seg of shiftSegments) {
      if (!seg.start_time || !seg.end_time) { setShiftError('All segments need start and end times.'); return }
      if (seg.start_time >= seg.end_time) { setShiftError('End time must be after start time for each segment.'); return }
    }
    setShiftSaving(true)
    if (editingShift) {
      // Update single shift
      const seg = shiftSegments[0]
      const res = await updateShift(editingShift.id, { ...shiftForm, staff: Number(shiftForm.staff), start_time: seg.start_time, end_time: seg.end_time })
      if (res.error) { setShiftError(res.error); setShiftSaving(false); return }
    } else {
      // Create one shift per segment (split shift support)
      for (const seg of shiftSegments) {
        const res = await createShift({ ...shiftForm, staff: Number(shiftForm.staff), start_time: seg.start_time, end_time: seg.end_time })
        if (res.error) { setShiftError(res.error); setShiftSaving(false); return }
      }
    }
    setShiftSaving(false)
    setShowShiftModal(false)
    loadData()
  }

  const handleDeleteShift = async (s: any) => {
    if (!confirm(`Delete shift for ${s.staff_name} on ${s.date}?`)) return
    const res = await deleteShift(s.id)
    if (res.error) { alert(res.error); return }
    loadData()
  }

  // --- Working Hours handlers ---
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const defaultSeg = { start_time: '09:00', end_time: '17:00', break_minutes: 0 }

  const loadWorkingHours = async (staffId: number) => {
    setWhStaffId(staffId)
    const res = await getWorkingHours({ staff_id: staffId })
    const entries = res.data || []
    const grid: Record<number, { start_time: string; end_time: string; break_minutes: number }[]> = {}
    for (let d = 0; d < 7; d++) grid[d] = []
    for (const e of entries) {
      grid[e.day_of_week].push({ start_time: e.start_time?.slice(0, 5) || '09:00', end_time: e.end_time?.slice(0, 5) || '17:00', break_minutes: e.break_minutes || 0 })
    }
    setWhGrid(grid)
    setWorkingHours(entries)
  }

  const saveWorkingHours = async () => {
    if (!whStaffId) return
    setWhSaving(true)
    const hours: any[] = []
    for (let d = 0; d < 7; d++) {
      for (const seg of (whGrid[d] || [])) {
        hours.push({ day_of_week: d, start_time: seg.start_time, end_time: seg.end_time, break_minutes: seg.break_minutes })
      }
    }
    const res = await bulkSetWorkingHours(whStaffId, hours)
    if (res.error) alert(res.error)
    else alert('Working hours saved.')
    setWhSaving(false)
  }

  const addWhSegment = (day: number) => {
    setWhGrid(prev => ({ ...prev, [day]: [...(prev[day] || []), { ...defaultSeg }] }))
  }
  const removeWhSegment = (day: number, idx: number) => {
    setWhGrid(prev => ({ ...prev, [day]: (prev[day] || []).filter((_, i) => i !== idx) }))
  }
  const updateWhSegment = (day: number, idx: number, field: string, val: any) => {
    setWhGrid(prev => ({ ...prev, [day]: (prev[day] || []).map((seg, i) => i === idx ? { ...seg, [field]: val } : seg) }))
  }

  const calcSegHours = (seg: { start_time: string; end_time: string; break_minutes: number }) => {
    const [sh, sm] = seg.start_time.split(':').map(Number)
    const [eh, em] = seg.end_time.split(':').map(Number)
    return Math.max(0, (eh * 60 + em - sh * 60 - sm - seg.break_minutes) / 60)
  }
  const calcDayHours = (segs: { start_time: string; end_time: string; break_minutes: number }[]) =>
    segs.reduce((sum, seg) => sum + calcSegHours(seg), 0)
  const calcWeeklyHours = () =>
    DAYS.reduce((sum, _, d) => sum + calcDayHours(whGrid[d] || []), 0)

  // --- Timesheet handlers ---
  const initTsDates = () => {
    const now = new Date()
    const mon = new Date(now)
    mon.setDate(now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1))
    const sun = new Date(mon)
    sun.setDate(mon.getDate() + 6)
    return { from: mon.toISOString().split('T')[0], to: sun.toISOString().split('T')[0] }
  }

  const loadTimesheets = async (from?: string, to?: string, staffId?: string) => {
    const dates = initTsDates()
    const df = from || tsDateFrom || dates.from
    const dt = to || tsDateTo || dates.to
    if (!tsDateFrom) setTsDateFrom(df)
    if (!tsDateTo) setTsDateTo(dt)
    const params: any = { date_from: df, date_to: dt }
    if (staffId || tsStaffFilter) params.staff_id = Number(staffId || tsStaffFilter)
    const res = await getTimesheets(params)
    setTimesheets(res.data || [])
  }

  const handleGenerateTimesheets = async () => {
    if (!tsDateFrom || !tsDateTo) { alert('Set date range first.'); return }
    setTsGenerating(true)
    const data: any = { date_from: tsDateFrom, date_to: tsDateTo }
    if (tsStaffFilter) data.staff_id = Number(tsStaffFilter)
    const res = await generateTimesheets(data)
    if (res.error) alert(res.error)
    else alert(res.data?.detail || 'Timesheets generated.')
    setTsGenerating(false)
    loadTimesheets()
  }

  const openEditTs = (ts: any) => {
    setEditingTs(ts)
    setTsForm({
      actual_start: (ts.actual_start || ts.scheduled_start || '').slice(11, 16) || '',
      actual_end: (ts.actual_end || ts.scheduled_end || '').slice(11, 16) || '',
      actual_break_minutes: ts.actual_break_minutes ?? ts.scheduled_break_minutes ?? 0,
      status: ts.status || 'SCHEDULED',
      notes: ts.notes || '',
    })
  }

  const saveTs = async () => {
    if (!editingTs) return
    setTsSaving(true)
    const res = await updateTimesheet(editingTs.id, tsForm)
    if (res.error) alert(res.error)
    setTsSaving(false)
    setEditingTs(null)
    loadTimesheets()
  }

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: C.muted }}><div style={{ textAlign: 'center' }}><div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div><div>Loading staff data…</div></div></div>

  const tabLabels: Record<string, string> = { profiles: 'Profiles', hours: 'Working Hours', timesheets: 'Timesheets', shifts: 'Shifts', leave: 'Leave', training: 'Training' }

  const selectFix = { WebkitTextFillColor: C.text, opacity: 1 } as React.CSSProperties
  const inputStyle: React.CSSProperties = { width: '100%', padding: '0.4rem 0.5rem', borderRadius: 6, border: `1px solid ${C.border}`, background: C.bg, color: C.text, fontSize: '0.85rem', colorScheme: 'dark', ...selectFix }
  const labelStyle: React.CSSProperties = { fontSize: '0.8rem', color: C.muted, marginBottom: 2, display: 'block' }
  const btnStyle: React.CSSProperties = { padding: '0.45rem 1rem', borderRadius: 8, border: 'none', fontWeight: 600, cursor: 'pointer', fontSize: '0.85rem', transition: 'opacity 0.15s' }
  const btnPrimary: React.CSSProperties = { ...btnStyle, background: C.accent, color: '#fff' }
  const btnDanger: React.CSSProperties = { ...btnStyle, background: C.red, color: '#fff' }
  const btnGhost: React.CSSProperties = { ...btnStyle, background: 'transparent', border: `1px solid ${C.border}`, color: C.muted }
  const btnSm: React.CSSProperties = { padding: '0.3rem 0.7rem', fontSize: '0.75rem' }
  const thStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: C.muted, borderBottom: `1px solid ${C.border}`, fontWeight: 600 }
  const tdStyle: React.CSSProperties = { padding: '0.5rem 0.75rem', borderBottom: `1px solid ${C.border}30`, fontSize: '0.85rem', color: C.text }
  const badgeStyle = (color: string): React.CSSProperties => ({ padding: '2px 8px', borderRadius: 6, fontSize: '0.65rem', fontWeight: 700, background: color + '25', color })
  const emptyStyle: React.CSSProperties = { textAlign: 'center', padding: '2rem', color: C.muted, fontSize: '0.85rem' }

  return (
    <div style={{ color: C.text, maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 800, color: C.text }}>Staff Management</h1>
          <div style={{ fontSize: '0.75rem', color: C.muted }}>Profiles, availability, shifts &amp; timesheets</div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '0.25rem', marginBottom: '1.25rem', overflowX: 'auto', borderBottom: `2px solid ${C.border}30`, paddingBottom: '0.5rem' }}>
        {(['profiles', 'hours', 'timesheets', 'shifts', 'leave', 'training'] as const).map(t => (
          <button key={t} onClick={() => { setTab(t); if (t === 'timesheets' && timesheets.length === 0) loadTimesheets(); if (t === 'leave' && leaveCalData.length === 0) loadLeaveCalendar() }} style={{
            padding: '0.5rem 1rem', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer',
            background: tab === t ? C.accent : 'transparent', color: tab === t ? '#fff' : C.muted,
            fontWeight: tab === t ? 700 : 500, fontSize: '0.85rem', transition: 'all 0.15s', whiteSpace: 'nowrap',
          }}>{tabLabels[t]}</button>
        ))}
      </div>

      {tab === 'profiles' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button style={btnPrimary} onClick={openAdd}>+ Add Staff Member</button>
          </div>
          <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}>Name</th><th style={thStyle}>Role</th><th style={thStyle}>Email</th><th style={thStyle}>Phone</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>
                {staff.map((s: any) => (
                  <tr key={s.id} onMouseEnter={e => (e.currentTarget.style.background = C.cardAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s.display_name || s.name}</td>
                    <td style={tdStyle}>{s.role || '—'}</td>
                    <td style={tdStyle}>{s.email}</td>
                    <td style={tdStyle}>{s.phone || '—'}</td>
                    <td style={tdStyle}><span style={badgeStyle((s.is_active ?? s.active) ? C.green : C.muted)}>{(s.is_active ?? s.active) ? 'Active' : 'Inactive'}</span></td>
                    <td style={tdStyle}>
                      <button style={{ ...btnGhost, ...btnSm, marginRight: 8 }} onClick={() => openEdit(s)}>Edit</button>
                      {(s.is_active ?? s.active) && <button style={{ ...btnDanger, ...btnSm }} onClick={() => handleDelete(s)}>Deactivate</button>}
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && <tr><td colSpan={6} style={emptyStyle}>No staff profiles</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'hours' && (
        <div style={{ maxWidth: 780 }}>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Select Staff Member</label>
            <select style={{ ...inputStyle, maxWidth: 300 }} value={whStaffId || ''} onChange={e => { const id = Number(e.target.value); if (id) loadWorkingHours(id) }}>
              <option value="" style={{ background: C.bg, color: C.text }}>Choose staff…</option>
              {staff.map((s: any) => <option key={s.id} value={s.id} style={{ background: C.bg, color: C.text }}>{s.display_name || s.name}</option>)}
            </select>
          </div>
          {whStaffId && (
            <>
              <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead><tr><th style={thStyle}>Day</th><th style={thStyle}>Start</th><th style={thStyle}>End</th><th style={thStyle}>Break (min)</th><th style={thStyle}>Hours</th><th style={thStyle}></th></tr></thead>
                  <tbody>
                    {DAYS.map((dayName, d) => {
                      const segs = whGrid[d] || []
                      const dayHrs = calcDayHours(segs)
                      return (
                        <React.Fragment key={d}>
                          {segs.length === 0 ? (
                            <tr style={{ opacity: 0.45 }}>
                              <td style={{ ...tdStyle, fontWeight: 600 }}>{dayName}</td>
                              <td colSpan={3} style={{ ...tdStyle, color: C.muted, fontSize: '0.85rem' }}>Day off</td>
                              <td style={tdStyle}>—</td>
                              <td style={tdStyle}><button style={{ ...btnGhost, ...btnSm }} onClick={() => addWhSegment(d)}>+ Add</button></td>
                            </tr>
                          ) : (
                            segs.map((seg, i) => (
                              <tr key={`${d}-${i}`}>
                                <td style={{ ...tdStyle, fontWeight: 600 }}>{i === 0 ? dayName : ''}{segs.length > 1 && <span style={{ fontSize: '0.7rem', color: C.muted, marginLeft: 4 }}>{i === 0 ? '' : `#${i + 1}`}</span>}</td>
                                <td style={tdStyle}><input type="time" value={seg.start_time} onChange={e => updateWhSegment(d, i, 'start_time', e.target.value)} style={{ ...inputStyle, width: 120 }} /></td>
                                <td style={tdStyle}><input type="time" value={seg.end_time} onChange={e => updateWhSegment(d, i, 'end_time', e.target.value)} style={{ ...inputStyle, width: 120 }} /></td>
                                <td style={tdStyle}><input type="number" value={seg.break_minutes} onChange={e => updateWhSegment(d, i, 'break_minutes', Number(e.target.value))} style={{ ...inputStyle, width: 80 }} min={0} /></td>
                                <td style={tdStyle}>{i === 0 ? `${dayHrs.toFixed(1)}h` : ''}</td>
                                <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                                  {i === 0 && <button style={{ ...btnGhost, ...btnSm, marginRight: 4 }} onClick={() => addWhSegment(d)} title="Add split shift">+ Split</button>}
                                  <button style={{ ...btnDanger, ...btnSm }} onClick={() => removeWhSegment(d, i)} title="Remove this segment">×</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: C.muted }}>
                  Weekly total: {calcWeeklyHours().toFixed(1)}h
                </span>
                <button style={btnPrimary} onClick={saveWorkingHours} disabled={whSaving}>{whSaving ? 'Saving…' : 'Save Working Hours'}</button>
              </div>
            </>
          )}
          {!whStaffId && <div style={emptyStyle}>Select a staff member to set their working hours</div>}
        </div>
      )}

      {tab === 'timesheets' && (() => {
        const tsTotals = timesheets.reduce((acc: any, ts: any) => {
          acc.scheduled += ts.scheduled_hours || 0
          acc.actual += ts.actual_hours || 0
          acc.count += 1
          if (ts.status === 'APPROVED' || ts.status === 'WORKED' || ts.actual_start) acc.worked += 1
          if (ts.status === 'ABSENT') acc.absent += 1
          if (ts.status === 'SICK') acc.sick += 1
          return acc
        }, { scheduled: 0, actual: 0, count: 0, worked: 0, absent: 0, sick: 0 })
        const tsVariance = tsTotals.actual - tsTotals.scheduled

        return (
        <>
          {/* KPI Summary */}
          {timesheets.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.6rem', marginBottom: '1rem' }}>
              {[
                { label: 'Scheduled Hrs', value: `${tsTotals.scheduled.toFixed(1)}h`, color: C.accent },
                { label: 'Actual Hrs', value: `${tsTotals.actual.toFixed(1)}h`, color: C.green },
                { label: 'Variance', value: `${tsVariance > 0 ? '+' : ''}${tsVariance.toFixed(1)}h`, color: tsVariance < 0 ? C.red : tsVariance > 0 ? C.green : C.muted },
                { label: 'Entries', value: String(tsTotals.count), color: C.muted },
                { label: 'Days Worked', value: String(tsTotals.worked), color: C.green },
                { label: 'Absent / Sick', value: String(tsTotals.absent + tsTotals.sick), color: tsTotals.absent + tsTotals.sick > 0 ? C.red : C.muted },
              ].map(k => (
                <div key={k.label} style={{ background: C.card, borderRadius: 10, padding: '0.75rem', textAlign: 'center' }}>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: k.color }}>{k.value}</div>
                  <div style={{ fontSize: '0.65rem', color: C.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end', marginBottom: 16 }}>
            <div>
              <label style={labelStyle}>From</label>
              <input type="date" value={tsDateFrom} onChange={e => setTsDateFrom(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>To</label>
              <input type="date" value={tsDateTo} onChange={e => setTsDateTo(e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Staff</label>
              <select style={inputStyle} value={tsStaffFilter} onChange={e => setTsStaffFilter(e.target.value)}>
                <option value="" style={{ background: C.bg, color: C.text }}>All Staff</option>
                {staff.map((s: any) => <option key={s.id} value={s.id} style={{ background: C.bg, color: C.text }}>{s.display_name || s.name}</option>)}
              </select>
            </div>
            <button style={{ ...btnPrimary, ...btnSm }} onClick={() => loadTimesheets()}>Load</button>
            <button style={{ ...btnGhost, ...btnSm }} onClick={handleGenerateTimesheets} disabled={tsGenerating} title="Auto-populate from working hours">{tsGenerating ? 'Generating…' : 'Generate from Hours'}</button>
          </div>

          {editingTs && (
            <div style={{ background: C.cardAlt, borderRadius: 12, padding: '1rem', marginBottom: 16 }}>
              <h3 style={{ marginBottom: 8, color: C.text, fontSize: '0.95rem' }}>Edit: {editingTs.staff_name} — {editingTs.date}</h3>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div>
                  <label style={labelStyle}>Actual Start</label>
                  <input type="time" value={tsForm.actual_start} onChange={e => setTsForm({ ...tsForm, actual_start: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Actual End</label>
                  <input type="time" value={tsForm.actual_end} onChange={e => setTsForm({ ...tsForm, actual_end: e.target.value })} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Break (min)</label>
                  <input type="number" value={tsForm.actual_break_minutes} onChange={e => setTsForm({ ...tsForm, actual_break_minutes: Number(e.target.value) })} min={0} style={{ ...inputStyle, width: 80 }} />
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={tsForm.status} onChange={e => setTsForm({ ...tsForm, status: e.target.value })}>
                    <option value="SCHEDULED" style={{ background: C.bg, color: C.text }}>Scheduled</option>
                    <option value="WORKED" style={{ background: C.bg, color: C.text }}>Worked</option>
                    <option value="LATE" style={{ background: C.bg, color: C.text }}>Late Arrival</option>
                    <option value="LEFT_EARLY" style={{ background: C.bg, color: C.text }}>Left Early</option>
                    <option value="ABSENT" style={{ background: C.bg, color: C.text }}>Absent</option>
                    <option value="SICK" style={{ background: C.bg, color: C.text }}>Sick</option>
                    <option value="HOLIDAY" style={{ background: C.bg, color: C.text }}>Holiday</option>
                    <option value="AMENDED" style={{ background: C.bg, color: C.text }}>Amended</option>
                  </select>
                </div>
                <div style={{ flex: 1, minWidth: 150 }}>
                  <label style={labelStyle}>Notes</label>
                  <input value={tsForm.notes} onChange={e => setTsForm({ ...tsForm, notes: e.target.value })} placeholder="e.g. Left 30min early" style={inputStyle} />
                </div>
                <button style={{ ...btnPrimary, ...btnSm }} onClick={saveTs} disabled={tsSaving}>{tsSaving ? '…' : 'Save'}</button>
                <button style={{ ...btnGhost, ...btnSm }} onClick={() => setEditingTs(null)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{ background: C.card, borderRadius: 12, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 900 }}>
              <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Staff</th><th style={thStyle}>Sched. Start</th><th style={thStyle}>Sched. End</th><th style={thStyle}>Sched. Hrs</th><th style={thStyle}>Actual Start</th><th style={thStyle}>Actual End</th><th style={thStyle}>Actual Hrs</th><th style={thStyle}>Variance</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>
                {timesheets.map((ts: any) => {
                  const variance = ts.variance != null ? ts.variance : 0
                  const fmtTime = (v: string | null) => v ? v.slice(11, 16) || v.slice(0, 5) : '—'
                  const statusColor: Record<string, string> = { WORKED: C.green, DRAFT: C.muted, SCHEDULED: C.muted, SUBMITTED: C.amber, APPROVED: C.green, LATE: C.amber, LEFT_EARLY: C.amber, ABSENT: C.red, SICK: C.red, HOLIDAY: C.blue, AMENDED: C.blue }
                  return (
                    <tr key={ts.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{ts.date}</td>
                      <td style={tdStyle}>{ts.staff_name}</td>
                      <td style={tdStyle}>{fmtTime(ts.scheduled_start)}</td>
                      <td style={tdStyle}>{fmtTime(ts.scheduled_end)}</td>
                      <td style={tdStyle}>{ts.scheduled_hours ? `${Number(ts.scheduled_hours).toFixed(1)}h` : '—'}</td>
                      <td style={tdStyle}>{fmtTime(ts.actual_start)}</td>
                      <td style={tdStyle}>{fmtTime(ts.actual_end)}</td>
                      <td style={tdStyle}>{ts.actual_hours ? `${Number(ts.actual_hours).toFixed(1)}h` : '—'}</td>
                      <td style={{ ...tdStyle, color: variance < 0 ? C.red : variance > 0 ? C.green : C.muted, fontWeight: variance !== 0 ? 600 : 400 }}>{variance !== 0 ? `${variance > 0 ? '+' : ''}${variance.toFixed(1)}h` : '—'}</td>
                      <td style={tdStyle}><span style={badgeStyle(statusColor[ts.status] || C.muted)}>{ts.status_display || ts.status}</span></td>
                      <td style={tdStyle}><button style={{ ...btnGhost, ...btnSm }} onClick={() => openEditTs(ts)}>Edit</button></td>
                    </tr>
                  )
                })}
                {timesheets.length === 0 && <tr><td colSpan={11} style={emptyStyle}>No timesheet entries. Set working hours first, then click &quot;Generate from Hours&quot;.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
        )
      })()}

      {tab === 'shifts' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button style={btnPrimary} onClick={openAddShift}>+ Add Shift</button>
          </div>
          <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr><th style={thStyle}>Date</th><th style={thStyle}>Staff</th><th style={thStyle}>Start</th><th style={thStyle}>End</th><th style={thStyle}>Hours</th><th style={thStyle}>Location</th><th style={thStyle}>Published</th><th style={thStyle}>Actions</th></tr></thead>
              <tbody>
                {shifts.map((s: any) => (
                  <tr key={s.id} onMouseEnter={e => (e.currentTarget.style.background = C.cardAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ ...tdStyle, fontWeight: 600 }}>{s.date}</td>
                    <td style={tdStyle}>{s.staff_name}</td>
                    <td style={tdStyle}>{s.start_time?.slice(0, 5)}</td>
                    <td style={tdStyle}>{s.end_time?.slice(0, 5)}</td>
                    <td style={tdStyle}>{s.duration_hours ? `${Number(s.duration_hours).toFixed(1)}h` : '—'}</td>
                    <td style={tdStyle}>{s.location || '—'}</td>
                    <td style={tdStyle}><span style={badgeStyle(s.is_published ? C.green : C.muted)}>{s.is_published ? 'Yes' : 'Draft'}</span></td>
                    <td style={tdStyle}>
                      <button style={{ ...btnGhost, ...btnSm, marginRight: 8 }} onClick={() => openEditShift(s)}>Edit</button>
                      <button style={{ ...btnDanger, ...btnSm }} onClick={() => handleDeleteShift(s)}>Delete</button>
                    </td>
                  </tr>
                ))}
                {shifts.length === 0 && <tr><td colSpan={8} style={emptyStyle}>No shifts assigned yet</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'leave' && (() => {
        const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const statusColor: Record<string,string> = { APPROVED: C.green, REQUESTED: C.amber, REJECTED: C.red, CANCELLED: C.muted }
        const typeLabel: Record<string,string> = { ANNUAL: 'Annual', SICK: 'Sick', UNPAID: 'Unpaid', OTHER: 'Other' }

        // Build a set of dates with leave per staff for the calendar
        const leaveDays: Record<string, { color: string; status: string; staffName: string; type: string }[]> = {}
        for (const lv of leaveCalData) {
          if (lv.status === 'CANCELLED' || lv.status === 'REJECTED') continue
          const s = new Date(lv.start_datetime)
          const e = new Date(lv.end_datetime)
          const cur = new Date(s); cur.setHours(0,0,0,0)
          const end = new Date(e); end.setHours(0,0,0,0)
          while (cur <= end) {
            const key = cur.toISOString().slice(0,10)
            if (!leaveDays[key]) leaveDays[key] = []
            leaveDays[key].push({ color: statusColor[lv.status] || C.muted, status: lv.status, staffName: lv.staff_name, type: lv.leave_type })
            cur.setDate(cur.getDate() + 1)
          }
        }

        return (
          <div>
            {/* Header: year nav + request button */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button style={{ ...btnGhost, ...btnSm }} onClick={() => { const y = leaveCalYear - 1; setLeaveCalYear(y); loadLeaveCalendar(y) }}>◀</button>
                <span style={{ fontWeight: 700, fontSize: '1.1rem' }}>{leaveCalYear}</span>
                <button style={{ ...btnGhost, ...btnSm }} onClick={() => { const y = leaveCalYear + 1; setLeaveCalYear(y); loadLeaveCalendar(y) }}>▶</button>
              </div>
              <button style={btnPrimary} onClick={() => setShowLeaveForm(true)}>+ Request Leave</button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.green }} />Approved</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.amber }} />Requested</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.7rem', color: C.muted }}><div style={{ width: 10, height: 10, borderRadius: 2, background: C.bg, border: `1px solid ${C.border}` }} />Available</div>
            </div>

            {/* Year calendar grid — 12 months */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
              {MONTHS.map((mName, mi) => {
                const firstDay = new Date(leaveCalYear, mi, 1)
                const daysInMonth = new Date(leaveCalYear, mi + 1, 0).getDate()
                const startDow = (firstDay.getDay() + 6) % 7 // Mon=0
                const cells: (number | null)[] = Array(startDow).fill(null)
                for (let d = 1; d <= daysInMonth; d++) cells.push(d)
                const today = new Date().toISOString().slice(0,10)

                return (
                  <div key={mi} style={{ background: C.card, borderRadius: 10, padding: '0.6rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: C.text, marginBottom: 4, textAlign: 'center' }}>{mName}</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
                      {['M','T','W','T','F','S','S'].map((d,i) => <div key={i} style={{ fontSize: '0.55rem', textAlign: 'center', color: C.muted, fontWeight: 600 }}>{d}</div>)}
                      {cells.map((day, ci) => {
                        if (day === null) return <div key={`e${ci}`} />
                        const dateStr = `${leaveCalYear}-${String(mi+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
                        const entries = leaveDays[dateStr] || []
                        const isToday = dateStr === today
                        const hasApproved = entries.some(e => e.status === 'APPROVED')
                        const hasRequested = entries.some(e => e.status === 'REQUESTED')
                        const bgColor = hasApproved ? C.green + '40' : hasRequested ? C.amber + '30' : 'transparent'
                        const dotColor = hasApproved ? C.green : hasRequested ? C.amber : ''
                        const title = entries.map(e => `${e.staffName} (${typeLabel[e.type] || e.type} - ${e.status})`).join('\n')

                        return (
                          <div key={dateStr} title={title} style={{
                            width: '100%', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.6rem', borderRadius: 3, background: bgColor,
                            color: isToday ? C.accent : entries.length > 0 ? C.text : C.muted,
                            fontWeight: isToday ? 800 : entries.length > 0 ? 600 : 400,
                            border: isToday ? `1px solid ${C.accent}` : 'none',
                            position: 'relative', cursor: entries.length > 0 ? 'help' : 'default',
                          }}>
                            {day}
                            {dotColor && <div style={{ position: 'absolute', bottom: 1, width: 3, height: 3, borderRadius: '50%', background: dotColor }} />}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Leave requests table */}
            <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '0.75rem 1rem', borderBottom: `1px solid ${C.border}30`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: C.text }}>Leave Requests — {leaveCalYear}</span>
                <span style={{ fontSize: '0.7rem', color: C.muted }}>{leaveCalData.length} total</span>
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr><th style={thStyle}>Staff</th><th style={thStyle}>Type</th><th style={thStyle}>From</th><th style={thStyle}>To</th><th style={thStyle}>Days</th><th style={thStyle}>Reason</th><th style={thStyle}>Status</th><th style={thStyle}>Actions</th></tr></thead>
                <tbody>
                  {leaveCalData.map((lv: any) => {
                    const days = Math.max(1, Math.ceil((new Date(lv.end_datetime).getTime() - new Date(lv.start_datetime).getTime()) / 86400000))
                    return (
                      <tr key={lv.id} onMouseEnter={e => (e.currentTarget.style.background = C.cardAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                        <td style={{ ...tdStyle, fontWeight: 600 }}>{lv.staff_name}</td>
                        <td style={tdStyle}>{typeLabel[lv.leave_type] || lv.leave_type}</td>
                        <td style={tdStyle}>{new Date(lv.start_datetime).toLocaleDateString('en-GB')}</td>
                        <td style={tdStyle}>{new Date(lv.end_datetime).toLocaleDateString('en-GB')}</td>
                        <td style={tdStyle}>{days}</td>
                        <td style={{ ...tdStyle, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{lv.reason || '—'}</td>
                        <td style={tdStyle}><span style={badgeStyle(statusColor[lv.status] || C.muted)}>{lv.status}</span></td>
                        <td style={tdStyle}>
                          {lv.status === 'REQUESTED' && (
                            <div style={{ display: 'flex', gap: 4 }}>
                              <button style={{ ...btnSm, background: C.green, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }} onClick={() => handleLeaveAction(lv.id, 'approve')}>Approve</button>
                              <button style={{ ...btnSm, background: C.red, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: '0.7rem' }} onClick={() => handleLeaveAction(lv.id, 'reject')}>Reject</button>
                            </div>
                          )}
                          {lv.status === 'APPROVED' && (
                            <button style={{ ...btnGhost, ...btnSm }} onClick={() => handleLeaveAction(lv.id, 'cancel')}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {leaveCalData.length === 0 && <tr><td colSpan={8} style={emptyStyle}>No leave requests for {leaveCalYear}</td></tr>}
                </tbody>
              </table>
            </div>

            {/* Request Leave Modal */}
            {showLeaveForm && (
              <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowLeaveForm(false)}>
                <div onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', padding: '2rem', background: C.cardAlt, borderRadius: 16, color: C.text }}>
                  <h2 style={{ margin: '0 0 1rem', color: C.text }}>Request Leave</h2>
                  {leaveError && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: 12, fontSize: '0.85rem' }}>{leaveError}</div>}
                  <div style={{ display: 'grid', gap: 12 }}>
                    <div>
                      <label style={labelStyle}>Staff Member *</label>
                      <select value={leaveForm.staff_member} onChange={e => setLeaveForm({ ...leaveForm, staff_member: e.target.value })} style={inputStyle}>
                        <option value="" style={{ background: C.bg, color: C.text }}>Select staff…</option>
                        {staff.map((s: any) => <option key={s.id} value={s.id} style={{ background: C.bg, color: C.text }}>{s.display_name || s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Leave Type</label>
                      <select value={leaveForm.leave_type} onChange={e => setLeaveForm({ ...leaveForm, leave_type: e.target.value })} style={inputStyle}>
                        <option value="ANNUAL" style={{ background: C.bg, color: C.text }}>Annual Leave</option>
                        <option value="SICK" style={{ background: C.bg, color: C.text }}>Sick Leave</option>
                        <option value="UNPAID" style={{ background: C.bg, color: C.text }}>Unpaid Leave</option>
                        <option value="OTHER" style={{ background: C.bg, color: C.text }}>Other</option>
                      </select>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={labelStyle}>Start Date *</label>
                        <input type="date" value={leaveForm.start_date} onChange={e => setLeaveForm({ ...leaveForm, start_date: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>End Date *</label>
                        <input type="date" value={leaveForm.end_date} onChange={e => setLeaveForm({ ...leaveForm, end_date: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div>
                      <label style={labelStyle}>Reason</label>
                      <input value={leaveForm.reason} onChange={e => setLeaveForm({ ...leaveForm, reason: e.target.value })} placeholder="Optional reason" style={inputStyle} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
                    <button style={btnGhost} onClick={() => setShowLeaveForm(false)}>Cancel</button>
                    <button style={btnPrimary} onClick={handleRequestLeave} disabled={leaveSaving}>{leaveSaving ? 'Submitting…' : 'Submit Request'}</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {tab === 'training' && (
        <div style={{ background: C.card, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr><th style={thStyle}>Staff</th><th style={thStyle}>Course</th><th style={thStyle}>Provider</th><th style={thStyle}>Completed</th><th style={thStyle}>Expiry</th><th style={thStyle}>Status</th></tr></thead>
            <tbody>
              {training.map((t: any) => (
                <tr key={t.id} onMouseEnter={e => (e.currentTarget.style.background = C.cardAlt)} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}><td style={{ ...tdStyle, fontWeight: 600 }}>{t.staff_name}</td><td style={tdStyle}>{t.title}</td><td style={tdStyle}>{t.provider}</td><td style={tdStyle}>{t.completed_date}</td><td style={tdStyle}>{t.expiry_date || 'N/A'}</td><td style={tdStyle}><span style={badgeStyle(t.is_expired ? C.red : C.green)}>{t.is_expired ? 'EXPIRED' : 'VALID'}</span></td></tr>
              ))}
              {training.length === 0 && <tr><td colSpan={6} style={emptyStyle}>No training records</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Add / Edit Staff Modal */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowAddModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', padding: '2rem', background: C.cardAlt, borderRadius: 16, color: C.text, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: 16, color: C.text }}>{editingStaff ? 'Edit Staff Member' : 'Add Staff Member'}</h2>
            {error && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: 12, fontSize: '0.85rem' }}>{error}</div>}
            <div style={{ display: 'grid', gap: 12 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>First Name *</label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })} placeholder="e.g. Sam" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Last Name *</label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })} placeholder="e.g. Kim" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="e.g. sam.kim@company.com" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Phone</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="e.g. 07700 900000" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Role</label>
                <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={inputStyle}>
                  <option value="staff" style={{ background: C.bg, color: C.text }}>Staff</option>
                  <option value="manager" style={{ background: C.bg, color: C.text }}>Manager</option>
                </select>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button style={btnGhost} onClick={() => setShowAddModal(false)}>Cancel</button>
              <button style={btnPrimary} onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : editingStaff ? 'Save Changes' : 'Add Staff'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Credentials Modal — shown after successful staff creation */}
      {createdCreds && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setCreatedCreds(null)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 480, width: '100%', padding: '2rem', background: C.cardAlt, borderRadius: 16, color: C.text, position: 'relative' }}>
            <h2 style={{ marginBottom: 4, color: C.text }}>Staff Member Created</h2>
            <p style={{ color: C.muted, marginBottom: 16, fontSize: '0.9rem' }}>Share these login details with <strong>{createdCreds.name}</strong>. They will be asked to set their own password on first login.</p>
            <div style={{ background: C.bg, borderRadius: 10, padding: '1rem', display: 'grid', gap: 8, fontSize: '0.9rem' }}>
              <div><strong>Login URL:</strong> <code style={{ color: C.accent }}>{window.location.origin}/login</code></div>
              <div><strong>Email:</strong> <code style={{ color: C.accent }}>{createdCreds.email}</code></div>
              <div><strong>Temporary Password:</strong> <code style={{ fontSize: '1.1rem', fontWeight: 700, color: C.green }}>{createdCreds.temp_password}</code></div>
            </div>
            <p style={{ marginTop: 12, fontSize: '0.8rem', color: C.muted }}>This password is shown once. The staff member must change it on their first login.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 16 }}>
              <button style={btnPrimary} onClick={() => setCreatedCreds(null)}>Done</button>
            </div>
          </div>
        </div>
      )}

      {/* Shift Modal */}
      {showShiftModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }} onClick={() => setShowShiftModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 520, width: '100%', padding: '2rem', background: C.cardAlt, borderRadius: 16, color: C.text, position: 'relative', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ color: C.text }}>{editingShift ? 'Edit Shift' : 'Add Shift'}</h2>
            {shiftError && <div style={{ background: '#7f1d1d', color: '#fca5a5', padding: '0.6rem 1rem', borderRadius: 10, marginBottom: 12, fontSize: '0.85rem' }}>{shiftError}</div>}
            <div style={{ display: 'grid', gap: 12, marginTop: 12 }}>
              <div>
                <label style={labelStyle}>Staff Member *</label>
                <select value={shiftForm.staff} onChange={e => setShiftForm({ ...shiftForm, staff: e.target.value })} style={inputStyle}>
                  <option value="" style={{ background: C.bg, color: C.text }}>Select staff…</option>
                  {staff.map((s: any) => <option key={s.id} value={s.id} style={{ background: C.bg, color: C.text }}>{s.display_name || s.name}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Date *</label>
                <input type="date" value={shiftForm.date} onChange={e => setShiftForm({ ...shiftForm, date: e.target.value })} style={inputStyle} />
              </div>

              {/* Time segments — split shift support */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <label style={{ ...labelStyle, margin: 0 }}>Working Hours *</label>
                  {!editingShift && <button type="button" style={{ ...btnGhost, ...btnSm }} onClick={addSegment}>+ Split Shift</button>}
                </div>
                {shiftSegments.map((seg, i) => (
                  <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ flex: 1 }}>
                      {i === 0 && <span style={{ fontSize: '0.75rem', color: C.muted }}>Start</span>}
                      <input type="time" value={seg.start_time} onChange={e => updateSegment(i, 'start_time', e.target.value)} style={inputStyle} />
                    </div>
                    <span style={{ paddingTop: i === 0 ? 16 : 0, color: C.muted }}>→</span>
                    <div style={{ flex: 1 }}>
                      {i === 0 && <span style={{ fontSize: '0.75rem', color: C.muted }}>End</span>}
                      <input type="time" value={seg.end_time} onChange={e => updateSegment(i, 'end_time', e.target.value)} style={inputStyle} />
                    </div>
                    {shiftSegments.length > 1 && (
                      <button type="button" onClick={() => removeSegment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.red, fontWeight: 700, fontSize: '1.2rem', paddingTop: i === 0 ? 16 : 0 }}>×</button>
                    )}
                  </div>
                ))}
                {shiftSegments.length > 1 && (
                  <p style={{ fontSize: '0.8rem', color: C.muted, marginTop: 4 }}>Split shift: {shiftSegments.length} segments will be created for this day.</p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Location</label>
                <input value={shiftForm.location} onChange={e => setShiftForm({ ...shiftForm, location: e.target.value })} placeholder="e.g. Main Office" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <input value={shiftForm.notes} onChange={e => setShiftForm({ ...shiftForm, notes: e.target.value })} placeholder="Optional notes" style={inputStyle} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="shift-published" checked={shiftForm.is_published} onChange={e => setShiftForm({ ...shiftForm, is_published: e.target.checked })} />
                <label htmlFor="shift-published" style={{ fontSize: '0.9rem', color: C.text }}>Published (visible to staff)</label>
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
              <button style={btnGhost} onClick={() => setShowShiftModal(false)}>Cancel</button>
              <button style={btnPrimary} onClick={handleSaveShift} disabled={shiftSaving}>{shiftSaving ? 'Saving…' : editingShift ? 'Save Changes' : 'Add Shift'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
