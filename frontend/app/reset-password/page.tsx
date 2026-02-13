'use client'

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useTenant } from '@/lib/tenant'

const API_BASE = '/api/django'

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <ResetPasswordForm />
    </Suspense>
  )
}

function ResetPasswordForm() {
  const tenant = useTenant()
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [newPassword, setNewPw] = useState('')
  const [confirmPassword, setConfirmPw] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<{ valid: boolean; name?: string; email?: string; reason?: string } | null>(null)
  const [validating, setValidating] = useState(true)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) { setTokenInfo({ valid: false, reason: 'No token provided' }); setValidating(false); return }
    fetch(`${API_BASE}/auth/validate-token/?token=${token}`)
      .then(r => r.json())
      .then(data => { setTokenInfo(data); setValidating(false) })
      .catch(() => { setTokenInfo({ valid: false, reason: 'Network error' }); setValidating(false) })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }

    setSaving(true)

    const res = await fetch(`${API_BASE}/auth/set-password-token/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, new_password: newPassword }),
    })
    const data = await res.json()
    if (!res.ok) { setError(data.detail || 'Failed to reset password'); setSaving(false); return }

    // Store JWT tokens — user is now logged in
    if (data.access && data.refresh) {
      localStorage.setItem('nbne_access', data.access)
      localStorage.setItem('nbne_refresh', data.refresh)
    }
    // Set cookie via auth route
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: data.user?.username, password: newPassword }),
    })
    setDone(true)
    const role = data.user?.role
    setTimeout(() => {
      if (role === 'owner' || role === 'manager') router.push('/admin')
      else if (role === 'staff') router.push('/app')
      else router.push('/')
    }, 1500)
  }

  if (validating) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <p style={{ color: 'var(--color-text-muted)' }}>Verifying your reset link…</p>
    </div>
  )

  if (tokenInfo && !tokenInfo.valid) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 420, width: '90%', textAlign: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', fontSize: '1.5rem', marginBottom: '1rem' }}>Link Expired</h1>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem' }}>{tokenInfo.reason || 'This reset link has expired or already been used.'}</p>
        <a href="/forgot-password" className="btn btn-primary" style={{ textDecoration: 'none' }}>Request a New Link</a>
        <p style={{ marginTop: '1rem', fontSize: '0.85rem' }}><a href="/login">← Back to login</a></p>
      </div>
    </div>
  )

  if (done) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>✅</div>
        <h2 style={{ color: 'var(--color-primary-dark)' }}>Password Reset Successfully!</h2>
        <p style={{ color: 'var(--color-text-muted)' }}>Redirecting you now…</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 420, width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', fontSize: '2rem' }}>{tenant.business_name}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Choose a new password for your account.</p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          {tokenInfo?.name && (
            <div style={{ marginBottom: '1.25rem', padding: '0.75rem 1rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius)', fontSize: '0.9rem' }}>
              Resetting password for <strong>{tokenInfo.name}</strong> ({tokenInfo.email})
            </div>
          )}

          {error && (
            <div className="alert alert-danger" style={{ marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1rem' }}>
            <label className="form-label" htmlFor="new-password">New Password *</label>
            <input id="new-password" className="form-input" type="password" value={newPassword} onChange={e => setNewPw(e.target.value)} placeholder="Minimum 8 characters" required autoFocus />
          </div>

          <div style={{ marginBottom: '1.25rem' }}>
            <label className="form-label" htmlFor="confirm-password">Confirm Password *</label>
            <input id="confirm-password" className="form-input" type="password" value={confirmPassword} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter your password" required />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={saving}>
            {saving ? 'Resetting…' : 'Reset Password & Sign In'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <a href="/login">← Back to login</a>
          </p>
        </form>
      </div>
    </div>
  )
}
