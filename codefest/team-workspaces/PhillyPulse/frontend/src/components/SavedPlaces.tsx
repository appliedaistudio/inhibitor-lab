"use client";

import { Star, Navigation, Trash2 } from "lucide-react";
import { useSavedDestinations } from "@/hooks/useSavedDestinations";

interface Props {
  onFlyTo: (lat: number, lng: number) => void;
  onDirections: (name: string, coords: { lat: number; lng: number }) => void;
}

export default function SavedPlaces({ onFlyTo, onDirections }: Props) {
  const { destinations, canSave, removeDestination } = useSavedDestinations();

  if (!canSave || destinations.length === 0) return null;

  return (
    <div className="px-4 pb-2">
      <h3
        className="text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1.5"
        style={{ color: "var(--panel-text-muted)" }}
      >
        <Star className="w-3 h-3" /> Saved Places
      </h3>
      <div className="space-y-1">
        {destinations.map((dest) => (
          <div
            key={dest.id}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors cursor-pointer group"
            style={{ background: "var(--panel-input-bg)" }}
            onClick={() => onFlyTo(dest.lat, dest.lng)}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--panel-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "var(--panel-input-bg)")
            }
          >
            <Star className="w-3.5 h-3.5 text-amber-500 shrink-0 fill-amber-500" />
            <span
              className="text-xs truncate flex-1"
              style={{ color: "var(--panel-text)" }}
            >
              {dest.name}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDirections(dest.name, { lat: dest.lat, lng: dest.lng });
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-500/50 hover:text-blue-500 shrink-0"
              title="Get directions"
            >
              <Navigation className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void removeDestination(dest.id);
              }}
              className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
              style={{ color: "var(--panel-text-muted)" }}
              title="Remove"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
