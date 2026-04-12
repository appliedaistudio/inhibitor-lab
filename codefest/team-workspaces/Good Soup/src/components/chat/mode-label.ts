import type { CompanionMode } from "@/types/companion";

export function toVisibleModeLabel(mode: CompanionMode): string {
  switch (mode) {
    case "learning":
      return "Socratic";
    case "retention":
      return "Retention";
    default:
      return "Research";
  }
}
