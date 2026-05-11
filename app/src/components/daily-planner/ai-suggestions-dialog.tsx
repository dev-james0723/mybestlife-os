"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Plus, Clock, Lightbulb } from "lucide-react";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";

type Recommendation = {
  taskTitle: string;
  estimatedBlocks: number;
  reason: string;
  priority: string;
  taskId?: string;
};

interface AISuggestionsDialogProps {
  open: boolean;
  onClose: () => void;
  recommendations: Recommendation[];
  planningTip: string;
  onAddTask: (taskId: string | undefined, title: string, blocks: number) => void;
  copy: DailyPlannerUiCopy;
  blockMinutes?: number;
}

export function AISuggestionsDialog({
  open,
  onClose,
  recommendations,
  planningTip,
  onAddTask,
  copy,
  blockMinutes = 10,
}: AISuggestionsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent size="2xl" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {copy.aiSuggestionsModalTitle}
          </DialogTitle>
        </DialogHeader>

        {planningTip && (
          <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <Lightbulb className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <p className="text-sm">{planningTip}</p>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0 max-h-[50vh]">
          <div className="space-y-3">
            {recommendations.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {copy.aiSuggestionsEmpty}
              </p>
            ) : (
              recommendations.map((rec, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{rec.taskTitle}</p>
                        <p className="text-sm text-muted-foreground mt-1">{rec.reason}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{rec.priority}</Badge>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {copy.aiRecDurationLine(
                              rec.estimatedBlocks,
                              rec.estimatedBlocks * blockMinutes,
                            )}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => onAddTask(rec.taskId, rec.taskTitle, rec.estimatedBlocks)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {copy.add}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {copy.dialogClose}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
