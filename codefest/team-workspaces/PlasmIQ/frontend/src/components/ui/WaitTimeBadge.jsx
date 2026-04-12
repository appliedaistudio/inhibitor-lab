import { Clock } from 'lucide-react'

export default function WaitTimeBadge({ minutes }) {
  const color =
    minutes <= 10 ? 'text-green-400 bg-green-500/20 border-green-500/30' :
    minutes <= 20 ? 'text-amber-400 bg-amber-500/20 border-amber-500/30' :
                    'text-red-400 bg-red-500/20 border-red-500/30'

  return (
    <span className={`inline-flex items-center gap-1 border rounded-full text-xs font-semibold px-2.5 py-1 ${color}`}>
      <Clock className="w-3 h-3" />
      {minutes} min wait
    </span>
  )
}
