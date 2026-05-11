"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { isBioLabToolId } from "@/lib/bio-lab/tool-types";
import { useBioLabStore } from "@/stores/bio-lab-store";

/**
 * Keeps `?tool=` on `/garden` in sync with the Bio Lab sheet (deep links + clean close).
 */
export function GardenBioLabQuerySync() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const activeTool = useBioLabStore((s) => s.activeTool);
  const openTool = useBioLabStore((s) => s.openTool);

  useEffect(() => {
    const raw = searchParams.get("tool");
    if (!raw) return;
    if (!isBioLabToolId(raw)) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("tool");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
      return;
    }
    if (useBioLabStore.getState().activeTool !== raw) {
      openTool(raw);
    }
  }, [searchParams, pathname, router, openTool]);

  useEffect(() => {
    const inUrl = searchParams.get("tool");
    if (activeTool) {
      if (inUrl === activeTool) return;
      const next = new URLSearchParams(searchParams.toString());
      next.set("tool", activeTool);
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
      return;
    }
    if (inUrl && isBioLabToolId(inUrl)) {
      const next = new URLSearchParams(searchParams.toString());
      next.delete("tool");
      const q = next.toString();
      router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    }
  }, [activeTool, searchParams, pathname, router]);

  return null;
}
