// ============================================================
// NBNE Platform Rev 2 — API Client
// Typed fetch helpers with JWT auth for Django backend
// ============================================================

const API_BASE = '/api/django'

// --- Token Management (client-side) ---
let accessToken: string | null = null
let refreshToken: string | null = null

export function setTokens(access: string, refresh: string) {
  accessToken = access
  refreshToken = refresh
  if (typeof window !== 'undefined') {
    localStorage.setItem('nbne_access', access)
    localStorage.setItem('nbne_refresh', refresh)
  }
}

export function getAccessToken(): string | null {
  if (!accessToken && typeof window !== 'undefined') {
    accessToken = localStorage.getItem('nbne_access')
  }
  return accessToken
}

export function getRefreshToken(): string | null {
  if (!refreshToken && typeof window !== 'undefined') {
    refreshToken = localStorage.getItem('nbne_refresh')
  }
  return refreshToken
}

export function clearTokens() {
  accessToken = null
  refreshToken = null
  if (typeof window !== 'undefined') {
    localStorage.removeItem('nbne_access')
    localStorage.removeItem('nbne_refresh')
  }
}

export function isLoggedIn(): boolean {
  return !!getAccessToken()
}

// --- Parse JWT payload without verification (client-side only) ---
export function parseJwtPayload(token: string): Record<string, any> | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload
  } catch {
    return null
  }
}

export function getCurrentUser() {
  const token = getAccessToken()
  if (!token) return null
  const payload = parseJwtPayload(token)
  if (!payload) return null
  return {
    id: payload.user_id,
    name: payload.name || '',
    email: payload.email || '',
    role: payload.role || 'customer',
    tier: payload.tier || 1,
  }
}

// --- Refresh token ---
async function refreshAccessToken(): Promise<boolean> {
  const refresh = getRefreshToken()
  if (!refresh) return false
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return false
    const data = await res.json()
    accessToken = data.access
    if (typeof window !== 'undefined') {
      localStorage.setItem('nbne_access', data.access)
    }
    if (data.refresh) {
      refreshToken = data.refresh
      if (typeof window !== 'undefined') {
        localStorage.setItem('nbne_refresh', data.refresh)
      }
    }
    return true
  } catch {
    return false
  }
}

// --- Core fetch with auth ---
async function apiFetch<T = any>(
  path: string,
  options: RequestInit = {},
  retry = true
): Promise<{ data: T | null; error: string | null; status: number }> {
  const token = getAccessToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  try {
    // Ensure trailing slash before query string to avoid Django 301 redirects
    let url = `${API_BASE}${path}`
    const qIdx = url.indexOf('?')
    if (qIdx === -1) {
      if (!url.endsWith('/')) url += '/'
    } else {
      const base = url.slice(0, qIdx)
      const qs = url.slice(qIdx)
      if (!base.endsWith('/')) url = base + '/' + qs
    }

    const res = await fetch(url, {
      ...options,
      headers,
    })

    // Token expired — try refresh
    if (res.status === 401 && retry) {
      const refreshed = await refreshAccessToken()
      if (refreshed) {
        return apiFetch<T>(path, options, false)
      }
      clearTokens()
      return { data: null, error: 'Session expired', status: 401 }
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}))
      const errMsg = errData.detail || errData.error || errData.message || `Error ${res.status}`
      return { data: null, error: errMsg, status: res.status }
    }

    const data = await res.json()
    return { data, error: null, status: res.status }
  } catch (err: any) {
    return { data: null, error: err.message || 'Network error', status: 0 }
  }
}

