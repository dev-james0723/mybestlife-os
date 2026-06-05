"use client";

import { useCallback, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Paperclip, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { EASE_OUT_EXPO, REDUCED_MOTION_FADE } from "@/lib/animation/easings";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import { cn } from "@/lib/utils";

const FILE_ACCEPT =
  "image/*,application/pdf,text/plain,text/markdown,.pdf,.txt,.md,.doc,.docx";

type AgentCommandBarProps = {
  ui: LifeAgentUiCopy;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelected?: (file: File) => void;
  canSend: boolean;
  isSending?: boolean;
  uploadBusy?: boolean;
  showPrefillHint?: boolean;
  className?: string;
};

export function AgentCommandBar({
  ui,
  value,
  onChange,
  onSend,
  onFileSelected,
  canSend,
  isSending = false,
  uploadBusy = false,
  showPrefillHint = false,
  className,
}: AgentCommandBarProps) {
  const reduceMotion = useReducedMotion();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [value, resize]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (canSend && !isSending && !uploadBusy) onSend();
    }
  };

  const attachDisabled = !onFileSelected || isSending || uploadBusy;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? REDUCED_MOTION_FADE : { duration: 0.4, ease: EASE_OUT_EXPO }}
      className={cn(
        "rounded-2xl border border-border/70 bg-background/80 p-3 shadow-sm backdrop-blur-md",
        className,
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        accept={FILE_ACCEPT}
        disabled={attachDisabled}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file && onFileSelected) onFileSelected(file);
          e.target.value = "";
        }}
      />
      {showPrefillHint && (
        <p className="mb-2 text-xs text-primary/80">{ui.commandBarPrefillHint}</p>
      )}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            resize();
          }}
          onKeyDown={handleKeyDown}
          placeholder={ui.commandBarPlaceholder}
          rows={2}
          disabled={uploadBusy}
          className="min-h-[3.25rem] flex-1 resize-none border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
          aria-label={ui.commandBarPlaceholder}
        />
        <div className="flex shrink-0 flex-col gap-1.5">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="rounded-xl"
                    disabled={attachDisabled}
                    aria-label={ui.commandBarAttach}
                    onClick={() => fileInputRef.current?.click()}
                  />
                }
              >
                {uploadBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </TooltipTrigger>
              <TooltipContent>{ui.commandBarAttachSoon}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    type="button"
                    size="icon"
                    className="rounded-xl"
                    disabled={!canSend || isSending || uploadBusy}
                    onClick={onSend}
                    aria-label={ui.commandBarSend}
                  />
                }
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>{ui.commandBarSend}</p>
                <p className="text-muted-foreground">{ui.commandBarSaveHint}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">{ui.commandBarSaveHint}</p>
    </motion.div>
  );
}
