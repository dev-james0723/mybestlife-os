"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, LocateFixed, MapPin, Search } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { WeatherLocation } from "@/lib/weather/types";
import { searchSignalsCities } from "@/lib/signals/location";
import type { SignalsUiCopy } from "@/lib/i18n/signals-ui";

type Props = {
  copy: SignalsUiCopy;
  location: WeatherLocation | null;
  detecting: boolean;
  onDetect: () => void;
  onPick: (loc: WeatherLocation) => void;
};

/** City/region override — reuses the Weather forward-geocoder (honest precision). */
export function SignalsLocationControl({ copy, location, detecting, onDetect, onPick }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    timerRef.current = setTimeout(async () => {
      const found = await searchSignalsCities(q);
      setResults(found.slice(0, 6));
      setSearching(false);
    }, 350);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [query]);

  const label = location?.displayLabel || location?.city || copy.sections.localChangeCity;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <Button variant="outline" size="sm" className="gap-1.5">
            <MapPin className="h-3.5 w-3.5" />
            <span className="max-w-[10rem] truncate">{label}</span>
          </Button>
        }
      />
      <PopoverContent align="end" className="w-80">
        <div className="space-y-2.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2"
            onClick={() => {
              onDetect();
            }}
            disabled={detecting}
          >
            {detecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <LocateFixed className="h-4 w-4" />
            )}
            {copy.consentLabels.useLocation.label}
          </Button>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={copy.sections.localChangeCity}
              className="h-9 pl-8"
              aria-label={copy.sections.localChangeCity}
            />
          </div>

          {searching && (
            <p className="px-1 text-xs text-muted-foreground">
              <Loader2 className="mr-1 inline h-3 w-3 animate-spin" />
              {copy.header.refreshing}
            </p>
          )}

          {results.length > 0 && (
            <ul className="max-h-56 space-y-0.5 overflow-y-auto">
              {results.map((loc, i) => (
                <li key={`${loc.city}-${loc.latitude}-${i}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onPick(loc);
                      setOpen(false);
                      setQuery("");
                      setResults([]);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted/50",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                    )}
                  >
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate">
                      {loc.displayLabel || loc.city}
                      {loc.country ? (
                        <span className="text-muted-foreground">, {loc.country}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="px-1 text-[11px] text-muted-foreground">
            {copy.sections.localPrecisionNote}
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
