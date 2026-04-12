import { MessageCircle, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  isOpen: boolean;
  onClick: () => void;
}

export function ChatFab({ isOpen, onClick }: Props) {
  return (
    <motion.button
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center shadow-lg cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #00d4ff, #0088aa)',
        boxShadow: '0 0 30px rgba(0, 212, 255, 0.3), 0 4px 20px rgba(0, 0, 0, 0.4)',
      }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
    >
      <AnimatePresence mode="wait">
        {isOpen ? (
          <motion.div
            key="close"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <X size={24} className="text-white" />
          </motion.div>
        ) : (
          <motion.div
            key="chat"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MessageCircle size={24} className="text-white" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pulse ring when closed */}
      {!isOpen && (
        <span
          className="absolute inset-0 rounded-full animate-ping"
          style={{
            background: 'rgba(0, 212, 255, 0.2)',
            animationDuration: '3s',
          }}
        />
      )}
    </motion.button>
  );
}
