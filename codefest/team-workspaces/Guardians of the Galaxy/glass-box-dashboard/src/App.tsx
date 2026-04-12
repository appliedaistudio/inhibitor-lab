import { useState, useCallback, useEffect } from 'react';
import type { TabId } from '@/lib/types';
import { useInhibitorData } from '@/hooks/useInhibitorData';
import { useChatbot } from '@/hooks/useChatbot';
import { CyberBackground } from '@/components/shared/CyberBackground';
import { LoadingScreen } from '@/components/shared/LoadingScreen';
import { LandingPage } from '@/components/landing/LandingPage';
import { AppShell } from '@/components/layout/AppShell';
import { OverviewPage } from '@/components/overview/OverviewPage';
import { InterventionsPage } from '@/components/interventions/InterventionsPage';
import { ExplorerPage } from '@/components/explorer/ExplorerPage';
import { CorrelationMap } from '@/components/correlation/CorrelationMap';
import { PerformancePage } from '@/components/performance/PerformancePage';
import { SecurityPage } from '@/components/security/SecurityPage';
import { ComparisonView } from '@/components/comparison/ComparisonView';
import { HistoryPage } from '@/components/history/HistoryPage';
import { NewSessionPage } from '@/components/upload/NewSessionPage';
import { ChatFab } from '@/components/chatbot/ChatFab';
import { ChatPanel } from '@/components/chatbot/ChatPanel';
import { ChatbotPage } from '@/components/chatbot/ChatbotPage';
import { saveSession, saveSessionBlobs, type SessionRecord } from '@/lib/sessionStorage';
import { humanizeObservation } from '@/lib/humanize';

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [showLanding, setShowLanding] = useState(true);
  const [explorerRequestId, setExplorerRequestId] = useState<string | undefined>();
  const data = useInhibitorData();
  const chat = useChatbot(data.activeDataset);

  const hasData = data.datasets.size > 0 && data.activeDataset !== null;
  const ds = data.activeDataset;

  // Auto-save session summary to localStorage when a dataset loads
  useEffect(() => {
    if (ds) {
      const topRisks = Object.entries(ds.stats.observationKeyCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 4)
        .map(([key]) => humanizeObservation(key));

      saveSession({
        id: ds.id,
        name: ds.name,
        createdAt: new Date().toISOString(),
        totalEvents: ds.stats.totalEvents,
        totalRequests: ds.stats.totalRequests,
        totalInterventions: ds.interventions.length,
        totalAuthFailures: ds.stats.totalAuthFailures,
        timeStart: ds.stats.timeSpanStart.toISOString(),
        timeEnd: ds.stats.timeSpanEnd.toISOString(),
        passRate: ds.stats.validationPassRate,
        topRisks,
      });
    }
  }, [ds]);

  // Landing page: upload files → save blobs → enter dashboard
  const handleLaunchWithFiles = useCallback(async (name: string, csvFile: File, jsonlFile: File) => {
    const [csvText, jsonlText] = await Promise.all([csvFile.text(), jsonlFile.text()]);
    const dsId = await data.addDatasetFromFiles(name, csvFile, jsonlFile);
    if (dsId) {
      await saveSessionBlobs(dsId, csvText, jsonlText).catch(() => {});
    }
    setShowLanding(false);
    setActiveTab('overview');
  }, [data.addDatasetFromFiles]);

  const handleLaunchSample = useCallback(async () => {
    const csvUrl = '/data/set_a/inhibitor_logs.csv';
    const jsonlUrl = '/data/set_a/inhibitor_events.jsonl';
    const dsId = await data.addDatasetFromUrl('Sample Set A', csvUrl, jsonlUrl);
    if (dsId) {
      const [csvResp, jsonlResp] = await Promise.all([fetch(csvUrl), fetch(jsonlUrl)]);
      const [csvText, jsonlText] = await Promise.all([csvResp.text(), jsonlResp.text()]);
      await saveSessionBlobs(dsId, csvText, jsonlText).catch(() => {});
    }
    setShowLanding(false);
    setActiveTab('overview');
  }, [data.addDatasetFromUrl]);

  // In-dashboard "New Session": upload files → save blobs → go to Overview
  const handleNewSession = useCallback(async (name: string, csvFile: File, jsonlFile: File) => {
    const [csvText, jsonlText] = await Promise.all([csvFile.text(), jsonlFile.text()]);
    const dsId = await data.addDatasetFromFiles(name, csvFile, jsonlFile);
    if (dsId) {
      await saveSessionBlobs(dsId, csvText, jsonlText).catch(() => {});
    }
    setActiveTab('overview');
  }, [data.addDatasetFromFiles]);

  // Load a saved session from History → re-parse from IndexedDB → go to Overview
  const handleLoadSession = useCallback(async (session: SessionRecord) => {
    const success = await data.loadDatasetFromSession(session);
    if (success) {
      setActiveTab('overview');
    }
    // If failed, user stays on History page and sees error via data.error
  }, [data.loadDatasetFromSession]);

  // Logo click: go to overview if data exists, otherwise show landing
  const handleLogoClick = useCallback(() => {
    if (hasData) {
      setActiveTab('overview');
    } else {
      setShowLanding(true);
    }
  }, [hasData]);

  const handleTabChange = useCallback((tab: TabId) => {
    setActiveTab(tab);
  }, []);

  // Loading overlay
  if (data.loading && !hasData) {
    return (
      <>
        <CyberBackground />
        <LoadingScreen />
      </>
    );
  }

  // Landing page — only on first visit (before any data loaded)
  if (showLanding && !hasData) {
    return (
      <>
        <CyberBackground />
        <LandingPage
          onLaunchWithFiles={handleLaunchWithFiles}
          onLaunchSample={handleLaunchSample}
          loading={data.loading}
          error={data.error}
        />
      </>
    );
  }

  // Dashboard
  return (
    <>
      <CyberBackground />
      <AppShell
        activeTab={activeTab}
        onTabChange={handleTabChange}
        activeDataset={data.activeDataset}
        datasetCount={data.datasets.size}
        onGoHome={handleLogoClick}
      >
        <div key={data.activeDatasetId}>
          {activeTab === 'overview' && ds && <OverviewPage stats={ds.stats} interventions={ds.interventions} />}
          {activeTab === 'interventions' && ds && (
            <InterventionsPage
              interventions={ds.interventions}
              dataset={ds}
              onNavigateToExplorer={(requestId?: string) => {
                setExplorerRequestId(requestId);
                setActiveTab('explorer');
              }}
            />
          )}
          {activeTab === 'explorer' && ds && <ExplorerPage requests={ds.requests} interventions={ds.interventions} initialRequestId={explorerRequestId} />}
          {activeTab === 'correlation' && ds && <CorrelationMap requests={ds.requests} />}
          {activeTab === 'performance' && ds && <PerformancePage stats={ds.stats} requests={ds.requests} />}
          {activeTab === 'security' && ds && <SecurityPage authFailures={ds.authFailures} />}
          {activeTab === 'comparison' && <ComparisonView datasets={data.datasets} />}
          {activeTab === 'history' && (
            <HistoryPage onLoadSession={handleLoadSession} loading={data.loading} error={data.error} />
          )}
          {activeTab === 'new-session' && (
            <NewSessionPage onSubmit={handleNewSession} loading={data.loading} error={data.error} />
          )}
          {activeTab === 'chatbot' && (
            <ChatbotPage
              messages={chat.messages}
              isLoading={chat.isLoading}
              error={chat.error}
              onSendMessage={chat.sendMessage}
              onClear={chat.clearChat}
            />
          )}
        </div>
      </AppShell>

      {!!import.meta.env.VITE_OPENAI_API_KEY && activeTab !== 'chatbot' && (
        <ChatFab isOpen={chat.isOpen} onClick={chat.togglePanel} />
      )}
      {!!import.meta.env.VITE_OPENAI_API_KEY && activeTab !== 'chatbot' && (
        <ChatPanel
          isOpen={chat.isOpen}
          messages={chat.messages}
          isLoading={chat.isLoading}
          error={chat.error}
          onSendMessage={chat.sendMessage}
          onClear={chat.clearChat}
          onMaximize={() => {
            chat.togglePanel();
            setActiveTab('chatbot');
          }}
        />
      )}
    </>
  );
}

export default App;
