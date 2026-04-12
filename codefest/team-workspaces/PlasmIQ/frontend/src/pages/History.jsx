import { useEffect, useState } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { History as HistoryIcon, Droplets, TrendingUp, Award } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth } from '../context/AuthContext'

function buildChartData(appointments) {
  if (!appointments?.length) return []
  const counts = {}
  appointments.forEach((a) => {
    const d = a.slot_time || a.created_at
    if (!d) return
    const month = new Date(d).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    counts[month] = (counts[month] || 0) + 1
  })
  return Object.entries(counts)
    .map(([month, donations]) => ({ month, donations }))
    .slice(-12)
}

// Returns last `weeks` weeks with a donated flag each
function getWeeklyGrid(donationHistory, weeks = 16) {
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
    const label = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    result.push({ label, donated, weekStart })
  }
  return result
}

function getConsistency(weekGrid) {
  if (!weekGrid.length) return 0
  return Math.round((weekGrid.filter((w) => w.donated).length / weekGrid.length) * 100)
}

function getLongestStreak(weekGrid) {
  let max = 0, cur = 0
  for (const w of weekGrid) {
    if (w.donated) { cur++; max = Math.max(max, cur) }
    else cur = 0
  }
  return max
}

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload?.length) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm">
        <p className="text-slate-400">{label}</p>
        <p className="font-semibold text-blue-400">{payload[0].value} donation{payload[0].value !== 1 ? 's' : ''}</p>
      </div>
    )
  }
  return null
}

