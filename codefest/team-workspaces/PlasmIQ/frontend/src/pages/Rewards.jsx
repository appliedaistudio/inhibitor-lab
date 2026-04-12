import { useState } from 'react'
import { Gift, Star, Shield, Award, ChevronRight, Coins, AlertCircle, CheckCircle2, DollarSign, Lock, QrCode } from 'lucide-react'
import DashboardLayout from '../components/layout/DashboardLayout'
import { useAuth } from '../context/AuthContext'
import backend from '../api/backend'

const TIERS = [
  { name: 'Bronze', min: 0, max: 999, color: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', icon: Shield },
  { name: 'Silver', min: 1000, max: 2499, color: 'text-slate-300', bg: 'bg-slate-500/20', border: 'border-slate-500/30', icon: Star },
  { name: 'Gold', min: 2500, max: Infinity, color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', icon: Award },
]

const CASH_REDEMPTION_THRESHOLD = 15000
const POINTS_PER_DOLLAR = 100

const BADGES = [
  { label: 'First Drop', desc: 'Made your first donation', icon: '🩸', earned: true },
  { label: '5 Donations', desc: 'Donated 5 times', icon: '⭐', earned: true },
  { label: 'Streak Master', desc: 'Maintained a 4-week streak', icon: '🔥', earned: true },
  { label: '10 Donations', desc: 'Donated 10 times', icon: '💪', earned: false },
  { label: 'Early Bird', desc: 'Donated before 9am', icon: '🌅', earned: false },
  { label: 'Refer a Friend', desc: 'Referred someone to donate', icon: '🤝', earned: false },
]

function getTier(points) {
  return TIERS.find((t) => points >= t.min && points <= t.max) || TIERS[0]
}

function TierProgressBar({ points }) {
  const tier = getTier(points)
  const nextTier = TIERS[TIERS.indexOf(tier) + 1]
  if (!nextTier) {
    return <p className="text-xs text-amber-400 font-semibold mt-1">You've reached the top tier! 🏆</p>
  }
  const pct = Math.min(100, Math.round(((points - tier.min) / (nextTier.min - tier.min)) * 100))
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-slate-400 mb-1">
        <span>{tier.name}</span>
        <span>{nextTier.min - points} pts to {nextTier.name}</span>
      </div>
      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 to-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Rewards() {
  const { donor, refreshDonor } = useAuth()
  const points = donor?.points || 0
  const tier = getTier(points)

  const [redeeming, setRedeeming] = useState(false)
  const [message, setMessage] = useState(null)
  const canRedeem = points >= CASH_REDEMPTION_THRESHOLD

  const handleRedeem = async () => {
    if (!canRedeem) return
    if (!confirm(`Redeem ${CASH_REDEMPTION_THRESHOLD.toLocaleString()} points for cash?`)) return
    setRedeeming(true)
    setMessage(null)
    try {
      await backend.post('/api/donors/me/points', { action: 'redeem', amount: CASH_REDEMPTION_THRESHOLD, reason: 'Cash Redemption' })
      await refreshDonor()
      setMessage({ type: 'success', text: `$${CASH_REDEMPTION_THRESHOLD / POINTS_PER_DOLLAR} cash voucher created! Scan the QR code below to redeem.` })
    } catch (err) {
      setMessage({ type: 'error', text: err.response?.data?.detail || 'Redemption failed.' })
    } finally {
      setRedeeming(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-20 md:pb-0">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Gift className="w-6 h-6 text-amber-400" />
            Rewards
          </h1>
          <p className="text-slate-400 text-sm mt-1">Earn points every time you donate. Redeem for great rewards.</p>
        </div>

        {message && (
          <div className={`flex items-center gap-2 rounded-xl p-4 text-sm border ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/30 text-green-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            {message.type === 'success'
              ? <CheckCircle2 className="w-4 h-4 shrink-0" />
              : <AlertCircle className="w-4 h-4 shrink-0" />
            }
            {message.text}
          </div>
        )}

        {/* Points + Tier */}
        <div className={`card border ${tier.border}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${tier.bg}`}>
                <tier.icon className={`w-6 h-6 ${tier.color}`} />
              </div>
              <div>
                <div className={`text-lg font-bold ${tier.color}`}>{tier.name} Tier</div>
                <div className="text-slate-400 text-sm">Your current status</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-3xl font-extrabold text-amber-400">{points.toLocaleString()}</div>
              <div className="text-slate-400 text-xs mt-0.5">points</div>
            </div>
          </div>
          <TierProgressBar points={points} />
        </div>

        {/* Cash Redemption */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Coins className="w-4 h-4 text-amber-400" />
            Redeem Points
          </h2>
          <div className={`card border transition-colors ${canRedeem ? 'border-green-500/40 hover:border-green-500/60' : 'border-slate-700 opacity-80'}`}>
            <div className="flex items-start gap-4">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${canRedeem ? 'bg-green-500/20' : 'bg-slate-700/50'}`}>
                {canRedeem
                  ? <DollarSign className="w-7 h-7 text-green-400" />
                  : <Lock className="w-7 h-7 text-slate-500" />
                }
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h3 className="font-bold text-lg">Cash Redemption</h3>
                    <p className="text-green-400 font-semibold text-sm">
                      = ${CASH_REDEMPTION_THRESHOLD / POINTS_PER_DOLLAR} cash
                      <span className="text-slate-500 font-normal ml-1">(100 pts = $1)</span>
                    </p>
                  </div>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${canRedeem ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                    {CASH_REDEMPTION_THRESHOLD.toLocaleString()} pts
                  </span>
                </div>
                <p className="text-slate-400 text-sm mt-1">
                  Convert your points into real cash. A QR code voucher is generated instantly on redemption.
                </p>

                {!canRedeem && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                      <span>{points.toLocaleString()} pts</span>
                      <span>{(CASH_REDEMPTION_THRESHOLD - points).toLocaleString()} pts to unlock</span>
                    </div>
                    <div className="h-2.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-green-500 rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.round((points / CASH_REDEMPTION_THRESHOLD) * 100))}%` }}
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      {Math.round((points / CASH_REDEMPTION_THRESHOLD) * 100)}% of the way there
                    </p>
                  </div>
                )}

                <button
                  onClick={handleRedeem}
                  disabled={!canRedeem || redeeming}
                  className={`mt-4 flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-semibold transition-all ${
                    canRedeem
                      ? 'bg-green-500 hover:bg-green-400 text-white'
                      : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                  }`}
                >
                  {redeeming ? (
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : canRedeem ? (
                    <>Redeem for Cash <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Locked — reach {CASH_REDEMPTION_THRESHOLD.toLocaleString()} pts to unlock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Vouchers */}
        {donor?.redemption_vouchers?.length > 0 && (
          <div>
            <h2 className="font-semibold mb-3 flex items-center gap-2">
              <QrCode className="w-4 h-4 text-green-400" />
              Your Cash Vouchers
            </h2>
            <div className="space-y-4">
              {[...donor.redemption_vouchers].reverse().map((v) => (
                <div key={v.code} className="card border border-green-500/20 bg-green-500/5">
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <div className="shrink-0 bg-white rounded-xl p-2">
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=PLASMIQ-${v.code}&color=0f172a&bgcolor=ffffff`}
                        alt={`QR code for voucher ${v.code}`}
                        className="w-40 h-40 rounded-lg"
                      />
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="text-3xl font-extrabold text-green-400 mb-1">${v.amount_usd}</div>
                      <div className="text-slate-400 text-sm mb-3">Cash Voucher · {v.points_used.toLocaleString()} pts redeemed</div>
                      <div className="bg-slate-800 rounded-lg px-4 py-2 font-mono text-sm text-slate-300 tracking-widest inline-block mb-3">
                        {v.code.match(/.{1,4}/g).join(' ')}
                      </div>
                      <div className="flex items-center justify-center sm:justify-start gap-2">
                        <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-400 text-xs font-semibold px-2.5 py-1 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                        <span className="text-slate-500 text-xs">
                          {new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <p className="text-slate-500 text-xs mt-3">
                        Scan the QR code or present the voucher code at any participating center to claim your cash.
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges */}
        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="w-4 h-4 text-blue-400" />
            Badges
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {BADGES.map((b) => (
              <div
                key={b.label}
                className={`card text-center transition-all ${b.earned ? 'border-blue-500/30' : 'opacity-40 grayscale'}`}
              >
                <div className="text-3xl mb-2">{b.icon}</div>
                <div className="font-semibold text-sm">{b.label}</div>
                <div className="text-slate-400 text-xs mt-0.5">{b.desc}</div>
                {b.earned && <div className="badge-blue mt-2 inline-block">Earned</div>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
