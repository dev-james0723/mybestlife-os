"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { ListChecks } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { LifeAgentUiCopy } from "@/lib/i18n/life-agent-ui";
import type { LifeAgentActionPreviewCard } from "@/lib/life-agent/action-types";
import { AgentActionPreview } from "@/components/life-agent/AgentActionPreview";
import { cn } from "@/lib/utils";

type AgentActionReviewDrawerProps = {
  ui: LifeAgentUiCopy;
  previews: LifeAgentActionPreviewCard[];
  onConfirm: (id: string, domain: LifeAgentActionPreviewCard["domain"]) => Promise<void>;
  onConfirmAll: (ids: string[]) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
  onCancelAll: (ids: string[]) => Promise<void>;
  className?: string;
};

export function AgentActionReviewDrawer({
  ui,
  previews,
  onConfirm,
  onConfirmAll,
  onCancel,
  onCancelAll,
  className,
}: AgentActionReviewDrawerProps) {
  const firstCardRef = useRef<HTMLLIElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [bulkWorking, setBulkWorking] = useState(false);

  const pending = useMemo(
    () => previews.filter((p) => p.status === "pending"),
    [previews],
  );

  const handleConfirm = useCallback(
    async (id: string, domain: LifeAgentActionPreviewCard["domain"]) => {
      setConfirmingId(id);
      try {
        await onConfirm(id, domain);
      } finally {
        setConfirmingId(null);
      }
    },
    [onConfirm],
  );

  const handleCancel = useCallback(
    async (id: string) => {
      setCancellingId(id);
      try {
        await onCancel(id);
      } finally {
        setCancellingId(null);
      }
    },
    [onCancel],
  );

  const handleConfirmAll = useCallback(async () => {
    if (!pending.length) return;
    setBulkWorking(true);
    try {
      await onConfirmAll(pending.map((p) => p.id));
    } finally {
      setBulkWorking(false);
    }
  }, [onConfirmAll, pending]);

  const handleCancelAll = useCallback(async () => {
    if (!pending.length) return;
    setBulkWorking(true);
    try {
      await onCancelAll(pending.map((p) => p.id));
    } finally {
      setBulkWorking(false);
    }
  }, [onCancelAll, pending]);

  const handleEditFirst = useCallback(() => {
    firstCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  if (!previews.length) return null;

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/60 bg-muted/20 p-4",
        className,
      )}
      aria-label={ui.actionReviewTitle}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold">
            <ListChecks className="h-4 w-4 text-primary" aria-hidden />
            {ui.actionReviewTitle}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{ui.actionReviewSubtitle}</p>
        </div>
      </div>

      {pending.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            className="h-8 rounded-lg text-xs"
            disabled={bulkWorking || Boolean(confirmingId)}
            onClick={() => void handleConfirmAll()}
          >
            {ui.actionCreateAll}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 rounded-lg text-xs"
            disabled={bulkWorking}
            onClick={handleEditFirst}
          >
            {ui.actionEditFirst}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-8 rounded-lg text-xs"
            disabled={bulkWorking}
            onClick={() => void handleCancelAll()}
          >
            {ui.actionCancelAll}
          </Button>
        </div>
      )}

      <ol className="flex flex-col gap-3">
        {previews.map((preview, index) => (
          <li
            key={preview.id}
            ref={index === 0 ? firstCardRef : undefined}
            className="list-none"
          >
            <span className="mb-1 block text-[10px] font-medium text-muted-foreground">
              {index + 1}. {preview.title}
            </span>
            <AgentActionPreview
              ui={ui}
              preview={preview}
              onConfirm={(id) => void handleConfirm(id, preview.domain)}
              onCancel={(id) => void handleCancel(id)}
              isConfirming={confirmingId === preview.id || bulkWorking}
              isCancelling={cancellingId === preview.id || bulkWorking}
            />
          </li>
        ))}
      </ol>

      <p className="mt-3 text-[10px] text-muted-foreground">{ui.actionReviewDisclaimer}</p>
    </section>
  );
}
