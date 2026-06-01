/**
 * Bucket List — Flight Watch provider abstraction.
 *
 * The Detail Hub and Overview "Best travel opportunity" tiles consume a
 * vendor-agnostic interface so a future Skyscanner / Kiwi / Duffel / Amadeus
 * integration only needs to add a new adapter. Today we ship a **mock**
 * adapter (bundled with the app, zero external dependencies) so the UX and
 * data model are fully exercised in dev without keys.
 *
 * Contract:
 *
 *   - `quote()` returns a **provider-agnostic** `FlightWatchQuote` shape.
 *   - `exploratoryBand()` returns a broad price range when the user hasn't
 *     committed to exact dates — exactly what the "Dreaming / Exploring"
 *     statuses need. It's deterministic per (origin, destination, month) so
 *     the same input always renders the same number in the UI.
 *
 * The heuristic below uses great-circle distance to generate believable
 * seed prices. Months in the "high season" for a destination get a +25%
 * uplift. This is intentionally coarse; the goal is a useful estimate, not a
 * real quote. The mock provider must never report `mode: "live"`.
 */

import type {
  BucketFlightProvider,
  BucketItem,
} from "@/types/bucket-list";

// ─── Public shapes ────────────────────────────────────────────────────────────

export type FlightWatchMode = "exploratory" | "live";

export type FlightWatchQuoteInput = {
  origin_airport: string;
  destination_airport: string;
  origin_lat?: number;
  origin_lng?: number;
  destination_lat?: number;
  destination_lng?: number;
  /** YYYY-MM-DD or YYYY-MM (month-only = exploratory). */
  depart_date?: string | null;
  return_date?: string | null;
  travel_style?: BucketItem["travel_style"];
  currency?: string;
};

export type FlightWatchQuote = {
  provider: BucketFlightProvider;
  mode: FlightWatchMode;
  origin_airport: string;
  destination_airport: string;
  depart_date: string | null;
  return_date: string | null;
  currency: string;
  cheapest_price: number | null;
  fastest_price: number | null;
  direct_price: number | null;
  cheapest_deeplink: string | null;
  notes?: string;
  /** Raw provider payload, debugging. */
  raw: Record<string, unknown>;
};

export interface FlightWatchProvider {
  readonly id: BucketFlightProvider;
  readonly displayName: string;
  readonly isConfigured: boolean;

  quote(input: FlightWatchQuoteInput): Promise<FlightWatchQuote>;
}

// ─── Great-circle helpers (Haversine km) ──────────────────────────────────────

const toRad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ─── Static IATA fallback table ───────────────────────────────────────────────
// We ship a small lookup so the mock can still price a trip when the user
// hasn't entered lat/lng for either end. Each airport maps to [lat, lng]. Keep
// this set small — it's only used when the bucket item doesn't carry its own
// coordinates.

const IATA_FALLBACKS: Record<string, [number, number]> = {
  JFK: [40.6413, -73.7781],
  LGA: [40.7769, -73.874],
  EWR: [40.6895, -74.1745],
  LAX: [33.9416, -118.4085],
  SFO: [37.6213, -122.3789],
  ORD: [41.9742, -87.9073],
  DFW: [32.8998, -97.0403],
  SEA: [47.4502, -122.3088],
  BOS: [42.3656, -71.0096],
  MIA: [25.7959, -80.287],
  YYZ: [43.6777, -79.6248],
  LHR: [51.47, -0.4543],
  LGW: [51.1537, -0.1821],
  CDG: [49.0097, 2.5479],
  FRA: [50.0379, 8.5622],
  MUC: [48.3538, 11.7861],
  AMS: [52.3105, 4.7683],
  MAD: [40.4983, -3.5676],
  BCN: [41.2974, 2.0833],
  FCO: [41.8003, 12.2389],
  ZRH: [47.4502, 8.5617],
  KEF: [63.985, -22.6056],
  HND: [35.5494, 139.7798],
  NRT: [35.772, 140.3929],
  ICN: [37.4602, 126.4407],
  HKG: [22.308, 113.9185],
  SIN: [1.3644, 103.9915],
  BKK: [13.6935, 100.7506],
  DXB: [25.2532, 55.3657],
  SYD: [-33.9399, 151.1753],
  AKL: [-37.0082, 174.785],
  GRU: [-23.4356, -46.4731],
  MEX: [19.4361, -99.0719],
  TPE: [25.0797, 121.2342],
};

export function airportCoords(
  iata: string | null | undefined,
): { lat: number; lng: number } | null {
  if (!iata) return null;
  const code = iata.trim().toUpperCase();
  const v = IATA_FALLBACKS[code];
  if (!v) return null;
  return { lat: v[0], lng: v[1] };
}

