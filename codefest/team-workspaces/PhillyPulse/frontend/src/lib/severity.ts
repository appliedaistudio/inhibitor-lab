export interface SeverityConfig {
  label: string;
  color: string;
  bgClass: string;
  textClass: string;
  markerColor: string;
}

export const SEVERITY_MAP: Record<string, SeverityConfig> = {
  violent_weapon: {
    label: "Violent (Weapon)",
    color: "#ef4444",
    bgClass: "bg-red-500/20",
    textClass: "text-red-400",
    markerColor: "#dc2626",
  },
  violent_no_weapon: {
    label: "Violent",
    color: "#f87171",
    bgClass: "bg-red-400/20",
    textClass: "text-red-300",
    markerColor: "#ef4444",
  },
  shots_heard: {
    label: "Shots Fired",
    color: "#ef4444",
    bgClass: "bg-red-500/20",
    textClass: "text-red-400",
    markerColor: "#dc2626",
  },
  robbery: {
    label: "Robbery",
    color: "#f97316",
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-400",
    markerColor: "#ea580c",
  },
  burglary_in_progress: {
    label: "Burglary",
    color: "#f97316",
    bgClass: "bg-orange-500/20",
    textClass: "text-orange-400",
    markerColor: "#ea580c",
  },
  medical_priority: {
    label: "Medical (Priority)",
    color: "#3b82f6",
    bgClass: "bg-blue-500/20",
    textClass: "text-blue-400",
    markerColor: "#2563eb",
  },
  medical_other: {
    label: "Medical",
    color: "#60a5fa",
    bgClass: "bg-blue-400/20",
    textClass: "text-blue-300",
    markerColor: "#3b82f6",
  },
  fire_hazmat: {
    label: "Fire / Hazmat",
    color: "#f59e0b",
    bgClass: "bg-amber-500/20",
    textClass: "text-amber-400",
    markerColor: "#d97706",
  },
  traffic_crash_injury: {
    label: "Crash (Injuries)",
    color: "#eab308",
    bgClass: "bg-yellow-500/20",
    textClass: "text-yellow-400",
    markerColor: "#ca8a04",
  },
  traffic_crash_no_injury: {
    label: "Crash",
    color: "#a3a3a3",
    bgClass: "bg-neutral-500/20",
    textClass: "text-neutral-400",
    markerColor: "#737373",
  },
  disorder: {
    label: "Disorder",
    color: "#a78bfa",
    bgClass: "bg-violet-400/20",
    textClass: "text-violet-400",
    markerColor: "#7c3aed",
  },
  admin_or_noise: {
    label: "Admin",
    color: "#525252",
    bgClass: "bg-neutral-600/20",
    textClass: "text-neutral-500",
    markerColor: "#525252",
  },
};

export function getSeverity(category: string): SeverityConfig {
  return (
    SEVERITY_MAP[category] || {
      label: category.replace(/_/g, " "),
      color: "#6b7280",
      bgClass: "bg-neutral-500/20",
      textClass: "text-neutral-400",
      markerColor: "#6b7280",
    }
  );
}
