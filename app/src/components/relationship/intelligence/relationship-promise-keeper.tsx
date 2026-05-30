"use client";

/**
 * Promise Keeper (spec §13.5). Lists tracked commitments for one relationship,
 * lets the user add new ones, mark them done/open, and shows overdue status.
 * Creating a promise is always explicit (no silent task creation — spec §25).
 */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Plus, RotateCcw, Handshake } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import {
  useCreateRelationshipPromise,
  useUpdateRelationshipPromise,
} from "@/hooks/use-relationship-intelligence";
import { isPromiseEffectivelyOverdue } from "@/lib/relationships/intelligence";
import { formatDate } from "@/lib/utils/date";
import type { RelationshipPromise } from "@/types/database";

type Props = {
  relationshipId: string;
  promises: readonly RelationshipPromise[];
};

export function RelationshipPromiseKeeper({ relationshipId, promises }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  const createPromise = useCreateRelationshipPromise();
  const updatePromise = useUpdateRelationshipPromise();
  const [draft, setDraft] = useState("");

  function add() {
    const text = draft.trim();
    if (!text) return;
    createPromise.mutate({
      relationship_id: relationshipId,
      promise_text: text,
      due_date: null,
      status: "open",
      source_interaction_id: null,
    });
    setDraft("");
  }

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Handshake className="h-4 w-4" aria-hidden />
        {copy.modalPromiseKeeper}
      </h3>

      {promises.length === 0 ? (
        <p className="text-sm text-muted-foreground">{copy.promiseNone}</p>
      ) : (
        <ul className="space-y-1.5">
          {promises.map((p, i) => {
            const overdue = isPromiseEffectivelyOverdue(p);
            const done = p.status === "done";
            return (
              <motion.li
                key={p.id}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: reduce ? 0 : Math.min(i * 0.03, 0.15) }}
                className="flex items-start justify-between gap-2 rounded-md border border-border bg-card/40 px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p
                    className={`text-sm text-pretty ${
                      done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {p.promise_text}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`font-normal text-[10px] ${statusChip(
                        done ? "done" : overdue ? "overdue" : "open",
                      )}`}
                    >
                      {done
                        ? copy.promiseDone
                        : overdue
                          ? copy.promiseOverdue
                          : copy.promiseOpen}
                    </Badge>
                    {p.due_date && (
                      <span className="text-[10px] text-muted-foreground">
                        {formatRelationshipCopy(copy.promiseDueOn, {
                          date: formatDate(p.due_date),
                        })}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label={done ? copy.promiseReopen : copy.promiseMarkDone}
                  onClick={() =>
                    updatePromise.mutate({
                      id: p.id,
                      data: { status: done ? "open" : "done" },
                    })
                  }
                >
                  {done ? (
                    <RotateCcw className="h-3.5 w-3.5" />
                  ) : (
                    <Check className="h-3.5 w-3.5" />
                  )}
                </Button>
              </motion.li>
            );
          })}
        </ul>
      )}

      <div className="flex items-center gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={copy.promiseAddPlaceholder}
          className="h-8 text-sm"
        />
        <Button size="sm" variant="outline" onClick={add} disabled={!draft.trim()}>
          <Plus className="mr-1 h-3.5 w-3.5" />
          {copy.promiseAdd}
        </Button>
      </div>
    </section>
  );
}

function statusChip(status: "open" | "done" | "overdue"): string {
  switch (status) {
    case "done":
      return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20";
    case "overdue":
      return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20";
    case "open":
      return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
  }
}
