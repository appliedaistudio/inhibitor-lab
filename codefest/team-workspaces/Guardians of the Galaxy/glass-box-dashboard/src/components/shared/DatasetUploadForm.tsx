import { useState, useCallback } from 'react';
import { Rocket, ArrowRight, Loader2, Database } from 'lucide-react';
import { FileUploadZone } from './FileUploadZone';
import { validateCsvHeaders } from '@/lib/parseCsv';
import { validateJsonlFile } from '@/lib/parseJsonl';

interface Props {
  onSubmit: (name: string, csvFile: File, jsonlFile: File) => Promise<void>;
  loading: boolean;
  error: string | null;
  submitLabel?: string;
  submitIcon?: React.ReactNode;
  onLoadSample?: () => Promise<void>;
}

export function DatasetUploadForm({
  onSubmit,
  loading,
  error,
  submitLabel = 'Launch Dashboard',
  submitIcon,
  onLoadSample,
}: Props) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonlFile, setJsonlFile] = useState<File | null>(null);
  const [csvValidation, setCsvValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [jsonlValidation, setJsonlValidation] = useState<{ valid: boolean; error?: string; count?: number } | null>(null);
  const [datasetName, setDatasetName] = useState('');

  const handleCsvSelect = useCallback(async (file: File | null) => {
    setCsvFile(file);
    if (file) {
      setCsvValidation(await validateCsvHeaders(file));
    } else {
      setCsvValidation(null);
    }
  }, []);

  const handleJsonlSelect = useCallback(async (file: File | null) => {
    setJsonlFile(file);
    if (file) {
      setJsonlValidation(await validateJsonlFile(file));
    } else {
      setJsonlValidation(null);
    }
  }, []);

  const canSubmit = csvFile && jsonlFile && csvValidation?.valid && jsonlValidation?.valid && !loading;
  const resolvedName = datasetName.trim() || csvFile?.name.replace(/\.[^.]+$/, '') || 'Dataset';

  const handleSubmit = () => {
    if (canSubmit) {
      onSubmit(resolvedName, csvFile, jsonlFile);
    }
  };

  return (
    <>
      {/* Dataset name */}
      <div className="mb-6">
        <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] block mb-2">
          Dataset Name
        </label>
        <input
          type="text"
          value={datasetName}
          onChange={e => setDatasetName(e.target.value)}
          placeholder="e.g. Production Audit Feb 2026"
          className="w-full px-4 py-2.5 bg-background/50 border border-border rounded-xl text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/40 transition-colors"
        />
      </div>

      {/* File upload zones */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] block mb-2">
            Inhibitor Logs
          </label>
          <FileUploadZone
            label="Upload CSV"
            accept=".csv"
            description="inhibitor_logs.csv"
            icon="csv"
            file={csvFile}
            onFileSelect={handleCsvSelect}
            validation={csvValidation}
          />
        </div>
        <div>
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] block mb-2">
            Intervention Events
          </label>
          <FileUploadZone
            label="Upload JSONL"
            accept=".jsonl,.json,.ndjson"
            description="inhibitor_events.jsonl"
            icon="json"
            file={jsonlFile}
            onFileSelect={handleJsonlSelect}
            validation={jsonlValidation}
          />
        </div>
      </div>

      {/* Error display */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-danger/10 border border-danger/20 text-sm text-danger">
          {error}
        </div>
      )}

      {/* Submit button */}
      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        className={`w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
          canSubmit
            ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 hover:shadow-[0_0_30px_rgba(0,212,255,0.15)]'
            : 'bg-white/[0.03] text-muted-foreground/50 border border-border cursor-not-allowed'
        }`}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            Parsing Log Data...
          </>
        ) : (
          <>
            {submitIcon || <Rocket size={16} />}
            {submitLabel}
            <ArrowRight size={14} />
          </>
        )}
      </button>

      {/* Optional: Load Sample Data */}
      {onLoadSample && (
        <>
          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>
          <button
            onClick={onLoadSample}
            disabled={loading}
            className="w-full py-3 rounded-xl text-sm font-medium flex items-center justify-center gap-2 bg-white/[0.03] text-muted-foreground border border-border hover:bg-white/[0.06] hover:text-foreground hover:border-border-light transition-all duration-300"
          >
            <Database size={15} />
            Load Sample Dataset
          </button>
        </>
      )}
    </>
  );
}
