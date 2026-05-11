"use client";

import { useMemo } from "react";
import {
  MapPin,
  FolderOpen,
  Wallet,
  FileText,
  Plane,
  Sparkles,
  ListChecks,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";
import { exploratoryBand } from "@/lib/bucket-list/flight-watch";
import {
  bucketTargetMonthLabel,
  bucketTypeBadgeClass,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import { useLatestFlightQuote } from "@/hooks/use-bucket-list";

type FeaturedRailProps = {
  item: BucketItem;
  onOpenDetail: () => void;
  onActivate: () => void;
  onRefreshFlights?: () => void;
  refreshing?: boolean;
};

/**
 * Large right-column hero card. Matches the screenshot's NE panel.
 *
 * Renders the currently featured dream with:
 *   • cover image or gradient
 *   • title / target month
 *   • "Project Linked / Generate Tasks / Budget Linked" action wells
 *   • Travel logistics card (airport + route)
 *   • Flight watch tile
 *   • Intelligence CTAs (AI Destination Brief / Break down into steps)
 */
export function BucketFeaturedRail({
  item,
  onOpenDetail,
  onActivate,
  onRefreshFlights,
  refreshing,
}: FeaturedRailProps) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const flight = useLatestFlightQuote(item.id);
  const targetLabel = bucketTargetMonthLabel(item);

  const priceBand = useMemo(() => {
    if (item.type !== "travel") return null;
    if (item.exploratory_price_min && item.exploratory_price_max) {
      return {
        min: item.exploratory_price_min,
        max: item.exploratory_price_max,
        currency: item.cost_currency ?? "USD",
      };
    }
    if (!item.origin_airport || !item.destination_airport) return null;
    return exploratoryBand({
      origin_airport: item.origin_airport,
      destination_airport: item.destination_airport,
      destination_lat: item.destination_lat ?? undefined,
      destination_lng: item.destination_lng ?? undefined,
      travel_style: item.travel_style,
      currency: item.cost_currency ?? "USD",
    });
  }, [item]);

  return (
    <aside className="flex flex-col gap-4">
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] shadow-[0_12px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl",
        )}
      >
        {/* Cover / hero image area */}
        <div className="relative h-40 w-full overflow-hidden">
          {item.cover_image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.cover_image_url}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/30 via-teal-400/20 to-lime-300/10" />
          )}
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/65" />
          <div className="absolute right-3 top-3">
            <span
              className={cn(
                "inline-flex items-center rounded-full border border-white/15 bg-black/40 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
                bucketTypeBadgeClass(item.type),
              )}
            >
              {getBucketTypeLabel(item.type, copy)}
            </span>
          </div>
        </div>

        {/* Title + target */}
        <button
          type="button"
          onClick={onOpenDetail}
          className="block w-full p-4 text-left transition-colors hover:bg-white/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime-300/70"
        >
          <h2 className="text-xl font-semibold leading-tight text-white">
            {item.title}
          </h2>
          <p className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium uppercase tracking-[0.12em] text-white/55">
            <MapPin className="h-3 w-3" />
            {[item.destination_country, targetLabel]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </button>

        {/* Action wells — matches screenshot "Project Linked / Generate Tasks / Budget Linked" */}
        <div className="grid grid-cols-3 gap-2 px-4 pb-4">
          <ActionWell
            label="PROJECT LINKED"
            icon={<FolderOpen className="h-4 w-4" />}
            active={Boolean(item.linked_project_id)}
            onClick={onActivate}
          />
          <ActionWell
            label="GENERATE TASKS"
            icon={<Sparkles className="h-4 w-4" />}
            accent
            onClick={onActivate}
          />
          <ActionWell
            label="BUDGET LINKED"
            icon={<Wallet className="h-4 w-4" />}
            active={Boolean(item.linked_savings_goal_id || item.linked_budget_id)}
            onClick={onActivate}
          />
        </div>
      </div>

      {/* Travel logistics (travel only) */}
      {item.type === "travel" ? (
        <>
          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
              {copy.detailTravelLogistics}
            </h3>
            <div className="flex items-start gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/[0.04]">
                <Plane className="h-5 w-5 text-white/80" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  {item.destination_airport ?? "—"} ({item.destination_city ?? item.destination_name ?? ""})
                </p>
                <p className="mt-0.5 text-[11px] text-white/60">
                  {item.origin_airport ? `Base camp: ${item.origin_airport}` : "Origin not set"}
                  {item.destination_city
                    ? ` · Route planned to ${item.destination_city}`
                    : ""}
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/65">
                <Plane className="h-3.5 w-3.5 text-white/60" />
                {copy.detailFlightWatch}
              </h3>
              {flight.data?.cheapest_price != null &&
              item.exploratory_price_max != null &&
              flight.data.cheapest_price <= item.exploratory_price_max * 0.9 ? (
                <span className="rounded-full bg-lime-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-lime-300">
                  {copy.flightPriceDropped}
                </span>
              ) : null}
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-semibold tracking-tight text-white">
                  {flight.data?.cheapest_price != null
                    ? `$${flight.data.cheapest_price}`
                    : priceBand
                      ? `$${priceBand.min}–${priceBand.max}`
                      : "—"}
                </p>
                <p className="text-[11px] text-white/55">
                  Round trip from {item.origin_airport ?? "—"}
                </p>
              </div>
              <Button
                size="sm"
                onClick={onRefreshFlights}
                disabled={refreshing}
                className="bg-white/10 text-white hover:bg-white/15"
              >
                {refreshing ? "Refreshing…" : copy.flightBookNow}
              </Button>
            </div>
          </section>
        </>
      ) : null}

      {/* Intelligence */}
      <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 shadow-[0_8px_32px_rgba(0,0,0,0.25)] backdrop-blur-xl">
        <h3 className="mb-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55">
          Intelligence
        </h3>
        <div className="space-y-2">
          {item.type === "travel" ? (
            <IntelRow
              icon={<Sparkles className="h-4 w-4 text-lime-300" />}
              title={copy.detailAiDestinationBrief}
              subtitle="Generate packing list & weather analysis"
              onClick={onOpenDetail}
              accent
            />
          ) : null}
          <IntelRow
            icon={<ListChecks className="h-4 w-4 text-white/75" />}
            title="Break down into steps"
            subtitle="Create a timeline and checklist"
            onClick={onActivate}
          />
          {item.ai_destination_brief || item.ai_trip_plan ? (
            <IntelRow
              icon={<FileText className="h-4 w-4 text-emerald-300" />}
              title="View saved AI materials"
              subtitle="Destination brief & itinerary"
              onClick={onOpenDetail}
            />
          ) : null}
        </div>
      </section>
    </aside>
  );
}

