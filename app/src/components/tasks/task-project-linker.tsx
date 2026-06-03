"use client";

import { Folder } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TasksUiCopy } from "@/lib/i18n/tasks-ui";
import type { TasksCenterUiCopy } from "@/lib/i18n/tasks-center-ui";

const NONE = "none";

interface TaskProjectLinkerProps {
  value: string | null;
  projects: { id: string; name: string }[] | undefined;
  onChange: (projectId: string | null) => void;
  copy: TasksUiCopy;
  centerCopy: TasksCenterUiCopy;
}

/** Inline project picker used by the detail panel (link / change / unlink). */
export function TaskProjectLinker({
  value,
  projects,
  onChange,
  copy,
  centerCopy,
}: TaskProjectLinkerProps) {
  const options = [
    { value: NONE, label: copy.noProject },
    ...(projects ?? []).map((p) => ({ value: p.id, label: p.name })),
  ];

  return (
    <Select
      value={value ?? NONE}
      onValueChange={(v) => {
        if (v === null) return;
        onChange(v === NONE ? null : String(v));
      }}
      itemToStringLabel={(v) =>
        options.find((o) => o.value === v)?.label ?? String(v)
      }
    >
      <SelectTrigger className="h-11 min-h-11 w-full rounded-xl">
        <span className="flex items-center gap-1.5">
          <Folder className="h-3.5 w-3.5 text-muted-foreground" />
          <SelectValue placeholder={centerCopy.linkProject} />
        </span>
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
