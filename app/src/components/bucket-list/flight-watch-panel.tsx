"use client";

import { useMemo, useState } from "react";
import { Loader2, Plane, RefreshCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import {
  useLatestFlightQuote,
  useRecordFlightQuote,
  useUpdateBucketItem,
} from "@/hooks/use-bucket-list";
import {
  exploratoryBand,
  getFlightWatchProvider,
} from "@/lib/bucket-list/flight-watch";
import type { BucketItem } from "@/types/bucket-list";

export function FlightWatchPanel({ item }: { item: BucketItem }) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const latest = useLatestFlightQuote(item.id);
  const record = useRecordFlightQuote();
  const updateBucket = useUpdateBucketItem();

  const [busy, setBusy] = useState(false);

  const band = useMemo(() => {
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

  async function handleRefresh() {
    if (!item.origin_airport || !item.destination_airport) return;
    setBusy(true);
    try {
      const provider = getFlightWatchProvider("mock");
      const quote = await provider.quote({
        origin_airport: item.origin_airport,
        destination_airport: item.destination_airport,
        origin_lat: undefined,
        origin_lng: undefined,
        destination_lat: item.destination_lat ?? undefined,
        destination_lng: item.destination_lng ?? undefined,
        depart_date: item.target_date ?? item.target_month ?? null,
        travel_style: item.travel_style,
        currency: item.cost_currency ?? "USD",
      });

      await record.mutateAsync({
        bucket_item_id: item.id,
        provider: quote.provider,
        mode: quote.mode,
        origin_airport: quote.origin_airport,
        destination_airport: quote.destination_airport,
        depart_date: quote.depart_date,
        return_date: quote.return_date,
        currency: quote.currency,
        cheapest_price: quote.cheapest_price,
        fastest_price: quote.fastest_price,
        direct_price: quote.direct_price,
        cheapest_deeplink: quote.cheapest_deeplink,
        raw_payload: quote.raw,
      });

      const isLiveQuote = quote.mode === "live" && quote.provider !== "mock";

      await updateBucket.mutateAsync({
        id: item.id,
        data: {
          latest_live_price: isLiveQuote ? quote.cheapest_price : null,
          latest_live_price_currency: isLiveQuote ? quote.currency : null,
          last_price_check_time: new Date().toISOString(),
          exploratory_price_min:
            item.exploratory_price_min ?? band?.min ?? null,
          exploratory_price_max:
            item.exploratory_price_max ?? band?.max ?? null,
        },
      });
    } finally {
      setBusy(false);
    }
  }

  const quote = latest.data;

  return (
    <section className="rounded-xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold">
          <Plane className="h-4 w-4" />
          {copy.detailFlightWatch}
        </h3>
        <Button
          size="sm"
          variant="outline"
          disabled={busy || !item.origin_airport || !item.destination_airport}
          onClick={handleRefresh}
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCcw className="h-4 w-4" />
          )}
          {copy.flightRefresh}
        </Button>
      </div>

      {!item.origin_airport || !item.destination_airport ? (
        <p className="text-sm text-muted-foreground">
          Set origin and destination airports to track flights.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Metric
              label={copy.flightCheapest}
              value={
                quote?.cheapest_price != null
                  ? formatMoney(quote.cheapest_price, quote.currency)
                  : band
                    ? `${formatMoney(band.min, band.currency)}–${formatMoney(
                        band.max,
                        band.currency,
                      )}`
                    : "—"
              }
              accent
            />
            <Metric
              label={copy.flightFastest}
              value={
                quote?.fastest_price != null
                  ? formatMoney(quote.fastest_price, quote.currency)
                  : "—"
              }
            />
            <Metric
              label={copy.flightDirect}
              value={
                quote?.direct_price != null
                  ? formatMoney(quote.direct_price, quote.currency)
                  : "—"
              }
            />
          </div>

          <Separator className="my-3" />

          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>
              {quote?.provider
                ? `Provider: ${quote.provider}`
                : "Provider: mock"}
              {quote?.mode ? ` · ${quote.mode}` : ""}
            </span>
            <span>
              {quote?.fetched_at
                ? `Last checked ${formatDistanceToNow(
                    new Date(quote.fetched_at),
                  )} ago`
                : "Never checked"}
            </span>
          </div>

          {quote?.provider === "mock" ? (
            <Badge variant="outline" className="mt-2 text-[10px]">
              {copy.flightProviderMock}
            </Badge>
          ) : null}
        </>
      )}
    </section>
  );
}

function Metric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border p-3 ${accent ? "border-lime-400/40 bg-lime-400/10" : "bg-muted/30"}`}
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1 text-lg font-semibold tabular-nums ${accent ? "text-lime-300" : ""}`}
      >
        {value}
      </p>
    </div>
  );
}

function formatMoney(n: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return `${currency} ${n.toLocaleString()}`;
  }
}
