import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Clock, Users, Phone, Search, ChevronRight } from 'lucide-react'
import logo from '../logo.png'
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
        <span>{used}/{total} slots</span>
      </div>
      <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Centers() {
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
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Navbar */}
      <nav className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center">
            <img src={logo} alt="PlasmIQ" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/auth/login" className="text-sm text-slate-400 hover:text-white transition-colors">Log In</Link>
            <Link to="/auth/register" className="btn-primary !py-2 !px-4 text-sm">Get Started</Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-800 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl sm:text-4xl font-bold mb-3">CSL Plasma Centers</h1>
          <p className="text-slate-400 mb-8">Find a donation center near you with real-time wait times.</p>

          {/* Search */}
          <div className="relative max-w-md mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by city, state, or name…"
              className="input-field pl-11 w-full"
            />
          </div>
        </div>
      </div>

      {/* Centers Grid */}
      <div className="max-w-6xl mx-auto px-4 py-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-slate-700 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-700 rounded w-full mb-2" />
                <div className="h-4 bg-slate-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <MapPin className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No centers found matching "{search}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((c) => (
              <div key={c.id} className="card hover:border-blue-600/50 transition-all duration-200 flex flex-col">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-blue-400" />
                  </div>
                  <WaitBadge minutes={c.current_wait_time} />
                </div>

                <h3 className="font-semibold text-base leading-snug mb-1">{c.name}</h3>
                <p className="text-slate-400 text-sm mb-3">{c.address}</p>

                <div className="flex items-center gap-4 text-sm text-slate-400 mt-auto">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {c.open_hours}
                  </span>
                </div>

                {c.phone && (
                  <div className="flex items-center gap-1 text-slate-400 text-sm mt-1.5">
                    <Phone className="w-3.5 h-3.5" />
                    {c.phone}
                  </div>
                )}

                <CapacityBar used={c.capacity_used} total={c.capacity} />

                <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                  <Link
                    to="/auth/register"
                    className="btn-primary flex-1 flex items-center justify-center gap-1 !py-2 text-sm"
                  >
                    Book Slot
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.address)}`}
                    target="_blank" rel="noopener noreferrer"
                    className="btn-secondary !py-2 !px-3 text-sm"
                  >
                    Directions
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
