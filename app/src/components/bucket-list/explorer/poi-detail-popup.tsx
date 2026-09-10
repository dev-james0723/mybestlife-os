"use client";

/**
 * POI detail popup — opens on a card click (store.detailPlaceId). Fetches
 * live Place Details via the proxy and shows photos / rating + reviews /
 * hours / links + a one-click "Add to trip". Rendered OUTSIDE the Canvas.
 *
 * COMPLIANCE: nothing here is persisted — saving stores only place_id +
 * user metadata; the content is always re-fetched live by place_id.
 */

import { useMemo } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Clock,
  ExternalLink,
  Globe,
  MapPin,
  Phone,
  Plus,
  Star,
} from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAppStore } from "@/stores/app-store";
import { getTravelExplorerUiCopy } from "@/lib/i18n/travel-explorer-ui";
import { useTravelExplorerStore } from "@/stores/travel-explorer-store";
import { usePlaceDetails, useSavePlace } from "@/hooks/use-travel-explorer";
import { placePhotoUrl } from "@/lib/travel-explorer/places/client";

export function PoiDetailPopup({ destinationId }: { destinationId: string | null }) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getTravelExplorerUiCopy(language), [language]);
  const detailPlaceId = useTravelExplorerStore((s) => s.detailPlaceId);
  const closeDetail = useTravelExplorerStore((s) => s.closeDetail);
  const { data, isLoading, isError, refetch } = usePlaceDetails(detailPlaceId);
  const savePlace = useSavePlace();

  if (!detailPlaceId) return null;
  const place = data?.place ?? null;

  const onAdd = () => {
    if (!place || !destinationId) return;
    savePlace.mutate({
      destination_id: destinationId,
      provider: "google",
      place_id: place.providerPlaceId,
      display_name: place.name,
      lat: place.lat,
      lng: place.lng,
      category: place.category,
    }, { onSuccess: closeDetail });
  };

  return (
    <Dialog open={Boolean(detailPlaceId)} onOpenChange={(open) => { if (!open) closeDetail(); }}>
      <DialogContent size="lg" className="max-h-[85svh] overflow-y-auto bg-[#101826] text-white">
        <DialogTitle className="sr-only">{place?.name ?? copy.nearbyPlaces}</DialogTitle>
        <DialogDescription className="sr-only">{copy.addToTrip}</DialogDescription>
        {isError && <div role="alert" className="p-6 text-center"><p>{copy.nearbyUnavailable}</p><button type="button" onClick={() => void refetch()} className="mt-3 min-h-11 px-4 underline">{copy.retryLoad}</button></div>}
        {isLoading && (
          <div className="p-12 text-center text-sm text-white/60">…</div>
        )}

        {place && (
          <>
            {place.photoRefs.length > 0 && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={placePhotoUrl(place.photoRefs[0]!, 800)}
                alt=""
                className="h-48 w-full object-cover sm:h-56"
              />
            )}
            <div className="space-y-3 p-5">
              <div>
                <h3 className="text-lg font-semibold">{place.name}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-white/70">
                  {place.rating != null && (
                    <span className="flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current text-amber-300" />
                      {place.rating.toFixed(1)}
                      {place.userRatingCount != null && (
                        <span className="text-white/40"> ({place.userRatingCount})</span>
                      )}
                    </span>
                  )}
                  {place.category && (
                    <span className="capitalize">{place.category.replace(/_/g, " ")}</span>
                  )}
                </div>
              </div>

              <dl className="space-y-1.5 text-sm text-white/80">
                {place.address && <DetailRow icon={MapPin}>{place.address}</DetailRow>}
                {place.openingHours?.[0] && (
                  <DetailRow icon={Clock}>{place.openingHours[0]}</DetailRow>
                )}
                {place.phone && <DetailRow icon={Phone}>{place.phone}</DetailRow>}
              </dl>

              <div className="flex flex-wrap gap-2 pt-1">
                {place.googleMapsUri && (
                  <a data-control-variant="outline"
                    href={place.googleMapsUri}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Google Maps
                  </a>
                )}
                {place.website && (
                  <a data-control-variant="outline"
                    href={place.website}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-1.5 text-xs hover:bg-white/10"
                  >
                    <Globe className="h-3.5 w-3.5" /> Website
                  </a>
                )}
              </div>

              {place.reviews.length > 0 && (
                <div className="space-y-2 border-t border-white/10 pt-3">
                  {place.reviews.slice(0, 2).map((r, i) => (
                    <div key={i} className="text-xs text-white/70">
                      <span className="font-medium text-white/90">{r.author}</span> · ★{r.rating}
                      <p className="mt-0.5 line-clamp-3 text-white/60">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}

              <button data-control-variant="default"
                type="button"
                onClick={onAdd}
                disabled={!destinationId || savePlace.isPending}
                className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#7FE3F0] px-4 py-2.5 text-sm font-semibold text-[#06121f] transition hover:brightness-110 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                {savePlace.isPending ? copy.savingPlace : copy.addToTrip}
              </button>
              <p className="text-center text-[10px] text-white/40">{copy.attribution}</p>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DetailRow({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-white/50" />
      <span>{children}</span>
    </div>
  );
}
