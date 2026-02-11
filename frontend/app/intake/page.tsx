'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import '../booking/booking-compact.css'
import './intake.css'

const API_BASE = '/api/django'

interface IntakeProfile {
  full_name: string
  email: string
  phone: string
  emergency_contact_name: string
  emergency_contact_phone: string
  experience_level: string
  goals: string
  preferences: string
  consent_booking: boolean
  consent_marketing: boolean
  consent_privacy: boolean
}

interface Disclaimer {
  version: string
  content: string
}

function IntakeForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnEmail = searchParams.get('email') || ''
  const returnTo = searchParams.get('return') || ''

  const [disclaimer, setDisclaimer] = useState<Disclaimer | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const [formData, setFormData] = useState<IntakeProfile>({
    full_name: '',
    email: returnEmail,
    phone: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    experience_level: '',
    goals: '',
    preferences: '',
    consent_booking: false,
    consent_marketing: false,
    consent_privacy: false,
  })

  useEffect(() => {
    fetchDisclaimer()
  }, [])

  const fetchDisclaimer = async () => {
    try {
      const response = await fetch(`${API_BASE}/intake-disclaimer/active/`)
      if (response.ok) {
        const data = await response.json()
        setDisclaimer(data)
      }
    } catch (err) {
      console.error('Failed to fetch disclaimer:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!formData.full_name || !formData.email || !formData.phone) {
      setError('Please fill in all required fields')
      return
    }
    if (!formData.emergency_contact_name || !formData.emergency_contact_phone) {
      setError('Emergency contact information is required for your safety')
      return
    }
    if (!formData.consent_booking) {
      setError('You must consent to booking to proceed')
      return
    }
    if (!formData.consent_privacy) {
      setError('You must accept the privacy policy to proceed')
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`${API_BASE}/intake/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.detail || 'Failed to submit intake form')
      }

      if (returnTo === 'booking') {
        router.push(`/booking?email=${encodeURIComponent(formData.email)}&intake_complete=true`)
      } else {
        router.push(`/booking?email=${encodeURIComponent(formData.email)}`)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit intake form. Please try again.')
      setSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target
    const checked = (e.target as HTMLInputElement).checked
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  if (loading) {
    return (
      <div className="booking-container">
        <div className="booking-header">
          <h1>The Mind Department</h1>
          <p>Wellness Session Intake</p>
        </div>
        <div style={{textAlign: 'center', padding: '2rem'}}><p>Loading...</p></div>
      </div>
    )
  }

  return (
    <div className="booking-container">
      <div className="booking-header">
        <img src="/assets/Logo idea.svg" alt="The Mind Department" style={{maxWidth: '200px', marginBottom: '10px'}} />
        <h1>The Mind Department</h1>
        <p>Welcome - Let us Get Started</p>
      </div>

      <div className="intake-container">
        <div className="intake-intro">
          <h2>Before Your First Session</h2>
          <p>To ensure your safety and provide the best possible experience, we need to collect some basic information. This will only take a few minutes and you will only need to complete this once.</p>
        </div>

        {disclaimer && (
          <div className="disclaimer-box">
            <h3>Important Information</h3>
            <div className="disclaimer-content" dangerouslySetInnerHTML={{ __html: disclaimer.content }} />
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
            <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>x</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="intake-form">
          <section className="form-section">
            <h3>Your Information</h3>
            <div className="form-group">
              <label>Full Name *</label>
              <input type="text" name="full_name" value={formData.full_name} onChange={handleChange} placeholder="Your full name" required />
            </div>
            <div className="form-group">
              <label>Email Address *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} placeholder="your.email@example.com" required />
            </div>
            <div className="form-group">
              <label>Phone Number *</label>
              <input type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="Your phone number" required />
            </div>
          </section>

          <section className="form-section">
            <h3>Emergency Contact</h3>
            <p className="section-description">For your safety, we require emergency contact information.</p>
            <div className="form-group">
              <label>Emergency Contact Name *</label>
              <input type="text" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} placeholder="Contact person's name" required />
            </div>
            <div className="form-group">
              <label>Emergency Contact Phone *</label>
              <input type="tel" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} placeholder="Contact person's phone" required />
            </div>
          </section>

          <section className="form-section">
            <h3>Session Preferences (Optional)</h3>
            <p className="section-description">Help us personalize your experience.</p>
            <div className="form-group">
              <label>Experience Level</label>
              <input type="text" name="experience_level" value={formData.experience_level} onChange={handleChange} placeholder="e.g., First time, Some experience, Regular practitioner" />
            </div>
            <div className="form-group">
              <label>Your Goals</label>
              <textarea name="goals" value={formData.goals} onChange={handleChange} placeholder="What would you like to achieve from your sessions? (Optional)" rows={3} />
            </div>
            <div className="form-group">
              <label>Preferences or Notes</label>
              <textarea name="preferences" value={formData.preferences} onChange={handleChange} placeholder="Any preferences or notes for your facilitator? (Optional)" rows={3} />
            </div>
          </section>

          <section className="form-section">
            <h3>Consent and Privacy</h3>
            <div className="checkbox-group">
              <input type="checkbox" id="consent_booking" name="consent_booking" checked={formData.consent_booking} onChange={handleChange} required />
              <label htmlFor="consent_booking">I consent to booking sessions and storing my booking data *</label>
            </div>
            <div className="checkbox-group">
              <input type="checkbox" id="consent_privacy" name="consent_privacy" checked={formData.consent_privacy} onChange={handleChange} required />
              <label htmlFor="consent_privacy">I have read and accept the <a href="/terms.html" target="_blank" style={{textDecoration: 'underline'}}>privacy policy</a> *</label>
            </div>
            <div className="checkbox-group">
              <input type="checkbox" id="consent_marketing" name="consent_marketing" checked={formData.consent_marketing} onChange={handleChange} />
              <label htmlFor="consent_marketing">I would like to receive updates and wellness information (optional)</label>
            </div>
          </section>

          <div className="form-actions">
            <button type="submit" className="submit-button" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Complete Intake & Continue to Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function IntakePage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <IntakeForm />
    </Suspense>
  )
}
