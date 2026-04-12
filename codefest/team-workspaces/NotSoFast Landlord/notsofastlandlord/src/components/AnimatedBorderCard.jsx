import { motion } from 'framer-motion'

export default function AnimatedBorderCard({ children, className = '', delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className={`relative group rounded-2xl p-[1px] cursor-pointer ${className}`}
      style={{
        background: 'linear-gradient(135deg, rgba(20,184,166,0.2), rgba(124,58,237,0.1), rgba(20,184,166,0.05))',
      }}
    >
      {/* Animated gradient border on hover */}
      <div
        className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"
        style={{
          background: 'linear-gradient(135deg, rgba(20,184,166,0.4), rgba(124,58,237,0.2), rgba(251,191,36,0.2), rgba(20,184,166,0.4))',
        }}
      />

      {/* Inner content */}
      <div className="relative bg-[#0A0F1E]/90 backdrop-blur-xl rounded-2xl h-full">
        {children}
      </div>
    </motion.div>
  )
}