// ─── Mock provider ────────────────────────────────────────────────────────────

/** Pretty-print `123.45` → `$123` (no cents for these rough estimates). */
function roundPrice(n: number): number {
  return Math.round(n / 5) * 5;
}

function seasonMultiplier(month: number | null): number {
  if (month == null) return 1;
  if (month >= 6 && month <= 8) return 1.25; // Northern summer
  if (month === 12 || month === 1) return 1.2; // Winter holiday
  if (month === 4 || month === 5 || month === 9 || month === 10) return 1.08;
  return 0.92; // shoulder months
}

export class MockFlightWatchProvider implements FlightWatchProvider {
  readonly id: BucketFlightProvider = "mock";
  readonly displayName = "Built-in estimate";
  readonly isConfigured = true;

  async quote(input: FlightWatchQuoteInput): Promise<FlightWatchQuote> {
    const origin =
      input.origin_lat != null && input.origin_lng != null
        ? { lat: input.origin_lat, lng: input.origin_lng }
        : airportCoords(input.origin_airport);
    const destination =
      input.destination_lat != null && input.destination_lng != null
        ? { lat: input.destination_lat, lng: input.destination_lng }
        : airportCoords(input.destination_airport);

    const km = origin && destination ? haversineKm(origin, destination) : 5000;
    const currency = input.currency ?? "USD";

    // Month for season uplift. "2025-11-03" or "2025-11".
    let month: number | null = null;
    if (input.depart_date) {
      const monthPart = input.depart_date.slice(5, 7);
      const m = Number(monthPart);
      if (m >= 1 && m <= 12) month = m;
    }

    const season = seasonMultiplier(month);

    const baseRoundTrip = km < 1500
      ? 140 + km * 0.08
      : km < 6000
        ? 320 + km * 0.09
        : 650 + km * 0.11;

    const basePrice = baseRoundTrip * season;
    const travelStyleBump =
      input.travel_style === "family"
        ? 1.1
        : input.travel_style === "workation"
          ? 1.05
          : 1;

    const cheapest = roundPrice(basePrice * travelStyleBump);
    const fastest = roundPrice(basePrice * 1.35 * travelStyleBump);
    const direct = km > 2000 ? roundPrice(basePrice * 1.2 * travelStyleBump) : cheapest;

    return {
      provider: "mock",
      mode: "exploratory",
      origin_airport: input.origin_airport,
      destination_airport: input.destination_airport,
      depart_date: input.depart_date ?? null,
      return_date: input.return_date ?? null,
      currency,
      cheapest_price: cheapest,
      fastest_price: fastest,
      direct_price: direct,
      cheapest_deeplink: null,
      notes:
        "Built-in estimate — connect a real flight provider for live pricing.",
      raw: {
        km,
        season,
        travel_style: input.travel_style ?? null,
        requested_exact_date: Boolean(
          input.depart_date && input.depart_date.length === 10,
        ),
      },
    };
  }
}

// ─── Exploratory band (broad "vibes" estimate) ────────────────────────────────

/** Return a reasonable price band (min, max) for "Dreaming" / "Exploring". */
export function exploratoryBand(input: FlightWatchQuoteInput): {
  min: number;
  max: number;
  currency: string;
} {
  const origin =
    input.origin_lat != null && input.origin_lng != null
      ? { lat: input.origin_lat, lng: input.origin_lng }
      : airportCoords(input.origin_airport);
  const destination =
    input.destination_lat != null && input.destination_lng != null
      ? { lat: input.destination_lat, lng: input.destination_lng }
      : airportCoords(input.destination_airport);
  const km = origin && destination ? haversineKm(origin, destination) : 5000;

  const lowSeason = seasonMultiplier(null) * 0.9;
  const highSeason = 1.25;

  const base = km < 1500 ? 140 + km * 0.08 : km < 6000 ? 320 + km * 0.09 : 650 + km * 0.11;

  return {
    min: roundPrice(base * lowSeason),
    max: roundPrice(base * highSeason),
    currency: input.currency ?? "USD",
  };
}

// ─── Provider registry ───────────────────────────────────────────────────────

export function getFlightWatchProvider(
  provider: BucketFlightProvider,
): FlightWatchProvider {
  switch (provider) {
    case "mock":
      return new MockFlightWatchProvider();
    case "skyscanner":
    case "kiwi":
    case "duffel":
    case "amadeus":
    case "custom": {
      // Future adapters plug in here. For now return the mock so the UI never
      // breaks when a user picks a provider that hasn't shipped yet.
      const fallback = new MockFlightWatchProvider();
      return {
        id: provider,
        displayName: `${provider} (pending adapter)`,
        isConfigured: false,
        quote: (input) => fallback.quote(input),
      } satisfies FlightWatchProvider;
    }
  }
}
