"use client";

import { useMemo } from "react";
import { BookHeart, Loader2, MapPin, Plane, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  useGenerateDestinationBrief,
  useGenerateTripPlan,
} from "@/hooks/use-bucket-ai";
import { airportCoords } from "@/lib/bucket-list/flight-watch";
import { TRAVEL_MAP_STATUS_COLOR } from "@/lib/bucket-list/travel-map-styles";
import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import type { BucketItem } from "@/types/bucket-list";

import { FlightWatchPanel } from "../flight-watch-panel";
import { TravelGoogleMap } from "../travel-google-map";
import type {
  TravelMapMarker,
  TravelMapRoute,
} from "../travel-google-map-inner";
import { DestinationBriefView, TripPlanView } from "./trip-plan-views";
import { TravelReadinessPanel } from "./travel-readiness-panel";
import { TripBuilderPanel } from "./trip-builder-panel";
import { BudgetVersionsPanel } from "./budget-versions-panel";
import { TravelBookingChecklist } from "./travel-booking-checklist";
import { DestinationImageSuggestions } from "./destination-image-suggestions";

/**
 * Travel Explorer Console — the single place to dream, research, map, plan,
 * price-watch and prepare a trip. Composes the existing flight-watch, map,
 * destination-brief and trip-plan features with the new travel-readiness, trip
 * builder, budget versions, booking checklist and image suggestions.
 */
export function TravelExplorerConsole({
  item,
  copy,
  onNavigateTab,
}: {
  item: BucketItem;
  copy: BucketListUiCopy;
  onNavigateTab: (tab: "visuals" | "reflect") => void;
}) {
  const generateBrief = useGenerateDestinationBrief();
  const generatePlan = useGenerateTripPlan();

  const { marker, routes } = useMemo(() => {
    let lat = item.destination_lat;
    let lng = item.destination_lng;
    if ((lat == null || lng == null) && item.destination_airport) {
      const c = airportCoords(item.destination_airport);
      if (c) {
        lat = c.lat;
        lng = c.lng;
      }
    }
    if (lat == null || lng == null) {
      return { marker: null as TravelMapMarker | null, routes: [] as TravelMapRoute[] };
    }
    const m: TravelMapMarker = {
      id: item.id,
      lat,
      lng,
      title: item.destination_name ?? item.title,
      status: item.status,
      color: TRAVEL_MAP_STATUS_COLOR[item.status],
    };
    const origin = item.origin_airport ? airportCoords(item.origin_airport) : null;
    const r: TravelMapRoute[] =
      origin != null
        ? [
            {
              id: `${item.id}-route`,
              from: origin,
              to: { lat, lng },
              completed: item.status === "completed",
            },
          ]
        : [];
    return { marker: m, routes: r };
  }, [item]);

  const destLabel =
    item.destination_city ?? item.destination_name ?? item.destination_country;

  return (
    <div className="space-y-4">
      {/* Destination hero summary */}
      <section className="rounded-xl border p-4">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-cyan-500" />
          {copy.destHeroHeading}
        </h3>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[13px] sm:grid-cols-3">
          <Fact label={copy.fieldDestinationName} value={item.destination_name ?? destLabel ?? "—"} />
          <Fact label={copy.fieldDestinationCountry} value={item.destination_country ?? "—"} />
          <Fact label={copy.destBestSeason} value={item.best_season ?? "—"} />
          <Fact
            label={copy.destTarget}
            value={item.target_month || item.target_date || "—"}
          />
          <Fact
            label={copy.fieldTripLength}
            value={item.trip_length_days ? copy.destTripLength(item.trip_length_days) : "—"}
          />
          <Fact label={copy.fieldTravelBudget} value={item.travel_budget_level ?? "—"} />
        </div>
      </section>

      <TravelReadinessPanel item={item} copy={copy} />

      {/* Map */}
      <section className="rounded-xl border p-4">
        <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold">
          <MapPin className="h-4 w-4 text-emerald-500" />
          {copy.mapHeading}
        </h3>
        {marker ? (
          <div className="overflow-hidden rounded-xl">
            <TravelGoogleMap
              markers={[marker]}
              routes={routes}
              onMarkerClick={() => {}}
              missingKeyMessage={copy.mapMissingKey}
            />
          </div>
        ) : (
          <p className="text-[13px] text-muted-foreground">{copy.mapNeedsAirport}</p>
        )}
      </section>

      {/* Flight watch (already labeled exploratory / mock) */}
      <FlightWatchPanel item={item} />

      {/* Destination brief — Best time, food/stay/transport, must-do wishlist */}
      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{copy.detailAiDestinationBrief}</h3>
          <Button
            size="sm"
            variant="outline"
            disabled={generateBrief.isPending}
            onClick={() => generateBrief.mutate({ bucket: item })}
          >
            {generateBrief.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {item.ai_destination_brief ? copy.explorerRefresh : copy.explorerGenerate}
          </Button>
        </div>
        {item.ai_destination_brief ? (
          <DestinationBriefView brief={item.ai_destination_brief} />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{copy.briefHint}</p>
        )}
      </section>

      {/* Trip builder + the resulting plan */}
      <TripBuilderPanel item={item} copy={copy} />

      <section className="rounded-xl border p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">{copy.detailAiTripPlan}</h3>
          <Button
            size="sm"
            variant="outline"
            disabled={generatePlan.isPending}
            onClick={() => generatePlan.mutate({ bucket: item })}
          >
            {generatePlan.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plane className="h-4 w-4" />
            )}
            {item.ai_trip_plan ? copy.explorerRefresh : copy.explorerGenerate}
          </Button>
        </div>
        {item.ai_trip_plan ? (
          <TripPlanView plan={item.ai_trip_plan} />
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">{copy.tripPlanHint}</p>
        )}
      </section>

      <BudgetVersionsPanel item={item} copy={copy} />

      <TravelBookingChecklist item={item} copy={copy} />

      <DestinationImageSuggestions
        item={item}
        copy={copy}
        onUploadOwn={() => onNavigateTab("visuals")}
      />

      {/* Travel notes */}
      <section className="rounded-xl border p-4">
        <h3 className="text-sm font-semibold">{copy.notesHeading}</h3>
        {item.notes?.trim() ? (
          <p className="mt-1 whitespace-pre-wrap text-[13px] text-muted-foreground">
            {item.notes}
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-muted-foreground">{copy.notesEmpty}</p>
        )}
      </section>

      {/* Travel memory (after completion) */}
      {item.status === "completed" ? (
        <section className="rounded-xl border border-pink-400/30 bg-pink-400/5 p-4">
          <h3 className="flex items-center gap-1.5 text-sm font-semibold">
            <BookHeart className="h-4 w-4 text-pink-500" />
            {copy.travelMemoryHeading}
          </h3>
          <p className="mt-1 text-[13px] text-muted-foreground">{copy.travelMemoryHint}</p>
          <Button
            size="sm"
            variant="outline"
            className="mt-2"
            onClick={() => onNavigateTab("reflect")}
          >
            {copy.travelMemoryView}
          </Button>
        </section>
      ) : null}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="font-medium">{value}</p>
    </div>
  );
}
