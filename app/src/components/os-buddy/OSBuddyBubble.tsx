"use client";

import { X } from "lucide-react";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import { cn } from "@/lib/utils";
import type { OSBuddyCompanionCta, OSBuddyCompanionKind } from "@/lib/os-buddy/os-buddy-companion";
import type { OSBuddyBubbleType } from "@/stores/os-buddy-store";

type OSBuddyBubblePayload = {
  message: string;
  type: OSBuddyBubbleType;
  kind?: OSBuddyCompanionKind;
  cta?: OSBuddyCompanionCta | null;
  isDismissing?: boolean;
  gardenInvitation?: { id: string; account: string };
};

type OSBuddyBubbleProps = {
  bubble: OSBuddyBubblePayload;
  horizontal?: "left" | "right" | "center";
  vertical?: "above" | "below";
  onDismiss?: () => void;
  onCtaClick?: (cta: OSBuddyCompanionCta) => void;
};

export function OSBuddyBubble({
  bubble,
  horizontal = "center",
  vertical = "above",
  onDismiss,
  onCtaClick,
}: OSBuddyBubbleProps) {
  return (
    <div
      className={cn("os-buddy-pixel-bubble", bubble.cta && "os-buddy-pixel-bubble-with-cta")}
      data-kind={bubble.kind ?? bubble.type}
      data-horizontal={horizontal}
      data-vertical={vertical}
      data-state={bubble.isDismissing ? "dismissing" : "visible"}
      // Action targets settle after the entrance; perpetual wobble makes tapping difficult.
      style={bubble.cta && !bubble.isDismissing ? { animationName: "os-buddy-bubble-pop" } : undefined}
      role="status"
      aria-live="polite"
    >
      {onDismiss ? (
        <button
          type="button"
          className="os-buddy-pixel-bubble-close"
          aria-label="Close OS Buddy message"
          onClick={() => { if (bubble.gardenInvitation) emitOSBuddyEvent({ type: "garden:invitation-feedback", ...bubble.gardenInvitation, action: "dismissed" }); onDismiss(); }}
        >
          <X className="size-3" aria-hidden />
        </button>
      ) : null}
      <div className="os-buddy-pixel-bubble-text">{bubble.message}</div>
      {bubble.cta ? (
        <button
          type="button"
          className="os-buddy-pixel-bubble-cta"
          onClick={() => { if (bubble.gardenInvitation) emitOSBuddyEvent({ type: "garden:invitation-feedback", ...bubble.gardenInvitation, action: "accepted" }); onCtaClick?.(bubble.cta!); }}
        >
          {bubble.cta.label}
        </button>
      ) : null}
    </div>
  );
}
