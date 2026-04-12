export type IconName =
  | "overview"
  | "runs"
  | "policies"
  | "interventions"
  | "evaluations"
  | "audit"
  | "settings"
  | "search";

export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    fill: "none",
    viewBox: "0 0 24 24",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  switch (name) {
    case "overview":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="7" height="7" rx="1.5" />
          <rect x="13" y="4" width="7" height="4" rx="1.5" />
          <rect x="13" y="10" width="7" height="10" rx="1.5" />
          <rect x="4" y="13" width="7" height="7" rx="1.5" />
        </svg>
      );
    case "runs":
      return (
        <svg {...common}>
          <path d="M5 17L9 13L12 16L19 8" />
          <path d="M14 8H19V13" />
        </svg>
      );
    case "policies":
      return (
        <svg {...common}>
          <path d="M12 4L19 7V12C19 16 16.2 19.4 12 20C7.8 19.4 5 16 5 12V7L12 4Z" />
          <path d="M9.5 12L11.3 13.8L15 10.1" />
        </svg>
      );
    case "interventions":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8" />
          <path d="M12 8V16" />
          <path d="M8 12H16" />
        </svg>
      );
    case "evaluations":
      return (
        <svg {...common}>
          <path d="M6 19V10" />
          <path d="M12 19V5" />
          <path d="M18 19V13" />
        </svg>
      );
    case "audit":
      return (
        <svg {...common}>
          <rect x="5" y="3.5" width="14" height="17" rx="2" />
          <path d="M8 8H16" />
          <path d="M8 12H16" />
          <path d="M8 16H13" />
        </svg>
      );
    case "settings":
      return (
        <svg {...common}>
          <path d="M12 8.5A3.5 3.5 0 1 0 12 15.5A3.5 3.5 0 1 0 12 8.5Z" />
          <path d="M19 12C19 11.4 18.9 10.8 18.7 10.3L20.2 9.1L18.7 6.5L16.8 7.1C16 6.4 15.1 5.9 14.1 5.7L13.8 3.7H10.2L9.9 5.7C8.9 5.9 8 6.4 7.2 7.1L5.3 6.5L3.8 9.1L5.3 10.3C5.1 10.8 5 11.4 5 12C5 12.6 5.1 13.2 5.3 13.7L3.8 14.9L5.3 17.5L7.2 16.9C8 17.6 8.9 18.1 9.9 18.3L10.2 20.3H13.8L14.1 18.3C15.1 18.1 16 17.6 16.8 16.9L18.7 17.5L20.2 14.9L18.7 13.7C18.9 13.2 19 12.6 19 12Z" />
        </svg>
      );
    case "search":
      return (
        <svg {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="M16 16L20 20" />
        </svg>
      );
    default:
      return null;
  }
}
