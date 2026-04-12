import { motion } from 'framer-motion'
import { useEffect } from 'react'

export default function IntroSplash({ onComplete }) {
  useEffect(() => {
    const t = setTimeout(() => onComplete(), 6500)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#09090B] overflow-hidden">
      {/* Sky — dark clouds at top */}
      <div
        className="absolute top-0 left-0 right-0 h-[40%]"
        style={{
          background: 'radial-gradient(ellipse at 50% 0%, rgba(30,30,40,0.8) 0%, transparent 70%)',
        }}
      />

      {/* Ground grid */}
      <div className="absolute bottom-0 left-0 right-0 h-[35%] overflow-hidden" style={{ perspective: '400px', perspectiveOrigin: '50% 0%' }}>
        <div
          className="w-full h-full origin-top"
          style={{
            transform: 'rotateX(60deg)',
            backgroundImage: `linear-gradient(rgba(20,184,166,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(20,184,166,0.1) 1px, transparent 1px)`,
            backgroundSize: '50px 50px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090B] via-[#09090B]/70 to-transparent" />
      </div>

      {/* ===== THE LIGHTNING STRIKE ===== */}

      {/* 1. Screen flash — the whole screen goes white for a split second */}
      <motion.div
        className="absolute inset-0 bg-white pointer-events-none z-20"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0, 0.9, 0, 0.4, 0] }}
        transition={{ duration: 1.2, times: [0, 0.45, 0.5, 0.6, 0.65, 0.75], delay: 0.8 }}
      />

      {/* 2. Main bolt — jagged path from top to center, draws itself */}
      <motion.svg
        viewBox="0 0 400 600"
        className="absolute inset-0 w-full h-full z-10 pointer-events-none"
        style={{ filter: 'drop-shadow(0 0 8px rgba(180,240,255,0.8)) drop-shadow(0 0 30px rgba(20,184,166,0.6)) drop-shadow(0 0 80px rgba(20,184,166,0.3))' }}
      >
        <defs>
          <linearGradient id="boltStrike" x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="white" />
            <stop offset="30%" stopColor="#A5F3FC" />
            <stop offset="60%" stopColor="#2DD4BF" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <filter id="boltBlur">
            <feGaussianBlur stdDeviation="2" />
          </filter>
        </defs>

        {/* Wide glow layer behind */}
        <motion.path
          d="M200,0 L210,60 L185,80 L215,140 L190,165 L220,230 L195,260 L215,310 L200,340"
          stroke="rgba(20,184,166,0.3)"
          strokeWidth="30"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          filter="url(#boltBlur)"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 0.8, 0] }}
          transition={{ duration: 2, times: [0, 0.4, 0.55, 1], delay: 0.5 }}
        />

        {/* Core bright bolt */}
        <motion.path
          d="M200,0 L210,60 L185,80 L215,140 L190,165 L220,230 L195,260 L215,310 L200,340"
          stroke="url(#boltStrike)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 0] }}
          transition={{ duration: 2.2, times: [0, 0.4, 0.6, 1], delay: 0.5 }}
        />

        {/* Inner white-hot core */}
        <motion.path
          d="M200,0 L210,60 L185,80 L215,140 L190,165 L220,230 L195,260 L215,310 L200,340"
          stroke="white"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 1, 0] }}
          transition={{ duration: 2, times: [0, 0.4, 0.55, 1], delay: 0.5 }}
        />

        {/* Branch 1 — forks left */}
        <motion.path
          d="M185,80 L155,105 L140,100"
          stroke="#A5F3FC"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 0.7, 0] }}
          transition={{ duration: 1.8, times: [0, 0.55, 0.7, 1], delay: 0.5 }}
        />

        {/* Branch 2 — forks right */}
        <motion.path
          d="M215,140 L245,160 L260,155"
          stroke="#A5F3FC"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 0.7, 0] }}
          transition={{ duration: 1.8, times: [0, 0.55, 0.7, 1], delay: 0.5 }}
        />

        {/* Branch 3 — lower left */}
        <motion.path
          d="M195,260 L165,280 L155,275"
          stroke="#7C3AED"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: [0, 0, 1, 1], opacity: [0, 0, 0.5, 0] }}
          transition={{ duration: 1.8, times: [0, 0.6, 0.75, 1], delay: 0.5 }}
        />
      </motion.svg>

      {/* 3. Impact point glow — where the bolt hits center screen */}
      <motion.div
        className="absolute pointer-events-none z-10"
        style={{
          width: 300, height: 300,
          left: 'calc(50% - 150px)', top: 'calc(56% - 150px)',
          background: 'radial-gradient(circle, rgba(180,240,255,0.4) 0%, rgba(20,184,166,0.15) 30%, transparent 60%)',
        }}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 0, 2.5, 2], opacity: [0, 0, 1, 0] }}
        transition={{ duration: 2, times: [0, 0.5, 0.65, 1], delay: 0.5 }}
      />

      {/* 4. Shockwave rings from impact */}
      {[0, 0.15, 0.3].map((d, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full border pointer-events-none z-10"
          style={{
            width: 100, height: 100,
            left: 'calc(50% - 50px)', top: 'calc(56% - 50px)',
            borderColor: i === 0 ? 'rgba(180,240,255,0.3)' : 'rgba(20,184,166,0.15)',
          }}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: [0, 0, 5], opacity: [0, 0, 0.5, 0] }}
          transition={{ duration: 2, times: [0, 0.55 + d, 0.7 + d, 1], delay: 0.5 }}
        />
      ))}

      {/* ===== TEXT REVEALS (after the strike fades) ===== */}
      <div className="relative z-30 flex flex-col items-center text-center">
        {/* LOGO — slams in right when bolt hits, starts invisible + huge + blurred, snaps to size */}
        <motion.div
          initial={{ scale: 3, opacity: 0, filter: 'blur(30px) brightness(3)', rotateZ: -15 }}
          animate={{
            scale: [3, 3, 1.15, 0.95, 1],
            opacity: [0, 0, 1, 1, 1],
            filter: [
              'blur(30px) brightness(3)',
              'blur(30px) brightness(3)',
              'blur(0px) brightness(2)',
              'blur(0px) brightness(1.2)',
              'blur(0px) brightness(1)',
            ],
            rotateZ: [-15, -15, 3, -1, 0],
          }}
          transition={{
            duration: 2.5,
            times: [0, 0.42, 0.52, 0.62, 0.72],
            delay: 0.5,
          }}
          className="mb-4"
        >
          <motion.img
            src="/logo.png"
            alt=""
            className="w-28 h-28 md:w-36 md:h-36 object-contain mx-auto"
            style={{ filter: 'drop-shadow(0 0 20px rgba(20,184,166,0.5))' }}
            animate={{
              filter: [
                'drop-shadow(0 0 20px rgba(20,184,166,0.5))',
                'drop-shadow(0 0 10px rgba(20,184,166,0.3))',
                'drop-shadow(0 0 20px rgba(20,184,166,0.5))',
              ],
            }}
            transition={{ duration: 2, repeat: Infinity, delay: 2.5 }}
          />
        </motion.div>

        {/* NOT SO FAST */}
        <div className="flex justify-center gap-[2px] md:gap-[4px]" style={{ perspective: '800px' }}>
          {'NOT SO FAST'.split('').map((char, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 60, rotateX: 90 }}
              animate={{ opacity: 1, y: 0, rotateX: 0 }}
              transition={{
                delay: 2.8 + i * 0.04,
                duration: 0.6,
                ease: [0.16, 1, 0.3, 1],
              }}
              style={{
                fontFamily: "'Orbitron', sans-serif",
                display: 'inline-block',
                minWidth: char === ' ' ? '16px' : 'auto',
                textShadow: '0 0 20px rgba(20,184,166,0.3)',
              }}
              className="text-2xl md:text-4xl font-extrabold text-white"
            >
              {char}
            </motion.span>
          ))}
        </div>

        {/* LANDLORD */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, filter: 'blur(20px)' }}
          animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
          transition={{ delay: 3.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mt-1"
        >
          <span
            style={{ fontFamily: "'Orbitron', sans-serif" }}
            className="text-4xl md:text-7xl font-black tracking-tight bg-gradient-to-r from-[#14B8A6] via-[#06B6D4] to-[#7C3AED] bg-clip-text text-transparent"
          >
            LANDLORD
          </span>
        </motion.div>

        {/* Line */}
        <motion.div
          className="mx-auto mt-4 h-[2px] rounded-full"
          style={{ background: 'linear-gradient(90deg, transparent, #14B8A6, #7C3AED, transparent)' }}
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: '280px', opacity: 1 }}
          transition={{ delay: 4.5, duration: 0.7 }}
        />

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5 }}
          style={{ fontFamily: "'Space Grotesk', sans-serif" }}
          className="text-zinc-500 text-xs mt-4 uppercase tracking-[0.2em]"
        >
          Tenant Rights AI — Philadelphia
        </motion.p>

        {/* Status */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 5.5 }}
          className="mt-3 flex items-center gap-2"
        >
          <motion.span
            className="w-1.5 h-1.5 bg-emerald-400 rounded-full"
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1, repeat: Infinity }}
          />
          <span className="text-[11px] text-zinc-600 font-mono tracking-wider">INHIBITOR ONLINE</span>
        </motion.div>
      </div>

      {/* Progress */}
      <div className="absolute bottom-12 w-48 h-[2px] bg-zinc-800/50 rounded-full overflow-hidden z-30">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, #14B8A6, #7C3AED, #06B6D4)' }}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: 6, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
    </div>
  )
}
