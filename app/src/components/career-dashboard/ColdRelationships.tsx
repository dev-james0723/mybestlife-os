"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Snowflake } from "lucide-react";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { OSSolidPanel } from "@/components/ui/os-primitives";
import { useCareerNetworkNodes } from "@/hooks/use-career-network";
import { coldRelationships } from "@/lib/dashboard/aggregators";

export function ColdRelationshipsWidget() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).dashboard.intelligence;
  const localeSlug = useLocaleSlug();

  const nodesQ = useCareerNetworkNodes();
  const cold = useMemo(
    () => coldRelationships(nodesQ.data ?? [], 5),
    [nodesQ.data],
  );

  return (
    <OSSolidPanel className="p-3">
      <div className="flex items-center gap-2">
        <Snowflake className="h-4 w-4 text-sky-500" aria-hidden />
        <span className="text-sm font-medium">
          {copy.coldContacts(cold.length)}
        </span>
      </div>
      {cold.length > 0 ? (
        <ul className="mt-2 space-y-1">
          {cold.slice(0, 3).map((n) => {
            const href = withLocalePrefix(
              localeSlug,
              `/career/network?node=${n.id}`,
            );
            return (
              <li key={n.id}>
                <Link
                  href={href}
                  className="block truncate text-xs text-muted-foreground hover:text-foreground"
                >
                  {n.name}
                  {n.daysSinceContact !== null
                    ? ` · ${n.daysSinceContact}d`
                    : ""}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </OSSolidPanel>
  );
}
