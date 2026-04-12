import { motion } from 'framer-motion'

export default function HopeBanner({ severity, validityStatus, hopeMessage }) {
  const invalid = validityStatus === 'INVALID' || validityStatus === 'LIKELY_INVALID'
  const critical = severity === 'CRITICAL' || severity === 'HIGH'

  let border, emoji, headline, sub
  if (invalid) {
    border = 'border-emerald-500/20 bg-emerald-500/[0.04]'
    emoji = '💪'
    headline = 'This notice has serious problems.'
    sub = "That's good news. An invalid notice can be challenged."
  } else if (critical) {
    border = 'border-amber-500/20 bg-amber-500/[0.04]'
    emoji = '🤝'
    headline = 'This is serious — but you have options.'
    sub = "Philadelphia has programs designed for this exact situation."
  } else {
    border = 'border-zinc-700/50 bg-zinc-800/20'
    emoji = '✅'
    headline = "Let's understand your rights."
    sub = "This isn't an emergency. Here's what it means."
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`border rounded-xl p-5 mb-5 ${border}`}
    >
      <div className="flex gap-3">
        <span className="text-2xl">{emoji}</span>
        <div>
          <h2 className="text-base font-semibold text-white">{headline}</h2>
          <p className="text-sm text-zinc-400 mt-0.5">{sub}</p>
          {hopeMessage && (
            <p className="mt-3 text-sm text-zinc-400 italic border-l-2 border-zinc-700 pl-3">
              {hopeMessage}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  )
}
