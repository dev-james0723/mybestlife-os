import type { OpportunityStage } from "@/types/career-vault";

export const STAGE_ORDER: OpportunityStage[] = [
  "researching",
  "applied",
  "phone_screen",
  "interviewing",
  "offer",
  "accepted",
  "rejected",
  "withdrawn",
];

export const STAGE_ACCENT: Record<OpportunityStage, string> = {
  researching: "border-slate-400/40",
  applied: "border-blue-400/50",
  phone_screen: "border-indigo-400/50",
  interviewing: "border-purple-400/50",
  offer: "border-emerald-400/60",
  accepted: "border-emerald-500",
  rejected: "border-rose-400/50",
  withdrawn: "border-muted-foreground/30",
};
