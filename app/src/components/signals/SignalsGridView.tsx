"use client";

import { useState } from "react";
import type { Locale } from "date-fns";

import { Button } from "@/components/ui/button";
import type { SignalItem } from "@/lib/signals/types";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";
import { SignalCardWithHandlers, type SignalCardHandlers } from "./SignalsSection";
import { SignalsCaughtUp } from "./SignalsStates";

const PAGE = 9;

/** Grid view — responsive feature cards with "Show more" paging (no infinite scroll). */
export function SignalsGridView({
  items,
  copy,
  dateLocale,
  handlers,
}: {
  items: SignalItem[];
  copy: SignalsUiCopy;
  dateLocale: Locale;
  handlers: SignalCardHandlers;
}) {
  const [count, setCount] = useState(PAGE);
  const [seenLen, setSeenLen] = useState(items.length);
  if (items.length !== seenLen) {
    setSeenLen(items.length);
    setCount(PAGE);
  }
  const visible = items.slice(0, count);
  const hasMore = items.length > visible.length;

  return (
    <div className="space-y-5">
      <div data-stagger className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((signal) => (
          <SignalCardWithHandlers
            key={signal.id}
            signal={signal}
            copy={copy}
            dateLocale={dateLocale}
            variant="feature"
            handlers={handlers}
          />
        ))}
      </div>
      {hasMore ? (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={() => setCount((c) => c + PAGE)}>
            {copy.states.showMore}
          </Button>
        </div>
      ) : (
        <SignalsCaughtUp copy={copy} />
      )}
    </div>
  );
}
