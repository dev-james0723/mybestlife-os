"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Trash2, Clock } from "lucide-react";
import type { ScheduleTemplate, DailyPlanTask } from "@/types/database";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";

interface TemplateDialogProps {
  open: boolean;
  onClose: () => void;
  mode: "save" | "load";
  templates: ScheduleTemplate[];
  currentPlan: { tasks: DailyPlanTask[] };
  onSaveTemplate: (name: string) => void;
  onLoadTemplate: (template: ScheduleTemplate) => void;
  onDeleteTemplate?: (id: string) => void;
  copy: DailyPlannerUiCopy;
}

export function TemplateDialog({
  open,
  onClose,
  mode,
  templates,
  currentPlan,
  onSaveTemplate,
  onLoadTemplate,
  onDeleteTemplate,
  copy,
}: TemplateDialogProps) {
  const [name, setName] = useState("");

  const handleSave = () => {
    if (!name.trim()) return;
    onSaveTemplate(name.trim());
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="xl" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {mode === "save" ? copy.saveAsTemplate : copy.loadTemplate}
          </DialogTitle>
        </DialogHeader>

        {mode === "save" ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{copy.templateNameLabel}</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={copy.templateNamePlaceholder}
                autoFocus
              />
            </div>
            <p className="text-sm text-muted-foreground">
              {copy.templateSaveBlurb(currentPlan.tasks.length)}
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {copy.cancel}
              </Button>
              <Button onClick={handleSave} disabled={!name.trim()}>
                {copy.templateSaveSubmit}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="max-h-[50vh]">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  {copy.templateListEmpty}
                </p>
              ) : (
                <div className="space-y-2">
                  {templates.map((tpl) => (
                    <Card key={tpl.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onLoadTemplate(tpl)}>
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{tpl.name}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {copy.templateListTaskCount(tpl.tasks.length)}
                            </p>
                          </div>
                        </div>
                        {onDeleteTemplate && (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => { e.stopPropagation(); onDeleteTemplate(tpl.id); }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </ScrollArea>
            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                {copy.dialogClose}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
