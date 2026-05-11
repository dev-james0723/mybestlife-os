/**
 * Career timeline normalizers.
 *
 * Note: career projects already come in via the people domain
 * (`careerNetworkToBrainNodes` produces `career_project` for
 * `node_type === 'project'`). This file handles the timeline-style
 * `career_events` table.
 */

import type { CareerEvent } from "@/types/database";
import type { BrainNode } from "@/types/brain-graph";
import { composeBody, makeBrainNode, ownedBy, truncate } from "./_shared";

export function careerEventsToBrainNodes(input: {
  rows: CareerEvent[] | undefined;
  userId: string;
}): BrainNode[] {
  return ownedBy(input.rows, input.userId).map((e) =>
    makeBrainNode(
      {
        sourceId: e.id,
        type: "career_event",
        userId: input.userId,
        title: truncate(e.title || `Career event (${e.event_type})`),
        summary: e.description ?? undefined,
        bodyText: composeBody(e.description, e.organization, e.location),
        tags: e.event_type ? [e.event_type] : [],
        sourceType: "career_events",
        createdAt: e.created_at,
        updatedAt: e.updated_at,
        importance: 0.55,
        metadata: {
          event_type: e.event_type,
          start_date: e.start_date,
          end_date: e.end_date,
          organization: e.organization,
        },
      },
      { sourceModule: "career_event" },
    ),
  );
}
