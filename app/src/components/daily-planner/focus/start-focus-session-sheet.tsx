"use client";

import { useEffect, useMemo, useState } from "react";
import { Play, ShieldCheck } from "lucide-react";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { focusSessionTypeLabel } from "@/components/daily-planner/focus/focus-session-labels";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { FocusSessionType } from "@/types/database";

export type FocusStartDraft = {
  taskTitle: string;
  plannerTaskId: string | null;
  taskId: string | null;
  planDate: string;
  dailyPlanId: string | null;
  plannedStartAt: string | null;
  plannedEndAt: string | null;
  sessionType: FocusSessionType;
};

const SESSION_TYPES: readonly FocusSessionType[] = [
  "deep_work",
  "admin",
  "learning",
  "creative",
  "meeting",
  "recovery",
  "personal",
];

function parseList(value: string): string[] {
  return value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

export function StartFocusSessionSheet({
  copy,
  open,
  draft,
  pending,
  onOpenChange,
  onStart,
}: {
  copy: DailyPlannerUiCopy;
  open: boolean;
  draft: FocusStartDraft | null;
  pending?: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (input: {
    sessionType: FocusSessionType;
    winCondition: string | null;
    allowedTools: string[];
    blockedRoutes: string[];
    energyBefore: number | null;
  }) => void;
}) {
  const [sessionType, setSessionType] = useState<FocusSessionType>("deep_work");
  const [winCondition, setWinCondition] = useState("");
  const [allowedTools, setAllowedTools] = useState("");
  const [blockedRoutes, setBlockedRoutes] = useState("");
  const [energyBefore, setEnergyBefore] = useState("3");

  useEffect(() => {
    if (!draft || !open) return;
    setSessionType(draft.sessionType);
    setWinCondition("");
    setAllowedTools("");
    setBlockedRoutes("");
    setEnergyBefore("3");
  }, [draft, open]);

  const energy = useMemo(() => {
    const parsed = Math.round(Number(energyBefore));
    return Number.isFinite(parsed) ? Math.min(5, Math.max(1, parsed)) : null;
  }, [energyBefore]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom-card" className="max-h-[92vh] overflow-hidden p-0 sm:max-w-3xl">
        <SheetHeader className="border-b border-border/50 px-4 pt-4 pb-3 sm:px-6">
          <SheetTitle>{copy.startFocusSheetTitle}</SheetTitle>
          <SheetDescription>
            {draft?.taskTitle ?? copy.untitledTask}
          </SheetDescription>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{copy.focusSessionType}</Label>
              <Select
                value={sessionType}
                onValueChange={(value) => {
                  if (SESSION_TYPES.includes(value as FocusSessionType)) {
                    setSessionType(value as FocusSessionType);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SESSION_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {focusSessionTypeLabel(copy, type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-energy-before">{copy.energyBefore}</Label>
              <Input
                id="focus-energy-before"
                type="number"
                min={1}
                max={5}
                inputMode="numeric"
                value={energyBefore}
                onChange={(event) => setEnergyBefore(event.target.value)}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="focus-win-condition">{copy.winCondition}</Label>
              <Textarea
                id="focus-win-condition"
                value={winCondition}
                onChange={(event) => setWinCondition(event.target.value)}
                placeholder={copy.winConditionPlaceholder}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-allowed-tools">{copy.allowedTools}</Label>
              <Textarea
                id="focus-allowed-tools"
                value={allowedTools}
                onChange={(event) => setAllowedTools(event.target.value)}
                placeholder={copy.allowedToolsPlaceholder}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="focus-blocked-routes">{copy.blockedRoutes}</Label>
              <Textarea
                id="focus-blocked-routes"
                value={blockedRoutes}
                onChange={(event) => setBlockedRoutes(event.target.value)}
                placeholder={copy.blockedRoutesPlaceholder}
                rows={3}
              />
            </div>
          </div>

          <div className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/8 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{copy.focusPrivacyNote}</span>
          </div>
        </div>

        <SheetFooter className="border-t border-border/50 bg-popover/95 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <Badge variant="secondary">
            {focusSessionTypeLabel(copy, sessionType)}
          </Badge>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 min-h-11 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              {copy.cancel}
            </Button>
            <Button
              type="button"
              className="h-11 min-h-11 gap-1.5 rounded-xl"
              disabled={!draft || pending}
              onClick={() =>
                onStart({
                  sessionType,
                  winCondition: winCondition.trim() || null,
                  allowedTools: parseList(allowedTools),
                  blockedRoutes: parseList(blockedRoutes),
                  energyBefore: energy,
                })
              }
            >
              <Play className="h-3.5 w-3.5" />
              {copy.startFocus}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
