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
import { gardenDay } from "@/lib/garden/game";

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
        }
      }),
    [],
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
        const day = gardenDay();
        const [save, identity, notifications] = await Promise.all([
          gardenAdventureRepository.read(actor, day),
          gardenAdventureRepository.identity(actor),
          gardenAdventureRepository.notificationEnabled(actor),
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
            playedToday: save.actions.length > 0,
            lastBubbleAt: useOSBuddyStore.getState().lastUnsolicitedBubbleAt,
            hidden: document.hidden,
          });
        if (cancelled || !eligible() || useOSBuddyStore.getState().bubble)
          return;
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
        useOSBuddyStore
          .getState()
          .showBubble(
            zh
              ? "想去花園散散步嗎？我們可以一起看看今天的新發現。"
              : "Fancy a little garden wander? We could see what’s growing together.",
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
