import { motion } from 'framer-motion'

export default function GlowButton({ children, onClick, disabled, className = '', size = 'lg' }) {
  const sizeClasses = size === 'lg' ? 'px-8 py-4 text-lg' : 'px-5 py-3 text-sm'

  return (
    <motion.button
      whileHover={!disabled ? { scale: 1.03 } : {}}
      whileTap={!disabled ? { scale: 0.97 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`
        relative font-semibold rounded-2xl transition-all cursor-pointer
        ${sizeClasses}
        ${
          disabled
            ? 'bg-white/[0.05] text-[#64748B] cursor-not-allowed border border-white/[0.05]'
            : 'bg-gradient-to-r from-[#0D9488] to-[#14B8A6] text-white border border-[#14B8A6]/30'
        }
        ${className}
      `}
      style={
        !disabled
          ? { boxShadow: '0 0 20px rgba(13,148,136,0.3), 0 0 60px rgba(13,148,136,0.1)' }
          : {}
      }
    >
      {/* Animated border glow */}
      {!disabled && (
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            boxShadow: '0 0 20px rgba(13,148,136,0.4)',
          }}
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
      <span className="relative z-10">{children}</span>
    </motion.button>
  )
}