// --- Auth ---
export async function login(username: string, password: string) {
  const res = await apiFetch<{ access: string; refresh: string; user: any }>('/auth/login/', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
  if (res.data) {
    setTokens(res.data.access, res.data.refresh)
  }
  return res
}

export async function getMe() {
  return apiFetch<any>('/auth/me/')
}

export async function setPassword(newPassword: string) {
  return apiFetch<any>('/auth/me/set-password/', { method: 'POST', body: JSON.stringify({ new_password: newPassword }) })
}

// --- Tenant ---
export async function getTenantSettings(params?: { tenant?: string }) {
  const qs = params?.tenant ? `?tenant=${params.tenant}` : ''
  return apiFetch<any>(`/tenant/${qs}`)
}

export async function getTenantBranding(params?: { tenant?: string }) {
  const qs = params?.tenant ? `?tenant=${params.tenant}` : ''
  return apiFetch<any>(`/tenant/branding/${qs}`)
}

// --- Bookings ---
export async function getServices(showAll = false) {
  return apiFetch<any[]>(`/services/${showAll ? '?all=1' : ''}`)
}

export async function createService(data: any) {
  return apiFetch<any>('/services/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateService(id: number, data: any) {
  return apiFetch<any>(`/services/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteService(id: number) {
  return apiFetch<any>(`/services/${id}/`, { method: 'DELETE' })
}

export async function assignStaffToService(serviceId: number, staffIds: number[]) {
  return apiFetch<any>(`/services/${serviceId}/assign-staff/`, { method: 'POST', body: JSON.stringify({ staff_ids: staffIds }) })
}

export async function applyServiceRecommendation(serviceId: number) {
  return apiFetch<any>(`/services/${serviceId}/apply-recommendation/`, { method: 'POST' })
}

export async function logServiceOverride(serviceId: number, data: { previous_price?: number; new_price?: number; previous_deposit?: number; new_deposit?: number; reason?: string }) {
  return apiFetch<any>(`/services/${serviceId}/log-override/`, { method: 'POST', body: JSON.stringify(data) })
}

export async function recalculateServiceIntelligence() {
  return apiFetch<any>('/services/recalculate-intelligence/', { method: 'POST' })
}

export async function getServiceOptimisationLogs(serviceId: number) {
  return apiFetch<any[]>(`/services/${serviceId}/optimisation-logs/`)
}

export function getSlots(params?: { service_id?: number; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams()
  if (params?.service_id) qs.set('service_id', String(params.service_id))
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  const q = qs.toString()
  return apiFetch<any[]>(`/bookings/slots/${q ? '?' + q : ''}`)
}

export async function getBookableStaff(serviceId?: number) {
  const q = serviceId ? `?service_id=${serviceId}` : ''
  return apiFetch<any[]>(`/bookings/staff-available/${q}`)
}

export async function getStaffSlots(staffId: number, serviceId: number, date: string) {
  return apiFetch<any>(`/bookings/staff-slots/?staff_id=${staffId}&service_id=${serviceId}&date=${date}`)
}

export async function checkDisclaimer(email: string) {
  return apiFetch<any>(`/bookings/disclaimer/check/?email=${encodeURIComponent(email)}`)
}

export async function signDisclaimer(data: { email: string; name: string; disclaimer_id: number }) {
  return apiFetch<any>('/bookings/disclaimer/sign/', { method: 'POST', body: JSON.stringify(data) })
}

export async function createBooking(data: any) {
  return apiFetch<any>('/bookings/create/', { method: 'POST', body: JSON.stringify(data) })
}

export async function getBookings(params?: { status?: string; email?: string }) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  if (params?.email) qs.set('email', params.email)
  const q = qs.toString()
  return apiFetch<any[]>(`/bookings/${q ? '?' + q : ''}`)
}

export async function confirmBooking(id: number) {
  return apiFetch<any>(`/bookings/${id}/confirm/`, { method: 'POST' })
}

export async function cancelBooking(id: number, reason = '') {
  return apiFetch<any>(`/bookings/${id}/cancel/`, { method: 'POST', body: JSON.stringify({ reason }) })
}

export async function completeBooking(id: number) {
  return apiFetch<any>(`/bookings/${id}/complete/`, { method: 'POST' })
}

export async function deleteBooking(id: number) {
  return apiFetch<any>(`/bookings/${id}/delete/`, { method: 'DELETE' })
}

export async function markNoShow(id: number) {
  return apiFetch<any>(`/bookings/${id}/no-show/`, { method: 'POST' })
}

export async function assignStaffToBooking(bookingId: number, staffId: number | null) {
  return apiFetch<any>(`/bookings/${bookingId}/assign-staff/`, { method: 'POST', body: JSON.stringify({ staff_id: staffId || 0 }) })
}

// --- Booking Notes ---
export async function updateBookingNotes(bookingId: number, notes: string) {
  return apiFetch<any>(`/bookings/${bookingId}/update-notes/`, { method: 'POST', body: JSON.stringify({ notes }) })
}

export async function updateClientNotes(bookingId: number, notes: string) {
  return apiFetch<any>(`/bookings/${bookingId}/update-client-notes/`, { method: 'POST', body: JSON.stringify({ notes }) })
}

// --- Staff Blocks (unavailability) ---
export async function getStaffBlocks(params?: { staff_id?: number; date_from?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  if (params?.date_from) qs.set('date_from', params.date_from)
  const q = qs.toString()
  return apiFetch<any[]>(`/staff-blocks/${q ? '?' + q : ''}`)
}

export async function createStaffBlock(data: { staff_id: number; date: string; start_time?: string; end_time?: string; reason?: string; all_day?: boolean }) {
  return apiFetch<any>('/staff-blocks/', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteStaffBlock(id: number) {
  return apiFetch<any>(`/staff-blocks/${id}/`, { method: 'DELETE' })
}

export async function getBookingReports(params?: { report?: string; date_from?: string; date_to?: string; staff_id?: number }) {
  const qs = new URLSearchParams()
  if (params?.report) qs.set('report', params.report)
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  const q = qs.toString()
  return apiFetch<any>(`/bookings/reports/${q ? '?' + q : ''}`)
}

function _reportQs(params?: { date_from?: string; date_to?: string; staff_id?: number; service_id?: number; risk_level?: string; payment_status?: string }) {
  const qs = new URLSearchParams()
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  if (params?.service_id) qs.set('service_id', String(params.service_id))
  if (params?.risk_level) qs.set('risk_level', params.risk_level)
  if (params?.payment_status) qs.set('payment_status', params.payment_status)
  return qs.toString()
}

export async function getReportsOverview(params?: Parameters<typeof _reportQs>[0]) {
  const q = _reportQs(params)
  return apiFetch<any>(`/reports/overview/${q ? '?' + q : ''}`)
}

export async function getReportsDaily(params?: Parameters<typeof _reportQs>[0]) {
  const q = _reportQs(params)
  return apiFetch<any>(`/reports/daily/${q ? '?' + q : ''}`)
}

export async function getReportsMonthly(params?: Parameters<typeof _reportQs>[0]) {
  const q = _reportQs(params)
  return apiFetch<any>(`/reports/monthly/${q ? '?' + q : ''}`)
}

export async function getReportsStaff(params?: Parameters<typeof _reportQs>[0]) {
  const q = _reportQs(params)
  return apiFetch<any>(`/reports/staff/${q ? '?' + q : ''}`)
}

export async function getReportsInsights() {
  return apiFetch<any>('/reports/insights/')
}

export async function getReportsStaffHours(params?: { month?: string; staff_id?: number }) {
  const qs = new URLSearchParams()
  if (params?.month) qs.set('month', params.month)
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  const q = qs.toString()
  return apiFetch<any>(`/reports/staff-hours/${q ? '?' + q : ''}`)
}

export function getStaffHoursCsvUrl(params?: { month?: string; staff_id?: number; detail?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.month) qs.set('month', params.month)
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  if (params?.detail) qs.set('detail', '1')
  const q = qs.toString()
  return `/api/django/reports/staff-hours/csv/${q ? '?' + q : ''}`
}

// --- Demo Data ---
export async function getDemoStatus() {
  return apiFetch<{ has_demo: boolean; has_real: boolean; demo_count: number }>('/demo/status/')
}

export async function seedDemoData() {
  return apiFetch<any>('/demo/seed/', { method: 'POST' })
}

export async function deleteDemoData() {
  return apiFetch<any>('/demo/seed/', { method: 'DELETE' })
}

// --- Staff ---
export async function getStaffList() {
  return apiFetch<any[]>('/staff/')
}

export async function createStaff(data: { first_name: string; last_name: string; email: string; phone?: string; role?: string }) {
  return apiFetch<any>('/staff/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateStaff(id: number, data: Record<string, any>) {
  return apiFetch<any>(`/staff/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteStaff(id: number) {
  return apiFetch<any>(`/staff/${id}/`, { method: 'DELETE' })
}

export async function getShifts(params?: { staff_id?: number; date?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  if (params?.date) qs.set('date', params.date)
  const q = qs.toString()
  return apiFetch<any[]>(`/staff/shifts/${q ? '?' + q : ''}`)
}

export async function createShift(data: Record<string, any>) {
  return apiFetch<any>('/staff/shifts/create/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateShift(id: number, data: Record<string, any>) {
  return apiFetch<any>(`/staff/shifts/${id}/update/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteShift(id: number) {
  return apiFetch<any>(`/staff/shifts/${id}/delete/`, { method: 'DELETE' })
}

export async function getMyShifts() {
  return apiFetch<any[]>('/staff/my-shifts/')
}

export async function getLeaveRequests(params?: { status?: string }) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return apiFetch<any[]>(`/staff/leave/${q ? '?' + q : ''}`)
}

export async function createLeaveRequest(data: any) {
  return apiFetch<any>('/staff/leave/create/', { method: 'POST', body: JSON.stringify(data) })
}

export async function reviewLeave(id: number, status: string) {
  return apiFetch<any>(`/staff/leave/${id}/review/`, { method: 'POST', body: JSON.stringify({ status }) })
}

export async function getTrainingRecords() {
  return apiFetch<any[]>('/staff/training/')
}

// --- Working Hours ---
export async function getWorkingHours(params?: { staff_id?: number }) {
  const qs = new URLSearchParams()
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  const q = qs.toString()
  return apiFetch<any[]>(`/staff/working-hours/${q ? '?' + q : ''}`)
}

export async function bulkSetWorkingHours(staffId: number, hours: any[]) {
  return apiFetch<any>('/staff/working-hours/bulk-set/', {
    method: 'POST', body: JSON.stringify({ staff: staffId, hours }),
  })
}

export async function deleteWorkingHours(id: number) {
  return apiFetch<any>(`/staff/working-hours/${id}/delete/`, { method: 'DELETE' })
}

// --- Availability Engine (WorkingPatterns, Overrides, Leave, Blocks) ---
export async function getWorkingPatterns(params?: { staff?: number; active?: boolean }) {
  const qs = new URLSearchParams()
  if (params?.staff) qs.set('staff', String(params.staff))
  if (params?.active) qs.set('active', '1')
  const q = qs.toString()
  return apiFetch<any[]>(`/working-patterns/${q ? '?' + q : ''}`)
}

export async function createWorkingPattern(data: any) {
  return apiFetch<any>('/working-patterns/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateWorkingPattern(id: number, data: any) {
  return apiFetch<any>(`/working-patterns/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteWorkingPattern(id: number) {
  return apiFetch<any>(`/working-patterns/${id}/`, { method: 'DELETE' })
}

export async function copyWorkingPattern(id: number, targetStaffId: number, name?: string) {
  return apiFetch<any>(`/working-patterns/${id}/copy-to/`, {
    method: 'POST', body: JSON.stringify({ staff_member: targetStaffId, name }),
  })
}

export async function duplicateWorkingPattern(id: number, data?: { name?: string; effective_from?: string; deactivate_source?: boolean }) {
  return apiFetch<any>(`/working-patterns/${id}/duplicate/`, { method: 'POST', body: JSON.stringify(data || {}) })
}

export async function getWorkingPatternRules(patternId: number) {
  return apiFetch<any[]>(`/working-pattern-rules/?pattern=${patternId}`)
}

export async function createWorkingPatternRule(data: any) {
  return apiFetch<any>('/working-pattern-rules/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateWorkingPatternRule(id: number, data: any) {
  return apiFetch<any>(`/working-pattern-rules/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteWorkingPatternRule(id: number) {
  return apiFetch<any>(`/working-pattern-rules/${id}/`, { method: 'DELETE' })
}

export async function getAvailabilityOverrides(params?: { staff?: number; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff) qs.set('staff', String(params.staff))
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  const q = qs.toString()
  return apiFetch<any[]>(`/availability-overrides/${q ? '?' + q : ''}`)
}

export async function createAvailabilityOverride(data: any) {
  return apiFetch<any>('/availability-overrides/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateAvailabilityOverride(id: number, data: any) {
  return apiFetch<any>(`/availability-overrides/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteAvailabilityOverride(id: number) {
  return apiFetch<any>(`/availability-overrides/${id}/`, { method: 'DELETE' })
}

export async function getLeaveRequestsAvail(params?: { staff?: number; status?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff) qs.set('staff', String(params.staff))
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return apiFetch<any[]>(`/leave-requests/${q ? '?' + q : ''}`)
}

export async function createLeaveRequestAvail(data: any) {
  return apiFetch<any>('/leave-requests/', { method: 'POST', body: JSON.stringify(data) })
}

export async function approveLeaveRequest(id: number) {
  return apiFetch<any>(`/leave-requests/${id}/approve/`, { method: 'POST' })
}

export async function rejectLeaveRequest(id: number) {
  return apiFetch<any>(`/leave-requests/${id}/reject/`, { method: 'POST' })
}

export async function cancelLeaveRequest(id: number) {
  return apiFetch<any>(`/leave-requests/${id}/cancel/`, { method: 'POST' })
}

export async function getBlockedTimes(params?: { staff?: number }) {
  const qs = new URLSearchParams()
  if (params?.staff) qs.set('staff', String(params.staff))
  const q = qs.toString()
  return apiFetch<any[]>(`/blocked-times/${q ? '?' + q : ''}`)
}

export async function createBlockedTime(data: any) {
  return apiFetch<any>('/blocked-times/', { method: 'POST', body: JSON.stringify(data) })
}

export async function deleteBlockedTime(id: number) {
  return apiFetch<any>(`/blocked-times/${id}/`, { method: 'DELETE' })
}

export async function getAvailabilityShifts(params?: { staff?: number; published?: boolean; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff) qs.set('staff', String(params.staff))
  if (params?.published) qs.set('published', '1')
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  const q = qs.toString()
  return apiFetch<any[]>(`/shifts/${q ? '?' + q : ''}`)
}

export async function createAvailabilityShift(data: any) {
  return apiFetch<any>('/shifts/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateAvailabilityShift(id: number, data: any) {
  return apiFetch<any>(`/shifts/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function deleteAvailabilityShift(id: number) {
  return apiFetch<any>(`/shifts/${id}/`, { method: 'DELETE' })
}

export async function getAvailabilityTimesheets(params?: { staff?: number; status?: string; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff) qs.set('staff', String(params.staff))
  if (params?.status) qs.set('status', params.status)
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  const q = qs.toString()
  return apiFetch<any[]>(`/timesheets/${q ? '?' + q : ''}`)
}

export async function submitTimesheet(id: number) {
  return apiFetch<any>(`/timesheets/${id}/submit/`, { method: 'POST' })
}

export async function approveTimesheet(id: number) {
  return apiFetch<any>(`/timesheets/${id}/approve/`, { method: 'POST' })
}

export async function getStaffAvailability(staffId: number, date: string) {
  return apiFetch<any>(`/availability/?staff=${staffId}&date=${date}`)
}

export async function getStaffFreeSlots(staffId: number, date: string, duration?: number) {
  const dur = duration ? `&duration=${duration}` : ''
  return apiFetch<any>(`/availability/slots/?staff=${staffId}&date=${date}${dur}`)
}

// --- Demo Availability Data ---
export async function getDemoAvailabilityStatus() {
  return apiFetch<any>('/demo/availability/seed/')
}

export async function seedDemoAvailability() {
  return apiFetch<any>('/demo/availability/seed/', { method: 'POST' })
}

export async function deleteDemoAvailability() {
  return apiFetch<any>('/demo/availability/seed/', { method: 'DELETE' })
}

// --- Timesheets ---
export async function getTimesheets(params?: { staff_id?: number; date_from?: string; date_to?: string }) {
  const qs = new URLSearchParams()
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  if (params?.date_from) qs.set('date_from', params.date_from)
  if (params?.date_to) qs.set('date_to', params.date_to)
  const q = qs.toString()
  return apiFetch<any[]>(`/staff/timesheets/${q ? '?' + q : ''}`)
}

export async function updateTimesheet(id: number, data: Record<string, any>) {
  return apiFetch<any>(`/staff/timesheets/${id}/update/`, { method: 'PATCH', body: JSON.stringify(data) })
}

export async function generateTimesheets(data: { date_from: string; date_to: string; staff_id?: number }) {
  return apiFetch<any>('/staff/timesheets/generate/', { method: 'POST', body: JSON.stringify(data) })
}

export async function getTimesheetSummary(params?: { period?: string; date?: string; staff_id?: number }) {
  const qs = new URLSearchParams()
  if (params?.period) qs.set('period', params.period)
  if (params?.date) qs.set('date', params.date)
  if (params?.staff_id) qs.set('staff_id', String(params.staff_id))
  const q = qs.toString()
  return apiFetch<any>(`/staff/timesheets/summary/${q ? '?' + q : ''}`)
}

// --- Media URL helper ---
const BACKEND_BASE = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || '').trim()
  : (process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000').trim()

export function getMediaUrl(path: string | null | undefined): string {
  if (!path) return ''
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  // Relative path from backend — prepend backend base
  return `${BACKEND_BASE}${path.startsWith('/') ? '' : '/'}${path}`
}

export function isImageFile(filename: string): boolean {
  return /\.(jpe?g|png|gif|webp|bmp|svg|heic|heif|tiff?)$/i.test(filename)
}

export function isVideoFile(filename: string): boolean {
  return /\.(mp4|webm|mov|avi|mkv|m4v)$/i.test(filename)
}

// --- Comms ---
export async function getChannels() {
  return apiFetch<any[]>('/comms/channels/')
}

export async function getMessages(channelId: number, limit = 50) {
  return apiFetch<any[]>(`/comms/channels/${channelId}/messages/?limit=${limit}`)
}

export async function sendMessage(channelId: number, body: string, files?: File[]) {
  if (files && files.length > 0) {
    // Use FormData for file uploads — bypass apiFetch to avoid JSON content-type
    const token = getAccessToken()
    const formData = new FormData()
    formData.append('body', body)
    for (const f of files) formData.append('files', f)
    try {
      const res = await fetch(`${API_BASE}/comms/channels/${channelId}/messages/create/`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return { data: null, error: err.detail || err.error || `Error ${res.status}`, status: res.status }
      }
      const data = await res.json()
      return { data, error: null, status: res.status }
    } catch (err: any) {
      return { data: null, error: err.message || 'Network error', status: 0 }
    }
  }
  return apiFetch<any>(`/comms/channels/${channelId}/messages/create/`, {
    method: 'POST', body: JSON.stringify({ body }),
  })
}

// --- Compliance ---
export async function getIncidents(params?: { status?: string }) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return apiFetch<any[]>(`/compliance/incidents/${q ? '?' + q : ''}`)
}

export async function createIncident(data: any) {
  return apiFetch<any>('/compliance/incidents/create/', { method: 'POST', body: JSON.stringify(data) })
}

export async function getRams() {
  return apiFetch<any[]>('/compliance/rams/')
}

// --- Intake / Disclaimer ---
export async function getIntakeProfiles() {
  return apiFetch<any[]>('/intake/')
}

export async function getIntakeStatus(email: string) {
  return apiFetch<any>(`/intake/status/?email=${encodeURIComponent(email)}`)
}

export async function expireIntake(id: number) {
  return apiFetch<any>(`/intake/${id}/expire/`, { method: 'POST' })
}

export async function requireRenewal(id: number) {
  return apiFetch<any>(`/intake/${id}/require_renewal/`, { method: 'POST' })
}

export async function clearRenewal(id: number) {
  return apiFetch<any>(`/intake/${id}/clear_renewal/`, { method: 'POST' })
}

export async function requireRenewalForVersion(disclaimerId: number) {
  return apiFetch<any>(`/intake-disclaimer/${disclaimerId}/require_renewal/`, { method: 'POST' })
}

export async function getDisclaimers() {
  return apiFetch<any[]>('/intake-disclaimer/')
}

export async function getActiveDisclaimer() {
  return apiFetch<any>('/intake-disclaimer/active/')
}

export async function createDisclaimer(data: { version: string; content: string; active: boolean }) {
  return apiFetch<any>('/intake-disclaimer/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateDisclaimer(id: number, data: Record<string, any>) {
  return apiFetch<any>(`/intake-disclaimer/${id}/`, { method: 'PATCH', body: JSON.stringify(data) })
}

// --- Clients ---
export async function getClients() {
  return apiFetch<any[]>('/clients/')
}

// --- Documents ---
export async function getDocuments() {
  return apiFetch<any[]>('/documents/')
}

// --- CRM ---
export async function getLeads(params?: { status?: string }) {
  const qs = new URLSearchParams()
  if (params?.status) qs.set('status', params.status)
  const q = qs.toString()
  return apiFetch<any[]>(`/crm/leads/${q ? '?' + q : ''}`)
}

export async function createLead(data: any) {
  return apiFetch<any>('/crm/leads/create/', { method: 'POST', body: JSON.stringify(data) })
}

export async function updateLeadStatus(id: number, status: string) {
  return apiFetch<any>(`/crm/leads/${id}/status/`, { method: 'POST', body: JSON.stringify({ status }) })
}

// --- Smart Dashboard ---
export async function getDashboardSummary() {
  return apiFetch<any>('/dashboard-summary/')
}

// --- Analytics ---
export async function getAnalyticsDashboard() {
  return apiFetch<any>('/analytics/dashboard/')
}

export async function getRecommendations() {
  return apiFetch<any[]>('/analytics/recommendations/')
}

// --- Audit ---
export async function getAuditLog(params?: { limit?: number; action?: string }) {
  const qs = new URLSearchParams()
  if (params?.limit) qs.set('limit', String(params.limit))
  if (params?.action) qs.set('action', params.action)
  const q = qs.toString()
  return apiFetch<any[]>(`/audit/${q ? '?' + q : ''}`)
}

// --- Users (admin) ---
export async function getUsers(params?: { role?: string }) {
  const qs = new URLSearchParams()
  if (params?.role) qs.set('role', params.role)
  const q = qs.toString()
  return apiFetch<any[]>(`/auth/users/${q ? '?' + q : ''}`)
}
