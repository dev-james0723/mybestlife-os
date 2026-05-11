"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useUpdateDecision } from "@/hooks/use-career-decisions";
import type { CareerDecision } from "@/types/database";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  decision: CareerDecision | null;
};

export function ReviewFormDialog({ open, onOpenChange, decision }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).journal.review;

  const update = useUpdateDecision();

  const [actual, setActual] = useState("");
  const [lessons, setLessons] = useState("");
  const [score, setScore] = useState<string>("");

  const seedKey = open && decision ? decision.id : null;
  const [lastSeed, setLastSeed] = useState<string | null>(null);
  if (seedKey && seedKey !== lastSeed && decision) {
    setLastSeed(seedKey);
    setActual(decision.actual_outcome ?? "");
    setLessons(decision.lessons_learned ?? "");
    setScore(decision.decision_quality_score?.toString() ?? "");
  } else if (!seedKey && lastSeed !== null) {
    setLastSeed(null);
  }

  const onSubmit = async () => {
    if (!decision) return;
    const parsedScore = score ? Number(score) : null;
    const safeScore =
      parsedScore === null || Number.isNaN(parsedScore)
        ? null
        : Math.min(10, Math.max(1, Math.round(parsedScore)));
    await update.mutateAsync({
      id: decision.id,
      updates: {
        actual_outcome: actual.trim() || null,
        lessons_learned: lessons.trim() || null,
        decision_quality_score: safeScore,
        review_date: new Date().toISOString().slice(0, 10),
      },
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{copy.heading}</DialogTitle>
          <DialogDescription>{decision?.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="review-actual">{copy.actualOutcome}</Label>
            <Textarea
              id="review-actual"
              value={actual}
              onChange={(e) => setActual(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-lessons">{copy.lessonsLearned}</Label>
            <Textarea
              id="review-lessons"
              value={lessons}
              onChange={(e) => setLessons(e.target.value)}
              rows={3}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="review-score">{copy.qualityScore}</Label>
            <Input
              id="review-score"
              type="number"
              min={1}
              max={10}
              value={score}
              onChange={(e) => setScore(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{copy.qualityHint}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {copy.save}
          </Button>
          <Button onClick={onSubmit} disabled={update.isPending}>
            {copy.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
