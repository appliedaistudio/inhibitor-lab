import { motion } from 'framer-motion'

export default function LightningBolt({ size = 200 }) {
  // Classic bold lightning bolt shape
  const frontFace = "M80,8 L132,8 L108,78 L148,78 L82,195 L102,108 L58,108 Z"
  // 3D right side (offset 12px right, 4px down)
  const sideRight = "M132,8 L144,12 L120,82 L148,78 L108,78 Z"
  const sideBottom = "M148,78 L160,82 L94,199 L82,195 Z"
  const sideLower = "M102,108 L114,112 L94,199 L82,195 Z"
  // Top bright edge
  const topEdge = "M80,8 L132,8 L130,12 L82,12 Z"

  return (
    <motion.div className="relative" style={{ width: size, height: size }}>
      {/* Big soft glow */}
      <motion.div
        className="absolute inset-[-30%] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(20,184,166,0.25) 0%, transparent 60%)',
          filter: 'blur(30px)',
        }}
        animate={{ opacity: [0.5, 0.8, 0.5], scale: [0.95, 1.05, 0.95] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      />

      <svg viewBox="0 0 220 210" className="w-full h-full relative z-10" style={{ filter: 'drop-shadow(0 0 15px rgba(20,184,166,0.5)) drop-shadow(0 0 40px rgba(20,184,166,0.2))' }}>
        <defs>
          <linearGradient id="boltFace" x1="0.3" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="30%" stopColor="#2DD4BF" />
            <stop offset="60%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0891B2" />
          </linearGradient>
          <linearGradient id="boltSide" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#0D9488" />
            <stop offset="100%" stopColor="#065F6B" />
          </linearGradient>
          <linearGradient id="boltTop" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity="0.5" />
            <stop offset="100%" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="reflGrad" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#06B6D4" stopOpacity="0" />
          </linearGradient>

          {/* Electric crackle glow */}
          <filter id="elecGlow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Main front face */}
        <motion.path
          d={frontFace}
          fill="url(#boltFace)"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
        />

        {/* 3D side faces */}
        <motion.path d={sideRight} fill="url(#boltSide)" initial={{ opacity: 0 }} animate={{ opacity: 0.9 }} transition={{ delay: 0.1, duration: 0.3 }} />
        <motion.path d={sideBottom} fill="url(#boltSide)" opacity="0.7" initial={{ opacity: 0 }} animate={{ opacity: 0.7 }} transition={{ delay: 0.15, duration: 0.3 }} />
        <motion.path d={sideLower} fill="url(#boltSide)" opacity="0.5" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} transition={{ delay: 0.15, duration: 0.3 }} />

        {/* Top bright edge */}
        <motion.path d={topEdge} fill="url(#boltTop)" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2, duration: 0.4 }} />

        {/* Inner highlight streak */}
        <motion.path
          d="M88,20 L120,20 L104,70 L92,70 Z"
          fill="white"
          opacity="0.08"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.08 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        />

        {/* Electric sparks */}
        {[
          { x: 60, y: 100, angle: -30 },
          { x: 145, y: 75, angle: 20 },
          { x: 95, y: 180, angle: -10 },
          { x: 130, y: 50, angle: 40 },
        ].map((spark, i) => (
          <motion.line
            key={i}
            x1={spark.x}
            y1={spark.y}
            x2={spark.x + Math.cos(spark.angle * Math.PI / 180) * 18}
            y2={spark.y + Math.sin(spark.angle * Math.PI / 180) * 18}
            stroke="#5EEAD4"
            strokeWidth="1.5"
            strokeLinecap="round"
            filter="url(#elecGlow)"
            initial={{ opacity: 0, pathLength: 0 }}
            animate={{ opacity: [0, 0.8, 0], pathLength: [0, 1, 0] }}
            transition={{ delay: 0.8 + i * 0.3, duration: 0.4, repeat: Infinity, repeatDelay: 2 + i * 0.5 }}
          />
        ))}

        {/* Floor reflection */}
        <motion.ellipse
          cx="110"
          cy="202"
          rx="50"
          ry="5"
          fill="url(#reflGrad)"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 0.7, scaleX: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        />
      </svg>
    </motion.div>
  )
}
