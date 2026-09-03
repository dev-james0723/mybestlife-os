import { notFound } from "next/navigation";
import { LifeAgentPage } from "@/components/life-agent/LifeAgentPage";
import { LIFE_COMPANION_ENABLED } from "@/lib/features";

export default function LifeAgentRoutePage() {
  if (!LIFE_COMPANION_ENABLED) notFound();

  return <LifeAgentPage />;
}
