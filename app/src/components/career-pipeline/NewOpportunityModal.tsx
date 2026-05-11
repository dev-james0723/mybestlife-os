"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
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
import { useCreateOpportunity } from "@/hooks/use-career-opportunities";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import type { OpportunityStage } from "@/types/career-vault";
import { STAGE_ORDER } from "./PipelineConstants";

interface NewOpportunityModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  copy: CareerVaultCopy;
  /** Called after create; receives the new opportunity ID. */
  onCreated?: (id: string) => void;
  /** Pre-select a stage when creating from a column. */
  initialStage?: OpportunityStage;
}

export function NewOpportunityModal({
  open,
  onOpenChange,
  copy,
  onCreated,
  initialStage,
}: NewOpportunityModalProps) {
  const createMutation = useCreateOpportunity();
  const n = copy.pipeline.newModal;

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [stage, setStage] = useState<OpportunityStage>(
    initialStage ?? "researching",
  );
  const [jobUrl, setJobUrl] = useState("");
  const [salary, setSalary] = useState("");

  const reset = () => {
    setCompany("");
    setRole("");
    setLocation("");
    setStage(initialStage ?? "researching");
    setJobUrl("");
    setSalary("");
  };

  const submit = async () => {
    if (!company.trim() || !role.trim()) return;
    const created = await createMutation.mutateAsync({
      companyName: company.trim(),
      roleTitle: role.trim(),
      location: location.trim() || null,
      stage,
      jobUrl: jobUrl.trim() || null,
      salaryRange: salary.trim() || null,
    });
    onCreated?.(created.id);
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{n.title}</DialogTitle>
          <p className="text-xs text-muted-foreground">{n.description}</p>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>{n.companyLabel}</Label>
            <Input
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder={n.companyPlaceholder}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{n.roleLabel}</Label>
            <Input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder={n.rolePlaceholder}
            />
          </div>
          <div className="space-y-1">
            <Label>{n.locationLabel}</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={n.locationPlaceholder}
            />
          </div>
          <div className="space-y-1">
            <Label>{n.stageLabel}</Label>
            <Select
              value={stage}
              onValueChange={(v) => v && setStage(v as OpportunityStage)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {copy.pipeline.stages[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{n.jobUrlLabel}</Label>
            <Input
              value={jobUrl}
              onChange={(e) => setJobUrl(e.target.value)}
              placeholder={n.jobUrlPlaceholder}
            />
          </div>
          <div className="space-y-1">
            <Label>{n.salaryLabel}</Label>
            <Input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder={n.salaryPlaceholder}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {n.cancel}
          </Button>
          <Button
            onClick={submit}
            disabled={
              createMutation.isPending || !company.trim() || !role.trim()
            }
          >
            {createMutation.isPending ? n.submitting : n.submit}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
