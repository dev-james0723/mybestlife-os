"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function IdeasError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Ideas route] error", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="max-w-md rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h2 className="text-lg font-semibold">Idea Capture failed to load</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {error.message || "A runtime error occurred while loading ideas."}
        </p>
        {error.digest ? (
          <p className="mt-2 text-xs text-muted-foreground">Error digest: {error.digest}</p>
        ) : null}
        <Button className="mt-4" onClick={reset}>
          Try again
        </Button>
      </div>
    </div>
  );
}
