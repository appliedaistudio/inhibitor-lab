import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Bot, Maximize2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';

interface Props {
  isOpen: boolean;
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (text: string) => void;
  onClear: () => void;
  onMaximize?: () => void;
}

export function ChatPanel({ isOpen, messages, isLoading, error, onSendMessage, onClear, onMaximize }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
          className="fixed bottom-24 right-6 z-50 w-[400px] h-[560px] flex flex-col rounded-2xl overflow-hidden"
          style={{
            background: isDark
              ? 'linear-gradient(145deg, rgba(10, 14, 26, 0.97), rgba(10, 14, 26, 0.92))'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
            backdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(0, 212, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.1)',
            boxShadow: isDark
              ? '0 0 60px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 212, 255, 0.05)'
              : '0 8px 40px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                <Bot size={16} className="text-accent" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">The Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Powered by GPT-4o-mini</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onMaximize && (
                <button
                  onClick={onMaximize}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/5 transition-colors cursor-pointer"
                  title="Open fullscreen"
                >
                  <Maximize2 size={14} className="text-muted-foreground" />
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={onClear}
                  className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-foreground/5 transition-colors cursor-pointer"
                  title="Clear chat"
                >
                  <Trash2 size={14} className="text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
            {messages.length === 0 ? (
              <SuggestedQuestions onSelect={onSendMessage} />
            ) : (
              messages.map(msg => <ChatMessage key={msg.id} message={msg} />)
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="px-3 py-2 bg-danger/10 border-t border-danger/20">
              <p className="text-xs text-danger">{error}</p>
            </div>
          )}

          {/* Input */}
          <ChatInput onSend={onSendMessage} disabled={isLoading} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
