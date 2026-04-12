import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { GoogleMap, useJsApiLoader, MarkerF, InfoWindowF } from '@react-google-maps/api'
import { MapPin, ExternalLink } from 'lucide-react'
import WaitTimeBadge from '../ui/WaitTimeBadge'

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY

const MAP_OPTIONS = {
  disableDefaultUI: true,
  zoomControl: true,
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
    { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
    { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
    { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  ],
}

// Color-code marker by wait time
function markerColor(wait) {
  if (wait <= 10) return 'http://maps.google.com/mapfiles/ms/icons/green-dot.png'
  if (wait <= 25) return 'http://maps.google.com/mapfiles/ms/icons/yellow-dot.png'
  return 'http://maps.google.com/mapfiles/ms/icons/red-dot.png'
}

function shortName(name) {
  return name.replace(/CSL Plasma\s*[–-]\s*/i, '')
}

function InteractiveMap({ centers }) {
  const navigate = useNavigate()
  const [selected, setSelected] = useState(null)
  const [map, setMap] = useState(null)

  const onLoad = useCallback((m) => {
    setMap(m)
    if (centers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      centers.forEach((c) => bounds.extend({ lat: c.latitude, lng: c.longitude }))
      m.fitBounds(bounds, 60)
    }
  }, [centers])

  return (
    <GoogleMap
      mapContainerClassName="w-full rounded-xl mb-4"
      mapContainerStyle={{ height: '220px' }}
      options={MAP_OPTIONS}
      onLoad={onLoad}
    >
      {centers.map((c) => (
        <MarkerF
          key={c.id}
          position={{ lat: c.latitude, lng: c.longitude }}
          icon={markerColor(c.current_wait_time)}
          onClick={() => setSelected(c)}
        />
      ))}

      {selected && (
        <InfoWindowF
          position={{ lat: selected.latitude, lng: selected.longitude }}
          onCloseClick={() => setSelected(null)}
          options={{ pixelOffset: new window.google.maps.Size(0, -32) }}
        >
          <div className="text-slate-900 text-xs" style={{ minWidth: 160 }}>
            <p className="font-semibold text-sm mb-1">{shortName(selected.name)}</p>
            <p className="text-slate-600 mb-2">{selected.address.split(',').slice(0, 2).join(',')}</p>
            <p className="mb-2">
              Wait: <span className={`font-bold ${selected.current_wait_time <= 10 ? 'text-green-600' : selected.current_wait_time <= 25 ? 'text-amber-600' : 'text-red-600'}`}>
                {selected.current_wait_time} min
              </span>
            </p>
            <button
              onClick={() => navigate(`/dashboard/book/${selected.id}`)}
              style={{ background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 10px', cursor: 'pointer', fontSize: 12 }}
            >
              Book Slot
            </button>
          </div>
        </InfoWindowF>
      )}
    </GoogleMap>
  )
}

function MapFallback({ centers }) {
  const navigate = useNavigate()
  return (
    <div>
      <div className="bg-slate-700/40 rounded-xl overflow-hidden mb-4">
        <div className="h-44 flex items-center justify-center text-slate-500 text-sm flex-col gap-2">
          <MapPin className="w-8 h-8 opacity-30" />
          <span>Add VITE_GOOGLE_MAPS_KEY to enable map</span>
          <a
            href="https://www.google.com/maps/search/CSL+Plasma"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1 text-blue-400 text-xs hover:underline"
          >
            Open in Google Maps <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
      <div className="space-y-2">
        {centers.slice(0, 4).map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/dashboard/book/${c.id}`)}
            className="flex items-center justify-between p-3 bg-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 bg-blue-500/20 rounded-lg flex items-center justify-center shrink-0">
                <MapPin className="w-3.5 h-3.5 text-blue-400" />
              </div>
              <div>
                <div className="text-sm font-medium leading-tight">{shortName(c.name)}</div>
                <div className="text-xs text-slate-400">{c.address.split(',').slice(-2).join(',').trim()}</div>
              </div>
            </div>
            <WaitTimeBadge minutes={c.current_wait_time} />
          </div>
        ))}
      </div>
    </div>
  )
}

function MapWithLoader({ centers }) {
  const navigate = useNavigate()
  const { isLoaded, loadError } = useJsApiLoader({
    googleMapsApiKey: GOOGLE_KEY,
    id: 'plasmaiq-map',
  })

  if (loadError || !isLoaded) {
    return (
      <div>
        <div className="bg-slate-700/40 rounded-xl h-44 flex items-center justify-center mb-4">
          {loadError
            ? <span className="text-red-400 text-sm">Map failed to load — check your API key</span>
            : <span className="text-slate-500 text-sm animate-pulse">Loading map…</span>
          }
        </div>
        <div className="space-y-2">
          {centers.slice(0, 4).map((c) => (
            <div
              key={c.id}
              onClick={() => navigate(`/dashboard/book/${c.id}`)}
              className="flex items-center justify-between p-3 bg-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                <span className="text-sm font-medium">{shortName(c.name)}</span>
              </div>
              <WaitTimeBadge minutes={c.current_wait_time} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <InteractiveMap centers={centers} />
      <div className="space-y-2">
        {centers.slice(0, 4).map((c) => (
          <div
            key={c.id}
            onClick={() => navigate(`/dashboard/book/${c.id}`)}
            className="flex items-center justify-between p-3 bg-slate-700/40 rounded-xl cursor-pointer hover:bg-slate-700 transition-colors"
          >
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span className="text-sm font-medium">{shortName(c.name)}</span>
            </div>
            <WaitTimeBadge minutes={c.current_wait_time} />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function CenterMap({ centers = [] }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider">
          Nearby Centers
        </h3>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> &lt;10 min
            <span className="w-2 h-2 rounded-full bg-amber-400 inline-block ml-1" /> 10–25
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block ml-1" /> 25+
          </div>
          <span className="badge-blue">{centers.length} open</span>
        </div>
      </div>

      {centers.length === 0 ? (
        <div className="h-44 flex items-center justify-center text-slate-500 text-sm animate-pulse">
          Loading centers…
        </div>
      ) : GOOGLE_KEY ? (
        <MapWithLoader centers={centers} />
      ) : (
        <MapFallback centers={centers} />
      )}
    </div>
  )
}
