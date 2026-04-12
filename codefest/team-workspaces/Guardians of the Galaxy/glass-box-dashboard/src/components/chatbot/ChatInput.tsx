import { useState, useCallback, type KeyboardEvent } from 'react';
import { Send } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  onSend: (text: string) => void;
  disabled: boolean;
}

export function ChatInput({ onSend, disabled }: Props) {
  const [value, setValue] = useState('');

  const handleSend = useCallback(() => {
    if (!value.trim() || disabled) return;
    onSend(value);
    setValue('');
  }, [value, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const { isDark } = useTheme();

  return (
    <div className={`flex items-end gap-2 p-3 border-t border-border ${isDark ? 'bg-card/50' : 'bg-white/80'}`}>
      <textarea
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Ask about interventions, compliance, risks..."
        disabled={disabled}
        rows={1}
        className={`flex-1 resize-none rounded-xl border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/40 transition-colors disabled:opacity-50 ${
          isDark ? 'bg-background/50 border-border' : 'bg-gray-50 border-gray-200'
        }`}
        style={{ maxHeight: '80px' }}
      />
      <button
        onClick={handleSend}
        disabled={disabled || !value.trim()}
        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all disabled:opacity-30 cursor-pointer"
        style={{
          background: value.trim() && !disabled ? 'rgba(0, 212, 255, 0.15)' : 'transparent',
          border: '1px solid rgba(0, 212, 255, 0.2)',
        }}
      >
        <Send size={16} className="text-accent" />
      </button>
    </div>
  );
}
