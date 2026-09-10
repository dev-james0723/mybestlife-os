"use client";

import { useCallback, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageShell } from "@/components/shared/page-shell";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { AIProviderIcon } from "@/components/ai-knowledge/AIProviderIcon";
import { useAppStore } from "@/stores/app-store";
import { usePromptStore } from "@/stores/prompt-store";
import { getAiKnowledgeUiCopy } from "@/lib/i18n/ai-knowledge-ui";
import { copyToClipboard } from "@/lib/ai/clipboard";
import { dispatchToAI } from "@/lib/ai/dispatcher";
import {
  AI_KNOWLEDGE_CHAT_TOOLS,
  getAITool,
  type AIKnowledgeChatTool,
} from "@/lib/ai/tool-registry";
import type { CustomPrompt, LibraryPrompt } from "@/types/prompt";

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
 * this page remains a shareable read-only shell with copy and external AI
 * hand-off actions.
 */
export default function AiKnowledgeDetailPage() {
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

  const handleCopyBody = useCallback(async () => {
    if (!prompt) return;

    const copied = await copyToClipboard(prompt.body);
    if (copied) {
      toast.success(ui.toast.copyBodySuccess);
    } else {
      toast.error(ui.toast.copyBodyFailed);
    }
  }, [prompt, ui.toast]);

  const handleOpenInAi = useCallback(
    async (tool: AIKnowledgeChatTool) => {
      if (!prompt) return;

      const provider = getAITool(tool).name;
      try {
        const result = await dispatchToAI({ prompt: prompt.body, tool });
        if (!result.opened) {
          toast.error(
            result.copied
              ? ui.toast.aiChatOpenFailed
              : ui.toast.copyBodyFailed,
          );
          return;
        }
        if (result.urlPrefilled) {
          toast.success(ui.toast.openedInAi(provider));
          if (!result.copied) toast.warning(ui.toast.copyBodyFailed);
          return;
        }
        if (result.copied) {
          toast.success(ui.toast.openedInAiPaste(provider));
        } else {
          toast.error(ui.toast.copyBodyFailed);
        }
      } catch {
        toast.error(ui.toast.aiChatOpenFailed);
      }
    },
    [prompt, ui.toast],
  );

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
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={handleCopyBody}
            >
              <Copy className="h-4 w-4" />
              {ui.detail.copyBody}
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

          <section
            aria-labelledby="prompt-ai-chat-actions"
            className="rounded-2xl border border-primary/20 bg-primary/[0.045] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] sm:p-4"
          >
            <div className="mb-3 space-y-1">
              <h2 id="prompt-ai-chat-actions" className="text-sm font-semibold">
                {ui.detail.openInAi}
              </h2>
              <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">
                {ui.detail.openInAiHint}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
              {AI_KNOWLEDGE_CHAT_TOOLS.map((tool) => (
                <Button
                  key={tool.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleOpenInAi(tool.id)}
                  aria-label={ui.detail.openInProvider(tool.name)}
                  className="h-10 min-w-0 justify-between gap-1.5 bg-background/55 px-2.5 hover:border-primary/35 hover:bg-background"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="grid size-6 shrink-0 place-items-center rounded-md border border-border/70 bg-background/80 shadow-sm">
                      <AIProviderIcon provider={tool.id} />
                    </span>
                    <span className="truncate text-xs font-medium">
                      {tool.name}
                    </span>
                  </span>
                  <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" />
                </Button>
              ))}
            </div>
          </section>
        </div>
      )}
    </PageShell>
  );
}
