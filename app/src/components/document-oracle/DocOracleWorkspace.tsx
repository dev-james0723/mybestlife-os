"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, BookOpen, FileText, ImageIcon, Layers, MessageCircle, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import type { LocaleUrlSlug } from "@/lib/i18n/locale-slug";
import type { KnowledgeItem } from "@/types/knowledge";

const glassPanel =
  "rounded-[20px] border border-white/[0.14] bg-white/[0.07] shadow-[0_8px_32px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-[24px] supports-[backdrop-filter]:saturate-[140%]";

const limeBtn =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-[#C8E53A] px-4 py-2 text-sm font-semibold text-[#0d0d0d] shadow-sm transition hover:scale-[1.02] hover:bg-[#d4ff3a]";

type AnalysisRow = {
  id: string;
  document_title: string | null;
  summary: string | null;
  total_pages: number | null;
  parser: string | null;
  parser_version: string | null;
  status: string;
};

export type DocOracleAnalysis = AnalysisRow;

function knowledgeFilesApiHref(filePath: string): string {
  return `/api/knowledge-files/${filePath.split("/").map(encodeURIComponent).join("/")}`;
}

export function DocOracleWorkspace(props: {
  locale: LocaleUrlSlug;
  item: KnowledgeItem;
  /** Present once `document_analyses` exists; full data when extraction finished. */
  analysis: DocOracleAnalysis | null;
}) {
  const { locale, item, analysis } = props;
  const backHref = useMemo(() => withLocalePrefix(locale, "/knowledge-base"), [locale]);
  const [tab, setTab] = useState("overview");
  const isReady = Boolean(analysis?.status === "completed");

  return (
    <div className="relative min-h-[100dvh] w-full overflow-x-hidden bg-[#0f0d0c] text-white">
      <div
        className="pointer-events-none fixed inset-0 -z-10 bg-[length:120%_120%] bg-center opacity-95"
        style={{
          backgroundImage:
            "linear-gradient(165deg, rgba(26,22,20,0.92) 0%, rgba(12,10,9,0.96) 45%, rgba(8,7,6,0.98) 100%), radial-gradient(ellipse 120% 80% at 50% -20%, rgba(200,229,58,0.08), transparent 55%)",
        }}
      />

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-8 sm:py-10">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div className="min-w-0 space-y-2">
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 text-[12px] font-medium text-white/55 transition hover:text-white/85"
            >
              <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
              Knowledge Base
            </Link>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/[0.06] text-[#C8E53A] shadow-inner">
                <Sparkles className="h-4 w-4" aria-hidden />
              </span>
              <div className="min-w-0">
                <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
                  {analysis?.document_title ?? item.title}
                </h1>
                <p className="text-[12px] text-white/50">
                  {isReady ? (
                    <>
                      Doc Oracle · {analysis?.parser ?? "MinerU"}
                      {analysis?.parser_version ? ` · ${analysis.parser_version}` : ""}
                    </>
                  ) : (
                    <>
                      Doc Oracle ·{" "}
                      {analysis?.status
                        ? `Analysis: ${analysis.status}`
                        : "Waiting for extraction (no analysis row yet)"}
                    </>
                  )}
                </p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {item.filePath ? (
              <a
                href={knowledgeFilesApiHref(item.filePath)}
                target="_blank"
                rel="noreferrer"
                className={cn(limeBtn, "no-underline")}
              >
                <FileText className="h-4 w-4" aria-hidden />
                Source PDF
              </a>
            ) : null}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08, duration: 0.4, ease: "easeOut" }}
          className={cn(glassPanel, "min-h-[420px] p-4 sm:p-6")}
        >
          {!isReady ? (
            <div
              role="status"
              className="mb-4 rounded-2xl border border-amber-400/25 bg-amber-500/10 px-4 py-3 text-[13px] leading-relaxed text-amber-50"
            >
              <p className="font-medium text-amber-100">Workspace shell — extraction not finished</p>
              <p className="mt-1 text-[12px] text-amber-100/85">
                When MinerU (or the stub worker) completes, this overview fills in automatically. Use{" "}
                <strong className="text-white">Knowledge Base</strong> to watch the card status, or open this URL
                again after the job shows <strong className="text-white">completed</strong>.
              </p>
              <p className="mt-2 font-mono text-[11px] text-white/60">
                Route: /{locale}/knowledge-base/{item.id}/oracle
              </p>
            </div>
          ) : null}

          <Tabs value={tab} onValueChange={setTab} className="flex min-h-0 w-full min-w-0 flex-col gap-4">
            <TabsList className="flex h-auto w-full min-w-0 flex-wrap justify-start gap-1 overflow-x-auto rounded-2xl border border-white/10 bg-black/25 p-1 sm:flex-nowrap">
              {[
                { id: "overview", label: "Overview", Icon: BookOpen },
                { id: "chat", label: "Chat", Icon: MessageCircle },
                { id: "pages", label: "Pages", Icon: Layers },
                { id: "sections", label: "Sections", Icon: Layers },
                { id: "glossary", label: "Glossary", Icon: BookOpen },
                { id: "visuals", label: "Visuals", Icon: ImageIcon },
                { id: "source", label: "Source", Icon: FileText },
              ].map(({ id, label, Icon }) => (
                <TabsTrigger
                  key={id}
                  value={id}
                  className={cn(
                    "shrink-0 gap-1.5 rounded-xl px-3 py-2 text-[12px] font-medium text-white/55 data-[state=active]:bg-white data-[state=active]:text-[#0d0d0d] data-[state=active]:shadow-sm sm:text-[13px]",
                  )}
                >
                  <Icon className="h-3.5 w-3.5 opacity-80" aria-hidden />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview" className="mt-0 min-h-[280px] space-y-4 text-[13px] leading-relaxed text-white/75">
              {!isReady ? (
                <p className="text-white/70">
                  {analysis
                    ? `Analysis record exists but is not complete yet (status: ${analysis.status}).`
                    : "No row in `document_analyses` yet. If you just uploaded a PDF, ensure the Doc Brain migration is applied and MinerU env vars are set so the worker can call back."}
                </p>
              ) : (
                <p className="text-white/90">{analysis?.summary}</p>
              )}
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  { k: "Pages", v: String((isReady ? analysis?.total_pages : null) ?? "—") },
                  { k: "Sections", v: "—" },
                  { k: "Visuals", v: "—" },
                ].map((cell) => (
                  <div
                    key={cell.k}
                    className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-md"
                  >
                    <p className="text-[11px] font-medium uppercase tracking-wide text-white/45">{cell.k}</p>
                    <p className="mt-1 text-2xl font-semibold tabular-nums text-white">{cell.v}</p>
                  </div>
                ))}
              </div>
              <p className="text-[12px] text-white/45">
                Full MinerU parsing, page thumbnails, glossary, visuals, and grounded chat will appear here as the
                pipeline fills in structured rows.
              </p>
            </TabsContent>

            <TabsContent value="chat" className="mt-0 text-[13px] text-white/60">
              Document-grounded chat with citations will use <code className="text-white/80">document_chunks</code>{" "}
              and your existing Gemini stack — wiring comes next.
            </TabsContent>

            <TabsContent value="pages" className="mt-0 text-[13px] text-white/60">
              Page explorer with signed-url thumbnails will render from <code className="text-white/80">document_pages</code>.
            </TabsContent>

            <TabsContent value="sections" className="mt-0 text-[13px] text-white/60">
              Section hierarchy from normalized MinerU output.
            </TabsContent>

            <TabsContent value="glossary" className="mt-0 text-[13px] text-white/60">
              Glossary browser backed by <code className="text-white/80">document_glossary_terms</code>.
            </TabsContent>

            <TabsContent value="visuals" className="mt-0 text-[13px] text-white/60">
              Visual assets with semantic categories from your document.
            </TabsContent>

            <TabsContent value="source" className="mt-0 text-[13px] text-white/60">
              {item.filePath ? (
                <a
                  className="text-[#C8E53A] underline-offset-4 hover:underline"
                  href={knowledgeFilesApiHref(item.filePath)}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open original file (authenticated proxy)
                </a>
              ) : (
                "No file on record."
              )}
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}
