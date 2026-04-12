import { useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Bot, Trash2 } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ChatMessage as ChatMessageType } from '@/lib/types';
import { ChatMessage } from './ChatMessage';
import { ChatInput } from './ChatInput';
import { SuggestedQuestions } from './SuggestedQuestions';

interface Props {
  messages: ChatMessageType[];
  isLoading: boolean;
  error: string | null;
  onSendMessage: (text: string) => void;
  onClear: () => void;
}

export function ChatbotPage({ messages, isLoading, error, onSendMessage, onClear }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { isDark } = useTheme();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col h-[calc(100vh-4rem)] rounded-2xl overflow-hidden"
      style={{
        background: isDark
          ? 'linear-gradient(145deg, rgba(10, 14, 26, 0.97), rgba(10, 14, 26, 0.92))'
          : 'linear-gradient(145deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.95))',
        border: isDark ? '1px solid rgba(0, 212, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isDark
          ? '0 0 60px rgba(0, 0, 0, 0.3), 0 0 30px rgba(0, 212, 255, 0.03)'
          : '0 2px 12px rgba(0, 0, 0, 0.06)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Bot size={20} className="text-accent" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">The Assistant</h2>
            <p className="text-xs text-muted-foreground">AI Safety Auditor &middot; Powered by GPT-4o-mini</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-foreground/5 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
            title="Clear chat"
          >
            <Trash2 size={14} />
            <span className="text-xs">Clear</span>
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 ? (
          <div className="max-w-2xl mx-auto">
            <SuggestedQuestions onSelect={onSendMessage} />
          </div>
        ) : (
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map(msg => <ChatMessage key={msg.id} message={msg} />)}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-6 py-2 bg-danger/10 border-t border-danger/20">
          <p className="text-xs text-danger">{error}</p>
        </div>
      )}

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <ChatInput onSend={onSendMessage} disabled={isLoading} />
      </div>
    </motion.div>
  );
}
