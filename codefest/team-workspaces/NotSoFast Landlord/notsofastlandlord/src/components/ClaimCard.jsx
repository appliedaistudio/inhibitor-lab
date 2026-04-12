import { motion } from 'framer-motion'

const B = {
  VERIFIED: { icon: '🟢', color: 'text-emerald-400', label: 'Verified' },
  UNCERTAIN: { icon: '🟡', color: 'text-amber-400', label: 'Uncertain' },
  LIKELY_FALSE: { icon: '🔴', color: 'text-red-400', label: 'Likely False' },
}

export default function ClaimCard({ claim, index }) {
  const b = B[claim.confidence] || B.UNCERTAIN
  const bad = claim.confidence === 'LIKELY_FALSE'

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className={`border rounded-xl p-4 ${bad ? 'border-red-500/15 bg-red-500/[0.02]' : 'border-zinc-800'}`}
    >
      <span className={`text-xs font-medium ${b.color}`}>{b.icon} {b.label}</span>
      <p className="text-sm text-white mt-1.5">{claim.text}</p>
      <p className="text-xs text-zinc-500 mt-1.5">{claim.explanation}</p>
      {claim.citation && <p className="text-xs text-[#14B8A6] mt-1.5">{claim.citation}</p>}
      {bad && (
        <div className="mt-2 text-[11px] text-red-400/80 bg-red-500/[0.05] border border-red-500/10 rounded-lg px-2.5 py-1.5">
          🛡 Inhibitor flagged — could not verify against Philadelphia law
        </div>
      )}
    </motion.div>
  )
}
