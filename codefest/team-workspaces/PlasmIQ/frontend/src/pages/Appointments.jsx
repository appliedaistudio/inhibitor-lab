import { useEffect, useState } from 'react'
import { CalendarDays, MapPin, Clock, Navigation, CloudSun, Zap, Trash2, AlertCircle, Coins } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import WaitTimeBadge from '../components/ui/WaitTimeBadge'
import FrictionScoreBadge from '../components/ui/FrictionScoreBadge'
import { useAuth } from '../context/AuthContext'
import backend from '../api/backend'

function StatusBadge({ status }) {
  const map = {
    scheduled: 'badge-blue',
    completed: 'badge-green',
    cancelled: 'badge-red',
  }
  return <span className={map[status] || 'badge-blue'}>{status}</span>
}

function formatDateTime(iso) {
  const d = new Date(iso)
  return d.toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function Appointments() {
  const { refreshDonor } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(null)
  const [cancelMessage, setCancelMessage] = useState(null)

  const load = () => {
    setLoading(true)
    backend.get('/api/appointments')
      .then((r) => setAppointments(r.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [])

  const handleCancel = async (appt) => {
    const pts = appt.points_earned || 0
    const confirmMsg = pts > 0
      ? `Cancel this appointment? This will deduct ${pts.toLocaleString()} points from your balance.`
      : 'Cancel this appointment?'
    if (!confirm(confirmMsg)) return
    setCancelling(appt.id)
    setCancelMessage(null)
    try {
      const res = await backend.delete(`/api/appointments/${appt.id}`)
      const deducted = res.data?.points_deducted || 0
      if (deducted > 0) {
        setCancelMessage(`Appointment cancelled. ${deducted.toLocaleString()} points have been deducted from your balance.`)
      }
      await refreshDonor()
      load()
    } catch {
    } finally {
      setCancelling(null)
    }
  }

  const upcoming = appointments.filter((a) => a.status === 'scheduled')
    .sort((a, b) => new Date(a.slot_time) - new Date(b.slot_time))
  const past = appointments.filter((a) => a.status !== 'scheduled')
    .sort((a, b) => new Date(b.slot_time) - new Date(a.slot_time))

  const Card = ({ appt }) => (
    <div className="card space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <StatusBadge status={appt.status} />
            {appt.points_earned > 0 && (
              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                appt.status === 'cancelled'
                  ? 'bg-red-500/10 text-red-400 line-through'
                  : 'bg-amber-500/10 text-amber-400'
              }`}>
                <Coins className="w-3 h-3" />
                {appt.status === 'cancelled' ? `-${appt.points_earned.toLocaleString()}` : `+${appt.points_earned.toLocaleString()}`} pts
              </span>
            )}
          </div>
          <h3 className="font-semibold text-base">{appt.center_name}</h3>
          <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            {appt.center_address}
          </div>
        </div>
        {appt.status === 'scheduled' && (
          <button
            onClick={() => handleCancel(appt)}
            disabled={cancelling === appt.id}
            title={`Cancel — ${(appt.points_earned || 0).toLocaleString()} pts will be deducted`}
            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex items-center gap-2 text-sm text-slate-300">
        <Clock className="w-4 h-4 text-blue-400 shrink-0" />
        <span className="font-medium">{formatDateTime(appt.slot_time)}</span>
      </div>

      {/* RWD Snapshot */}
      {appt.rwd_snapshot && (
        <div className="bg-slate-700/50 rounded-xl p-3 border border-slate-600">
          <div className="text-xs text-slate-400 font-medium mb-2 flex items-center gap-1">
            <Zap className="w-3 h-3" />
            Conditions at Time of Booking
          </div>
          <div className="flex flex-wrap gap-3 text-sm">
            {appt.rwd_snapshot.travel_time_mins != null && (
              <span className="flex items-center gap-1 text-slate-300">
                <Navigation className="w-3.5 h-3.5 text-blue-400" />
                {appt.rwd_snapshot.travel_time_mins} min drive
              </span>
            )}
            {appt.rwd_snapshot.wait_time_mins != null && (
              <WaitTimeBadge minutes={appt.rwd_snapshot.wait_time_mins} />
            )}
            {appt.rwd_snapshot.weather && (
              <span className="flex items-center gap-1 text-slate-300">
                <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                {appt.rwd_snapshot.weather}
              </span>
            )}
            {appt.rwd_snapshot.friction_score != null && (
              <FrictionScoreBadge score={appt.rwd_snapshot.friction_score} />
            )}
          </div>
        </div>
      )}
    </div>
  )

  return (
    <DashboardLayout>
      <div className="max-w-2xl space-y-8 pb-20 md:pb-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-400" />
            My Appointments
          </h1>
          <p className="text-slate-400 text-sm mt-1">Track upcoming and past donation slots.</p>
        </div>

        {cancelMessage && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {cancelMessage}
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2].map((i) => <div key={i} className="card h-32 animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Upcoming */}
            <section>
              <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                Upcoming ({upcoming.length})
              </h2>
              {upcoming.length === 0 ? (
                <div className="card text-center text-slate-400 py-8">
                  <CalendarDays className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>No upcoming appointments.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {upcoming.map((a) => <Card key={a.id} appt={a} />)}
                </div>
              )}
            </section>

            {/* Past */}
            {past.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                  Past ({past.length})
                </h2>
                <div className="space-y-4">
                  {past.map((a) => <Card key={a.id} appt={a} />)}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
