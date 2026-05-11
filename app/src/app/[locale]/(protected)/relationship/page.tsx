import { Suspense } from "react";
import { LoadingPage } from "@/components/shared/loading-state";
import { RelationshipShell } from "@/components/relationship/relationship-shell";

export default function RelationshipPage() {
  // Suspense boundary is required because RelationshipShell uses
  // `useSearchParams`, which Next.js will bail out of during static rendering.
  return (
    <Suspense fallback={<LoadingPage />}>
      <RelationshipShell />
    </Suspense>
  );
}
