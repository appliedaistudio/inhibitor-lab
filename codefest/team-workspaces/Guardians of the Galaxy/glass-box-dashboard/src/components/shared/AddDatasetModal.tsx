import { useState, useCallback } from 'react';
import { X, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileUploadZone } from './FileUploadZone';
import { validateCsvHeaders } from '@/lib/parseCsv';
import { validateJsonlFile } from '@/lib/parseJsonl';

interface Props {
  open: boolean;
  onClose: () => void;
  onAdd: (name: string, csvFile: File, jsonlFile: File) => Promise<void>;
  loading: boolean;
}

export function AddDatasetModal({ open, onClose, onAdd, loading }: Props) {
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [jsonlFile, setJsonlFile] = useState<File | null>(null);
  const [csvValidation, setCsvValidation] = useState<{ valid: boolean; error?: string } | null>(null);
  const [jsonlValidation, setJsonlValidation] = useState<{ valid: boolean; error?: string; count?: number } | null>(null);
  const [name, setName] = useState('');

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

  const canAdd = csvFile && jsonlFile && csvValidation?.valid && jsonlValidation?.valid && !loading;
  const datasetName = name.trim() || csvFile?.name.replace(/\.[^.]+$/, '') || 'New Dataset';

  const handleAdd = async () => {
    if (canAdd) {
      await onAdd(datasetName, csvFile, jsonlFile);
      // Reset
      setCsvFile(null);
      setJsonlFile(null);
      setCsvValidation(null);
      setJsonlValidation(null);
      setName('');
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
          >
            <div className="glass-card border border-accent/15 p-6" style={{ boxShadow: '0 0 60px rgba(0,212,255,0.08)' }}>
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Add Dataset</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Upload a new set of Inhibitor logs</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Name input */}
              <div className="mb-4">
                <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.15em] block mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Staging Audit"
                  className="w-full px-3 py-2 bg-background/50 border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:border-accent/40 transition-colors"
                />
              </div>

              {/* Upload zones */}
              <div className="grid grid-cols-2 gap-3 mb-5">
                <FileUploadZone
                  label="CSV Logs"
                  accept=".csv"
                  description="inhibitor_logs.csv"
                  icon="csv"
                  file={csvFile}
                  onFileSelect={handleCsvSelect}
                  validation={csvValidation}
                />
                <FileUploadZone
                  label="JSONL Events"
                  accept=".jsonl,.json,.ndjson"
                  description="inhibitor_events.jsonl"
                  icon="json"
                  file={jsonlFile}
                  onFileSelect={handleJsonlSelect}
                  validation={jsonlValidation}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-white/[0.03] text-muted-foreground border border-border hover:bg-white/[0.06] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAdd}
                  disabled={!canAdd}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-300 ${
                    canAdd
                      ? 'bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25 hover:shadow-[0_0_20px_rgba(0,212,255,0.1)]'
                      : 'bg-white/[0.03] text-muted-foreground/40 border border-border cursor-not-allowed'
                  }`}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Plus size={14} />
                  )}
                  Add Dataset
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
