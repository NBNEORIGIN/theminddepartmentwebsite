'use client'

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import './booking-compact.css'

const API_BASE = '/api/django'

interface Service {
  id: number
  name: string
  description: string
  duration_minutes: number
  price: string
  active: boolean
}

interface Staff {
  id: number
  name: string
  email: string
  photo_url?: string
  active: boolean
}

export default function CompactBookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  
  const [selectedService, setSelectedService] = useState<Service | null>(null)
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedTime, setSelectedTime] = useState<string>('')
  
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [consent, setConsent] = useState(false)
  
  const [bookingComplete, setBookingComplete] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [availableSlots, setAvailableSlots] = useState<string[]>([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [paymentStatus, setPaymentStatus] = useState<string>('')
  const [confirmationDetails, setConfirmationDetails] = useState<any>(null)

  useEffect(() => {
    fetchData()
    const urlParams = new URLSearchParams(window.location.search)
    const emailParam = urlParams.get('email')
    const intakeComplete = urlParams.get('intake_complete')
    const payment = urlParams.get('payment')
    const bookingId = urlParams.get('booking_id')
    if (emailParam) {
      setCustomerEmail(emailParam)
    }
    if (payment === 'success' && bookingId) {
      // Restore booking details saved before Stripe redirect
      try {
        const saved = localStorage.getItem('pending_booking')
        if (saved) {
          setConfirmationDetails(JSON.parse(saved))
          localStorage.removeItem('pending_booking')
        }
      } catch {}
      setBookingComplete(true)
      setPaymentStatus('success')
      window.history.replaceState({}, '', '/booking')
    } else if (payment === 'cancelled') {
      setError('Payment was cancelled. Your booking has not been confirmed. Please try again.')
      window.history.replaceState({}, '', '/booking')
    } else if (intakeComplete === 'true') {
      window.history.replaceState({}, '', '/booking')
    }
  }, [])

  const fetchData = async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        fetch(`${API_BASE}/services/`),
        fetch(`${API_BASE}/staff/`)
      ])
      if (!servicesRes.ok || !staffRes.ok) throw new Error('Failed to fetch data')
      const servicesData = await servicesRes.json()
      const staffData = await staffRes.json()
      setServices(servicesData.filter((s: Service) => s.active))
      setStaff(staffData.filter((s: Staff) => s.active))
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const generateTimeSlots = () => {
    const slots = []
    for (let hour = 9; hour < 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`)
      }
    }
    return slots
  }

  const fetchAvailableSlots = async () => {
    if (!selectedService || !selectedStaff || !selectedDate) {
      setAvailableSlots([])
      return
    }
    setLoadingSlots(true)
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd')
      const response = await fetch(
        `${API_BASE}/bookings/slots/?service_id=${selectedService.id}&staff_id=${selectedStaff.id}&date=${dateStr}`
      )
      if (response.ok) {
        const data = await response.json()
        const times = data.slots.map((slot: any) => {
          const startTime = new Date(slot.start_time)
          return format(startTime, 'HH:mm')
        })
        setAvailableSlots(times)
      } else {
        setAvailableSlots([])
      }
    } catch (err) {
      console.error('Failed to fetch available slots:', err)
      setAvailableSlots([])
    } finally {
      setLoadingSlots(false)
    }
  }

  useEffect(() => {
    fetchAvailableSlots()
  }, [selectedService, selectedStaff, selectedDate])

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()
    const days: (Date | null)[] = []
    for (let i = 0; i < startingDayOfWeek; i++) days.push(null)
    for (let day = 1; day <= daysInMonth; day++) days.push(new Date(year, month, day))
    return days
  }

  const changeMonth = (direction: number) => {
    const newMonth = new Date(currentMonth)
    newMonth.setMonth(newMonth.getMonth() + direction)
    setCurrentMonth(newMonth)
  }

  const isDateSelectable = (date: Date) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return date >= today
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!selectedService || !selectedStaff || !selectedDate || !selectedTime) {
      setError('Please complete all booking details')
      return
    }
    if (!customerName || !customerEmail || !customerPhone) {
      setError('Please fill in all contact details')
      return
    }
    if (!consent) {
      setError('Please accept the terms and conditions')
      return
    }

    setSubmitting(true)

    try {
      // Check intake form status
      const intakeCheckRes = await fetch(`${API_BASE}/intake/status/?email=${encodeURIComponent(customerEmail)}`)
      if (intakeCheckRes.ok) {
        const intakeStatus = await intakeCheckRes.json()
        if (!intakeStatus.is_valid_for_booking) {
          setSubmitting(false)
          window.location.href = `/intake?email=${encodeURIComponent(customerEmail)}&return=booking`
          return
        }
      } else {
        setSubmitting(false)
        window.location.href = `/intake?email=${encodeURIComponent(customerEmail)}&return=booking`
        return
      }

      const bookingData = {
        service_id: selectedService.id,
        staff_id: selectedStaff.id,
        date: format(selectedDate, 'yyyy-MM-dd'),
        time: selectedTime,
        client_name: customerName,
        client_email: customerEmail,
        client_phone: customerPhone,
        notes: notes,
      }

      // Use Stripe Checkout for paid services
      const response = await fetch(`${API_BASE}/checkout/create/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bookingData),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to create booking')
      }

      const result = await response.json()

      // Save booking summary for confirmation page
      const summary = {
        serviceName: selectedService.name,
        staffName: selectedStaff.name,
        date: format(selectedDate, 'EEEE, MMMM d, yyyy'),
        time: selectedTime,
        price: selectedService.price,
        duration: selectedService.duration_minutes,
      }

      if (result.free) {
        // Free service — confirmed immediately
        setConfirmationDetails(summary)
        setBookingComplete(true)
      } else if (result.checkout_url) {
        // Paid service — save details then redirect to Stripe Checkout
        localStorage.setItem('pending_booking', JSON.stringify(summary))
        window.location.href = result.checkout_url
      } else {
        throw new Error('Unexpected response from server')
      }
    } catch (err: any) {
      setError(err.message)
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="booking-container">
        <div className="booking-header">
          <h1>The Mind Department</h1>
          <p>Loading...</p>
        </div>
      </div>
    )
  }

  if (bookingComplete) {
    const cd = confirmationDetails
    return (
      <div className="booking-container">
        <div className="success-message">
          <h2>Session Confirmed!</h2>
          <p>Your wellness session has been successfully booked.</p>
          {cd ? (
            <>
              <p><strong>Service:</strong> {cd.serviceName}</p>
              <p><strong>Facilitator:</strong> {cd.staffName}</p>
              <p><strong>Date:</strong> {cd.date}</p>
              <p><strong>Time:</strong> {cd.time}</p>
              <p><strong>Duration:</strong> {cd.duration} minutes</p>
              <p><strong>Total:</strong> {Number(cd.price) > 0 ? `\u00A3${cd.price}` : 'Free'}</p>
            </>
          ) : (
            <p>A confirmation email has been sent with your booking details.</p>
          )}
          <button className="submit-button" onClick={() => window.location.reload()}>
            Book Another Session
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="booking-container">
      <div className="booking-header">
        <img src="/assets/Logo idea.svg" alt="The Mind Department" style={{maxWidth: '200px', marginBottom: '10px'}} />
        <h1>The Mind Department</h1>
        <p className="subtitle">Wellness Sessions - Book Your Experience</p>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer' }}>x</button>
        </div>
      )}

      <div className="booking-grid">
        {/* Service Selection */}
        <div className="booking-section">
          <h2>1. Choose Session Type</h2>
          <div className="compact-service-grid">
            {services.map((service) => (
              <div
                key={service.id}
                className={`compact-service-card ${selectedService?.id === service.id ? 'selected' : ''}`}
                onClick={() => { setSelectedService(service); setSelectedStaff(null); setSelectedTime('') }}
              >
                <h3>{service.name}</h3>
                <div className="price">{Number(service.price) > 0 ? `\u00A3${service.price}` : 'Contact for pricing'}</div>
                <div className="duration">{service.duration_minutes} min</div>
              </div>
            ))}
          </div>
        </div>

        {/* Staff Selection */}
        <div className="booking-section">
          <h2>2. Choose Facilitator</h2>
          <div className="staff-grid">
            {staff.filter((member: any) => {
              if (!selectedService) return true
              // If staff has services array, filter by selected service
              if (member.services && Array.isArray(member.services)) {
                return member.services.some((s: any) => s.id === selectedService.id)
              }
              // If staff has service_ids array, filter by selected service
              if (member.service_ids && Array.isArray(member.service_ids)) {
                return member.service_ids.includes(selectedService.id)
              }
              return true
            }).map((member) => (
              <div
                key={member.id}
                className={`staff-card ${selectedStaff?.id === member.id ? 'selected' : ''}`}
                onClick={() => setSelectedStaff(member)}
              >
                {member.photo_url ? (
                  <img src={member.photo_url} alt={member.name} className="staff-photo" />
                ) : (
                  <div className="staff-photo-placeholder">
                    {member.name.charAt(0)}
                  </div>
                )}
                <div className="staff-info">
                  <h3>{member.name}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Date Selection */}
        <div className="booking-section">
          <h2>3. Choose Date</h2>
          <div className="calendar-container">
            <div className="calendar-header">
              <button onClick={() => changeMonth(-1)} className="calendar-nav">&lsaquo;</button>
              <h3>{format(currentMonth, 'MMMM yyyy')}</h3>
              <button onClick={() => changeMonth(1)} className="calendar-nav">&rsaquo;</button>
            </div>
            <div className="calendar-weekdays">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                <div key={day} className="calendar-weekday">{day}</div>
              ))}
            </div>
            <div className="calendar-grid">
              {getDaysInMonth(currentMonth).map((date, index) => {
                if (!date) return <div key={`empty-${index}`} className="calendar-day empty"></div>
                const isSelectable = isDateSelectable(date)
                const isSelected = selectedDate && format(selectedDate, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
                return (
                  <button
                    key={date.toISOString()}
                    className={`calendar-day ${isSelected ? 'selected' : ''} ${!isSelectable ? 'disabled' : ''}`}
                    onClick={() => isSelectable && setSelectedDate(date)}
                    disabled={!isSelectable}
                  >
                    {format(date, 'd')}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Time Selection */}
        <div className="booking-section">
          <h2>4. Choose Time</h2>
          {loadingSlots ? (
            <p>Loading available times...</p>
          ) : (
            <div className="time-slots">
              {generateTimeSlots().map((time) => {
                const isAvailable = availableSlots.includes(time)
                const isDisabled = !!(selectedService && selectedStaff && selectedDate && !isAvailable)
                return (
                  <button
                    key={time}
                    className={`time-slot ${selectedTime === time ? 'selected' : ''} ${isDisabled ? 'disabled' : ''}`}
                    onClick={() => isAvailable && setSelectedTime(time)}
                    disabled={isDisabled}
                  >
                    {time}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Customer Details */}
      <div className="booking-section" style={{ marginTop: '20px' }}>
        <h2>5. Your Details</h2>
        <div className="customer-form">
          <div className="form-group">
            <label>Name *</label>
            <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your full name" />
          </div>
          <div className="form-group">
            <label>Email *</label>
            <input type="email" value={customerEmail} onChange={(e) => setCustomerEmail(e.target.value)} placeholder="your.email@example.com" />
          </div>
          <div className="form-group">
            <label>Phone *</label>
            <input type="tel" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="07XXX XXXXXX" />
          </div>
          <div className="form-group">
            <label>Notes (optional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any special requests or notes" rows={3} />
          </div>
          <div className="checkbox-group">
            <input type="checkbox" id="consent" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
            <label htmlFor="consent">I agree to the <a href="/terms.html" target="_blank" style={{textDecoration: 'underline'}}>terms and conditions</a></label>
          </div>
        </div>
      </div>

      {/* Summary and Submit */}
      {selectedService && selectedStaff && selectedDate && selectedTime && (
        <div className="booking-summary">
          <h2>Booking Summary</h2>
          <div className="summary-item">
            <span>Service:</span>
            <span>{selectedService.name}</span>
          </div>
          <div className="summary-item">
            <span>Facilitator:</span>
            <span>{selectedStaff.name}</span>
          </div>
          <div className="summary-item">
            <span>Date:</span>
            <span>{format(selectedDate, 'EEE, d MMM yyyy')}</span>
          </div>
          <div className="summary-item">
            <span>Time:</span>
            <span>{selectedTime}</span>
          </div>
          <div className="summary-item">
            <span>Duration:</span>
            <span>{selectedService.duration_minutes} min</span>
          </div>
          <div className="summary-item">
            <span>Total:</span>
            <span>{Number(selectedService.price) > 0 ? `\u00A3${selectedService.price}` : 'Contact for pricing'}</span>
          </div>
          <button
            className="submit-button"
            onClick={handleSubmit}
            disabled={submitting || !consent || !customerName || !customerEmail || !customerPhone}
          >
            {submitting ? 'Processing...' : Number(selectedService.price) > 0 ? `Pay \u00A3${selectedService.price} & Confirm` : 'Confirm Booking'}
          </button>
        </div>
      )}
    </div>
  )
}
