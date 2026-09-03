import { notFound } from "next/navigation";
import { WEEKLY_REVIEW_ENABLED } from "@/lib/features";

export default function WeeklyReviewLayout({ children }: { children: React.ReactNode }) {
  if (!WEEKLY_REVIEW_ENABLED) notFound();

  return children;
}
