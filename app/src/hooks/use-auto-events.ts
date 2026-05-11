"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/stores/app-store";
import { getCareerPhase5Copy } from "@/lib/i18n/career-phase5-ui";
import { careerEventsRepository } from "@/lib/repositories/career-events";
import { useCareerVaultFiles } from "./use-career-vault";
import { useCareerOpportunities } from "./use-career-opportunities";
import type { CareerVaultFile, CareerOpportunity } from "@/types/database";

/**
 * Reconciles "auto-events" — events that should exist once a user hits
 * certain milestones. Runs once per session when the underlying Vault and
 * Pipeline data have loaded. Idempotent: duplicate calls cost at most one
 * existence check per source record.
 *
 * Why reconciliation instead of wiring into every mutation?
 * - Keeps Phase 1–4 hooks untouched.
 * - Catches historical milestones that predate Phase 5.
 * - Safe against retry storms because `upsertAutoEvent` short-circuits when
 *   an event with the same (source_kind, source_id) already exists.
 */
export function useAutoEvents(): void {
  const language = useAppStore((s) => s.language);
  const copy = getCareerPhase5Copy(language).autoEvents;

  const filesQ = useCareerVaultFiles();
  const oppsQ = useCareerOpportunities();
  const qc = useQueryClient();

  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    if (filesQ.isLoading || oppsQ.isLoading) return;
    didRun.current = true;

    const files = (filesQ.data ?? []) as CareerVaultFile[];
    const opps = (oppsQ.data ?? []) as CareerOpportunity[];

    void (async () => {
      let created = 0;

      for (const f of files) {
        if (!f.is_master) continue;
        const ev = await careerEventsRepository.upsertAutoEvent({
          sourceKind: "file_upload",
          sourceId: f.id,
          eventType: "milestone",
          title: copy.newMasterResume(f.filename),
          startDate: f.created_at.slice(0, 10),
          description: null,
          relatedFileIds: [f.id],
        });
        if (ev) created += 1;
      }

      for (const o of opps) {
        if (o.stage !== "accepted") continue;
        const ev = await careerEventsRepository.upsertAutoEvent({
          sourceKind: "opportunity_stage",
          sourceId: `${o.id}-accepted`,
          eventType: "job_started",
          title: copy.jobOfferAccepted(o.company_name),
          startDate:
            o.stage_history?.accepted?.slice(0, 10) ??
            o.applied_date ??
            o.updated_at.slice(0, 10),
          description: o.role_title ?? null,
          organization: o.company_name,
          location: o.location ?? null,
        });
        if (ev) created += 1;
      }

      if (created > 0) {
        void qc.invalidateQueries({ queryKey: ["career-events"] });
      }
    })();
  }, [filesQ.data, filesQ.isLoading, oppsQ.data, oppsQ.isLoading, qc, copy]);
}
