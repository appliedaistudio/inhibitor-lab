import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { useState, useEffect } from 'react'

const STEPS = [
  'Reading your notice',
  'Checking Philadelphia ordinances',
  'Fact-checking landlord claims',
  'Running Inhibitor safety checks',
  'Building your action plan',
]

export default function LoadingSteps({ onComplete, apiDone }) {
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (step < STEPS.length) {
      const t = setTimeout(() => setStep((s) => s + 1), 1000)
      return () => clearTimeout(t)
    } else if (apiDone) onComplete()
  }, [step, apiDone, onComplete])

  return (
    <div className="min-h-screen bg-[#09090B] flex items-center justify-center px-6">
      <div className="w-full max-w-xs">
        <div className="space-y-3">
          {STEPS.map((s, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -12 }}
              animate={i <= step ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              {i < step ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 bg-white rounded-full flex items-center justify-center flex-shrink-0"
                >
                  <Check className="w-3 h-3 text-black" />
                </motion.div>
              ) : i === step ? (
                <div className="w-5 h-5 border border-zinc-600 rounded-full flex-shrink-0 relative">
                  <motion.div
                    className="absolute inset-0 border border-white rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1.2, repeat: Infinity }}
                  />
                </div>
              ) : (
                <div className="w-5 h-5 border border-zinc-800 rounded-full flex-shrink-0" />
              )}
              <span className={`text-sm ${i < step ? 'text-zinc-400' : i === step ? 'text-white' : 'text-zinc-700'}`}>
                {s}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
