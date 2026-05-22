"use client";

import { useMemo } from "react";
import { format } from "date-fns";
import { Loader2, RefreshCw, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import {
  getQuoteCategoryLabel,
  getQuoteLibraryUiCopy,
} from "@/lib/i18n/quote-library-ui";
import { useAppStore } from "@/stores/app-store";
import { useQuotes } from "@/hooks/use-quotes";
import {
  useComputeWisdomProfile,
  useWisdomProfile,
} from "@/hooks/use-wisdom-profile";
import { useCreateJournalEntry } from "@/hooks/use-journal";
import { WisdomChart } from "./wisdom-chart";
import type { QuoteCategory } from "@/types/quote";

const PROFILE_THRESHOLD = 20;

export function WisdomProfileTab() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getQuoteLibraryUiCopy(language), [language]);

  const { data: quotes } = useQuotes();
  const { data: profile, isLoading } = useWisdomProfile();
  const compute = useComputeWisdomProfile();
  const createJournalEntry = useCreateJournalEntry();

  const count = quotes?.length ?? 0;

  const handleSendToJournal = async () => {
    if (!profile?.monthly_insight) return;
    if (!window.confirm(copy.sendToJournalConfirm)) return;
    try {
      const today = new Date().toISOString().slice(0, 10);
      const insight = profile.monthly_insight;
      await createJournalEntry.mutateAsync({
        entryDate: today,
        topic: "Quick Reset",
        quadrant: "GREEN",
        primaryEmotion: "Thoughtful",
        intensity: 5,
        bullets: { items: [copy.wisdomInsightTitle] },
        needs: { items: ["Clarity"] },
        nextTinyStep: copy.wisdomInsightTitle,
        appreciation: insight,
        selfStory: insight,
      });
      toast.success(copy.sendToJournalSuccess);
    } catch {
      toast.error(copy.sendToJournalFailed);
    }
  };

  if (count < PROFILE_THRESHOLD) {
    return (
      <EmptyState
        icon={Sparkles}
        title={copy.emptyWisdomTitle}
        description={copy.emptyWisdomDescription(count, PROFILE_THRESHOLD)}
      />
    );
  }

  if (!profile && !isLoading) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <Sparkles className="size-10 text-primary" aria-hidden />
        <h2 className="text-lg font-semibold">{copy.emptyWisdomTitle}</h2>
        <p className="max-w-md text-sm text-muted-foreground [text-wrap:balance]">
          {copy.wisdomChartTitle}
        </p>
        <Button
          onClick={() => compute.mutate({ manual: true })}
          disabled={compute.isPending}
        >
          {compute.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {copy.wisdomRefreshing}
            </>
          ) : (
            copy.wisdomRefresh
          )}
        </Button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" aria-hidden />
        {copy.loadingLibrary}
      </div>
    );
  }

  const lastComputed = new Date(profile.computed_at);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{copy.wisdomChartTitle}</h2>
          <p className="text-xs text-muted-foreground">
            {copy.wisdomLastComputed}: {format(lastComputed, "PPp")} ·{" "}
            {profile.quote_count_at_compute} {copy.tabAll.toLowerCase()}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => compute.mutate({ manual: true })}
          disabled={compute.isPending}
        >
          {compute.isPending ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
              {copy.wisdomRefreshing}
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 size-4" aria-hidden />
              {copy.wisdomRefresh}
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardContent className="p-5">
          <WisdomChart distribution={profile.category_distribution} />
        </CardContent>
      </Card>

      <section aria-label={copy.wisdomThemesTitle} className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {copy.wisdomThemesTitle}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {profile.top_themes.map((t) => (
            <Card key={t.theme}>
              <CardContent className="space-y-2 p-5">
                <h4 className="text-base font-semibold">{t.theme}</h4>
                <p className="text-sm leading-relaxed text-foreground/85 [text-wrap:pretty]">
                  {t.description}
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {t.supporting_categories.map((c) => (
                    <Badge
                      key={c}
                      variant="outline"
                      className="font-normal text-xs"
                    >
                      {getQuoteCategoryLabel(language, c as QuoteCategory)}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {profile.monthly_insight ? (
        <section aria-label={copy.wisdomInsightTitle}>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {copy.wisdomInsightTitle}
            </h3>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void handleSendToJournal()}
              disabled={createJournalEntry.isPending}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
            >
              {createJournalEntry.isPending ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
              {copy.sendToJournal}
            </Button>
          </div>
          <Card>
            <CardContent className="p-5">
              <p className="font-serif text-[17px] leading-relaxed text-foreground/90 [text-wrap:pretty]">
                {profile.monthly_insight}
              </p>
            </CardContent>
          </Card>
        </section>
      ) : null}
    </div>
  );
}
