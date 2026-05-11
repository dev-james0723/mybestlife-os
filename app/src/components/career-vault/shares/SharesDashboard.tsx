"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/shared/loading-state";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { useAppStore } from "@/stores/app-store";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import { useCareerVaultShares } from "@/hooks/use-career-vault-shares";
import type { CareerVaultShare } from "@/types/career-vault";
import { ShareCard } from "./ShareCard";
import { AccessLogModal } from "./AccessLogModal";

function isArchived(share: CareerVaultShare): boolean {
  if (!share.is_active) return true;
  if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
    return true;
  }
  if (
    typeof share.max_views === "number" &&
    share.view_count >= share.max_views
  ) {
    return true;
  }
  return false;
}

export function SharesDashboard() {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const localeSlug = useLocaleSlug();
  const sharesQuery = useCareerVaultShares();
  const [logsOpenFor, setLogsOpenFor] = useState<string | null>(null);

  const vaultHref = withLocalePrefix(localeSlug, "/career/vault");

  const grouped = useMemo(() => {
    const all = sharesQuery.data ?? [];
    return {
      active: all.filter((s) => !isArchived(s)),
      archived: all.filter((s) => isArchived(s)),
    };
  }, [sharesQuery.data]);

  const totalViews = (sharesQuery.data ?? []).reduce(
    (sum, s) => sum + (s.view_count || 0),
    0,
  );

  if (sharesQuery.isLoading) return <LoadingPage />;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={vaultHref} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.breadcrumb.vault}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {copy.shares.pageTitle}
        </h1>
      </div>

      <p className="text-sm text-muted-foreground">{copy.shares.pageDescription}</p>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span>{copy.shares.stats.active(grouped.active.length)}</span>
        <span>·</span>
        <span>{copy.shares.stats.totalViews(totalViews)}</span>
      </div>

      {grouped.active.length === 0 && grouped.archived.length === 0 ? (
        <div className="rounded-2xl border bg-card p-10 text-center">
          <p className="text-sm font-medium">{copy.shares.empty.title}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {copy.shares.empty.description}
          </p>
        </div>
      ) : null}

      {grouped.active.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">{copy.shares.sections.active}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {grouped.active.map((s) => (
              <ShareCard
                key={s.id}
                share={s}
                copy={copy}
                onOpenLogs={setLogsOpenFor}
              />
            ))}
          </div>
        </section>
      ) : null}

      {grouped.archived.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-sm font-medium">{copy.shares.sections.archived}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {grouped.archived.map((s) => (
              <ShareCard
                key={s.id}
                share={s}
                copy={copy}
                onOpenLogs={setLogsOpenFor}
              />
            ))}
          </div>
        </section>
      ) : null}

      <AccessLogModal
        shareId={logsOpenFor}
        onClose={() => setLogsOpenFor(null)}
        copy={copy}
      />
    </div>
  );
}
