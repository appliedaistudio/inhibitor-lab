import { useNavigate } from 'react-router-dom'
import { CalendarDays, MapPin, Clock, ChevronRight } from 'lucide-react'

function formatRelative(isoString) {
  const now = new Date()
  const target = new Date(isoString)
  const diffMs = target - now
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (diffMs < 0) return 'Passed'
  if (diffDays === 0) return diffHrs === 0 ? 'Very soon!' : `In ${diffHrs}h`
  if (diffDays === 1) return 'Tomorrow'
  return `In ${diffDays} days`
}

function formatDateTime(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  })
}

export default function NextAppointment({ appointment }) {
  const navigate = useNavigate()

  if (!appointment) {
    return (
      <div className="card h-full flex flex-col items-center justify-center text-center py-8">
        <CalendarDays className="w-10 h-10 text-slate-600 mb-3" />
        <p className="text-slate-400 text-sm mb-4">No upcoming appointments</p>
        <button
          onClick={() => navigate('/dashboard/find-slot')}
          className="btn-primary text-sm !py-2"
        >
          Book a Slot
        </button>
      </div>
    )
  }

  const relative = formatRelative(appointment.slot_time)
  const isUrgent = relative.startsWith('In') && (relative.includes('h') || relative === 'Tomorrow')

  return (
    <div className="card h-full flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">Next Appointment</h3>
        <span className={`text-sm font-bold ${isUrgent ? 'text-amber-400' : 'text-blue-400'}`}>
          {relative}
        </span>
      </div>

      <div className="flex-1">
        <h2 className="font-bold text-lg leading-tight mb-2">{appointment.center_name}</h2>

        <div className="flex items-center gap-1.5 text-slate-400 text-sm mb-1.5">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span>{appointment.center_address}</span>
        </div>

        <div className="flex items-center gap-1.5 text-slate-400 text-sm">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>{formatDateTime(appointment.slot_time)}</span>
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-700">
        <button
          onClick={() => navigate('/dashboard/appointments')}
          className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors"
        >
          View all appointments
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
