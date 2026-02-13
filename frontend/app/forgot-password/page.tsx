'use client'

import { useState } from 'react'
import { useTenant } from '@/lib/tenant'

const API_BASE = '/api/django'

export default function ForgotPasswordPage() {
  const tenant = useTenant()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await fetch(`${API_BASE}/auth/password-reset/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (res.ok) {
        setSent(true)
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.detail || 'Something went wrong. Please try again.')
      }
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 420, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📧</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', marginBottom: '0.75rem' }}>Check Your Email</h2>
        <p style={{ color: 'var(--color-text-muted)', marginBottom: '1.5rem', lineHeight: 1.6 }}>
          If an account exists for <strong>{email}</strong>, we&apos;ve sent a password reset link.
          Please check your inbox (and spam folder).
        </p>
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginBottom: '1rem' }}>
          The link expires in 48 hours.
        </p>
        <a href="/login" className="btn btn-primary" style={{ textDecoration: 'none' }}>Back to Login</a>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
      <div style={{ maxWidth: 420, width: '90%' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary-dark)', fontSize: '2rem' }}>{tenant.business_name}</h1>
          <p style={{ color: 'var(--color-text-muted)', marginTop: '0.5rem' }}>Enter your email and we&apos;ll send you a reset link.</p>
        </div>

        <form onSubmit={handleSubmit} className="card" style={{ padding: '2rem' }}>
          {error && (
            <div style={{ background: '#fee2e2', color: '#991b1b', padding: '0.75rem 1rem', borderRadius: 'var(--radius)', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}

          <div style={{ marginBottom: '1.25rem' }}>
            <label htmlFor="email">Email Address</label>
            <input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your.email@example.com" required autoFocus />
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
            <a href="/login">← Back to login</a>
          </p>
        </form>
      </div>
    </div>
  )
}
