import { motion } from 'framer-motion';
import { Bot, User } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ChatMessage as ChatMessageType } from '@/lib/types';

interface Props {
  message: ChatMessageType;
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-2 py-1">
      {[0, 1, 2].map(i => (
        <motion.div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-accent/60"
          animate={{ opacity: [0.3, 1, 0.3], y: [0, -3, 0] }}
          transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
        />
      ))}
    </div>
  );
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user';
  const { isDark } = useTheme();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
    >
      {/* Avatar */}
      <div
        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
          isUser
            ? 'bg-accent/15 border border-accent/25'
            : isDark ? 'bg-white/5 border border-border' : 'bg-gray-100 border border-gray-200'
        }`}
      >
        {isUser ? (
          <User size={14} className="text-accent" />
        ) : (
          <Bot size={14} className="text-accent" />
        )}
      </div>

      {/* Bubble */}
      <div
        className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser
            ? 'bg-accent/10 border border-accent/20 text-foreground'
            : isDark
              ? 'bg-white/[0.04] border border-border text-foreground/90'
              : 'bg-gray-50 border border-gray-200 text-foreground/90'
        }`}
      >
        {message.loading && !message.content ? (
          <TypingIndicator />
        ) : (
          <div className="whitespace-pre-wrap break-words">{message.content}</div>
        )}
      </div>
    </motion.div>
  );
}
