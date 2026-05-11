"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useCreateDecision,
  useUpdateDecision,
} from "@/hooks/use-career-decisions";
import { FrameworkSelector } from "./FrameworkSelector";
import type {
  CareerDecision,
  DecisionFramework,
  DecisionOption,
  DecisionType,
} from "@/types/database";

const DECISION_TYPES: DecisionType[] = [
  "job_offer",
  "career_pivot",
  "education",
  "relocation",
  "side_project",
  "mentor_choice",
  "investment",
  "custom",
];

function emptyOption(): DecisionOption {
  return { name: "", pros: [], cons: [], score: null };
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function addMonthsIso(base: string, months: number): string {
  const d = new Date(base);
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  existing?: CareerDecision | null;
};

export function DecisionFormDialog({ open, onOpenChange, existing }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).journal;

  const create = useCreateDecision();
  const update = useUpdateDecision();

  const [title, setTitle] = useState("");
  const [decisionType, setDecisionType] = useState<DecisionType | "">("");
  const [framework, setFramework] = useState<DecisionFramework | null>(null);
  const [context, setContext] = useState("");
  const [options, setOptions] = useState<DecisionOption[]>([emptyOption()]);
  const [assumptions, setAssumptions] = useState("");
  const [decision, setDecision] = useState("");
  const [expected, setExpected] = useState("");
  const [decidedAt, setDecidedAt] = useState(todayIso());
  const [reviewDate, setReviewDate] = useState(addMonthsIso(todayIso(), 6));

  // Re-seed form state when the dialog is (re-)opened for a different target.
  const seedKey = open ? (existing?.id ?? "new") : null;
  const [lastSeed, setLastSeed] = useState<string | null>(null);
  if (seedKey && seedKey !== lastSeed) {
    setLastSeed(seedKey);
    if (existing) {
      setTitle(existing.title);
      setDecisionType((existing.decision_type ?? "") as DecisionType | "");
      setFramework(existing.framework);
      setContext(existing.context ?? "");
      setOptions(
        existing.options.length > 0 ? existing.options : [emptyOption()],
      );
      setAssumptions(existing.assumptions ?? "");
      setDecision(existing.decision ?? "");
      setExpected(existing.expected_outcome ?? "");
      setDecidedAt(existing.decided_at);
      setReviewDate(
        existing.review_reminder_date ?? addMonthsIso(existing.decided_at, 6),
      );
    } else {
      setTitle("");
      setDecisionType("");
      setFramework(null);
      setContext("");
      setOptions([emptyOption()]);
      setAssumptions("");
      setDecision("");
      setExpected("");
      setDecidedAt(todayIso());
      setReviewDate(addMonthsIso(todayIso(), 6));
    }
  } else if (!seedKey && lastSeed !== null) {
    setLastSeed(null);
  }

  const updateOption = (idx: number, patch: Partial<DecisionOption>) => {
    setOptions((prev) =>
      prev.map((o, i) => (i === idx ? { ...o, ...patch } : o)),
    );
  };

  const addOption = () => setOptions((prev) => [...prev, emptyOption()]);
  const removeOption = (idx: number) =>
    setOptions((prev) => prev.filter((_, i) => i !== idx));

  const onSubmit = async () => {
    if (!title.trim()) return;
    const cleanedOptions = options
      .filter((o) => o.name.trim().length > 0)
      .map((o) => ({
        ...o,
        name: o.name.trim(),
        pros: o.pros.map((p) => p.trim()).filter(Boolean),
        cons: o.cons.map((c) => c.trim()).filter(Boolean),
      }));

    if (existing) {
      await update.mutateAsync({
        id: existing.id,
        updates: {
          title: title.trim(),
          decision_type: (decisionType || null) as DecisionType | null,
          framework,
          context: context.trim() || null,
          options: cleanedOptions,
          assumptions: assumptions.trim() || null,
          decision: decision.trim() || null,
          expected_outcome: expected.trim() || null,
          decided_at: decidedAt,
          review_reminder_date: reviewDate || null,
        },
      });
    } else {
      await create.mutateAsync({
        title: title.trim(),
        decisionType: (decisionType || null) as DecisionType | null,
        framework,
        context: context.trim() || null,
        options: cleanedOptions,
        assumptions: assumptions.trim() || null,
        decision: decision.trim() || null,
        expectedOutcome: expected.trim() || null,
        decidedAt,
        reviewReminderDate: reviewDate || null,
      });
    }
    onOpenChange(false);
  };

  const busy = create.isPending || update.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existing ? existing.title : copy.newDecision}
          </DialogTitle>
          <DialogDescription>{copy.pageDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="decision-title">{copy.form.title}</Label>
            <Input
              id="decision-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={160}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{copy.form.decisionType}</Label>
              <Select
                value={decisionType}
                onValueChange={(v) => setDecisionType(v as DecisionType)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DECISION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {copy.decisionTypes[t] ?? t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-decided-at">{copy.form.decidedAt}</Label>
              <Input
                id="decision-decided-at"
                type="date"
                value={decidedAt}
                onChange={(e) => setDecidedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{copy.form.framework}</Label>
            <FrameworkSelector value={framework} onChange={setFramework} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-context">{copy.form.context}</Label>
            <Textarea
              id="decision-context"
              value={context}
              onChange={(e) => setContext(e.target.value)}
              rows={3}
              placeholder={copy.form.contextHint}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{copy.form.options}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
              >
                <Plus className="mr-1 h-3.5 w-3.5" aria-hidden />
                {copy.form.addOption}
              </Button>
            </div>
            <div className="space-y-3">
              {options.map((o, idx) => (
                <div
                  key={idx}
                  className="space-y-2 rounded-lg border bg-background/50 p-3"
                >
                  <div className="flex items-center gap-2">
                    <Input
                      value={o.name}
                      onChange={(e) =>
                        updateOption(idx, { name: e.target.value })
                      }
                      placeholder={`${copy.form.optionName} ${idx + 1}`}
                      maxLength={120}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeOption(idx)}
                      aria-label={copy.form.remove}
                      disabled={options.length === 1}
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <Textarea
                      value={o.pros.join("\n")}
                      onChange={(e) =>
                        updateOption(idx, {
                          pros: e.target.value.split("\n"),
                        })
                      }
                      rows={3}
                      placeholder={copy.form.pros}
                    />
                    <Textarea
                      value={o.cons.join("\n")}
                      onChange={(e) =>
                        updateOption(idx, {
                          cons: e.target.value.split("\n"),
                        })
                      }
                      rows={3}
                      placeholder={copy.form.cons}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">
                      {copy.form.score}
                    </Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      className="w-24"
                      value={o.score ?? ""}
                      onChange={(e) => {
                        const n = e.target.value
                          ? Number(e.target.value)
                          : null;
                        updateOption(idx, {
                          score:
                            n === null || Number.isNaN(n)
                              ? null
                              : Math.min(10, Math.max(1, n)),
                        });
                      }}
                    />
                    <span className="text-xs text-muted-foreground">
                      {copy.form.scoreHint}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-assumptions">
              {copy.form.assumptions}
            </Label>
            <Textarea
              id="decision-assumptions"
              value={assumptions}
              onChange={(e) => setAssumptions(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="decision-final">{copy.form.decision}</Label>
              <Textarea
                id="decision-final"
                value={decision}
                onChange={(e) => setDecision(e.target.value)}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decision-expected">
                {copy.form.expectedOutcome}
              </Label>
              <Textarea
                id="decision-expected"
                value={expected}
                onChange={(e) => setExpected(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="decision-review">{copy.form.reviewReminder}</Label>
            <Input
              id="decision-review"
              type="date"
              value={reviewDate}
              onChange={(e) => setReviewDate(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            {copy.form.cancel}
          </Button>
          <Button onClick={onSubmit} disabled={busy || !title.trim()}>
            {copy.form.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
