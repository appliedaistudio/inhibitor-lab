import { motion } from 'framer-motion'

const E = {
  BLOCKED: { icon: '🛑', color: 'text-red-400' },
  ESCALATED: { icon: '⚠️', color: 'text-amber-400' },
  VERIFIED: { icon: '✅', color: 'text-emerald-400' },
  FLAGGED: { icon: '🚩', color: 'text-blue-400' },
}

export default function AuditLog({ entries }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 mb-3">
        Inhibitor safety checks — hallucinations blocked, fake statutes flagged, escalations forced.
      </p>
      <div className="space-y-1">
        {entries.map((e, i) => {
          const s = E[e.type] || E.FLAGGED
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg px-3 py-2 font-mono text-xs flex items-start gap-2"
            >
              <span>{s.icon}</span>
              <span>
                <span className={`font-semibold ${s.color}`}>[{e.type}]</span>
                <span className="text-zinc-500 ml-1.5">{e.message}</span>
              </span>
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
