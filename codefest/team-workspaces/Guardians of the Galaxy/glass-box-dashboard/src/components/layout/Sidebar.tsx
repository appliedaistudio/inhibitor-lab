import { LayoutDashboard, ShieldAlert, Search, Gauge, Lock, Hexagon, Network, GitCompare, History, PlusCircle, Bot } from 'lucide-react';
import type { TabId } from '@/lib/types';
import { motion } from 'framer-motion';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  multiDataset?: boolean;
  hasData?: boolean;
  onLogoClick?: () => void;
}

interface TabDef {
  id: TabId;
  label: string;
  icon: typeof LayoutDashboard;
  section?: string;
  requiresData?: boolean;
  requiresMulti?: boolean;
}

const tabs: TabDef[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, requiresData: true },
  { id: 'interventions', label: 'Interventions', icon: ShieldAlert, requiresData: true },
  { id: 'explorer', label: 'Explorer', icon: Search, requiresData: true },
  { id: 'correlation', label: 'Risk Map', icon: Network, section: 'Analysis', requiresData: true },
  { id: 'performance', label: 'Performance', icon: Gauge, section: 'System', requiresData: true },
  { id: 'security', label: 'Security', icon: Lock, requiresData: true },
  { id: 'comparison', label: 'Compare', icon: GitCompare, requiresData: true, requiresMulti: true },
  { id: 'history', label: 'History', icon: History, section: 'Sessions' },
  { id: 'new-session', label: 'New Session', icon: PlusCircle },
  { id: 'chatbot', label: 'Assistant', icon: Bot },
];

export function Sidebar({ activeTab, onTabChange, multiDataset, hasData, onLogoClick }: Props) {
  let lastSection = '';

  return (
    <aside className="w-52 min-h-screen border-r border-border bg-card/90 backdrop-blur-xl flex flex-col relative z-10 transition-colors duration-300">
      {/* Logo - clickable, goes to landing page */}
      <button
        onClick={onLogoClick}
        className="p-4 pb-3 border-b border-border w-full text-left hover:bg-white/[0.02] transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Hexagon size={28} className="text-accent" strokeWidth={1.5} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-accent" style={{ boxShadow: '0 0 8px var(--color-accent)' }} />
            </div>
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground tracking-tight">GlassBox Explained</h1>
            <p className="text-[8px] text-accent/70 uppercase tracking-[0.2em]">AI Safety Audit</p>
          </div>
        </div>
      </button>

      {/* Navigation */}
      <nav className="flex-1 p-2 mt-1 overflow-y-auto">
        {tabs.map(tab => {
          if (tab.requiresMulti && !multiDataset) return null;
          const disabled = tab.requiresData && !hasData;
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          const showSection = tab.section && tab.section !== lastSection;
          if (tab.section) lastSection = tab.section;

          return (
            <div key={tab.id}>
              {showSection && (
                <p className="text-[8px] text-muted-foreground/40 uppercase tracking-[0.2em] px-3 pt-3 pb-1">
                  {tab.section}
                </p>
              )}
              <button
                onClick={() => !disabled && onTabChange(tab.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all duration-300 relative ${
                  disabled
                    ? 'text-muted-foreground/25 cursor-not-allowed'
                    : isActive
                    ? 'text-accent'
                    : 'text-muted-foreground hover:text-foreground hover:bg-white/[0.03]'
                }`}
              >
                {isActive && !disabled && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-lg"
                    style={{
                      background: 'linear-gradient(135deg, rgba(0,212,255,0.08), rgba(0,212,255,0.02))',
                      border: '1px solid rgba(0,212,255,0.15)',
                      boxShadow: 'inset 0 0 20px rgba(0,212,255,0.03)',
                    }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                {isActive && !disabled && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[2px] h-4 rounded-r bg-accent"
                    style={{ boxShadow: '0 0 8px #00d4ff' }}
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                  />
                )}
                <Icon size={14} className="relative z-10" />
                <span className="text-xs font-medium relative z-10">{tab.label}</span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-border">
        <p className="text-[8px] text-muted-foreground/40 text-center uppercase tracking-[0.15em]">
          Philly Codefest 2026
        </p>
      </div>
    </aside>
  );
}
