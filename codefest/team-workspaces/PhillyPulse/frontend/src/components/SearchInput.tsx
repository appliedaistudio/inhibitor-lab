"use client";

import { useState, useRef, useCallback } from "react";
import { Search, MapPin, Loader2, X, Navigation } from "lucide-react";
import { geocodePhilly } from "@/lib/search";

interface GeoResult {
  display_name: string;
  lat: number;
  lng: number;
}

interface Props {
  onFlyTo: (lat: number, lng: number) => void;
  onDirections: (name: string, coords: { lat: number; lng: number }) => void;
}

export default function SearchInput({ onFlyTo, onDirections }: Props) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeoResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const geocode = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.trim().length < 2) {
      setSuggestions([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const results = await geocodePhilly(q);
      setSuggestions(results);
      setLoading(false);
    }, 200);
  }, []);

  const handleSelect = (s: GeoResult) => {
    onFlyTo(s.lat, s.lng);
    setQuery(s.display_name.split(",")[0]);
    setSuggestions([]);
    setOpen(false);
  };

  return (
    <div className="p-4 pb-2">
      <div
        className="flex items-center gap-3 rounded-full px-4 py-2.5 transition-colors shadow-lg"
        style={{
          background: "var(--panel-input-bg)",
          border: "1px solid var(--panel-input-border)",
          boxShadow: "0 2px 8px var(--panel-shadow)",
        }}
      >
        <Search className="w-5 h-5 text-blue-500 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            geocode(e.target.value);
          }}
          onFocus={() => {
            if (query.length >= 2) setOpen(true);
          }}
          placeholder="Search PHLPulse"
          className="flex-1 bg-transparent text-sm outline-none"
          style={{ color: "var(--panel-text)" }}
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              setOpen(false);
            }}
            style={{ color: "var(--panel-text-muted)" }}
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {open && (suggestions.length > 0 || loading) && (
        <div
          className="mt-2 rounded-xl overflow-hidden shadow-lg"
          style={{
            background: "var(--panel-bg-secondary)",
            border: "1px solid var(--panel-border)",
          }}
        >
          {loading && suggestions.length === 0 && (
            <div className="px-4 py-3 flex items-center gap-3">
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "var(--panel-text-muted)" }}
              />
              <span className="text-xs" style={{ color: "var(--panel-text-muted)" }}>
                Searching...
              </span>
            </div>
          )}
          {suggestions.map((s, i) => {
            const parts = s.display_name.split(",");
            const primary = parts[0].trim();
            const secondary = parts.slice(1, 3).map((p) => p.trim()).join(", ");
            return (
              <div
                key={i}
                onClick={() => handleSelect(s)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 last:border-0 transition-colors cursor-pointer"
                style={{ borderBottom: "1px solid var(--panel-border)" }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = "var(--panel-hover)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: "var(--panel-input-bg)" }}
                >
                  <MapPin
                    className="w-4 h-4"
                    style={{ color: "var(--panel-text-muted)" }}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: "var(--panel-text)" }}
                  >
                    {primary}
                  </p>
                  {secondary && (
                    <p
                      className="text-xs truncate mt-0.5"
                      style={{ color: "var(--panel-text-muted)" }}
                    >
                      {secondary}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDirections(primary, s);
                  }}
                  className="ml-auto text-blue-500/50 hover:text-blue-500 shrink-0 mt-1"
                  title="Get directions"
                >
                  <Navigation className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
