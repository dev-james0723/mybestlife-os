"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import {
  useDeleteNetworkNode,
  useLogNetworkInteraction,
  useUpdateNetworkNode,
} from "@/hooks/use-career-network";
import type { CareerNetworkNode } from "@/types/database";
import { computeWarmth } from "@/lib/dashboard/aggregators";

interface Props {
  node: CareerNetworkNode | null;
  onClose: () => void;
}

export function NodeDetailPanel({ node, onClose }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).network;

  const [name, setName] = useState("");
  const [roleTitle, setRoleTitle] = useState("");
  const [email, setEmail] = useState("");
  const [linkedin, setLinkedin] = useState("");
  const [notes, setNotes] = useState("");

  const update = useUpdateNetworkNode();
  const del = useDeleteNetworkNode();
  const logInteraction = useLogNetworkInteraction();

  const seedKey = node ? `${node.id}:${node.updated_at}` : null;
  const [lastSeed, setLastSeed] = useState<string | null>(null);
  if (seedKey && seedKey !== lastSeed && node) {
    setLastSeed(seedKey);
    setName(node.name);
    setRoleTitle(node.role_title ?? "");
    setEmail(node.email ?? "");
    setLinkedin(node.linkedin_url ?? "");
    setNotes(node.notes ?? "");
  } else if (!seedKey && lastSeed !== null) {
    setLastSeed(null);
  }

  if (!node) return null;

  const warmth = computeWarmth(node.last_interaction_date);
  const warmthLabel = copy.warmth[warmth];

  const handleSave = async () => {
    await update.mutateAsync({
      id: node.id,
      updates: {
        name: name.trim() || node.name,
        role_title: roleTitle.trim() || null,
        email: email.trim() || null,
        linkedin_url: linkedin.trim() || null,
        notes: notes.trim() || null,
      },
    });
    onClose();
  };

  const handleLog = () => {
    const today = new Date().toISOString().slice(0, 10);
    logInteraction.mutate({ nodeId: node.id, date: today });
  };

  return (
    <Dialog open={!!node} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            <span>{node.name}</span>
            <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              {warmthLabel}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>{copy.form.name}</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {node.node_type === "person" ? (
            <>
              <div className="grid gap-1.5">
                <Label>{copy.detail.roleTitle}</Label>
                <Input
                  value={roleTitle}
                  onChange={(e) => setRoleTitle(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{copy.detail.email}</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>{copy.detail.linkedinUrl}</Label>
                <Input
                  value={linkedin}
                  onChange={(e) => setLinkedin(e.target.value)}
                />
              </div>
            </>
          ) : null}
          <div className="grid gap-1.5">
            <Label>{copy.detail.notes}</Label>
            <Textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="rounded-lg border bg-background/50 p-3 text-xs text-muted-foreground">
            {copy.detail.lastInteraction}:{" "}
            <span className="font-medium text-foreground">
              {node.last_interaction_date ?? "—"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={handleLog}>
              {copy.detail.logInteraction}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex-wrap">
          <Button
            variant="destructive"
            size="sm"
            onClick={async () => {
              await del.mutateAsync(node.id);
              onClose();
            }}
            className="mr-auto"
          >
            {copy.detail.delete}
          </Button>
          <Button variant="ghost" onClick={onClose}>
            {copy.detail.cancel}
          </Button>
          <Button onClick={handleSave} disabled={update.isPending}>
            {copy.detail.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
