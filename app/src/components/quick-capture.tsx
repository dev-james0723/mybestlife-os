"use client";

import { useCallback, useMemo, useState } from "react";
import { Plus, X, Lightbulb, CheckSquare, StickyNote, Target } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { ideasRepository } from "@/lib/repositories/ideas";
import { useTheme } from "@/lib/theme-context";
import { getThemedItemLabel } from "@/lib/theme-labels";
import { getThemeUiCopy } from "@/lib/i18n/theme-ui";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import type { CaptureKind } from "@/types/database";

const CAPTURE_KIND_ICONS: Record<CaptureKind, typeof Lightbulb> = {
  idea: Lightbulb,
  task: CheckSquare,
  note: StickyNote,
  goal: Target,
};

export function QuickCapture() {
  const [open, setOpen] = useState(false);
  const [content, setContent] = useState("");
  const [kind, setKind] = useState<CaptureKind>("idea");
  const [saving, setSaving] = useState(false);
  const { uiTheme } = useTheme();
  const language = useAppStore((s) => s.language);
  const ideasHref = useLocalizedPath("/ideas");
  const ui = useMemo(() => getThemeUiCopy(language), [language]);

  const kindLabels: Record<CaptureKind, string> = useMemo(
    () => ({
      idea: ui.captureKindIdea,
      task: ui.captureKindTask,
      note: ui.captureKindNote,
      goal: ui.captureKindGoal,
    }),
    [ui]
  );

  const handleSave = useCallback(async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      await ideasRepository.create({
        content: content.trim(),
        capture_kind: kind,
      });
      toast.success(ui.quickCaptureSuccess, {
        action: {
          label: ui.quickCaptureViewInbox,
          onClick: () => {
            window.location.href = ideasHref;
          },
        },
      });
      setContent("");
      setKind("idea");
      setOpen(false);
    } catch {
      toast.error(ui.quickCaptureFailed);
    } finally {
      setSaving(false);
    }
  }, [content, kind, ui, ideasHref]);

  const label = getThemedItemLabel("quick-capture", uiTheme, language);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={cn(
          "fixed bottom-6 right-6 z-40 h-14 w-14 rounded-full shadow-lg",
          "bg-primary text-primary-foreground hover:bg-primary/90",
          "transition-transform hover:scale-105"
        )}
        size="icon"
        aria-label={label}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{label}</h3>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {(["idea", "task", "note", "goal"] as const).map((id) => {
                  const Icon = CAPTURE_KIND_ICONS[id];
                  return (
                    <Button
                      key={id}
                      variant={kind === id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setKind(id)}
                      className="gap-1.5"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {kindLabels[id]}
                    </Button>
                  );
                })}
              </div>

              <div className="space-y-2">
                <Label htmlFor="capture-content">{ui.quickCapturePrompt}</Label>
                <Input
                  id="capture-content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder={ui.quickCapturePlaceholder}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSave();
                    }
                  }}
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between">
                <Link
                  href={ideasHref}
                  onClick={() => setOpen(false)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {ui.quickCaptureGoToInbox}
                </Link>
                <Button onClick={() => void handleSave()} disabled={saving || !content.trim()}>
                  {saving ? ui.quickCaptureSaving : ui.quickCaptureSave}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
