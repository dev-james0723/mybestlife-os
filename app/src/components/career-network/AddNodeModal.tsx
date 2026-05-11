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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { useCreateNetworkNode } from "@/hooks/use-career-network";
import type { NetworkNodeType } from "@/types/database";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: NetworkNodeType;
}

export function AddNodeModal({ open, onOpenChange, defaultType }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).network;

  const [nodeType, setNodeType] = useState<NetworkNodeType>(
    defaultType ?? "person",
  );
  const [name, setName] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");

  const create = useCreateNetworkNode();

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await create.mutateAsync({
      nodeType,
      name: trimmed,
      subtitle: subtitle.trim() || null,
      description: description.trim() || null,
      tags: tags
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 10),
    });
    setName("");
    setSubtitle("");
    setDescription("");
    setTags("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.addNode}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label>{copy.form.nodeType}</Label>
            <Select
              value={nodeType}
              onValueChange={(v) => setNodeType(v as NetworkNodeType)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["person", "organization", "project", "opportunity"] as NetworkNodeType[]).map(
                  (t) => (
                    <SelectItem key={t} value={t}>
                      {copy.form.nodeTypes[t]}
                    </SelectItem>
                  ),
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nn-name">{copy.form.name}</Label>
            <Input
              id="nn-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nn-sub">{copy.form.subtitle}</Label>
            <Input
              id="nn-sub"
              value={subtitle}
              onChange={(e) => setSubtitle(e.target.value)}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nn-desc">{copy.form.description}</Label>
            <Textarea
              id="nn-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
            />
          </div>

          <div className="grid gap-1.5">
            <Label htmlFor="nn-tags">{copy.form.tags}</Label>
            <Input
              id="nn-tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground">
              {copy.form.tagsHint}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {copy.form.cancel}
          </Button>
          <Button
            onClick={handleSave}
            disabled={!name.trim() || create.isPending}
          >
            {copy.form.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
