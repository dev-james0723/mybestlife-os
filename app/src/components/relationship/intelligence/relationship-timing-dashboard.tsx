"use client";

/**
 * Page-level timing intelligence (spec §14.1 + §14.2). Two gentle, non-guilt
 * panels computed deterministically from the user's own data:
 *   - "Who may need attention this week" — sorted by a soft priority.
 *   - "Open promises" (Promise Debt) — unresolved commitments across people.
 *
 * Collapsible and only rendered when there's something to show.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CalendarHeart, Handshake, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/stores/app-store";
import {
  formatRelationshipCopy,
  getRelationshipUiCopy,
} from "@/lib/i18n/relationship-ui";
import { getAttentionReasonLabel } from "@/components/relationship/utils/intelligence-display";
import {
  computeAttention,
  countOpenPromises,
  isPromiseEffectivelyOverdue,
  type AttentionItem,
} from "@/lib/relationships/intelligence";
import type { Relationship, RelationshipPromise } from "@/types/database";

type Props = {
  relationships: readonly Relationship[];
  promises: readonly RelationshipPromise[];
  onOpenRelationship: (id: string) => void;
};

export function RelationshipTimingDashboard({
  relationships,
  promises,
  onOpenRelationship,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  const [collapsed, setCollapsed] = useState(false);

  // Group promises by relationship for fast per-person counts.
  const promisesByRel = useMemo(() => {
    const map = new Map<string, RelationshipPromise[]>();
    for (const p of promises) {
      const arr = map.get(p.relationship_id) ?? [];
      arr.push(p);
      map.set(p.relationship_id, arr);
    }
    return map;
  }, [promises]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const r of relationships) {
      const rp = promisesByRel.get(r.id) ?? [];
      const item = computeAttention({
        relationship: r,
        openPromiseCount: countOpenPromises(rp),
        overduePromiseCount: rp.filter((p) => isPromiseEffectivelyOverdue(p))
          .length,
      });
      if (item) items.push(item);
    }
    return items.sort((a, b) => b.priority - a.priority).slice(0, 6);
  }, [relationships, promisesByRel]);

  const openPromises = useMemo(
    () => promises.filter((p) => p.status === "open"),
    [promises],
  );

  const relName = (id: string) =>
    relationships.find((r) => r.id === id)?.person_name ?? "";

  if (attention.length === 0 && openPromises.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <button
        type="button"
        onClick={() => setCollapsed((c) => !c)}
        className="flex w-full items-center justify-between gap-2 text-left"
      >
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <CalendarHeart className="h-4 w-4 text-primary" />
          {copy.dashWhoNeedsMe}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${
            collapsed ? "-rotate-90" : ""
          }`}
        />
      </button>

      <AnimatePresence initial={false}>
        {!collapsed && (
          <motion.div
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 gap-4 pt-4 md:grid-cols-2">
              {/* Who needs me */}
              <div className="space-y-2">
                {attention.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {copy.dashWhoNeedsMeEmpty}
                  </p>
                ) : (
                  attention.map((item, i) => (
                    <motion.button
                      key={item.relationship.id}
                      type="button"
                      onClick={() => onOpenRelationship(item.relationship.id)}
                      initial={reduce ? false : { opacity: 0, x: -6 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: reduce ? 0 : Math.min(i * 0.04, 0.2) }}
                      className="flex w-full items-start justify-between gap-2 rounded-md border border-border bg-background/60 px-3 py-2 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-medium">
                          {item.relationship.person_name}
                        </span>
                        <span className="mt-0.5 flex flex-wrap gap-1">
                          {item.reasonKeys.map((k) => (
                            <Badge
                              key={k}
                              variant="outline"
                              className="font-normal text-[10px] text-muted-foreground"
                            >
                              {getAttentionReasonLabel(k, copy)}
                            </Badge>
                          ))}
                        </span>
                      </span>
                    </motion.button>
                  ))
                )}
              </div>

              {/* Promise debt */}
              <div className="space-y-2">
                <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <Handshake className="h-3.5 w-3.5" />
                  {copy.dashPromiseDebt}
                </p>
                {openPromises.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    {copy.dashPromiseDebtEmpty}
                  </p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">
                      {formatRelationshipCopy(copy.dashPromiseDebtCount, {
                        count: openPromises.length,
                      })}
                    </p>
                    <ul className="space-y-1">
                      {openPromises.slice(0, 6).map((p) => (
                        <li key={p.id}>
                          <button
                            type="button"
                            onClick={() => onOpenRelationship(p.relationship_id)}
                            className="flex w-full items-baseline gap-1.5 rounded px-1 py-0.5 text-left text-sm hover:bg-muted/50"
                          >
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {relName(p.relationship_id)}:
                            </span>
                            <span className="min-w-0 truncate text-pretty">
                              {p.promise_text}
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
