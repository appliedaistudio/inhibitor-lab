import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Navigation, Clock, CloudSun, TrendingDown, RefreshCw } from 'lucide-react'
import backend from '../../api/backend'
import FrictionScoreBadge from '../ui/FrictionScoreBadge'
import WaitTimeBadge from '../ui/WaitTimeBadge'

export default function OptimalWindowCard() {
  const navigate = useNavigate()
  const [best, setBest] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState(null)
  const fetchingRef = useRef(false)

  const fetchBest = (lat = 39.9526, lng = -75.1652) => {
    if (fetchingRef.current) return
    fetchingRef.current = true
    setLoading(true)
    backend.get('/api/smart-suggest', { params: { lat, lng } })
      .then((r) => {
        if (r.data?.length) setBest(r.data[0])
        setLastUpdated(new Date())
      })
      .catch(() => {})
      .finally(() => {
        setLoading(false)
        fetchingRef.current = false
      })
  }

  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (pos) => fetchBest(pos.coords.latitude, pos.coords.longitude),
      () => fetchBest()
    )
  }, [])

  if (loading) {
    return (
      <div className="card h-48 animate-pulse">
        <div className="h-5 bg-slate-700 rounded w-1/2 mb-4" />
        <div className="h-8 bg-slate-700 rounded w-3/4 mb-3" />
        <div className="h-4 bg-slate-700 rounded w-2/3" />
      </div>
    )
  }

  if (!best) {
    return (
      <div className="card h-48 flex items-center justify-center text-slate-400 text-sm">
        Could not load suggestions.
      </div>
    )
  }

  return (
    <div className="card bg-gradient-to-br from-blue-900/40 to-slate-800 border-blue-700/40 relative overflow-hidden">
      {/* Glow accent */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      <div className="relative">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-green-400">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Best Slot Right Now
          </div>
          <button
            onClick={() => fetchBest()}
            className="text-slate-400 hover:text-white transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold leading-tight">{best.center_name}</h2>
            <p className="text-slate-400 text-sm mt-0.5">{best.address}</p>
          </div>
          <FrictionScoreBadge score={best.friction_score} large />
        </div>

        <div className="flex flex-wrap gap-4 text-sm mb-5">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Navigation className="w-4 h-4 text-blue-400" />
            <span>{best.travel_time_mins} min drive</span>
          </div>
          <WaitTimeBadge minutes={best.wait_time_mins} />
          <div className="flex items-center gap-1.5 text-slate-300">
            <CloudSun className="w-4 h-4 text-sky-400" />
            <span>{best.weather}</span>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => navigate(`/dashboard/book/${best.center_id}`, { state: { slot: best } })}
            className="btn-primary flex items-center gap-2 text-sm"
          >
            <Zap className="w-4 h-4" />
            Book This Slot
          </button>
          <button
            onClick={() => navigate('/dashboard/find-slot')}
            className="btn-secondary text-sm"
          >
            See All Options
          </button>
        </div>

        {lastUpdated && (
          <p className="text-slate-500 text-xs mt-4">
            Updated {lastUpdated.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
          </p>
        )}
      </div>
    </div>
  )
}
