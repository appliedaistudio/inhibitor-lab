import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, MapPin, Clock, CloudSun, Navigation, AlertCircle, TrendingDown } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import FrictionScoreBadge from '../components/ui/FrictionScoreBadge'
import WaitTimeBadge from '../components/ui/WaitTimeBadge'
import backend from '../api/backend'

export default function FindSlot() {
  const navigate = useNavigate()
  const [slots, setSlots] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [locationUsed, setLocationUsed] = useState(false)

  const fetchSlots = (lat, lng) => {
    setLoading(true)
    setError('')
    backend.get('/api/smart-suggest', { params: { lat, lng } })
      .then((r) => { setSlots(r.data); setLocationUsed(true) })
      .catch(() => setError('Could not fetch slot suggestions. Please try again.'))
      .finally(() => setLoading(false))
  }

  const handleGeolocate = () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => fetchSlots(pos.coords.latitude, pos.coords.longitude),
      () => {
        // Fallback to Philadelphia
        fetchSlots(39.9526, -75.1652)
      }
    )
  }

  useEffect(() => {
    handleGeolocate()
  }, [])

  return (
    <DashboardLayout>
      <div className="max-w-3xl space-y-6 pb-20 md:pb-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Find Best Slot
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            AI-ranked donation slots based on traffic, weather, and wait times right now.
          </p>
        </div>

        {/* Location bar */}
        <div className="card flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Navigation className="w-4 h-4 text-blue-400 shrink-0" />
            {locationUsed ? 'Using your current location' : 'Detecting location…'}
          </div>
          <button onClick={handleGeolocate} className="btn-secondary !py-1.5 !px-3 text-xs">
            Refresh
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Slot cards */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card animate-pulse">
                <div className="h-5 bg-slate-700 rounded w-2/3 mb-3" />
                <div className="h-4 bg-slate-700 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {slots.map((slot, i) => (
              <div
                key={slot.center_id}
                className={`card hover:border-blue-600/50 transition-all duration-200 ${
                  i === 0 ? 'border-green-500/40 bg-green-500/5' : ''
                }`}
              >
                {i === 0 && (
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-green-400 mb-3">
                    <TrendingDown className="w-3.5 h-3.5" />
                    Best Option Right Now
                  </div>
                )}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-base">{slot.center_name}</h3>
                    <div className="flex items-center gap-1 text-slate-400 text-sm mt-0.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      {slot.address}
                    </div>
                  </div>
                  <FrictionScoreBadge score={slot.friction_score} />
                </div>

                <div className="flex flex-wrap gap-3 mt-4 text-sm">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Navigation className="w-3.5 h-3.5 text-blue-400" />
                    <span>{slot.travel_time_mins} min drive</span>
                  </div>
                  <WaitTimeBadge minutes={slot.wait_time_mins} />
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <CloudSun className="w-3.5 h-3.5 text-sky-400" />
                    <span>{slot.weather}</span>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/dashboard/book/${slot.center_id}`, { state: { slot } })}
                  className="btn-primary w-full mt-4 !py-2.5 text-sm"
                >
                  Book This Slot
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
