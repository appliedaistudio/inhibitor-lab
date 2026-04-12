import { motion } from 'framer-motion'

export default function FuturisticBackground({ children }) {
  return (
    <div className="relative min-h-screen bg-[#09090B] overflow-hidden">
      {/* Rotating aurora */}
      <motion.div
        className="absolute top-[-40%] left-[-20%] w-[140%] h-[80%] pointer-events-none"
        style={{
          background: 'conic-gradient(from 230deg at 50% 50%, #0D948800 0deg, #0D9488 72deg, #7C3AED 144deg, #06B6D4 216deg, #0D948800 360deg)',
          filter: 'blur(120px)',
          opacity: 0.08,
        }}
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 50, repeat: Infinity, ease: 'linear' }}
      />
      <motion.div
        className="absolute bottom-[-30%] right-[-20%] w-[100%] h-[70%] pointer-events-none"
        style={{
          background: 'conic-gradient(from 60deg at 50% 50%, #7C3AED00 0deg, #7C3AED 90deg, #EC4899 180deg, #06B6D4 270deg, #7C3AED00 360deg)',
          filter: 'blur(140px)',
          opacity: 0.05,
        }}
        animate={{ rotate: [360, 0] }}
        transition={{ duration: 70, repeat: Infinity, ease: 'linear' }}
      />

      {/* Top spotlight */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center top, rgba(20,184,166,0.1) 0%, transparent 60%)' }}
      />

      {/* 3D floor grid */}
      <div className="absolute bottom-0 left-0 right-0 h-[30%] overflow-hidden pointer-events-none" style={{ perspective: '500px', perspectiveOrigin: '50% 0%' }}>
        <div
          className="w-full h-full origin-top"
          style={{
            transform: 'rotateX(60deg)',
            backgroundImage: `linear-gradient(rgba(20,184,166,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.06) 1px, transparent 1px)`,
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/80 to-transparent" />
      </div>

      {/* Flat grid overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
        }}
      />

      <div className="relative z-10">{children}</div>
    </div>
  )
}
