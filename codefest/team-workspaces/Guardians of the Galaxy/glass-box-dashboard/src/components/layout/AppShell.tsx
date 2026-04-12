import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import type { TabId, DatasetEntry } from '@/lib/types';

interface Props {
  children: ReactNode;
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  activeDataset: DatasetEntry | null;
  datasetCount: number;
  onGoHome: () => void;
}

export function AppShell({
  children,
  activeTab,
  onTabChange,
  activeDataset,
  datasetCount,
  onGoHome,
}: Props) {
  return (
    <div className="flex h-screen overflow-hidden relative z-10">
      <Sidebar
        activeTab={activeTab}
        onTabChange={onTabChange}
        multiDataset={datasetCount > 1}
        hasData={datasetCount > 0}
        onLogoClick={onGoHome}
      />
      <div className="flex-1 flex flex-col min-w-0 h-screen">
        <Header activeDataset={activeDataset} />
        <main className="flex-1 overflow-y-auto p-6 cyber-grid">
          <div className="relative z-10">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
