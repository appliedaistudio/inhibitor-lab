import { useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ShieldCheck, ArrowLeft, Activity, Eye, Layers, AlertTriangle, Database } from 'lucide-react'
import FuturisticBackground from '../components/FuturisticBackground'

const API = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8765'
const fade = (d) => ({ initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, transition: { delay: d, duration: 0.5 } })

export default function GlassBox() {
  const navigate = useNavigate()
  const [sets, setSets] = useState([])
  const [activeSet, setActiveSet] = useState('set_a')
  const [summary, setSummary] = useState(null)
  const [summaryRecords, setSummaryRecords] = useState([])
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('overview') // overview | events | own

  useEffect(() => {
    fetch(`${API}/glass-box/sets`).then(r => r.json()).then(d => setSets(d.sets || [])).catch(() => {})
  }, [])

  useEffect(() => {
    if (view === 'own') return
    setLoading(true)
    Promise.all([
      fetch(`${API}/glass-box/${activeSet}/summary`).then(r => r.json()),
      fetch(`${API}/glass-box/${activeSet}/summaries`).then(r => r.json()),
      fetch(`${API}/glass-box/${activeSet}/events?limit=100`).then(r => r.json()),
    ]).then(([s, sums, evts]) => {
      setSummary(s)
      setSummaryRecords(sums.summaries || [])
      setEvents(evts.events || [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [activeSet, view])

  // Own intervention log
  const [ownData, setOwnData] = useState([])
  useEffect(() => {
    if (view !== 'own') return
    fetch(`${API}/logs/interventions`).then(r => r.json()).then(d => setOwnData(Array.isArray(d) ? d : [])).catch(() => {})
  }, [view])

  const ownStats = useMemo(() => {
    const total = ownData.length
    const blocked = ownData.filter(e => !e.verdict?.allow).length
    const flags = {}
    ownData.forEach(e => (e.verdict?.flags || []).forEach(f => { flags[f] = (flags[f] || 0) + 1 }))
    return { total, blocked, allowed: total - blocked, flags }
  }, [ownData])

  return (
    <FuturisticBackground>
      {/* Nav */}
      <motion.nav {...fade(0)} className="flex items-center justify-between px-6 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-zinc-500 hover:text-white transition cursor-pointer">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
              <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-semibold text-white tracking-tight">Glass Box</span>
            <span className="text-xs text-zinc-500">Audit Dashboard</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
          </span>
          <span className="text-xs text-zinc-500">Live</span>
        </div>
      </motion.nav>

      <main className="max-w-6xl mx-auto px-6 pb-20">
        {/* View switcher + dataset selector */}
        <motion.div {...fade(0.1)} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div className="flex gap-1 p-1 bg-zinc-900/50 border border-zinc-800/80 rounded-xl">
            {[
              { id: 'overview', label: 'Pipeline Overview', icon: Activity },
              { id: 'events', label: 'Event Stream', icon: Database },
              { id: 'own', label: 'NotSoFast Logs', icon: Eye },
            ].map(v => (
              <button
                key={v.id}
                onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                  view === v.id ? 'bg-white text-black' : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <v.icon className="w-3 h-3" />
                {v.label}
              </button>
            ))}
          </div>

          {view !== 'own' && (
            <div className="flex gap-1">
              {sets.map(s => (
                <button
                  key={s}
                  onClick={() => setActiveSet(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    activeSet === s ? 'bg-[#14B8A6]/10 text-[#14B8A6] border border-[#14B8A6]/20' : 'text-zinc-500 hover:text-zinc-300 border border-zinc-800'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </motion.div>

        <AnimatePresence mode="wait">
          {view === 'overview' && summary && !loading && (
            <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Stats grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Pipeline Events', value: summary.total_events?.toLocaleString(), color: 'text-white' },
                  { label: 'Requests', value: summary.total_requests?.toLocaleString(), color: 'text-[#14B8A6]' },
                  { label: 'Rule Evaluations', value: summary.rules?.starts?.toLocaleString(), color: 'text-[#FBBF24]' },
                  { label: 'Success Rate', value: summary.total_requests > 0 ? `${Math.round(summary.requests.success / summary.total_requests * 100)}%` : '—', color: 'text-emerald-400' },
                ].map((s, i) => (
                  <motion.div {...fade(0.2 + i * 0.05)} key={s.label} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                    <div className={`text-2xl font-bold tabular-nums ${s.color}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>{s.value}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">{s.label}</div>
                  </motion.div>
                ))}
              </div>

              {/* Phase + Rules side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
                <motion.div {...fade(0.4)} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" /> Pipeline Phases
                  </h3>
                  <div className="space-y-2.5">
                    {Object.entries(summary.phase_counts || {}).sort((a, b) => b[1] - a[1]).map(([phase, count]) => {
                      const max = Math.max(...Object.values(summary.phase_counts))
                      return (
                        <div key={phase} className="flex items-center gap-3">
                          <span className="text-xs text-zinc-400 w-24 truncate font-mono">{phase}</span>
                          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                            <motion.div
                              className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-[#06B6D4]"
                              initial={{ width: 0 }}
                              animate={{ width: `${(count / max) * 100}%` }}
                              transition={{ duration: 0.8, delay: 0.5 }}
                            />
                          </div>
                          <span className="text-xs text-zinc-500 w-14 text-right tabular-nums">{count.toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                </motion.div>

                <motion.div {...fade(0.5)} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5" /> Top Rules Triggered
                  </h3>
                  {(summary.rules?.top_rules || []).length === 0 ? (
                    <p className="text-xs text-zinc-600">No rules fired in this set.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {summary.rules.top_rules.map(([rule, count]) => (
                        <div key={rule} className="flex items-center justify-between">
                          <span className="text-xs text-zinc-400 font-mono">{rule}</span>
                          <span className="text-xs text-[#FBBF24] bg-[#FBBF24]/10 border border-[#FBBF24]/15 px-2 py-0.5 rounded tabular-nums">{count}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Severity + Action */}
                  {Object.keys(summary.severity_counts || {}).length > 0 && (
                    <>
                      <h4 className="text-[10px] text-zinc-500 uppercase tracking-wider mt-6 mb-3">Severity</h4>
                      <div className="flex gap-2">
                        {Object.entries(summary.severity_counts).map(([sev, n]) => (
                          <span key={sev} className={`text-xs px-2 py-1 rounded border ${
                            sev === 'high' ? 'text-red-400 bg-red-400/10 border-red-400/15' :
                            sev === 'medium' ? 'text-amber-400 bg-amber-400/10 border-amber-400/15' :
                            'text-zinc-400 bg-zinc-800 border-zinc-700'
                          }`}>
                            {sev}: {n}
                          </span>
                        ))}
                      </div>
                    </>
                  )}
                </motion.div>
              </div>

              {/* Summary records */}
              {summaryRecords.length > 0 && (
                <motion.div {...fade(0.6)} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Intervention Summary ({summaryRecords.length})</h3>
                  <div className="space-y-2">
                    {summaryRecords.map((rec, i) => (
                      <div key={i} className="border border-zinc-800 rounded-lg p-3 bg-zinc-900/50">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] text-zinc-500 font-mono">{rec.timestamp}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            rec.action === 'blocked' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>{rec.action}</span>
                        </div>
                        <p className="text-xs text-zinc-300">{rec.reason}</p>
                        {rec.proposed_action && (
                          <p className="text-[11px] mt-1.5">
                            <span className="text-red-400/70 line-through">{rec.proposed_action}</span>
                            <span className="text-zinc-600 mx-1.5">→</span>
                            <span className="text-emerald-400/80">{rec.corrected_action}</span>
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Top event types */}
              <motion.div {...fade(0.7)} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30 mt-3">
                <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Top Event Types</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                  {Object.entries(summary.event_counts || {}).slice(0, 9).map(([event, count]) => (
                    <div key={event} className="flex items-center justify-between border border-zinc-800/60 rounded-lg px-3 py-2 bg-zinc-900/30">
                      <span className="text-[10px] text-zinc-400 font-mono truncate mr-2">{event}</span>
                      <span className="text-[10px] text-zinc-500 tabular-nums flex-shrink-0">{count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            </motion.div>
          )}

          {view === 'events' && !loading && (
            <motion.div key="events" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
                <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2.5 flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-xs font-medium text-zinc-400">Pipeline Event Stream</span>
                  <span className="text-[10px] text-zinc-600 ml-auto">{events.length} shown</span>
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-900 border-b border-zinc-800">
                      <tr>
                        <th className="text-left px-4 py-2 text-zinc-500 font-medium">Timestamp</th>
                        <th className="text-left px-4 py-2 text-zinc-500 font-medium">Event</th>
                        <th className="text-left px-4 py-2 text-zinc-500 font-medium">Phase</th>
                        <th className="text-left px-4 py-2 text-zinc-500 font-medium">Meta</th>
                      </tr>
                    </thead>
                    <tbody>
                      {events.slice(0, 100).map((e, i) => (
                        <tr key={i} className="border-t border-zinc-800/50 hover:bg-zinc-800/20 transition">
                          <td className="px-4 py-2 text-zinc-600 font-mono whitespace-nowrap">{(e.timestamp || '').replace('T', ' ').slice(0, 19)}</td>
                          <td className="px-4 py-2 text-zinc-300 font-mono">{e.event}</td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                              e.phase === 'rules' ? 'bg-amber-500/10 text-amber-400' :
                              e.phase === 'finalize' ? 'bg-emerald-500/10 text-emerald-400' :
                              e.phase === 'prediction' ? 'bg-red-500/10 text-red-400' :
                              e.phase === 'observation' ? 'bg-blue-500/10 text-blue-400' :
                              'bg-zinc-800 text-zinc-500'
                            }`}>{e.phase}</span>
                          </td>
                          <td className="px-4 py-2 text-zinc-600 font-mono text-[10px] max-w-xs truncate">{JSON.stringify(e.meta).slice(0, 80)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'own' && (
            <motion.div key="own" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Stats */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                {[
                  { label: 'Total Drafts', value: ownStats.total, color: 'text-white' },
                  { label: 'Allowed', value: ownStats.allowed, color: 'text-emerald-400' },
                  { label: 'Intervened', value: ownStats.blocked, color: 'text-red-400' },
                ].map((s, i) => (
                  <div key={s.label} className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30">
                    <div className={`text-2xl font-bold tabular-nums ${s.color}`} style={{ fontFamily: "'Orbitron', sans-serif" }}>{s.value}</div>
                    <div className="text-[11px] text-zinc-500 mt-1 uppercase tracking-wider">{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Flags */}
              {Object.keys(ownStats.flags).length > 0 && (
                <div className="border border-zinc-800 rounded-xl p-5 bg-zinc-900/30 mb-6">
                  <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-4">Flag Distribution</h3>
                  <div className="space-y-2">
                    {Object.entries(ownStats.flags).sort((a, b) => b[1] - a[1]).map(([flag, count]) => {
                      const max = Math.max(...Object.values(ownStats.flags))
                      return (
                        <div key={flag} className="flex items-center gap-3">
                          <span className="text-[10px] text-zinc-400 w-48 truncate font-mono">{flag}</span>
                          <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                            <div className="h-full rounded-full bg-gradient-to-r from-[#14B8A6] to-[#7C3AED]" style={{ width: `${(count / max) * 100}%` }} />
                          </div>
                          <span className="text-xs text-zinc-500 w-8 text-right tabular-nums">{count}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Entries */}
              <div className="space-y-2">
                {ownData.slice().reverse().slice(0, 30).map((e, i) => (
                  <div key={i} className={`border rounded-xl p-4 ${e.verdict?.allow ? 'border-zinc-800 bg-zinc-900/30' : 'border-red-500/15 bg-red-500/[0.02]'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] text-zinc-600 font-mono">{new Date(e.ts * 1000).toLocaleString()}</span>
                      <span className={`text-[10px] font-semibold ${e.verdict?.allow ? 'text-emerald-400' : 'text-red-400'}`}>
                        {e.verdict?.allow ? 'ALLOWED' : 'BLOCKED'}
                      </span>
                    </div>
                    {(e.verdict?.flags || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {e.verdict.flags.slice(0, 5).map(f => (
                          <span key={f} className="text-[9px] font-mono text-zinc-500 bg-zinc-800 border border-zinc-700/50 px-1.5 py-0.5 rounded">{f}</span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Draft</div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{(e.draft || '').slice(0, 200)}{(e.draft || '').length > 200 ? '...' : ''}</p>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1">Final</div>
                        <p className="text-[11px] text-zinc-400 leading-relaxed">{(e.final || '').slice(0, 200)}{(e.final || '').length > 200 ? '...' : ''}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {loading && view !== 'own' && (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-20">
              <span className="text-sm text-zinc-500">Loading dataset...</span>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </FuturisticBackground>
  )
}
