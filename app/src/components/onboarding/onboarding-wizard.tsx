"use client";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { OSControl } from "@/components/ui/os-primitives";
import { settingsRepository } from "@/lib/repositories/settings";
import { useAppStore } from "@/stores/app-store";
import { FirstStepCard } from "./first-step-card";

export function OnboardingWizard({ onComplete }: { onComplete?: () => void }) {
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  const queryClient = useQueryClient();
  const gate = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const complete = async () => {
    if (gate.current) return;
    gate.current = true;
    setBusy(true); setError(false);
    try {
      await settingsRepository.updateProfile({ onboarding_completed: true });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      onComplete?.();
    } catch { setError(true); } finally { setBusy(false); gate.current = false; }
  };
  return <Dialog open onOpenChange={(open) => { if (!open) void complete(); }}><DialogContent size="2xl" className="max-h-[90dvh] overflow-y-auto">
    <DialogTitle>{chinese ? "把想做的事，變成今日做得到的一步" : "Turn something on your mind into one doable step"}</DialogTitle>
    <DialogDescription>{chinese ? "先安排一件小事。語言、時區及外觀可隨時在設定中修改，無需先連接日曆或使用 AI。" : "Start with one small action. You can change language, time zone and appearance in Settings anytime. Calendar connection and AI are optional."}</DialogDescription>
    <FirstStepCard onCommitted={() => void complete()} />
    <OSControl disabled={busy} onClick={() => void complete()}>{busy ? (chinese ? "儲存中…" : "Saving…") : (chinese ? "先四處看看，稍後再安排" : "Explore first, plan later")}</OSControl>
    <p className="text-xs text-muted-foreground">{chinese ? "Dashboard 會保留安排今日一件事的入口。" : "You can return to the one-step planner on your dashboard anytime."}</p>
    {error && <p role="alert" className="text-sm text-destructive">{chinese ? "未能儲存引導狀態，請重試。" : "Could not save your setup status. Please retry."}</p>}
  </DialogContent></Dialog>;
}
