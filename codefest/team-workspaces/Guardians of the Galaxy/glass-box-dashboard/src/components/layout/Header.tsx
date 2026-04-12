import { Clock, Activity, Sun, Moon } from 'lucide-react';
import type { DatasetEntry } from '@/lib/types';
import { useTheme } from '@/contexts/ThemeContext';

interface Props {
  activeDataset: DatasetEntry | null;
}

export function Header({ activeDataset }: Props) {
  const { isDark, toggleTheme } = useTheme();

  const formatDateRange = () => {
    if (!activeDataset?.stats) return '';
    const s = activeDataset.stats.timeSpanStart;
    const e = activeDataset.stats.timeSpanEnd;
    const sameDay = s.getFullYear() === e.getFullYear()
      && s.getMonth() === e.getMonth()
      && s.getDate() === e.getDate();
    if (sameDay) {
      return s.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return `${s.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} \u2014 ${e.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  };

  return (
    <header className="h-12 border-b border-border bg-card/80 backdrop-blur-xl flex items-center justify-between px-6 relative z-10 transition-colors duration-300">
      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="w-1.5 h-1.5 rounded-full bg-success" />
            <div className="absolute inset-0 w-1.5 h-1.5 rounded-full bg-success animate-ping opacity-50" />
          </div>
          <span className="text-[10px] text-success uppercase tracking-wider font-medium">Online</span>
        </div>
        {activeDataset?.stats && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Clock size={11} />
            <span className="font-mono">{formatDateRange()}</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {activeDataset && (
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <Activity size={11} className="text-accent" />
            <span className="font-medium text-foreground">{activeDataset.name}</span>
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-1.5 rounded-lg hover:bg-accent/10 transition-colors text-muted-foreground hover:text-accent"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {isDark ? <Sun size={15} /> : <Moon size={15} />}
        </button>
      </div>
    </header>
  );
}
