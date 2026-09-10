/** Missing query values must not become Number(null) = 0 (Gulf of Guinea). */
export function readPlaceCoordinates(params: URLSearchParams): { lat: number; lng: number } | undefined {
  const latitude = params.get("lat")?.trim();
  const longitude = params.get("lng")?.trim();
  if (!latitude || !longitude) return undefined;
  const lat = Number(latitude), lng = Number(longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}
