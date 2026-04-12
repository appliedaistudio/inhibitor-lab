import { useState, useEffect, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Shield, ArrowLeft, Phone, ExternalLink } from 'lucide-react'
import FuturisticBackground from '../components/FuturisticBackground'
import LoadingSteps from '../components/LoadingSteps'
import HopeBanner from '../components/HopeBanner'
import ClaimCard from '../components/ClaimCard'
import EscalationCard from '../components/EscalationCard'
import AuditLog from '../components/AuditLog'
import ResponseLetter from '../components/ResponseLetter'
import TimelineView from '../components/Timeline'
import { analyzeNotice } from '../utils/api'

const TABS = [
  { id: 'claims', label: 'Claims' },
  { id: 'actions', label: 'Actions' },
  { id: 'timeline', label: 'Timeline' },
  { id: 'audit', label: 'Inhibitor' },
  { id: 'letter', label: 'Letter' },
]

const SEV = {
  CRITICAL: 'bg-red-500/10 text-red-400 border-red-500/20',
  HIGH: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  MEDIUM: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
}

const VAL = {
  INVALID: 'text-emerald-400',
  LIKELY_INVALID: 'text-teal-400',
  PARTIALLY_VALID: 'text-amber-400',
  VALID: 'text-red-400',
}

export default function Results() {
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [apiDone, setApiDone] = useState(false)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [tab, setTab] = useState('claims')
  const [score, setScore] = useState(0)

  const payload = location.state

  useEffect(() => {
    if (!payload) { navigate('/upload'); return }
    analyzeNotice(payload)
      .then((r) => { setData(r); setApiDone(true) })
      .catch((e) => { setError(e.message); setApiDone(true) })
  }, [])

  useEffect(() => {
    if (data?.validityScore != null) {
      let n = 0
      const t = setInterval(() => {
        n += 2
        if (n >= data.validityScore) { setScore(data.validityScore); clearInterval(t) }
        else setScore(n)
      }, 20)
      return () => clearInterval(t)
    }
  }, [data])

  const onLoadDone = useCallback(() => { if (apiDone) setLoading(false) }, [apiDone])

  if (loading) return <LoadingSteps onComplete={onLoadDone} apiDone={apiDone} />

  if (error) return (
    <FuturisticBackground>
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="border border-zinc-800 rounded-2xl p-8 max-w-md text-center bg-zinc-900/50">
          <p className="text-3xl mb-3">⚠️</p>
          <h2 className="text-lg font-semibold text-white">Something went wrong</h2>
          <p className="text-sm text-zinc-400 mt-2">{error}</p>
          <a href="tel:2159813700" className="block mt-4 text-[#14B8A6] font-medium">📞 CLS: 215-981-3700</a>
          <button onClick={() => navigate('/upload')} className="text-zinc-500 text-sm mt-4 cursor-pointer">← Try again</button>
        </div>
      </div>
    </FuturisticBackground>
  )

  return (
    <FuturisticBackground>
      <nav className="flex items-center gap-3 px-6 py-5 max-w-lg mx-auto">
        <button onClick={() => navigate('/upload')} className="text-zinc-500 hover:text-white transition cursor-pointer">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-b from-[#18CCBA] to-[#0D9488] rounded-lg flex items-center justify-center">
            <Shield className="w-3 h-3 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight">NotSoFast Landlord</span>
        </div>
      </nav>

      <main className="max-w-lg mx-auto px-6 pb-20">
        <HopeBanner severity={data.severity} validityStatus={data.validityStatus} hopeMessage={data.hopeMessage} />

        {/* Score */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="border border-zinc-800 rounded-xl p-5 mb-5 flex items-center justify-between bg-zinc-900/30"
        >
          <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${SEV[data.severity] || ''}`}>
            {data.severity}
          </span>
          <div className="text-center">
            <div className="text-3xl font-bold text-white tabular-nums">{score}</div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-widest">Validity</div>
          </div>
          <span className={`text-sm font-semibold ${VAL[data.validityStatus] || ''}`}>
            {data.validityStatus?.replace(/_/g, ' ')}
          </span>
        </motion.div>

        {/* Issues */}
        {data.validityIssues?.length > 0 && (
          <div className="space-y-1.5 mb-5">
            {data.validityIssues.map((issue, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.15 + i * 0.04 }}
                className="border border-red-500/15 bg-red-500/[0.03] rounded-lg px-3 py-2 text-sm text-red-400"
              >
                ⚠️ {issue}
              </motion.div>
            ))}
          </div>
        )}

        {/* Escalations */}
        {data.escalations?.length > 0 && (
          <div className="space-y-2 mb-5">
            {data.escalations
              .sort((a, b) => ({ EMERGENCY: 0, WARNING: 1, INFO: 2 }[a.type] ?? 3) - ({ EMERGENCY: 0, WARNING: 1, INFO: 2 }[b.type] ?? 3))
              .map((e, i) => <EscalationCard key={i} escalation={e} index={i} />)}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-zinc-900/50 border border-zinc-800/80 rounded-xl mb-5 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition cursor-pointer ${
                tab === t.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
          >
            {tab === 'claims' && <div className="space-y-2">{data.claims?.map((c, i) => <ClaimCard key={i} claim={c} index={i} />)}</div>}

            {tab === 'actions' && (
              <div className="space-y-2">
                {data.actions?.map((a, i) => (
                  <div key={i} className="border border-zinc-800 rounded-xl p-4 flex gap-3">
                    <div className="w-7 h-7 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{a.priority}</div>
                    <div>
                      <p className="text-sm font-medium text-white">{a.title}</p>
                      <p className="text-xs text-zinc-500 mt-1">{a.description}</p>
                      {a.deadline && <span className="inline-block mt-1.5 text-[11px] text-amber-400 bg-amber-400/10 border border-amber-400/15 px-2 py-0.5 rounded">⏰ {a.deadline}</span>}
                    </div>
                  </div>
                ))}
                {data.documentChecklist?.length > 0 && (
                  <div className="border border-zinc-800 rounded-xl p-4 mt-3">
                    <p className="text-xs font-semibold text-zinc-300 mb-2">Document checklist</p>
                    {data.documentChecklist.map((d, i) => (
                      <label key={i} className="flex items-center gap-2 text-xs text-zinc-400 py-1 cursor-pointer">
                        <input type="checkbox" className="accent-[#14B8A6] rounded" /> {d}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}

            {tab === 'timeline' && <TimelineView items={data.timeline || []} />}
            {tab === 'audit' && <AuditLog entries={data.auditLog || []} />}
            {tab === 'letter' && <ResponseLetter text={data.responseLetter || ''} />}
          </motion.div>
        </AnimatePresence>

        <div className="mt-10 pt-5 border-t border-zinc-800/60">
          <p className="text-xs text-zinc-600 text-center mb-3">Free legal representation:</p>
          <div className="grid grid-cols-2 gap-2">
            <a href="tel:2159813700" className="flex items-center justify-center gap-1.5 bg-white text-black py-2.5 rounded-full text-xs font-medium hover:bg-zinc-200 transition">
              <Phone className="w-3 h-3" /> CLS: 215-981-3700
            </a>
            <a href="https://eviction-diversion.phila.gov" target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-1.5 border border-zinc-800 text-zinc-300 py-2.5 rounded-full text-xs font-medium hover:border-zinc-700 transition">
              <ExternalLink className="w-3 h-3" /> Eviction Diversion
            </a>
          </div>
        </div>
      </main>
    </FuturisticBackground>
  )
}
