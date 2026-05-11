"use client";

import * as React from "react";
import mammoth from "mammoth";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { Bold, Italic, Loader2, Save, Underline } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import type { KnowledgeItem } from "@/types/knowledge";
import type { KnowledgeUiCopy } from "@/lib/i18n/knowledge-ui-copy-type";
import { knowledgeFilesProxyUrlFromStoragePath } from "@/lib/knowledge/storage-thumbnail-url";
import { replaceKnowledgeUploadedFile } from "@/lib/knowledge/mutations";
import { useKnowledgeStore } from "@/stores/knowledge-store";

type DetailCopy = KnowledgeUiCopy["detail"];

export function KnowledgeWordEditor({
  item,
  copy,
}: {
  item: KnowledgeItem;
  copy: DetailCopy;
}) {
  const upsertItem = useKnowledgeStore((s) => s.upsertItem);
  const editRef = React.useRef<HTMLDivElement>(null);
  const layoutBodyRef = React.useRef<HTMLDivElement>(null);
  const layoutStyleRef = React.useRef<HTMLDivElement>(null);
  const bufferRef = React.useRef<ArrayBuffer | null>(null);
  const editPrimedRef = React.useRef(false);

  const [tab, setTab] = React.useState("layout");
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [layoutError, setLayoutError] = React.useState<string | null>(null);

  const [layoutVersion, setLayoutVersion] = React.useState(0);

  const storagePath = item.filePath;

  React.useEffect(() => {
    let cancelled = false;
    if (!storagePath) return;

    (async () => {
      setLoading(true);
      setLoadError(null);
      setLayoutError(null);
      try {
        const url = knowledgeFilesProxyUrlFromStoragePath(storagePath);
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = await res.arrayBuffer();
        if (cancelled) return;
        bufferRef.current = buf.slice(0);
      } catch {
        if (!cancelled) setLoadError(copy.wordLoadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [storagePath, copy.wordLoadFailed]);

  /** Paginated layout — docx-preview respects page breaks stored in the file. */
  React.useEffect(() => {
    if (tab !== "layout" || loading || loadError || !bufferRef.current) return;
    const body = layoutBodyRef.current;
    const styleHost = layoutStyleRef.current;
    if (!body) return;

    let cancelled = false;
    body.innerHTML = "";
    if (styleHost) styleHost.innerHTML = "";

    void (async () => {
      try {
        const { renderAsync } = await import("docx-preview");
        if (cancelled) return;
        await renderAsync(bufferRef.current!, body, styleHost ?? undefined, {
          className: "docx-knowledge",
          inWrapper: true,
          breakPages: true,
          ignoreLastRenderedPageBreak: false,
          ignoreWidth: false,
          ignoreHeight: false,
          renderHeaders: true,
          renderFooters: true,
          renderFootnotes: true,
          renderEndnotes: true,
        });
      } catch {
        if (!cancelled) setLayoutError(copy.wordLoadFailed);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [tab, loading, loadError, item.id, layoutVersion, copy.wordLoadFailed]);

  /** Quick-edit HTML from the same bytes (first visit). */
  React.useEffect(() => {
    if (tab !== "edit" || loading || loadError || !bufferRef.current || editPrimedRef.current)
      return;
    let cancelled = false;
    void (async () => {
      try {
        const result = await mammoth.convertToHtml({ arrayBuffer: bufferRef.current! });
        if (cancelled) return;
        const el = editRef.current;
        if (el) {
          el.innerHTML = result.value?.trim() ? result.value : "<p></p>";
          editPrimedRef.current = true;
        }
      } catch {
        if (!cancelled) setLoadError(copy.wordLoadFailed);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, loading, loadError, copy.wordLoadFailed]);

  const runFormat = (cmd: "bold" | "italic" | "underline") => {
    editRef.current?.focus();
    try {
      document.execCommand(cmd, false);
    } catch {
      /* ignore */
    }
  };

  const handleSave = async () => {
    const el = editRef.current;
    const path = item.filePath;
    if (!el || !path || saving) return;

    setSaving(true);
    try {
      const lines = el.innerText.replace(/\r/g, "").split("\n");
      const doc = new Document({
        sections: [
          {
            children: lines.map((line) => new Paragraph({ children: [new TextRun(line)] })),
          },
        ],
      });
      const blob = await Packer.toBlob(doc);
      const baseName = path.split("/").pop() ?? "document.docx";
      const file = new File([blob], baseName, {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      });
      const fd = new FormData();
      fd.set("file", file);
      const updated = await replaceKnowledgeUploadedFile(item.id, fd);
      upsertItem(updated);
      const nextBuffer = await file.arrayBuffer().then((b) => b.slice(0));
      bufferRef.current = nextBuffer;
      editPrimedRef.current = true;
      if (editRef.current) {
        const html = await mammoth.convertToHtml({ arrayBuffer: nextBuffer.slice(0) });
        editRef.current.innerHTML = html.value?.trim() ? html.value : "<p></p>";
      }
      if (layoutBodyRef.current) layoutBodyRef.current.innerHTML = "";
      setLayoutError(null);
      setLayoutVersion((v) => v + 1);
      toast.success(copy.wordSavedToast);
    } catch {
      toast.error(copy.wordSaveFailed);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-xs font-medium">{copy.wordEditorHeading}</h4>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={loading || saving || Boolean(loadError) || tab !== "edit"}
          onClick={() => void handleSave()}
          className="gap-1.5 text-xs"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {saving ? copy.wordSaving : copy.wordSaveRevision}
        </Button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted-foreground">{copy.wordEditorHint}</p>

      <Tabs value={tab} onValueChange={setTab} className="w-full min-w-0">
        <TabsList className="w-full min-w-0">
          <TabsTrigger value="layout" className="flex-1">
            {copy.wordLayoutTab}
          </TabsTrigger>
          <TabsTrigger value="edit" className="flex-1">
            {copy.wordQuickEditTab}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="layout" className="mt-3 space-y-2">
          {loading ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {copy.wordEditorLoading}
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : layoutError ? (
            <p className="text-sm text-destructive">{layoutError}</p>
          ) : (
            <div className="docx-preview-shell rounded-xl border border-white/10 bg-[#2a2a2e] p-3 shadow-inner">
              <div ref={layoutStyleRef} className="docx-style-host" aria-hidden />
              <div
                ref={layoutBodyRef}
                className="docx-layout-host max-h-[min(65vh,720px)] overflow-auto rounded-lg bg-[#2a2a2e] px-2 py-4"
              />
            </div>
          )}
        </TabsContent>

        <TabsContent value="edit" className="mt-3 space-y-2">
          <div className="flex flex-wrap gap-1 rounded-md border border-input bg-muted/30 p-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              aria-label="Bold"
              onMouseDown={(e) => {
                e.preventDefault();
                runFormat("bold");
              }}
            >
              <Bold className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              aria-label="Italic"
              onMouseDown={(e) => {
                e.preventDefault();
                runFormat("italic");
              }}
            >
              <Italic className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 px-2"
              aria-label="Underline"
              onMouseDown={(e) => {
                e.preventDefault();
                runFormat("underline");
              }}
            >
              <Underline className="h-4 w-4" />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-4 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin shrink-0" />
              {copy.wordEditorLoading}
            </div>
          ) : loadError ? (
            <p className="text-sm text-destructive">{loadError}</p>
          ) : (
            <div className="relative min-h-[220px]">
              <div
                ref={editRef}
                contentEditable
                suppressContentEditableWarning
                className={cn(
                  "max-h-[min(55vh,560px)] min-h-[220px] overflow-y-auto rounded-md border border-input bg-background px-4 py-3 text-sm",
                  "prose prose-sm dark:prose-invert max-w-none [&_img]:max-w-full",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                )}
              />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
