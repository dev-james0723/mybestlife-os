"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import {
  isOSBuddyInGarden,
  subscribeToOSBuddyEvents,
} from "@/lib/os-buddy/os-buddy-events";
import { gardenAdventureRepository } from "@/lib/repositories/garden-adventure";
import { gardenInvitationEligible } from "@/lib/garden/persistence";
import {
  defaultGardenPresentation,
  sampleGardenAtmosphere,
  gardenWeatherInvitation,
} from "@/lib/garden/presentation";
import { gardenDay } from "@/lib/garden/game";
import { gardenPondRepository } from "@/lib/repositories/garden-pond";
import { queuePondFeedback, readPondFeedback, clearPondFeedback } from "@/lib/garden/pond-persistence";
import { pondInvitationText } from "@/lib/garden/pond-companion";
import { LIVING_POND_ENABLED } from "@/lib/garden/pond-config";

async function flushPondFeedback(account: string) {
  for (const feedback of await readPondFeedback(account)) {
    await gardenPondRepository.invitation(account, feedback.action, feedback.id);
    await clearPondFeedback(feedback);
  }
}

/** Foreground companion invitations only. No permission prompt or background messages. */
export function useGardenBuddyInvitations({
  enabled,
  pathname,
  locale,
}: {
  enabled: boolean;
  pathname: string | null;
  locale: string;
}) {
  const { user } = useAuth();
  const [inGarden, setInGarden] = useState(isOSBuddyInGarden),
    active = useRef(inGarden);
  useEffect(
    () =>
      subscribeToOSBuddyEvents((event) => {
        if (event.type === "garden:enter" || event.type === "garden:exit") {
          active.current = event.type === "garden:enter";
          setInGarden(active.current);
          if (active.current) useOSBuddyStore.getState().clearBubble();
        } else if (LIVING_POND_ENABLED && event.type === "garden:invitation-feedback" && event.account === user?.id) {
          // A closing button is explicit feedback. Automatic timeout/focus changes are not dismissals.
          void queuePondFeedback({ account: event.account, id: event.id, action: event.action })
            .then(() => flushPondFeedback(event.account)).catch(() => { /* Retain durable feedback for the next foreground check. */ });
        }
      }),
    [user?.id],
  );
  useEffect(() => {
    if (!enabled || !user || /\/garden(?:\/|$)/.test(pathname ?? "")) return;
    let cancelled = false,
      checking = false;
    const actor = user.id;
    async function check() {
      const store = useOSBuddyStore.getState();
      if (
        checking ||
        cancelled ||
        active.current ||
        document.hidden ||
        store.focusSession ||
        store.isMiniGameOpen ||
        store.isMenuOpen ||
        store.bubble
      )
        return;
      checking = true;
      try {
        // Confirm queued dismissals before considering another invitation, including after a restart.
        if (LIVING_POND_ENABLED) await flushPondFeedback(actor);
        const day = gardenDay();
        const [save, identity, notifications, pond] = await Promise.all([
          gardenAdventureRepository.read(actor, day),
          gardenAdventureRepository.identity(actor),
          gardenAdventureRepository.notificationEnabled(actor),
          LIVING_POND_ENABLED ? gardenPondRepository.invitation(actor, "read") : Promise.resolve({ managed: false }),
        ]);
        const eligible = () =>
          gardenInvitationEligible({
            now: new Date(),
            timezone: identity.timezone,
            settings: save.settings,
            notificationEnabled: notifications,
            buddyEnabled: identity.enabled,
            focusing: !!useOSBuddyStore.getState().focusSession,
            inGarden: active.current,
            playedToday: !pond.managed && save.actions.length > 0,
            lastBubbleAt: useOSBuddyStore.getState().lastUnsolicitedBubbleAt,
            hidden: document.hidden,
          });
        if (cancelled || !eligible() || useOSBuddyStore.getState().bubble)
          return;
        if (pond.managed) {
          // V3 players receive only a new, server-verified pond fact, within the shared invitation budget.
          const reserved = await gardenPondRepository.invitation(actor, "reserve");
          const invitation = reserved.invitation;
          if (!invitation || cancelled || !eligible() || useOSBuddyStore.getState().bubble) return;
          const zh = locale === "zh-TW";
          useOSBuddyStore.getState().showBubble(pondInvitationText(invitation.kind, zh), "context", {
            unsolicited: true, durationMs: 12_000,
            cta: { label: zh ? "看看魚塘" : "Visit pond", href: "/garden" },
            gardenInvitation: { id: invitation.id, account: actor },
          });
          if (useOSBuddyStore.getState().bubble?.gardenInvitation?.id === invitation.id) {
            await queuePondFeedback({ account: actor, id: invitation.id, action: "shown" });
            await flushPondFeedback(actor);
          }
          return;
        }
        // The database lock limits invitations across tabs and devices, as well as this tab.
        const claimed = await gardenAdventureRepository.action(
          actor,
          day,
          "invite",
          { timezone: identity.timezone },
        );
        if (
          cancelled ||
          !claimed.invited ||
          !eligible() ||
          useOSBuddyStore.getState().bubble
        )
          return;
        const zh = locale === "zh-TW";
        const sky = sampleGardenAtmosphere(
          Date.now(),
          identity.timezone,
          defaultGardenPresentation,
        );
        useOSBuddyStore
          .getState()
          .showBubble(
            gardenWeatherInvitation(sky.weather, sky.night, zh),
            "context",
            {
              unsolicited: true,
              durationMs: 10_000,
              cta: { label: zh ? "逛逛花園" : "Visit garden", href: "/garden" },
            },
          );
      } catch {
        /* A missing schema, session or preference means no invitation. */
      } finally {
        checking = false;
      }
    }
    const first = setTimeout(() => void check(), 12_000),
      interval = setInterval(() => void check(), 60_000);
    return () => {
      cancelled = true;
      clearTimeout(first);
      clearInterval(interval);
    };
  }, [enabled, locale, pathname, user]);
  return inGarden;
}
