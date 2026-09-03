import { notFound } from "next/navigation";
import { HEALTH_ENABLED } from "@/lib/features";

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  if (!HEALTH_ENABLED) notFound();

  return children;
}
