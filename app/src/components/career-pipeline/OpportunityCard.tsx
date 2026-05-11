"use client";

import { useDraggable } from "@dnd-kit/core";
import Link from "next/link";
import { Building2, MapPin, Paperclip, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CareerOpportunity } from "@/types/career-vault";
import type { CareerVaultCopy } from "@/lib/i18n/career-vault-ui";

interface OpportunityCardProps {
  opportunity: CareerOpportunity;
  copy: CareerVaultCopy;
  href: string;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.max(0, Math.floor((Date.now() - t) / 86400000));
}

export function OpportunityCard({
  opportunity,
  copy,
  href,
}: OpportunityCardProps) {
  const { attributes, listeners, setNodeRef, isDragging, transform } =
    useDraggable({ id: opportunity.id });

  const style: React.CSSProperties = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 30,
      }
    : {};

  const attachedCount = opportunity.attached_file_ids.length;
  const applied = daysSince(opportunity.applied_date);

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={cn(
        "group space-y-2 rounded-lg border bg-card p-3 text-xs shadow-sm transition",
        isDragging ? "opacity-50 ring-1 ring-primary" : "hover:border-primary/50",
      )}
      {...listeners}
      {...attributes}
    >
      <div className="flex items-start gap-2">
        <Link
          href={href}
          className="line-clamp-2 flex-1 text-sm font-semibold hover:underline"
          onPointerDown={(e) => e.stopPropagation()}
        >
          {opportunity.role_title}
        </Link>
      </div>
      <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Building2 className="h-3 w-3" />
        <span className="truncate">{opportunity.company_name}</span>
      </div>
      {opportunity.location ? (
        <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span className="truncate">{opportunity.location}</span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted-foreground">
        {typeof opportunity.excitement_score === "number" ? (
          <span className="inline-flex items-center gap-0.5">
            <Star className="h-3 w-3 text-amber-500" />
            {copy.pipeline.card.excitementScore(opportunity.excitement_score)}
          </span>
        ) : null}
        {typeof opportunity.match_score === "number" ? (
          <span>
            {copy.pipeline.card.matchScore(opportunity.match_score)}
          </span>
        ) : null}
        {attachedCount > 0 ? (
          <span className="inline-flex items-center gap-0.5">
            <Paperclip className="h-3 w-3" />
            {copy.pipeline.card.attachedFiles(attachedCount)}
          </span>
        ) : null}
        {applied !== null ? (
          <span>{copy.pipeline.card.appliedAgo(applied)}</span>
        ) : null}
      </div>
    </article>
  );
}
