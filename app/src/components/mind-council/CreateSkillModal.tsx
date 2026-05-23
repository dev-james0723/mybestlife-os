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

type CreateSkillModalProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ui: MindCouncilUiCopy;
  onCreate: (payload: { lensTitle: string; systemPromptHint: string }) => void;
};

export function CreateSkillModal({ open, onOpenChange, ui, onCreate }: CreateSkillModalProps) {
  const [name, setName] = useState("");
  const [hint, setHint] = useState("");

  const save = () => {
    const n = name.trim();
    const h = hint.trim();
    if (!n || !h) return;
    onCreate({ lensTitle: n, systemPromptHint: h });
    setName("");
    setHint("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
              placeholder="e.g. My sailing coach lens"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="mc-lens-hint">{ui.createHintLabel}</Label>
            <Textarea
              id="mc-lens-hint"
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              rows={4}
              className="rounded-xl"
              placeholder="Describe tone, metaphors, and boundaries…"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            {ui.createCancel}
          </Button>
          <Button type="button" className="rounded-xl" onClick={save}>
            {ui.createSave}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
