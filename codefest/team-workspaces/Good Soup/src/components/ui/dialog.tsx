"use client";

import { useEffect, useRef, useState } from "react";

type DialogVariant = "confirm" | "prompt" | "alert";

interface DialogConfig {
  variant: DialogVariant;
  title: string;
  body?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  defaultValue?: string;
  danger?: boolean;
  onConfirm: (value?: string) => void;
  onCancel?: () => void;
}

let showDialogFn: ((config: DialogConfig) => void) | null = null;

export function showDialog(config: DialogConfig) {
  showDialogFn?.(config);
}

export function DialogProvider() {
  const [config, setConfig] = useState<DialogConfig | null>(null);
  const [inputValue, setInputValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    showDialogFn = (cfg) => {
      setInputValue(cfg.defaultValue ?? "");
      setConfig(cfg);
    };
    return () => { showDialogFn = null; };
  }, []);

  useEffect(() => {
    if (!config) return;
    const target = config.variant === "prompt" ? inputRef.current : confirmRef.current;
    setTimeout(() => target?.focus(), 30);
  }, [config]);

  if (!config) return null;

  function handleConfirm() {
    const nextConfig = config;
    setConfig(null);
    nextConfig?.onConfirm(nextConfig.variant === "prompt" ? inputValue : undefined);
  }

  function handleCancel() {
    const nextConfig = config;
    setConfig(null);
    nextConfig?.onCancel?.();
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && config?.variant !== "prompt") handleConfirm();
    if (e.key === "Enter" && config?.variant === "prompt" && inputValue.trim()) handleConfirm();
    if (e.key === "Escape") handleCancel();
  }

  return (
    <div className="dialog-overlay" onMouseDown={handleCancel} onKeyDown={handleKey} tabIndex={-1}>
      <div className="dialog-panel" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-modal>
        <p className="dialog-title">{config.title}</p>
        {config.body && <p className="dialog-body">{config.body}</p>}
        {config.variant === "prompt" && (
          <input
            ref={inputRef}
            className="dialog-input"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKey}
            autoComplete="off"
            spellCheck={false}
          />
        )}
        <div className="dialog-actions">
          {config.variant !== "alert" && (
            <button className="dialog-btn dialog-btn--cancel" type="button" onClick={handleCancel}>
              {config.cancelLabel ?? "Cancel"}
            </button>
          )}
          <button
            ref={confirmRef}
            className={`dialog-btn dialog-btn--confirm${config.danger ? " dialog-btn--danger" : ""}`}
            type="button"
            onClick={handleConfirm}
            disabled={config.variant === "prompt" && !inputValue.trim()}
          >
            {config.confirmLabel ?? (config.variant === "alert" ? "OK" : "Confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
