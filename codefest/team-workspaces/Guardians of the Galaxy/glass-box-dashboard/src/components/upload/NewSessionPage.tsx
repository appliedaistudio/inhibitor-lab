import { PlusCircle } from 'lucide-react';
import { DatasetUploadForm } from '@/components/shared/DatasetUploadForm';

interface Props {
  onSubmit: (name: string, csvFile: File, jsonlFile: File) => Promise<void>;
  loading: boolean;
  error: string | null;
}

export function NewSessionPage({ onSubmit, loading, error }: Props) {
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center">
          <PlusCircle size={20} className="text-accent" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-foreground">New Audit Session</h2>
          <p className="text-sm text-muted-foreground">
            Upload Inhibitor logs to start a new audit session
          </p>
        </div>
      </div>

      {/* Upload form in a glass card */}
      <div className="glass-card p-8">
        <DatasetUploadForm
          onSubmit={onSubmit}
          loading={loading}
          error={error}
          submitLabel="Start Audit Session"
          submitIcon={<PlusCircle size={16} />}
        />
      </div>
    </div>
  );
}
