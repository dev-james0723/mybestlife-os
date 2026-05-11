"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ArrowLeft, Play, Sparkles } from "lucide-react";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { usePromptStore } from "@/stores/prompt-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import type { CustomPrompt, LibraryPrompt } from "@/types/prompt";
import { useAiKnowledgeRun } from "@/components/ai-knowledge/ai-knowledge-run-context";

/**
 * AI Knowledge — prompt detail (Phase 1 skeleton).
 *
 * The [id] segment accepts both library and custom prompt identifiers:
 *   - library slug prefixed with `lib-` (e.g. `/ai-knowledge/lib-react-reviewer`)
 *   - raw UUID for user-owned custom prompts
 *
 * This keeps the URL space flat while still letting the detail view fetch the
 * right record from the already-loaded prompt store. Run-with-Gemini (Phase 3)
 * and the create wizard (Phase 4) live on the main index and create routes;
 * this page remains a shareable read-only shell with Run.
 */
export default function AiKnowledgeDetailPage() {
  const { openRun } = useAiKnowledgeRun();
  const language = useAppStore((s) => s.language);
  const ui = getAiKnowledgeUiCopy(language);
  const pathname = usePathname();
  const params = useParams<{ id: string }>();
  const locale = useMemo(() => pathname.split("/")[1] || "en", [pathname]);
  const indexHref = `/${locale}/ai-knowledge`;

  const id = params?.id ?? "";

  const library = usePromptStore((s) => s.library);
  const userPrompts = usePromptStore((s) => s.userPrompts);
  const libraryLoaded = usePromptStore((s) => s.libraryLoaded);
  const userPromptsLoaded = usePromptStore((s) => s.userPromptsLoaded);
  const fetchAll = usePromptStore((s) => s.fetchAll);
  const isLoading = usePromptStore((s) => s.isLoading);

  useEffect(() => {
    if (!libraryLoaded || !userPromptsLoaded) {
      fetchAll().catch(() => {
        /* surfaced via store.lastError */
      });
    }
  }, [libraryLoaded, userPromptsLoaded, fetchAll]);

  const prompt = useMemo<LibraryPrompt | CustomPrompt | null>(() => {
    if (!id) return null;
    if (id.startsWith("lib-")) {
      const slug = id.slice(4);
      return library.find((p) => p.slug === slug) ?? null;
    }
    return userPrompts.find((p) => p.id === id) ?? null;
  }, [id, library, userPrompts]);

  return (
    <PageShell
      title={prompt?.title_i18n.en ?? ui.detail.back}
      description={prompt?.description_i18n.en}
      actions={
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            render={<Link href={indexHref} />}
          >
            <ArrowLeft className="h-4 w-4" />
            {ui.detail.back}
          </Button>
          {prompt && (
            <Button
              size="sm"
              className="gap-2"
              onClick={() => openRun(prompt)}
            >
              <Play className="h-4 w-4" />
              {ui.detail.runWithAi}
            </Button>
          )}
        </div>
      }
    >
      {!prompt ? (
        isLoading ? (
          <p className="text-sm text-muted-foreground py-12 text-center">
            {ui.states.loading}
          </p>
        ) : (
          <EmptyState
            icon={Sparkles}
            title={ui.states.errorTitle}
            description={ui.states.errorBodyGeneric}
          />
        )
      ) : (
        <div className="space-y-6">
          <section className="rounded-xl border bg-card p-6">
            <h2 className="text-sm font-semibold mb-3">
              {ui.detail.promptBody}
            </h2>
            <pre className="text-sm whitespace-pre-wrap font-mono text-muted-foreground">
              {prompt.body}
            </pre>
          </section>

          {prompt.variables.length > 0 && (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="text-sm font-semibold mb-3">
                {ui.detail.variables}
              </h2>
              <ul className="space-y-2">
                {prompt.variables.map((v) => (
                  <li
                    key={v.name}
                    className="flex items-center justify-between text-sm"
                  >
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
                      {`{${v.name}}`}
                    </code>
                    <span className="text-muted-foreground">
                      {v.label ?? v.name}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {prompt.tags.length > 0 && (
            <section className="rounded-xl border bg-card p-6">
              <h2 className="text-sm font-semibold mb-3">{ui.detail.tags}</h2>
              <div className="flex flex-wrap gap-1.5">
                {prompt.tags.map((t) => (
                  <span
                    key={t}
                    className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
                  >
                    #{t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {prompt.source === "library" && prompt.provenance && (
            <section className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              <h2 className="text-sm font-semibold text-foreground mb-3">
                {ui.detail.source}
              </h2>
              {prompt.provenance.source_url && (
                <a
                  href={prompt.provenance.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-foreground"
                >
                  {ui.detail.sourceLink}
                </a>
              )}
              {prompt.provenance.license && (
                <p className="mt-2">
                  {ui.detail.license(prompt.provenance.license)}
                </p>
              )}
              {prompt.provenance.attribution && (
                <p>
                  {ui.detail.attribution(prompt.provenance.attribution)}
                </p>
              )}
            </section>
          )}
        </div>
      )}
    </PageShell>
  );
}
