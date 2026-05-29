"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { searchLocations } from "@/lib/weather/openweather-forecast";
import type { WeatherLocation } from "@/lib/weather/types";
import type { WeatherUiCopy } from "@/lib/i18n/weather-ui";

interface WeatherLocationSearchProps {
  copy: WeatherUiCopy;
  /** Currently selected location label, for the clear button. */
  selectedLabel?: string;
  onSelect: (location: WeatherLocation) => void;
  onClear: () => void;
  onUseMyLocation: () => void;
}

/**
 * Debounced typeahead over `/geo/1.0/direct`. Renders results in a glass
 * popover. No external command-menu lib — keyboard navigation is built in
 * (ArrowUp/Down/Enter/Escape).
 */
export function WeatherLocationSearch({
  copy,
  selectedLabel,
  onSelect,
  onClear,
  onUseMyLocation,
}: WeatherLocationSearchProps) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<WeatherLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLUListElement | null>(null);
  const [menuRect, setMenuRect] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);

  const syncMenuPosition = () => {
    const anchor = wrapperRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setMenuRect({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  };

  useLayoutEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    syncMenuPosition();
    window.addEventListener("resize", syncMenuPosition);
    window.addEventListener("scroll", syncMenuPosition, true);
    return () => {
      window.removeEventListener("resize", syncMenuPosition);
      window.removeEventListener("scroll", syncMenuPosition, true);
    };
  }, [open, results.length, query, error]);

  // Click-outside closes the popover (input + portaled list).
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      const target = e.target as Node;
      if (wrapperRef.current?.contains(target)) return;
      if (listRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // Debounced search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const res = await searchLocations(trimmed);
      if (res.status === "ok") {
        setResults(res.locations);
        setError(res.locations.length === 0 ? copy.searchEmpty : null);
      } else {
        setResults([]);
        setError(copy.searchError);
      }
      setLoading(false);
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, copy.searchEmpty, copy.searchError]);

  const choose = (loc: WeatherLocation) => {
    onSelect(loc);
    setOpen(false);
    setQuery("");
    setResults([]);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => Math.min(results.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter") {
      const loc = results[activeIdx];
      if (loc) {
        e.preventDefault();
        choose(loc);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const showMenu = open && (query.trim().length >= 2 || error);

  return (
    <div ref={wrapperRef} className="relative z-[60] w-full max-w-md">
      <div className="weather-glass-pill flex h-10 w-full items-center gap-2 px-3">
        <Search className="size-4 opacity-70" aria-hidden />
        <input
          id={inputId}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActiveIdx(0);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={copy.searchPlaceholder}
          aria-label={copy.searchPlaceholder}
          aria-expanded={open}
          aria-controls={`${inputId}-listbox`}
          aria-autocomplete="list"
          className="flex-1 bg-transparent text-sm text-[var(--weather-text-primary)] placeholder:text-[var(--weather-text-muted)] focus:outline-none"
        />
        {loading ? (
          <Loader2 className="size-4 animate-spin opacity-70" aria-hidden />
        ) : null}
        {selectedLabel ? (
          <button
            type="button"
            onClick={onClear}
            aria-label={copy.clearSelectedLocation}
            className="text-[var(--weather-text-muted)] hover:text-[var(--weather-text-primary)]"
          >
            <X className="size-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onUseMyLocation}
            aria-label={copy.useMyLocation}
            className="text-[var(--weather-text-muted)] hover:text-[var(--weather-text-primary)]"
          >
            <MapPin className="size-4" />
          </button>
        )}
      </div>

      {showMenu && menuRect && typeof document !== "undefined"
        ? createPortal(
            <div
              className="weather-workspace pointer-events-auto"
              style={{
                position: "fixed",
                top: menuRect.top,
                left: menuRect.left,
                width: menuRect.width,
                zIndex: 100,
              }}
            >
              <ul
                ref={listRef}
                id={`${inputId}-listbox`}
                role="listbox"
                className="weather-glass-dark max-h-72 overflow-y-auto rounded-3xl py-1 text-sm shadow-xl"
              >
              {error && results.length === 0 ? (
                <li
                  className="px-3 py-2 text-[var(--weather-text-muted)]"
                  role="option"
                  aria-selected={false}
                >
                  {error}
                </li>
              ) : null}
              {results.map((loc, idx) => (
                <li
                  key={`${loc.latitude}-${loc.longitude}-${idx}`}
                  role="option"
                  aria-selected={idx === activeIdx}
                >
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => choose(loc)}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 px-3 py-2 text-left",
                      idx === activeIdx
                        ? "bg-white/10 text-[var(--weather-text-primary)]"
                        : "text-[var(--weather-text-secondary)] hover:bg-white/5",
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-medium">{loc.displayLabel}</span>
                      <span className="text-xs text-[var(--weather-text-muted)]">
                        {loc.latitude.toFixed(3)}, {loc.longitude.toFixed(3)}
                      </span>
                    </span>
                    {loc.country ? (
                      <span className="text-[10px] uppercase text-[var(--weather-text-muted)]">
                        {loc.country}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
              </ul>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
