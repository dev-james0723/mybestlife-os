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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCreateNetworkEdge } from "@/hooks/use-career-network";
import type { CareerNetworkNode } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  nodes: CareerNetworkNode[];
  sourceId?: string | null;
}

export function AddEdgeModal({ open, onOpenChange, nodes, sourceId }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).network;

  const [source, setSource] = useState<string>(sourceId ?? "");
  const [target, setTarget] = useState<string>("");
  const [rel, setRel] = useState("peer");
  const [strength, setStrength] = useState<string>("3");

  const create = useCreateNetworkEdge();

  const handleSave = async () => {
    if (!source || !target || source === target) return;
    const s = Number.parseInt(strength, 10);
    await create.mutateAsync({
      sourceNodeId: source,
      targetNodeId: target,
      relationshipType: rel.trim() || "peer",
      strength: Number.isFinite(s) ? Math.max(1, Math.min(5, s)) : null,
    });
    setTarget("");
    setRel("peer");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.addEdge}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>From</Label>
            <Select value={source} onValueChange={(v) => setSource(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select node" />
              </SelectTrigger>
              <SelectContent>
                {nodes.map((n) => (
                  <SelectItem key={n.id} value={n.id}>
                    {n.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>To</Label>
            <Select value={target} onValueChange={(v) => setTarget(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Select node" />
              </SelectTrigger>
              <SelectContent>
                {nodes
                  .filter((n) => n.id !== source)
                  .map((n) => (
                    <SelectItem key={n.id} value={n.id}>
                      {n.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label>{copy.form.edgeType}</Label>
            <Input value={rel} onChange={(e) => setRel(e.target.value)} />
            <p className="text-[11px] text-muted-foreground">
              {copy.form.edgeTypeHint}
            </p>
          </div>
          <div className="grid gap-1.5">
            <Label>{copy.form.strength}</Label>
            <Input
              type="number"
              min={1}
              max={5}
              value={strength}
              onChange={(e) => setStrength(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {copy.form.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!source || !target || source === target || create.isPending}
          >
            {copy.form.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
