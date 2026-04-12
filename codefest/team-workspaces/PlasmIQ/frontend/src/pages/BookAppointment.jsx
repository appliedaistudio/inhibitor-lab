import { useState, useEffect, useCallback } from 'react'
import { useParams, useLocation, useNavigate } from 'react-router-dom'
import {
  MapPin, Clock, CheckCircle2, Circle, CalendarDays,
  AlertCircle, ChevronLeft, Droplets, Users, Loader2, Ban, Info
} from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import FrictionScoreBadge from '../components/ui/FrictionScoreBadge'
import WaitTimeBadge from '../components/ui/WaitTimeBadge'
import { useAuth } from '../context/AuthContext'
import backend from '../api/backend'

const PRESCREENING = [
  { id: 'ate',       label: 'I have eaten a nutritious meal today' },
  { id: 'hydrated',  label: 'I have drunk at least 16 oz of water today' },
  { id: 'slept',     label: 'I have had at least 7–8 hours of sleep' },
  { id: 'healthy',   label: 'I feel healthy with no fever or illness' },
  { id: 'noalcohol', label: 'I have not consumed alcohol in the last 24 hours' },
]

function getTomorrowDate() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  return d.toISOString().split('T')[0]
}

function SlotButton({ slot, selected, onClick }) {
  if (slot.full) {
    return (
      <div className="relative py-2 px-1 rounded-xl text-xs font-medium border border-slate-700/50 bg-slate-800/40 text-slate-600 cursor-not-allowed text-center">
        <span className="block">{slot.time}</span>
        <span className="flex items-center justify-center gap-0.5 mt-0.5 text-slate-600">
          <Ban className="w-2.5 h-2.5" /> Full
        </span>
      </div>
    )
  }

  const spotsLeft = slot.available
  const isAlmostFull = spotsLeft <= 2

  return (
    <button
      onClick={onClick}
      className={`py-2 px-1 rounded-xl text-xs font-medium border transition-all text-center ${
        selected
          ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
          : isAlmostFull
          ? 'border-amber-500/40 bg-amber-500/5 text-amber-300 hover:border-amber-400 hover:bg-amber-500/10'
          : 'border-slate-600 text-slate-300 hover:border-blue-500 hover:text-white hover:bg-blue-500/5'
      }`}
    >
      <span className="block">{slot.time}</span>
      <span className={`flex items-center justify-center gap-0.5 mt-0.5 ${selected ? 'text-blue-200' : isAlmostFull ? 'text-amber-400' : 'text-slate-500'}`}>
        <Users className="w-2.5 h-2.5" />
        {spotsLeft}
      </span>
    </button>
  )
}

