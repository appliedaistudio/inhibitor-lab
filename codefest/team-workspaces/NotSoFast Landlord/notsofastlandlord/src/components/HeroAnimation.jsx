import { motion } from 'framer-motion'

export default function HeroAnimation() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7, rotateX: 40 }}
      animate={{ opacity: 1, scale: 1, rotateX: 0 }}
      transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
      style={{ perspective: '800px' }}
      className="relative"
    >
      {/* Outer glow ring */}
      <motion.div
        className="absolute -inset-6 rounded-[28px]"
        style={{
          background: 'conic-gradient(from 0deg, #14B8A6, #7C3AED, #06B6D4, #14B8A6)',
          filter: 'blur(30px)',
          opacity: 0.2,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      />

      {/* Animated gradient border */}
      <motion.div
        className="relative p-[1.5px] rounded-2xl"
        style={{
          background: 'conic-gradient(from 0deg, #14B8A6, #7C3AED, #06B6D4, #14B8A6)',
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      >
        <div className="w-[72px] h-[72px] bg-[#09090B] rounded-2xl flex items-center justify-center relative overflow-hidden">
          {/* Inner gradient shine */}
          <motion.div
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(135deg, rgba(20,184,166,0.15) 0%, transparent 50%, rgba(124,58,237,0.1) 100%)',
            }}
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 3, repeat: Infinity }}
          />
          {/* Shield SVG instead of emoji */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="relative z-10">
            <path
              d="M12 2L4 6v5c0 5.25 3.4 10.2 8 12 4.6-1.8 8-6.75 8-12V6l-8-4z"
              fill="url(#shieldGrad)"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="0.5"
            />
            <path
              d="M9.5 12l2 2 4-4"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="shieldGrad" x1="4" y1="2" x2="20" y2="22">
                <stop offset="0%" stopColor="#14B8A6" />
                <stop offset="100%" stopColor="#0D9488" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </motion.div>

      {/* Floating light dots */}
      {[
        { x: -40, y: -20, delay: 0, size: 4, color: '#14B8A6' },
        { x: 50, y: -30, delay: 0.5, size: 3, color: '#7C3AED' },
        { x: -30, y: 40, delay: 1, size: 3, color: '#06B6D4' },
        { x: 45, y: 35, delay: 1.5, size: 2, color: '#14B8A6' },
      ].map((dot, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: dot.size,
            height: dot.size,
            backgroundColor: dot.color,
            left: `calc(50% + ${dot.x}px)`,
            top: `calc(50% + ${dot.y}px)`,
            boxShadow: `0 0 ${dot.size * 3}px ${dot.color}`,
          }}
          animate={{
            y: [0, -8, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{ duration: 2 + i * 0.5, delay: dot.delay, repeat: Infinity }}
        />
      ))}
    </motion.div>
  )
}
