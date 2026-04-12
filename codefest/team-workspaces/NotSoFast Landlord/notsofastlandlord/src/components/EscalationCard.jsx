import { motion } from 'framer-motion'

const S = {
  EMERGENCY: { border: 'border-red-500/20', bg: 'bg-red-500/[0.03]', badge: 'bg-red-500 text-white' },
  WARNING: { border: 'border-amber-500/20', bg: 'bg-amber-500/[0.03]', badge: 'bg-amber-500 text-black' },
  INFO: { border: 'border-blue-500/20', bg: 'bg-blue-500/[0.03]', badge: 'bg-blue-500 text-white' },
}

export default function EscalationCard({ escalation, index }) {
  const s = S[escalation.type] || S.INFO
  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.08 }}
      className={`border ${s.border} ${s.bg} rounded-xl p-4`}
    >
      <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.badge}`}>{escalation.type}</span>
      <p className="text-sm text-white mt-2">{escalation.trigger}</p>
      <p className="text-xs text-zinc-500 mt-1">{escalation.action}</p>
      {escalation.contact && (
        <a href={`tel:${escalation.contact.replace(/\D/g, '')}`} className="inline-block mt-2 text-xs text-[#14B8A6] font-medium">
          📞 {escalation.resource}: {escalation.contact}
        </a>
      )}
    </motion.div>
  )
}
