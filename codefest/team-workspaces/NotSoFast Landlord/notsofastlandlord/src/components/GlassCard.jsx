import { motion } from 'framer-motion'

export default function GlassCard({
  children,
  className = '',
  hover = false,
  glow = false,
  glowColor = 'rgba(13,148,136,0.15)',
  delay = 0,
  onClick,
  ...props
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      whileTap={onClick ? { scale: 0.98 } : {}}
      onClick={onClick}
      className={`
        relative rounded-2xl border border-white/[0.06]
        bg-white/[0.03] backdrop-blur-xl
        ${glow ? 'shadow-lg' : ''}
        ${onClick ? 'cursor-pointer' : ''}
        ${className}
      `}
      style={glow ? { boxShadow: `0 0 30px ${glowColor}, inset 0 1px 0 rgba(255,255,255,0.05)` } : { boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}
      {...props}
    >
      {children}
    </motion.div>
  )
}
