import { useNavigate } from 'react-router-dom'
import { Flame, Droplets, Users, TrendingUp, ChevronRight } from 'lucide-react'

const PEOPLE_PER_DONATION = 18

function getWeeklyDots(donationHistory, weeks = 8) {
  const result = []
  const now = new Date()
  const dayOfWeek = now.getDay()
  for (let i = weeks - 1; i >= 0; i--) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek - i * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    const donated = donationHistory?.some((iso) => {
      const d = new Date(iso)
      return d >= weekStart && d < weekEnd
    }) || false
    result.push(donated)
  }
  return result
}

function getConsistency(donationHistory, weeks = 12) {
  if (!donationHistory?.length) return 0
  const now = new Date()
  const dayOfWeek = now.getDay()
  let donated = 0
  for (let i = 0; i < weeks; i++) {
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - dayOfWeek - i * 7)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 7)
    if (donationHistory.some((iso) => { const d = new Date(iso); return d >= weekStart && d < weekEnd })) {
      donated++
    }
  }
  return Math.round((donated / weeks) * 100)
}

export default function DonationStreak({ donor }) {
  const navigate = useNavigate()

  const streak = donor?.streak || 0
  const points = donor?.points || 0
  const totalDonations = donor?.donation_count || 0
  const peopleServed = totalDonations * PEOPLE_PER_DONATION
  const weekDots = getWeeklyDots(donor?.donation_history)
  const consistency = getConsistency(donor?.donation_history)

  const streakColor =
    streak >= 10 ? 'text-amber-400' :
    streak >= 5  ? 'text-orange-400' :
    streak >= 1  ? 'text-blue-400' : 'text-slate-500'

  return (
    <div className="card h-full flex flex-col">
      <h3 className="font-semibold text-sm text-slate-400 uppercase tracking-wider mb-4">Your Impact</h3>

      {/* Streak */}
      <div className="flex items-center gap-4 mb-4 p-4 bg-slate-700/40 rounded-xl">
        <div className="w-12 h-12 bg-orange-500/20 rounded-2xl flex items-center justify-center shrink-0">
          <Flame className={`w-6 h-6 ${streakColor}`} />
        </div>
        <div className="flex-1">
          <div className={`text-3xl font-extrabold ${streakColor}`}>{streak}</div>
          <div className="text-slate-400 text-xs">week streak</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold text-slate-300">{consistency}%</div>
          <div className="text-xs text-slate-500">consistent</div>
        </div>
      </div>

      {/* Weekly dots — last 8 weeks */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-slate-500">Last 8 weeks</span>
          <span className="text-xs text-slate-500">this week →</span>
        </div>
        <div className="flex gap-1.5">
          {weekDots.map((donated, i) => (
            <div
              key={i}
              title={donated ? 'Donated' : 'No donation'}
              className={`flex-1 h-3 rounded-full transition-all ${
                donated ? 'bg-blue-500' : 'bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-slate-700/40 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1">
            <Droplets className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-lg font-bold text-blue-400">{totalDonations}</div>
          <div className="text-xs text-slate-400">Donations</div>
        </div>
        <div className="bg-slate-700/40 rounded-xl p-3 text-center">
          <div className="flex justify-center mb-1">
            <Users className="w-4 h-4 text-green-400" />
          </div>
          <div className="text-lg font-bold text-green-400">{peopleServed}</div>
          <div className="text-xs text-slate-400">People Served</div>
        </div>
      </div>

      {/* Points */}
      <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-2.5 mb-4">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-amber-400" />
          <span className="text-sm text-slate-300">Points</span>
        </div>
        <span className="text-amber-400 font-bold">{points.toLocaleString()}</span>
      </div>

      <button
        onClick={() => navigate('/dashboard/history')}
        className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-sm font-medium transition-colors mt-auto"
      >
        Full impact stats
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  )
}
