export type PolicyArea = "Healthcare" | "Education" | "Climate" | "Economy" | "Immigration" | "Justice";
export type OfficeLevel = "Local" | "State" | "National";
export type Party = "Democrat" | "Republican" | "Independent" | "Other";

export interface PolicyPosition {
  area: PolicyArea;
  stance: string;
  recentVote?: string;
  source: string;
  sourceUrl: string;
  date: string;
}

export interface Politician {
  id: string;
  name: string;
  party: Party;
  office: string;
  officeLevel: OfficeLevel;
  photo: string;
  positions: PolicyPosition[];
  bio: string;
}

export type UserAction = "support" | "oppose" | "neutral" | null;