export default function History() {
  const { donor, refreshDonor } = useAuth()
  const [chartData, setChartData] = useState([])

  useEffect(() => {
    if (donor?.donation_history) {
      setChartData(buildChartData(donor.donation_history))
    }
  }, [donor])

  const totalDonations = donor?.donation_count || 0
  const totalVolume = (totalDonations * 800).toLocaleString()
  const streak = donor?.streak || 0
  const totalMl = totalDonations * ML_PER_DONATION
  const peopleServed = totalDonations * PEOPLE_PER_DONATION
  const consistency = getConsistency(weekGrid)
  const longestStreak = getLongestStreak(weekGrid)

  // Impact breakdown — approximate distribution of plasma use
  const impactBreakdown = [
    {
      label: 'Immune Disorder Patients',
      desc: 'Immunoglobulin (IVIg) therapy',
      count: Math.round(totalDonations * 8),
      color: 'bg-blue-500',
      textColor: 'text-blue-400',
      icon: HeartPulse,
    },
    {
      label: 'Hemophilia Patients',
      desc: 'Clotting factor treatments',
      count: Math.round(totalDonations * 5),
      color: 'bg-purple-500',
      textColor: 'text-purple-400',
      icon: Activity,
    },
    {
      label: 'Burn & Trauma Patients',
      desc: 'Albumin & critical care',
      count: Math.round(totalDonations * 5),
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      icon: Users,
    },
  ]

  const statCards = [
    { label: 'Total Donations', value: totalDonations, icon: Droplets, color: 'text-blue-400', bg: 'bg-blue-500/20' },
    { label: 'Plasma Donated', value: `${(totalMl).toLocaleString()} mL`, icon: TrendingUp, color: 'text-green-400', bg: 'bg-green-500/20' },
    { label: 'People Served', value: peopleServed.toLocaleString(), icon: Users, color: 'text-pink-400', bg: 'bg-pink-500/20' },
    { label: 'Current Streak', value: `${streak} wks`, icon: Flame, color: 'text-amber-400', bg: 'bg-amber-500/20' },
    { label: 'Consistency', value: `${consistency}%`, icon: CheckCircle2, color: 'text-teal-400', bg: 'bg-teal-500/20' },
    { label: 'Longest Streak', value: `${longestStreak} wks`, icon: Award, color: 'text-purple-400', bg: 'bg-purple-500/20' },
  ]

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HistoryIcon className="w-6 h-6 text-blue-400" />
            Donation History
          </h1>
          <p className="text-slate-400 text-sm mt-1">Your full impact over time.</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((s) => (
            <div key={s.label} className="card">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${s.bg}`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-400 mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Weekly consistency grid */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              Weekly Consistency — Last 16 Weeks
            </h2>
            <span className="text-sm font-semibold text-teal-400">{consistency}% consistent</span>
          </div>
          <div className="grid grid-cols-8 sm:grid-cols-16 gap-1.5 mb-3" style={{ gridTemplateColumns: 'repeat(16, minmax(0, 1fr))' }}>
            {weekGrid.map((w, i) => (
              <div key={i} className="group relative">
                <div
                  className={`h-8 rounded-md transition-all ${
                    w.donated
                      ? 'bg-blue-500 hover:bg-blue-400'
                      : 'bg-slate-700 hover:bg-slate-600'
                  }`}
                />
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block z-10 whitespace-nowrap">
                  <div className="bg-slate-700 text-xs text-slate-200 rounded-lg px-2 py-1 shadow-lg">
                    {w.label} · {w.donated ? '✓ Donated' : 'No donation'}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-blue-500 rounded-sm inline-block" /> Donated</span>
            <span className="flex items-center gap-1.5"><span className="w-3 h-3 bg-slate-700 rounded-sm inline-block" /> No donation</span>
          </div>
        </div>

        {/* Impact breakdown */}
        {totalDonations > 0 && (
          <div className="card">
            <h2 className="font-semibold mb-1 flex items-center gap-2">
              <Users className="w-4 h-4 text-pink-400" />
              Who Your Plasma Has Helped
            </h2>
            <p className="text-slate-400 text-xs mb-5">
              Each plasma donation (800 mL) can serve up to {PEOPLE_PER_DONATION} patients across multiple treatments.
            </p>
            <div className="space-y-4">
              {impactBreakdown.map((item) => {
                const pct = Math.round((item.count / peopleServed) * 100) || 0
                return (
                  <div key={item.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <item.icon className={`w-4 h-4 ${item.textColor}`} />
                        <div>
                          <span className="text-sm font-medium">{item.label}</span>
                          <span className="text-slate-500 text-xs ml-2">{item.desc}</span>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${item.textColor}`}>{item.count} patients</span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${item.color} rounded-full transition-all`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-700 flex items-center justify-between">
              <span className="text-sm text-slate-400">Total people your plasma has served</span>
              <span className="text-lg font-extrabold text-pink-400">{peopleServed.toLocaleString()}</span>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="card">
          <h2 className="font-semibold mb-6">Donations Per Month</h2>
          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
              No donation history yet.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="donationGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="donations"
                  stroke="#3b82f6" strokeWidth={2}
                  fill="url(#donationGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Completed donations list */}
        <div className="card">
          <h2 className="font-semibold mb-4">Completed Donations</h2>
          {completedAppts.length === 0 ? (
            <p className="text-slate-400 text-sm">No completed donations yet.</p>
          ) : (
            <div className="space-y-2">
              {[...donor.donation_history].reverse().slice(0, 10).map((iso, i) => (
                <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0 text-sm">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center">
                      <Droplets className="w-4 h-4 text-blue-400" />
                    </div>
                    <div>
                      <div className="font-medium">Plasma Donation</div>
                      <div className="text-slate-400 text-xs">800 mL collected</div>
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-green-500/15 text-green-400 border border-green-500/30 shrink-0">
                      Completed
                    </span>
                  </div>

                  {/* Thank-you message from the center */}
                  {a.thank_you_message && (
                    <div className="mt-3">
                      <button
                        onClick={() => setExpandedMsg(expandedMsg === a.id ? null : a.id)}
                        className="flex items-center gap-1.5 text-xs text-pink-400 hover:text-pink-300 transition-colors"
                      >
                        <Heart className="w-3.5 h-3.5" />
                        {expandedMsg === a.id ? 'Hide message' : 'View thank-you message from the team'}
                      </button>
                      {expandedMsg === a.id && (
                        <div className="mt-2 bg-pink-500/5 border border-pink-500/20 rounded-xl px-4 py-3 text-sm text-slate-300 leading-relaxed italic">
                          {a.thank_you_message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}
