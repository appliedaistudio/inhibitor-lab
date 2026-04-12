import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, ShieldCheck, Scale, Cpu, Scan } from 'lucide-react'
import FuturisticBackground from '../components/FuturisticBackground'
import HeroAnimation from '../components/HeroAnimation'
import IntroSplash from '../components/IntroSplash'

const fade = (d) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: d, duration: 0.7, ease: [0.16, 1, 0.3, 1] },
})

export default function Landing() {
  const navigate = useNavigate()
  const [ready, setReady] = useState(false)
  const done = useCallback(() => setReady(true), [])

  return (
    <div className="relative">
      {/* Intro splash — parent controls mount/unmount */}
      <AnimatePresence>
        {!ready && (
          <motion.div
            key="splash"
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            className="fixed inset-0 z-50"
          >
            <IntroSplash onComplete={done} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Landing — only mounts after splash is done */}
      {ready && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <FuturisticBackground>
            <motion.nav {...fade(0.3)} className="flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #14B8A6, #0D9488)' }}>
                  <ShieldCheck className="w-4 h-4 text-white" />
                </div>
                <span className="text-sm font-semibold text-white tracking-tight">NotSoFast Landlord</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span className="text-xs text-zinc-500">Inhibitor active</span>
              </div>
            </motion.nav>

            <main className="max-w-5xl mx-auto px-6 pt-20 md:pt-28 pb-20">
              <div className="flex flex-col items-center text-center">
                <motion.div {...fade(0.4)} className="inline-flex items-center gap-2 bg-white/[0.04] border border-white/[0.06] px-4 py-1.5 rounded-full mb-8">
                  <Scan className="w-3.5 h-3.5 text-[#14B8A6]" />
                  <span className="text-xs text-zinc-400">AI-powered tenant protection for Philadelphia</span>
                </motion.div>

                <motion.div {...fade(0.5)}>
                  <HeroAnimation />
                </motion.div>

                <motion.h1 {...fade(0.7)} className="mt-10 text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.08]" style={{ fontFamily: "'Orbitron', sans-serif" }}>
                  <span className="bg-gradient-to-b from-white to-zinc-400 bg-clip-text text-transparent">Your home.</span>
                  <br />
                  <span className="bg-gradient-to-r from-[#14B8A6] via-[#06B6D4] to-[#7C3AED] bg-clip-text text-transparent">Your rights.</span>
                </motion.h1>

                <motion.p {...fade(0.9)} className="mt-5 text-base md:text-lg text-zinc-400 max-w-md leading-relaxed">
                  Upload your eviction notice. We fact-check every claim against
                  real Philadelphia law, protected by Inhibitor AI.
                </motion.p>

                <motion.div {...fade(1.1)} className="mt-8 flex gap-3">
                  <button
                    onClick={() => navigate('/upload')}
                    className="group flex items-center gap-2 bg-white text-black font-medium text-sm px-6 py-3 rounded-full hover:bg-zinc-200 transition cursor-pointer"
                  >
                    Upload your notice
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                  <button
                    onClick={() => navigate('/upload')}
                    className="text-sm text-zinc-400 hover:text-white px-5 py-3 rounded-full border border-zinc-800 hover:border-zinc-600 transition cursor-pointer"
                  >
                    Try demo
                  </button>
                </motion.div>

                <motion.div {...fade(1.3)} className="flex gap-10 mt-16">
                  {[
                    { value: '4.78', unit: '/5', label: 'Judge Score' },
                    { value: '93', unit: '%', label: 'Citations' },
                    { value: '5', unit: '', label: 'AI Agents' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-2xl md:text-3xl font-bold text-white tabular-nums">
                        {s.value}<span className="text-zinc-500 text-lg">{s.unit}</span>
                      </div>
                      <div className="text-[11px] text-zinc-600 mt-1 uppercase tracking-wider">{s.label}</div>
                    </div>
                  ))}
                </motion.div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mt-28">
                <motion.div {...fade(1.5)} className="md:col-span-7 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-8 hover:border-zinc-700 transition overflow-hidden relative">
                  <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-[#14B8A6]/[0.06] to-transparent rounded-bl-full" />
                  <div className="relative">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#14B8A6]/20 to-transparent border border-[#14B8A6]/10 flex items-center justify-center mb-5">
                      <ShieldCheck className="w-5 h-5 text-[#14B8A6]" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">Inhibitor Protected</h3>
                    <p className="text-sm text-zinc-500 mt-2 leading-relaxed max-w-sm">
                      Every response passes through Applied AI's Inhibitor — blocking hallucinated statutes, fake citations, and harmful advice.
                    </p>
                    <div className="flex gap-2 mt-5">
                      {['Bias check', 'Citation verify', 'Safety filter', 'Audit trail'].map((t) => (
                        <span key={t} className="text-[10px] text-zinc-500 bg-zinc-800/80 border border-zinc-700/50 px-2 py-1 rounded-md">{t}</span>
                      ))}
                    </div>
                  </div>
                </motion.div>

                <div className="md:col-span-5 flex flex-col gap-3">
                  <motion.div {...fade(1.6)} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 hover:border-zinc-700 transition overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#7C3AED]/[0.05] to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7C3AED]/20 to-transparent border border-[#7C3AED]/10 flex items-center justify-center mb-4">
                        <Scale className="w-5 h-5 text-[#7C3AED]" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">Philadelphia law only</h3>
                      <p className="text-xs text-zinc-500 mt-1.5">Real PA statutes and Philly ordinances with real citations.</p>
                    </div>
                  </motion.div>

                  <motion.div {...fade(1.7)} className="rounded-2xl border border-zinc-800/80 bg-zinc-900/40 p-6 hover:border-zinc-700 transition overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-[#06B6D4]/[0.05] to-transparent rounded-bl-full" />
                    <div className="relative">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#06B6D4]/20 to-transparent border border-[#06B6D4]/10 flex items-center justify-center mb-4">
                        <Cpu className="w-5 h-5 text-[#06B6D4]" />
                      </div>
                      <h3 className="text-sm font-semibold text-white">5-agent pipeline</h3>
                      <p className="text-xs text-zinc-500 mt-1.5">Intake → Retrieval → Drafting → Critic → Finalizer. Every step traced.</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <motion.div {...fade(1.9)} className="mt-20">
                <h2 className="text-center text-xs text-zinc-600 uppercase tracking-[0.2em] mb-8">How it works</h2>
                <div className="grid grid-cols-3 gap-px bg-zinc-800/50 rounded-2xl overflow-hidden border border-zinc-800/80">
                  {[
                    { step: '01', title: 'Upload', desc: 'Drop your eviction notice — photo, PDF, or text' },
                    { step: '02', title: 'Analyze', desc: 'Five AI agents fact-check every claim against real law' },
                    { step: '03', title: 'Act', desc: 'Get your action plan, timeline, and response letter' },
                  ].map((s) => (
                    <div key={s.step} className="bg-[#09090B] p-6 md:p-8 text-center">
                      <div className="text-xs text-[#14B8A6] font-mono mb-3">{s.step}</div>
                      <div className="text-sm font-semibold text-white">{s.title}</div>
                      <div className="text-xs text-zinc-500 mt-1.5">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </motion.div>

              <motion.p {...fade(2.1)} className="text-center text-[11px] text-zinc-700 mt-20 tracking-wide uppercase">
                Built for Philly Codefest 2026 · Powered by Inhibitor AI · Free forever
              </motion.p>
            </main>
          </FuturisticBackground>
        </motion.div>
      )}
    </div>
  )
}
