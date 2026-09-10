"use client";

import { useState } from "react";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import type { CreateCouncilSkillInput } from "@/lib/mind-council/create-council-skill";
import { NeuralSkillGenerationError } from "@/lib/relationships/neural-skill-generation";

type CreateSkillModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ui: MindCouncilUiCopy;
  onCreate: (payload: CreateCouncilSkillInput) => Promise<void>;
};

export function CreateSkillModal({ open, onOpenChange, ui, onCreate }: CreateSkillModalProps) {
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    const n = name.trim();
    const h = hint.trim();
    if (!n || working) return;
    setWorking(true);
    setError(null);
    try {
      await onCreate({ name: n, focus: h });
      setName("");
      setHint("");
      onOpenChange(false);
    } catch (failure) {
      setError(failure instanceof NeuralSkillGenerationError && failure.code === "research_unavailable"
        ? ui.createResearchFailed : ui.createFailed);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!working) onOpenChange(next); }}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{ui.createSkillTitle}</DialogTitle>
          <DialogDescription>{ui.createSkillSubtitle}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="mc-lens-name">{ui.createNameLabel}</Label>
            <Input
              id="mc-lens-name"
              value={name}
              maxLength={100}
              disabled={working}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              placeholder={ui.createNamePlaceholder}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc-lens-hint">{ui.createHintLabel}</Label>
            <Textarea
              id="mc-lens-hint"
              value={hint}
              maxLength={1000}
              disabled={working}
              onChange={(e) => setHint(e.target.value)}
              rows={4}
              className="rounded-xl"
              placeholder={ui.createFocusPlaceholder}
            />
          </div>
        </div>
        {working ? <p role="status" className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 shrink-0 animate-spin" />{ui.createWorking}</p> : null}
        {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" disabled={working} variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {ui.createCancel}
          </Button>
          <Button type="button" disabled={working || !name.trim()} className="rounded-xl" onClick={() => void save()}>
            {ui.createSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
