"use client";

import Link from "next/link";
import { Briefcase, ExternalLink } from "lucide-react";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { useOpportunitiesForFile } from "@/hooks/use-career-opportunities";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { Button } from "@/components/ui/button";

interface UsedInOpportunitiesSectionProps {
  fileId: string;
  copy: CareerVaultCopy;
}

export function UsedInOpportunitiesSection({
  fileId,
  copy,
}: UsedInOpportunitiesSectionProps) {
  const localeSlug = useLocaleSlug();
  const query = useOpportunitiesForFile(fileId);

  const opps = query.data ?? [];

  return (
    <section className="space-y-2 rounded-xl border bg-card p-4">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Briefcase className="h-4 w-4" />
        {copy.pipeline.vaultFile.usedInTitle}
      </h3>
      {query.isLoading ? (
        <p className="text-xs text-muted-foreground">…</p>
      ) : opps.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          {copy.pipeline.vaultFile.usedInEmpty}
        </p>
      ) : (
        <ul className="space-y-1.5">
          {opps.map((o) => (
            <li
              key={o.id}
              className="flex items-center gap-2 rounded-md border px-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium">{o.role_title}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {o.company_name} · {copy.pipeline.stages[o.stage]}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                render={
                  <Link
                    href={withLocalePrefix(
                      localeSlug,
                      `/career/pipeline/${o.id}`,
                    )}
                  />
                }
              >
                <ExternalLink className="mr-1 h-3 w-3" />
                {copy.pipeline.vaultFile.viewOpportunity}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
