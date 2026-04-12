import { useState, useRef, type DragEvent } from 'react';
import { Upload, FileText, X, CheckCircle, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  label: string;
  accept: string;
  description: string;
  icon?: 'csv' | 'json';
  file: File | null;
  onFileSelect: (file: File | null) => void;
  validation?: { valid: boolean; error?: string } | null;
}

export function FileUploadZone({ label, accept, description, icon = 'csv', file, onFileSelect, validation }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileSelect(dropped);
  };

  const handleClick = () => inputRef.current?.click();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) onFileSelect(selected);
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const accentColor = icon === 'csv' ? '#00d4ff' : '#a855f7';

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="hidden"
      />

      <motion.div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!file ? handleClick : undefined}
        animate={{
          borderColor: isDragging ? accentColor : file ? `${accentColor}40` : 'var(--color-border)',
          boxShadow: isDragging ? `0 0 30px ${accentColor}20` : 'none',
        }}
        className={`relative rounded-xl border-2 border-dashed p-4 transition-all duration-300 flex flex-col justify-center ${
          !file ? 'cursor-pointer hover:border-[var(--color-border-light)]' : ''
        }`}
        style={{
          background: file
            ? `linear-gradient(135deg, ${accentColor}08, transparent)`
            : 'var(--color-card)',
        }}
      >
        {/* Drag overlay */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 rounded-2xl flex items-center justify-center z-10"
              style={{ background: `${accentColor}10`, backdropFilter: 'blur(4px)' }}
            >
              <p className="text-sm font-medium" style={{ color: accentColor }}>
                Drop file here
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {!file ? (
          /* Empty state */
          <div className="flex flex-col items-center gap-2 py-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: `${accentColor}10`, border: `1px solid ${accentColor}20` }}
            >
              <Upload size={18} style={{ color: accentColor }} />
            </div>
            <div className="text-center">
              <p className="text-xs font-medium text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{description}</p>
            </div>
            <p className="text-[9px] text-muted-foreground/50">
              Drop or click to browse
            </p>
          </div>
        ) : (
          /* File loaded state */
          <div className="flex items-center gap-4">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: `${accentColor}15`, border: `1px solid ${accentColor}25` }}
            >
              <FileText size={20} style={{ color: accentColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{formatSize(file.size)}</span>
                {validation?.valid && (
                  <span className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle size={11} /> Valid
                  </span>
                )}
                {validation && !validation.valid && (
                  <span className="flex items-center gap-1 text-xs text-danger">
                    <AlertCircle size={11} /> {validation.error}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); onFileSelect(null); }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-muted-foreground hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}
