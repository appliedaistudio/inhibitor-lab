import { useEffect, useState } from 'react'
import DashboardLayout from '../components/layout/DashboardLayout'
import OptimalWindowCard from '../components/dashboard/OptimalWindowCard'
import CenterMap from '../components/dashboard/CenterMap'
import NextAppointment from '../components/dashboard/NextAppointment'
import DonationStreak from '../components/dashboard/DonationStreak'
import { useAuth } from '../context/AuthContext'
import backend from '../api/backend'
import { Heart, X } from 'lucide-react'

const DISMISSED_KEY = 'plasmiq_dismissed_thankyou'

function ThankYouBanner({ appointments }) {
  const dismissed = JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]')
  const [hiddenIds, setHiddenIds] = useState(dismissed)

  const messages = appointments.filter(
    (a) => a.status === 'completed' && a.thank_you_message && !hiddenIds.includes(a.id)
  )

  if (!messages.length) return null

  const latest = messages[0]

  const dismiss = () => {
    const updated = [...hiddenIds, latest.id]
    setHiddenIds(updated)
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(updated))
  }

  return (
    <div className="relative bg-gradient-to-r from-pink-900/40 to-rose-900/30 border border-pink-500/30 rounded-2xl px-5 py-4">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-500 hover:text-slate-300 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-4 h-4 text-pink-400 shrink-0" />
        <span className="text-sm font-semibold text-pink-300">A message from the team</span>
      </div>
      <p className="text-sm text-slate-300 leading-relaxed italic pr-6">
        {latest.thank_you_message}
      </p>
      <p className="text-xs text-slate-500 mt-2">{latest.center_name}</p>
    </div>
  )
}

export default function Dashboard() {
  const { donor, refreshDonor } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [centers, setCenters] = useState([])

  useEffect(() => {
    refreshDonor()
    backend.get('/api/appointments').then((r) => setAppointments(r.data)).catch(() => {})
    backend.get('/api/centers').then((r) => setCenters(r.data)).catch(() => {})
  }, [])

  const upcoming = appointments.filter((a) => a.status === 'scheduled')
  const nextAppt = upcoming.sort((a, b) => new Date(a.slot_time) - new Date(b.slot_time))[0] || null

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold">
            Good {getGreeting()}, {donor?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-400 text-sm mt-1">Here's your donation command center.</p>
        </div>

        {/* Thank-you message banner */}
        <ThankYouBanner appointments={appointments} />

        {/* Top row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OptimalWindowCard />
          </div>
          <div>
            <NextAppointment appointment={nextAppt} />
          </div>
        </div>

        {/* Streak + Map */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div>
            <DonationStreak donor={donor} />
          </div>
          <div className="lg:col-span-2">
            <CenterMap centers={centers} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}

function getGreeting() {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 17) return 'afternoon'
  return 'evening'
}
