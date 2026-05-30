import { Suspense } from "react";
import { MindCouncilExperience } from "@/components/mind-council/mind-council-experience";

export default function MindCouncilPage() {
  // MindCouncilExperience reads search params (skill/mode/prompt deep links),
  // so it must sit under a Suspense boundary.
  return (
    <Suspense fallback={null}>
      <MindCouncilExperience />
    </Suspense>
  );
}
