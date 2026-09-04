"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Sparkles, Download, RefreshCw } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  OSControl,
  OSFrostedPanel,
  OSPrimaryAction,
} from "@/components/ui/os-primitives";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import {
  SCHEDULE_IMAGE_STYLES,
  getScheduleImageStyleLabel,
} from "@/lib/daily-planner/schedule-image-styles";
import { scheduleImageRequestKey } from "@/lib/daily-planner/schedule-image-request-key";
import type { DailyPlanTask } from "@/types/database";

const DEFAULT_BLOCK_MINUTES = 10;

type Props = {
  copy: DailyPlannerUiCopy;
  planDate: string;
  startTime: string;
  endTime: string;
  tasks: DailyPlanTask[];
  imageUrl: string | null;
  onImageUrlChange: (url: string | null) => void;
  onPersistImageUrl: (url: string) => Promise<void>;
  blockMinutes?: number;
};

export function VisualScheduleGenerator({
  copy,
  planDate,
  startTime,
  endTime,
  tasks,
  imageUrl,
  onImageUrlChange,
  onPersistImageUrl,
  blockMinutes: blockMinutesProp,
}: Props) {
  const blockMinutes = blockMinutesProp ?? DEFAULT_BLOCK_MINUTES;
  const [styleId, setStyleId] = useState(SCHEDULE_IMAGE_STYLES[0]!.id);
  const [busy, setBusy] = useState(false);
  const currentRequestKey = scheduleImageRequestKey({
    planDate,
    startTime,
    endTime,
    styleId,
    blockMinutes,
    tasks,
  });
  const latestRequestKeyRef = useRef(currentRequestKey);
  useEffect(() => {
    latestRequestKeyRef.current = currentRequestKey;
  }, [currentRequestKey]);

  const runGenerate = useCallback(async () => {
    if (tasks.length === 0) return;
    const generationRequestKey = currentRequestKey;
    setBusy(true);
    try {
      const res = await fetch("/api/daily-planner/schedule-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planDate,
          startTime,
          endTime,
          styleId,
          blockMinutes,
          tasks: tasks.map((t) => ({
            taskName: t.taskName ?? "",
            blocks: t.blocks ?? 1,
          })),
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        imageUrl?: string;
        error?: string;
        detail?: string;
      };
      if (!res.ok) {
        const msg =
          payload.error ??
          (res.status === 401
            ? copy.toastScheduleImageUnauthorized
            : copy.toastScheduleImageFailed);
        toast.error(msg);
        if (payload.detail && res.status !== 401 && res.status !== 429) {
          console.error(payload.detail);
        }
        return;
      }
      const url = payload.imageUrl;
      if (!url || typeof url !== "string") {
        toast.error(copy.toastScheduleImageFailed);
        return;
      }
      // The user may have reordered tasks or navigated to another day while
      // image generation was running. Never install that stale response.
      if (latestRequestKeyRef.current !== generationRequestKey) return;
      onImageUrlChange(url);
      await onPersistImageUrl(url);
      toast.success(copy.toastScheduleImageReady);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : copy.toastScheduleImageFailed,
      );
    } finally {
      setBusy(false);
    }
  }, [
    blockMinutes,
    copy,
    currentRequestKey,
    endTime,
    onImageUrlChange,
    onPersistImageUrl,
    planDate,
    startTime,
    styleId,
    tasks,
  ]);

  const handleDownload = useCallback(() => {
    if (!imageUrl) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `schedule-${planDate}.png`;
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }, [imageUrl, planDate]);

  const hasTasks = tasks.length > 0;

  return (
    <OSFrostedPanel as="section" className="space-y-4 p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl border border-white/45 bg-white/65 text-lime-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] dark:border-white/10 dark:bg-white/[0.06] dark:text-lime-200">
          <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-heading text-base font-semibold tracking-tight text-foreground">
            {copy.visualScheduleTitle}
          </h2>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {copy.visualScheduleBlurb}
          </p>
        </div>
      </div>
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">
            {copy.imageStyleLabel}
          </Label>
          <Select
            value={styleId}
            onValueChange={(v) => {
              if (v !== null) setStyleId(v);
            }}
            itemToStringLabel={(v) => getScheduleImageStyleLabel(String(v))}
          >
            <SelectTrigger className="h-11 min-h-11 w-full rounded-xl bg-background/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-[min(24rem,70vh)]">
              {SCHEDULE_IMAGE_STYLES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <OSPrimaryAction
          type="button"
          className="h-11 min-h-11 w-full gap-2 rounded-xl"
          disabled={!hasTasks || busy}
          onClick={() => void runGenerate()}
        >
          <Sparkles className="h-4 w-4 shrink-0" />
          {busy ? copy.scheduleImageGenerating : copy.generateScheduleImage}
        </OSPrimaryAction>

        {imageUrl ? (
          <div className="space-y-3 pt-1">
            <div className="overflow-hidden rounded-lg border border-border/80 bg-background shadow-inner">
              <img
                src={imageUrl}
                alt={copy.scheduleImageAlt}
                className="w-full h-auto max-h-[min(70vh,560px)] object-contain object-top bg-muted/20"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <OSControl
                type="button"
                className="h-11 min-h-11 flex-1 gap-2 rounded-xl"
                disabled={!hasTasks || busy}
                onClick={() => void runGenerate()}
              >
                <RefreshCw className={cn("h-4 w-4", busy && "animate-spin")} />
                {copy.regenerateScheduleImage}
              </OSControl>
              <OSControl
                type="button"
                className="h-11 min-h-11 flex-1 gap-2 rounded-xl"
                onClick={handleDownload}
              >
                <Download className="h-4 w-4" />
                {copy.downloadScheduleImage}
              </OSControl>
            </div>
          </div>
        ) : null}
      </div>
    </OSFrostedPanel>
  );
}
