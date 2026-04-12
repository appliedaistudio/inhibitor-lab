import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapPin, Clock, Phone, Search, CalendarDays, ChevronRight, Users, Coins } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import backend from '../api/backend'

function WaitBadge({ minutes }) {
  if (minutes <= 10) return <span className="badge-green">~{minutes} min wait</span>
  if (minutes <= 20) return <span className="badge-amber">~{minutes} min wait</span>
  return <span className="badge-red">~{minutes} min wait</span>
}

function CapacityBar({ used, total }) {
  const pct = Math.min(100, Math.round((used / total) * 100))
  const color = pct < 50 ? 'bg-green-500' : pct < 80 ? 'bg-amber-500' : 'bg-red-500'
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>Capacity</span>
        <span>{used}/{total}</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function ManualBook() {
  const navigate = useNavigate()
  const [centers, setCenters] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    backend.get('/api/centers')
      .then((r) => setCenters(r.data))
      .catch(() => setCenters([]))
      .finally(() => setLoading(false))
  }, [])

  const filtered = centers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.address.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-blue-400" />
            Book an Appointment
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Pick a center, choose your date, and select any available slot.
          </p>
        </div>

        {/* Info banner */}
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 text-sm">
          <Coins className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-slate-300">
            Manual bookings earn <span className="text-amber-400 font-semibold">1,000 points</span>.
            Use <span className="text-blue-400 font-semibold">Find Best Slot</span> for AI-optimised picks that earn{' '}
            <span className="text-amber-400 font-semibold">1,500 points</span>.
          </div>
        </div>

        {/* Rules banner */}
        <div className="flex items-start gap-3 bg-slate-700/50 border border-slate-600 rounded-xl px-4 py-3 text-sm text-slate-300">
          <Users className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold text-white">Booking rules: </span>
            You must rest at least <span className="font-semibold">24 hours</span> between donations and can book a maximum of{' '}
            <span className="font-semibold">2 slots per week</span>.
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by center name or address…"
            className="input-field pl-11 w-full"
          />
        </div>

        {/* Centers grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card animate-pulse h-44" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card text-center py-12 text-slate-400">
            <MapPin className="w-8 h-8 mx-auto mb-3 opacity-40" />
            <p>No centers found{search ? ` matching "${search}"` : ''}.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <div key={c.id} className="card hover:border-blue-600/50 transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <WaitBadge minutes={c.current_wait_time} />
                </div>

                <h3 className="font-semibold text-base leading-snug mb-1">{c.name}</h3>
                <p className="text-slate-400 text-sm mb-2">{c.address}</p>

                <div className="flex flex-wrap gap-3 text-sm text-slate-400 mt-auto">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {c.open_hours}
                  </span>
                  {c.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5" />
                      {c.phone}
                    </span>
                  )}
                </div>

                <CapacityBar used={c.capacity_used} total={c.capacity} />

                <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                  <button
                    onClick={() => navigate(`/dashboard/book/${c.id}`)}
                    className="btn-primary flex-1 flex items-center justify-center gap-1 !py-2.5 text-sm"
                  >
                    Book Here
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary !py-2.5 !px-3 text-sm"
                  >
                    Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
