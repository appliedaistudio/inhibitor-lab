import { motion } from 'framer-motion'

export default function Timeline({ items }) {
  return (
    <div className="relative pl-8">
      {/* Vertical line */}
      <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-[#1E293B]" />

      <div className="space-y-6">
        {items.map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="relative"
          >
            {/* Node */}
            <div
              className={`absolute -left-5 top-1 w-4 h-4 rounded-full border-2 ${
                item.critical
                  ? 'bg-[#EF4444] border-[#EF4444]'
                  : 'bg-[#0D9488] border-[#0D9488]'
              }`}
            />
            <div className="ml-4">
              <div className={`text-xs font-bold uppercase tracking-wider ${
                item.critical ? 'text-[#EF4444]' : 'text-[#14B8A6]'
              }`}>
                {item.day}
              </div>
              <p className="text-sm text-white mt-1">{item.action}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
