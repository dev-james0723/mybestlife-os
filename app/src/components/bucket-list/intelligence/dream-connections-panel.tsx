"use client";

import { Link2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type {
  BucketDreamConnections,
  BucketItem,
} from "@/types/bucket-list";
import { bucketStaggerItem } from "../bucket-motion";

/**
 * Shows what's already connected + AI-suggested connections, and offers a
 * confirm-first "Connect this dream" entry point (opens the Activate modal).
 * Never creates cross-module records on its own.
 */
export function DreamConnectionsPanel({
  connections,
  item,
  copy,
  onConnect,
}: {
  connections: BucketDreamConnections;
  item: BucketItem;
  copy: BucketListUiCopy;
  onConnect: () => void;
}) {
  const reduceMotion = useReducedMotion() ?? false;
  const groups: { label: string; items: string[] }[] = [
    { label: copy.connProjects, items: connections.projects },
    { label: copy.connTasks, items: connections.tasks },
    { label: copy.connGoals, items: connections.goals },
    { label: copy.connRelationships, items: connections.relationships },
    { label: copy.connAssets, items: connections.assets },
    { label: copy.connNotes, items: connections.notes },
  ].filter((g) => g.items.length > 0);

  const linkedCount =
    (item.linked_project_id ? 1 : 0) +
    item.linked_task_ids.length +
    (item.linked_savings_goal_id ? 1 : 0) +
    (item.linked_budget_id ? 1 : 0);

  return (
    <motion.section
      variants={bucketStaggerItem(reduceMotion, 10)}
      className="rounded-xl border p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <Link2 className="h-4 w-4 text-indigo-500" />
          {copy.connectionsHeading}
        </h3>
        <Button size="sm" variant="outline" onClick={onConnect}>
          {copy.connectionsConnectBtn}
        </Button>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {copy.connectionsLinkedCount(linkedCount)}
      </p>

      {groups.length > 0 ? (
        <div className="mt-3 space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {copy.connectionsSuggested}
          </p>
          {groups.map((g) => (
            <div key={g.label} className="flex flex-wrap items-center gap-1.5">
              <span className="text-[12px] font-medium">{g.label}:</span>
              {g.items.map((it) => (
                <Badge key={it} variant="secondary" className="text-[11px]">
                  {it}
                </Badge>
              ))}
            </div>
          ))}
          <p className="text-[11px] text-muted-foreground">{copy.actionConfirmNote}</p>
        </div>
      ) : null}
    </motion.section>
  );
}
