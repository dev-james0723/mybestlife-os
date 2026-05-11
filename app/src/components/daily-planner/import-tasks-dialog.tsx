"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Search, Import } from "lucide-react";
import type { Task } from "@/types/database";
import type { DailyPlannerUiCopy } from "@/lib/i18n/daily-planner-ui";

interface ImportTasksDialogProps {
  open: boolean;
  onClose: () => void;
  onImport: (taskIds: string[]) => void;
  tasks: Task[];
  copy: DailyPlannerUiCopy;
}

export function ImportTasksDialog({
  open,
  onClose,
  onImport,
  tasks,
  copy,
}: ImportTasksDialogProps) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const activeTasks = useMemo(() => {
    const active = tasks.filter((t) => t.status !== "done" && t.status !== "cancelled");
    if (!search.trim()) return active;
    const q = search.toLowerCase();
    return active.filter((t) => t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q));
  }, [tasks, search]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleImport = () => {
    onImport(Array.from(selected));
    setSelected(new Set());
    setSearch("");
  };

  const handleClose = () => {
    setSelected(new Set());
    setSearch("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent size="xl" className="max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{copy.importDialogTitle}</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={copy.importSearchPlaceholder}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <ScrollArea className="flex-1 min-h-0 max-h-[50vh] border rounded-lg">
          <div className="divide-y">
            {activeTasks.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {copy.importNoMatch}
              </p>
            ) : (
              activeTasks.map((task) => (
                <label
                  key={task.id}
                  className="flex items-start gap-3 px-4 py-3 hover:bg-muted/40 cursor-pointer transition-colors"
                >
                  <Checkbox
                    checked={selected.has(task.id)}
                    onCheckedChange={() => toggle(task.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{task.priority}</Badge>
                      <Badge variant="secondary" className="text-xs">{task.status}</Badge>
                      {task.project?.name && (
                        <span className="text-xs text-muted-foreground truncate">{task.project.name}</span>
                      )}
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {copy.cancel}
          </Button>
          <Button onClick={handleImport} disabled={selected.size === 0}>
            <Import className="h-4 w-4 mr-2" />
            {copy.importSelectedButton(selected.size)}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