function ActionWell({
  label,
  icon,
  active,
  accent,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  accent?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group/well flex flex-col items-center justify-center gap-1 rounded-xl border px-2 py-3 text-[10px] font-semibold uppercase tracking-[0.08em] transition-colors",
        accent
          ? "border-lime-400/40 bg-lime-400/15 text-lime-300 hover:bg-lime-400/25"
          : active
            ? "border-white/15 bg-white/[0.04] text-white/85 hover:bg-white/[0.08]"
            : "border-white/10 bg-white/[0.02] text-white/55 hover:border-white/20 hover:bg-white/[0.05] hover:text-white/85",
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 place-items-center rounded-lg",
          accent
            ? "bg-lime-300/20 text-lime-300"
            : "bg-white/[0.06] text-current",
        )}
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}

function IntelRow({
  icon,
  title,
  subtitle,
  onClick,
  accent,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors",
        accent
          ? "border-lime-400/30 bg-lime-400/10 hover:bg-lime-400/15"
          : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]",
      )}
    >
      <span
        className={cn(
          "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
          accent ? "bg-lime-300/20" : "bg-white/[0.06]",
        )}
      >
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-white">{title}</span>
        <span className="block text-[11px] text-white/55">{subtitle}</span>
      </span>
    </button>
  );
}
