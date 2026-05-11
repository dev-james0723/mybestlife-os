"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Flame } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCareerOpportunities } from "@/hooks/use-career-opportunities";

export function HotPipelineWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard.intelligence;
  const localeSlug = useLocaleSlug();

  const oppsQ = useCareerOpportunities();
  const hot = useMemo(
    () =>
      (oppsQ.data ?? []).filter(
        (o) =>
          o.stage === "phone_screen" ||
          o.stage === "interviewing" ||
          o.stage === "offer",
      ),
    [oppsQ.data],
  );

  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-rose-500" aria-hidden />
        <span className="text-sm font-medium">
          {copy.hotInterviews(hot.length)}
        </span>
      </div>
      {hot.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {hot.slice(0, 3).map((o) => {
            const href = withLocalePrefix(
              localeSlug,
              `/career/pipeline/${o.id}`,
            );
            return (
              <li key={o.id}>
                <Link
                  href={href}
                  className="block truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  {o.role_title} — {o.company_name}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
