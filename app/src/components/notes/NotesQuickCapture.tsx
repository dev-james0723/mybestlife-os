"use client";

import { useEffect, useRef, useState } from "react";
import { NotebookPen, SendHorizonal } from "lucide-react";
import { OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { NOTE_TYPE_LABELS, type NoteType } from "@/lib/notes/note-types";
import type { NotesUiCopy } from "@/lib/i18n/notes-ui";

const DRAFT_KEY = "notes:quick-capture-draft";
const CAPTURE_MODES: NoteType[] = [
  "auto",
  "general",
  "meeting",
  "research",
  "decision",
  "brain-dump",
];

export type QuickCaptureInput = {
  content: string;
  mode: NoteType;
};

type NotesQuickCaptureProps = {
  copy: NotesUiCopy;
  focusSignal: number;
  isPending?: boolean;
  onCapture: (input: QuickCaptureInput) => Promise<void>;
};

export function NotesQuickCapture({
  copy,
  focusSignal,
  isPending,
  onCapture,
}: NotesQuickCaptureProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<NoteType>("auto");

  useEffect(() => {
    const stored = window.localStorage.getItem(DRAFT_KEY);
    if (stored) setValue(stored);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(DRAFT_KEY, value);
  }, [value]);

  useEffect(() => {
    if (focusSignal > 0) {
      inputRef.current?.focus();
      inputRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
    }
  }, [focusSignal]);

  async function submit() {
    const content = value.trim();
    if (!content || isPending) return;
    await onCapture({ content, mode });
    setValue("");
    setMode("auto");
    window.localStorage.removeItem(DRAFT_KEY);
  }

  return (
    <OSFrostedPanel className="overflow-hidden p-0" data-notes-reveal>
      <div className="border-b border-black/5 px-4 py-3 dark:border-white/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <NotebookPen className="h-4 w-4 text-primary" />
          {copy.quickCaptureTitle}
        </div>
      </div>
      <div className="space-y-3 p-3 sm:p-4">
        <Textarea
          ref={inputRef}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={(event) => {
            if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              void submit();
            }
          }}
          placeholder={copy.quickCapturePlaceholder}
          className="min-h-28 resize-y border-transparent bg-background/45 text-sm leading-6 shadow-inner shadow-black/[0.025] focus-visible:bg-background/70 dark:bg-white/[0.045]"
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 gap-1.5 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
            {CAPTURE_MODES.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setMode(item)}
                className={cn(
                  "h-8 shrink-0 rounded-lg border px-2.5 text-xs font-medium transition duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]",
                  mode === item
                    ? "border-primary/30 bg-primary/10 text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]"
                    : "border-black/10 bg-background/40 text-muted-foreground hover:bg-background/70 hover:text-foreground dark:border-white/10",
                )}
              >
                {item === "auto" ? copy.modeAuto : NOTE_TYPE_LABELS[item]}
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between gap-3 sm:justify-end">
            <span className="text-xs text-muted-foreground">
              {copy.quickCaptureHint}
            </span>
            <OSPrimaryAction
              type="button"
              onClick={() => void submit()}
              disabled={!value.trim() || isPending}
            >
              <SendHorizonal className="h-4 w-4" />
              {copy.saveNote}
            </OSPrimaryAction>
          </div>
        </div>
      </div>
    </OSFrostedPanel>
  );
}