export default function BookAppointment() {
  const { centerId } = useParams()
  const { state } = useLocation()
  const navigate = useNavigate()
  const { refreshDonor } = useAuth()

  const [center, setCenter] = useState(null)
  const [centerLoading, setCenterLoading] = useState(true)
  const [checks, setChecks] = useState({})
  const [date, setDate] = useState(getTomorrowDate())
  const [slots, setSlots] = useState([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [slotsError, setSlotsError] = useState('')
  const [selectedTime, setSelectedTime] = useState('')
  const [booking, setBooking] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [pointsEarnedActual, setPointsEarnedActual] = useState(0)

  const slot = state?.slot

  // Load center info
  useEffect(() => {
    backend.get(`/api/centers/${centerId}`)
      .then((r) => setCenter(r.data))
      .catch(() => setError('Center not found.'))
      .finally(() => setCenterLoading(false))
  }, [centerId])

  // Load slots whenever date changes
  const fetchSlots = useCallback((d) => {
    setSlotsLoading(true)
    setSlotsError('')
    setSelectedTime('')
    backend.get(`/api/slots/${centerId}`, { params: { date: d } })
      .then((r) => {
        if (!r.data.day_active) {
          setSlotsError('This center is closed on the selected day.')
          setSlots([])
        } else {
          setSlots(r.data.slots || [])
        }
      })
      .catch(() => setSlotsError('Could not load available slots. Please try again.'))
      .finally(() => setSlotsLoading(false))
  }, [centerId])

  useEffect(() => {
    if (centerId) fetchSlots(date)
  }, [date, centerId, fetchSlots])

  const allChecked = PRESCREENING.every((p) => checks[p.id])

  const handleBook = async () => {
    if (!allChecked) { setError('Please complete all pre-screening checks.'); return }
    if (!selectedTime) { setError('Please select a time slot.'); return }
    setError('')
    setBooking(true)
    try {
      const res = await backend.post('/api/appointments', {
        center_id: centerId,
        slot_time: `${date}T${selectedTime}:00`,
        rwd_snapshot: slot ? {
          travel_time_mins: slot.travel_time_mins,
          wait_time_mins: slot.wait_time_mins,
          weather: slot.weather,
          friction_score: slot.friction_score,
        } : null,
      })
      setPointsEarnedActual(res.data?.points_earned || pointsEarned)
      await refreshDonor()
      setSuccess(true)
    } catch (err) {
      const detail = err.response?.data?.detail || 'Booking failed. Please try again.'
      setError(detail)
    } finally {
      setBooking(false)
    }
  }

  const pointsEarned = slot ? 1500 : 1000

  if (success) {
    return (
      <DashboardLayout>
        <div className="max-w-md mx-auto text-center py-16">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Appointment Confirmed!</h2>
          <p className="text-slate-400 mb-3">
            {center?.name} · {date} at {selectedTime}
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold mb-6 bg-amber-500/20 text-amber-400">
            +{pointsEarnedActual.toLocaleString()} points added to your balance
          </div>
          <div className="flex gap-3 justify-center">
            <button onClick={() => navigate('/dashboard/appointments')} className="btn-primary">
              View Appointments
            </button>
            <button onClick={() => navigate('/dashboard')} className="btn-secondary">
              Dashboard
            </button>
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="max-w-xl space-y-6 pb-20 md:pb-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="btn-secondary !py-2 !px-3">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Book Appointment</h1>
            <p className="text-slate-400 text-sm">Pre-screen & pick a slot</p>
          </div>
        </div>

        {/* Booking rules */}
        <div className="flex items-start gap-3 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-300">
          <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <span>
            Min. <span className="font-semibold text-white">24 hrs rest</span> between donations ·
            Max <span className="font-semibold text-white">2 bookings per week</span> ·
            Earns <span className="font-semibold text-amber-400">{slot ? '1,500' : '1,000'} pts</span>
          </span>
        </div>

        {/* Center info */}
        {centerLoading ? (
          <div className="card animate-pulse h-28" />
        ) : center ? (
          <div className="card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-semibold text-lg">{center.name}</h2>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {center.address}
                </div>
                <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                  {center.open_hours}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <WaitTimeBadge minutes={center.current_wait_time} />
                {slot && <FrictionScoreBadge score={slot.friction_score} />}
              </div>
            </div>
          </div>
        ) : null}

        {/* Pre-screening */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <Droplets className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Health Pre-Screening</h3>
          </div>
          <p className="text-slate-400 text-sm mb-4">
            Please confirm all of the following before booking:
          </p>
          <div className="space-y-3">
            {PRESCREENING.map((p) => (
              <button
                key={p.id}
                onClick={() => setChecks((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                  checks[p.id]
                    ? 'border-green-500/40 bg-green-500/10 text-white'
                    : 'border-slate-700 hover:border-slate-600 text-slate-300'
                }`}
              >
                {checks[p.id]
                  ? <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0" />
                  : <Circle className="w-5 h-5 text-slate-500 shrink-0" />}
                <span className="text-sm">{p.label}</span>
              </button>
            ))}
          </div>
          {allChecked && (
            <div className="mt-4 text-center text-green-400 text-sm font-medium">
              Pre-screening complete — you're good to go!
            </div>
          )}
        </div>

        {/* Date & Slot picker */}
        <div className="card">
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-blue-400" />
            <h3 className="font-semibold">Choose Date & Time</h3>
          </div>

          {/* Date */}
          <div className="mb-5">
            <label className="block text-sm text-slate-400 mb-1.5">Date</label>
            <input
              type="date"
              value={date}
              min={getTomorrowDate()}
              onChange={(e) => setDate(e.target.value)}
              className="input-field"
            />
          </div>

          {/* Slot grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-slate-400">Available Slots</label>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> spots left</span>
                <span className="flex items-center gap-1 text-amber-400">amber = almost full</span>
              </div>
            </div>

            {slotsLoading ? (
              <div className="flex items-center justify-center py-8 text-slate-400 gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-sm">Loading slots…</span>
              </div>
            ) : slotsError ? (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-amber-400 text-sm">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {slotsError}
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-6 text-slate-500 text-sm">
                No slots configured for this date.
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                {slots.map((s) => (
                  <SlotButton
                    key={s.time}
                    slot={s}
                    selected={selectedTime === s.time}
                    onClick={() => { setSelectedTime(s.time); setError('') }}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <button
          onClick={handleBook}
          disabled={booking || !allChecked || !selectedTime}
          className="btn-primary w-full"
        >
          {booking ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Booking…
            </span>
          ) : (
            `Confirm Appointment${selectedTime ? ` at ${selectedTime}` : ''}`
          )}
        </button>
      </div>
    </DashboardLayout>
  )
}
