"use client";

import { useEffect, useMemo, useState } from "react";
import { DoorOpen, RotateCcw, Shield } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";
import type { PendingDistractionGate } from "@/hooks/use-distraction-gate";
import type { PlannerFocusSession } from "@/types/database";

export function DistractionGateDialog({
  copy,
  pendingGate,
  activeSession,
  delaySeconds,
  onReturnToFocus,
  onCaptureNoteAndReturn,
  onContinueIntentionally,
  onAbandonFocusAndContinue,
}: {
  copy: DailyPlannerUiCopy;
  pendingGate: PendingDistractionGate | null;
  activeSession: PlannerFocusSession | null | undefined;
  delaySeconds: number;
  onReturnToFocus: (reason?: string) => void;
  onCaptureNoteAndReturn: (note: string) => void;
  onContinueIntentionally: (reason?: string) => void;
  onAbandonFocusAndContinue: (reason?: string) => void;
}) {
  const [reason, setReason] = useState("");
  const [remaining, setRemaining] = useState(delaySeconds);

  useEffect(() => {
    if (!pendingGate) return;
    setReason("");
    setRemaining(delaySeconds);
    const id = window.setInterval(() => {
      const elapsed = Math.floor((Date.now() - pendingGate.startedAt) / 1000);
      setRemaining(Math.max(0, delaySeconds - elapsed));
    }, 250);
    return () => window.clearInterval(id);
  }, [delaySeconds, pendingGate]);

  const description = useMemo(() => {
    if (!pendingGate || !activeSession) return "";
    return copy.gateDescription(activeSession.task_title, pendingGate.normalizedRoute);
  }, [activeSession, copy, pendingGate]);

  return (
    <Dialog open={Boolean(pendingGate)}>
      <DialogContent size="md" showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-amber-600" />
            {copy.gateTitle}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <Textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={copy.gateReasonPlaceholder}
          rows={4}
        />

        <DialogFooter className="sm:grid sm:grid-cols-2">
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 gap-1.5 rounded-xl"
            onClick={() => onReturnToFocus(reason)}
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {copy.returnToFocus}
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 min-h-11 rounded-xl"
            onClick={() => onCaptureNoteAndReturn(reason)}
            disabled={!reason.trim()}
          >
            {copy.captureNoteAndReturn}
          </Button>
          <Button
            type="button"
            className="h-11 min-h-11 gap-1.5 rounded-xl"
            onClick={() => onContinueIntentionally(reason)}
            disabled={remaining > 0}
          >
            <DoorOpen className="h-3.5 w-3.5" />
            {remaining > 0
              ? copy.gateCountdownLabel(remaining)
              : copy.continueIntentionally}
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 min-h-11 rounded-xl"
            onClick={() => onAbandonFocusAndContinue(reason)}
          >
            {copy.abandonSession}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
