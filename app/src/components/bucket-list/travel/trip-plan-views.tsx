"use client";

import type {
  BucketDestinationBrief,
  BucketTripPlan,
} from "@/types/bucket-list";

/**
 * Presentational views for the AI destination brief and trip plan. Shared by
 * the Travel Explorer Console (and previously inline in the detail hub). Pure
 * rendering — the grounded `unverified` flag is surfaced honestly.
 */
export function DestinationBriefView({ brief }: { brief: BucketDestinationBrief }) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>{brief.overview}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BriefList title="Best time" items={[brief.best_time]} />
        <BriefList title="Must-do" items={brief.must_do} />
        <BriefList title="Food" items={brief.food} />
        <BriefList title="Stay" items={brief.stay} />
        <BriefList title="Transport" items={brief.transport} />
        {brief.weather_note ? (
          <BriefList title="Weather" items={[brief.weather_note]} />
        ) : null}
      </div>
      <TravelResearchNote unverified={brief.unverified === true} />
    </div>
  );
}

export function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={`${title}-${i}`} className="leading-snug">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TripPlanView({ plan }: { plan: BucketTripPlan }) {
  return (
    <div className="mt-3 space-y-3">
      <ol className="space-y-3 border-l pl-4">
        {plan.days.map((day) => (
          <li key={day.day} className="relative">
            <span className="absolute -left-[25px] top-1 grid h-5 w-5 place-items-center rounded-full border bg-background text-[10px] font-bold">
              {day.day}
            </span>
            <p className="text-sm font-semibold">
              Day {day.day}: {day.theme}
              {day.anchor ? (
                <span className="text-muted-foreground"> · {day.anchor}</span>
              ) : null}
            </p>
            <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Morning — </span>
                {day.morning}
              </li>
              <li>
                <span className="font-medium text-foreground">Afternoon — </span>
                {day.afternoon}
              </li>
              <li>
                <span className="font-medium text-foreground">Evening — </span>
                {day.evening}
              </li>
            </ul>
          </li>
        ))}
      </ol>
      <TravelResearchNote unverified={plan.unverified === true} />
    </div>
  );
}

function TravelResearchNote({ unverified }: { unverified: boolean }) {
  return (
    <p
      className={
        unverified
          ? "rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-300"
          : "rounded-md border border-cyan-500/25 bg-cyan-500/10 px-2 py-1 text-xs text-cyan-800 dark:text-cyan-200"
      }
    >
      {unverified
        ? "AI research could not verify every detail — double-check before booking."
        : "Grounded AI research — verify hours, requirements, and prices before booking."}
    </p>
  );
}
