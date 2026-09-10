/** Dark roadmap styling for Map Tiles API sessions. */
// Same keyless basemap used by Weather; keep Travel independent of its adapter.
export const TRAVEL_BASEMAP_URL =
  "https://maps.rainviewer.com/styles/m2_dark/256/{z}/{x}/{y}.png";

export const GOOGLE_MAP_TILES_DARK_STYLES = [
  { elementType: "geometry", stylers: [{ color: "#0f172a" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#94a3b8" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#0f172a" }] },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#020617" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "road",
    elementType: "geometry.stroke",
    stylers: [{ color: "#334155" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#1e293b" }],
  },
  {
    featureType: "administrative",
    elementType: "geometry.stroke",
    stylers: [{ color: "#334155" }],
  },
] as const;

export type GoogleMapTilesSession = {
  session: string;
  expiry: string;
  tileWidth: number;
  tileHeight: number;
  imageFormat: string;
};

/** Session creation and browser tile requests must select the same public key. */
export function resolveGoogleMapTilesKey(): string | undefined {
  return (
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_TILES_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    undefined
  );
}

export function googleMapTilesLayerUrl(
  session: string,
  apiKey: string,
): string {
  return `https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(session)}&key=${encodeURIComponent(apiKey)}`;
}
