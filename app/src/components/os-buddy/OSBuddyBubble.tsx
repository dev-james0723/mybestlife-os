"use client";

import { cn } from "@/lib/utils";
import type { OSBuddyCompanionCta, OSBuddyCompanionKind } from "@/lib/os-buddy/os-buddy-companion";
import type { OSBuddyBubbleType } from "@/stores/os-buddy-store";

type OSBuddyBubblePayload = {
  message: string;
  type: OSBuddyBubbleType;
  kind?: OSBuddyCompanionKind;
  cta?: OSBuddyCompanionCta | null;
};

type OSBuddyBubbleProps = {
  bubble: OSBuddyBubblePayload;
  onCtaClick?: (cta: OSBuddyCompanionCta) => void;
};

export function OSBuddyBubble({ bubble, onCtaClick }: OSBuddyBubbleProps) {
  return (
    <div
      className={cn("os-buddy-pixel-bubble", bubble.cta && "os-buddy-pixel-bubble-with-cta")}
      data-kind={bubble.kind ?? bubble.type}
      role="status"
      aria-live="polite"
    >
      <div className="os-buddy-pixel-bubble-text">{bubble.message}</div>
      {bubble.cta ? (
        <button
          type="button"
          className="os-buddy-pixel-bubble-cta"
          onClick={() => onCtaClick?.(bubble.cta!)}
        >
          {bubble.cta.label}
        </button>
      ) : null}
    </div>
  );
}
