import { Zap } from 'lucide-react'

export default function FrictionScoreBadge({ score, large = false }) {
  const color =
    score <= 10 ? 'text-green-400 bg-green-500/20 border-green-500/30' :
    score <= 20 ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' :
                  'text-red-400 bg-red-500/20 border-red-500/30'

  return (
    <span className={`inline-flex items-center gap-1 border rounded-full font-semibold ${color} ${large ? 'px-3 py-1.5 text-sm' : 'px-2.5 py-1 text-xs'}`}>
      <Zap className={large ? 'w-4 h-4' : 'w-3 h-3'} />
      {score.toFixed(1)}
    </span>
  )
}
