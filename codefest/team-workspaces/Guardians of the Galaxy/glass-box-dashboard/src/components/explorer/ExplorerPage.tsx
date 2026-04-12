import { useState, useEffect } from 'react';
import { Search as SearchIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { RequestLifecycle, InterventionEvent } from '@/lib/types';
import { RequestTable } from './RequestTable';
import { RequestTimeline } from './RequestTimeline';
import { GovernanceReviewModal } from '@/components/governance/GovernanceReviewModal';

interface Props {
  requests: RequestLifecycle[];
  interventions: InterventionEvent[];
  initialRequestId?: string;
}

export function ExplorerPage({ requests, interventions, initialRequestId }: Props) {
  const [selectedRequest, setSelectedRequest] = useState<RequestLifecycle | null>(null);
  const [governanceRequest, setGovernanceRequest] = useState<RequestLifecycle | null>(null);

  // Auto-select when navigated from another page
  useEffect(() => {
    if (initialRequestId && requests.length > 0) {
      if (initialRequestId === 'auto') {
        // No specific request — select the first one so the timeline opens
        setSelectedRequest(requests[0]);
      } else {
        const target = requests.find(r => r.id === initialRequestId);
        if (target) {
          setSelectedRequest(target);
          setTimeout(() => {
            document.getElementById(`req-row-${initialRequestId}`)?.scrollIntoView({
              behavior: 'smooth', block: 'center',
            });
          }, 150);
        }
      }
    }
  }, [initialRequestId, requests]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <SearchIcon size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">Request Explorer</h2>
          <p className="text-sm text-muted-foreground">
            Click any request to see its full processing timeline · expand pipeline stages to inspect individual events
          </p>
        </div>
      </motion.div>

      {/* Main content — both panels scroll independently */}
      <div className="flex gap-6 items-start" style={{ height: 'calc(100vh - 140px)' }}>
        {/* Table — scrollable */}
        <div className={`transition-all duration-300 overflow-y-auto h-full ${selectedRequest ? 'w-[55%]' : 'w-full'}`}>
          <RequestTable
            requests={requests}
            onSelectRequest={setSelectedRequest}
            selectedId={selectedRequest?.id}
            highlightId={initialRequestId}
          />
        </div>

        {/* Timeline Panel — scrollable independently */}
        <AnimatePresence>
          {selectedRequest && (
            <div className="w-[45%] h-full">
              <RequestTimeline
                key={selectedRequest.id}
                request={selectedRequest}
                interventions={interventions}
                onClose={() => setSelectedRequest(null)}
                onOpenGovernance={() => setGovernanceRequest(selectedRequest)}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      {/* Governance Review Modal */}
      {governanceRequest && (
        <GovernanceReviewModal
          open={!!governanceRequest}
          onClose={() => setGovernanceRequest(null)}
          request={governanceRequest}
          interventions={interventions}
        />
      )}
    </div>
  );
}
