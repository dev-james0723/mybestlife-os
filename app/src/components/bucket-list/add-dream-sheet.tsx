"use client";

import { useMemo, useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";

import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import {
  useCreateBucketItem,
  useBucketSettings,
} from "@/hooks/use-bucket-list";
import {
  BUCKET_COST_BANDS,
  BUCKET_DIFFICULTIES,
  BUCKET_PRIORITIES,
  BUCKET_TIME_HORIZONS,
  BUCKET_TRAVEL_BUDGET_LEVELS,
  BUCKET_TRAVEL_STYLES,
  BUCKET_TYPES,
  type BucketCostBand,
  type BucketDifficulty,
  type BucketPriority,
  type BucketTimeHorizon,
  type BucketTravelBudgetLevel,
  type BucketTravelStyle,
  type BucketType,
  type CreateBucketItemInput,
} from "@/types/bucket-list";
import {
  getBucketDifficultyLabel,
  getBucketPriorityLabel,
  getBucketTimeHorizonLabel,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import { airportCoords } from "@/lib/bucket-list/flight-watch";
import {
  bucketControlSize,
  bucketGlassControl,
  bucketPrimaryControl,
  bucketSheetSurface,
  bucketSheen,
} from "./bucket-glass";

const DEFAULT_FORM: FormState = {
  title: "",
  description: "",
  why_this_matters: "",
  type: "travel",
  priority: "medium",
  difficulty: "med",
  time_horizon: "1_3_years",
  estimated_cost: "",
  cost_currency: "USD",
  cost_band: "$$",
  target_month: "",
  category_tags: "",
  quote_inspiration: "",
  notes: "",

  destination_name: "",
  destination_city: "",
  destination_country: "",
  destination_airport: "",
  origin_airport: "",
  best_season: "",
  travel_budget_level: "mid",
  travel_style: "couple",
  trip_length_days: "",
  flight_watch_enabled: true,
};

type FormState = {
  title: string;
  description: string;
  why_this_matters: string;
  type: BucketType;
  priority: BucketPriority;
  difficulty: BucketDifficulty;
  time_horizon: BucketTimeHorizon;
  estimated_cost: string;
  cost_currency: string;
  cost_band: BucketCostBand;
  target_month: string;
  category_tags: string;
  quote_inspiration: string;
  notes: string;

  destination_name: string;
  destination_city: string;
  destination_country: string;
  destination_airport: string;
  origin_airport: string;
  best_season: string;
  travel_budget_level: BucketTravelBudgetLevel;
  travel_style: BucketTravelStyle;
  trip_length_days: string;
  flight_watch_enabled: boolean;
};

export function AddDreamSheet() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);
  const reduceMotion = useReducedMotion() ?? false;

  const open = useBucketListStore((s) => s.addSheetOpen);
  const closeSheet = useBucketListStore((s) => s.closeAddSheet);
  const preset = useBucketListStore((s) => s.addSheetPreset);

  const createBucket = useCreateBucketItem();
  const settings = useBucketSettings();

  const [mode, setMode] = useState<"quick" | "detailed">("quick");
  // Derive a signature of the "open conditions" so we can reset form state
  // synchronously when the sheet opens without reaching for useEffect.
  const openSignature = useMemo(() => {
    if (!open) return null;
    return JSON.stringify({
      type: preset?.type ?? null,
      title: preset?.title ?? null,
      origin: settings.data?.default_origin_airport ?? null,
      currency: settings.data?.default_currency ?? null,
    });
  }, [open, preset, settings.data]);

  const [lastSignature, setLastSignature] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>({ ...DEFAULT_FORM });

  if (openSignature !== lastSignature) {
    setLastSignature(openSignature);
    if (openSignature !== null) {
      setForm({
        ...DEFAULT_FORM,
        origin_airport: settings.data?.default_origin_airport ?? "",
        cost_currency: settings.data?.default_currency ?? "USD",
        type: preset?.type ?? DEFAULT_FORM.type,
        title: preset?.title ?? "",
      });
      setMode("quick");
    }
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(andOpenDetail: boolean) {
    if (!form.title.trim()) return;

    const destCoords = airportCoords(form.destination_airport || null);
    const originCoords = airportCoords(form.origin_airport || null);

    const input: CreateBucketItemInput = {
      title: form.title.trim(),
      description: form.description.trim() || null,
      why_this_matters: form.why_this_matters.trim() || null,
      type: form.type,
      priority: form.priority,
      difficulty: form.difficulty,
      time_horizon: form.time_horizon,
      estimated_cost: form.estimated_cost
        ? Number(form.estimated_cost)
        : null,
      cost_currency: form.cost_currency || "USD",
      cost_band: form.cost_band,
      target_month: form.target_month || null,
      category_tags: form.category_tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      quote_inspiration: form.quote_inspiration.trim() || null,
      notes: form.notes.trim() || null,
    };

    if (form.type === "travel") {
      Object.assign(input, {
        destination_name: form.destination_name.trim() || null,
        destination_city: form.destination_city.trim() || null,
        destination_country: form.destination_country.trim() || null,
        destination_airport:
          form.destination_airport.trim().toUpperCase() || null,
        origin_airport: form.origin_airport.trim().toUpperCase() || null,
        destination_lat: destCoords?.lat ?? null,
        destination_lng: destCoords?.lng ?? null,
        origin_location: originCoords ? form.origin_airport : null,
        best_season: form.best_season.trim() || null,
        travel_budget_level: form.travel_budget_level,
        travel_style: form.travel_style,
        trip_length_days: form.trip_length_days
          ? Number(form.trip_length_days)
          : null,
        flight_watch_enabled: form.flight_watch_enabled,
      } satisfies Partial<CreateBucketItemInput>);
    }

    const saved = await createBucket.mutateAsync(input);
    closeSheet();

    if (andOpenDetail) {
      useBucketListStore.getState().setSelectedBucketId(saved.id);
    }
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && closeSheet()}>
      <SheetContent
        side="right"
        className={cn(
          "z-[140] flex max-w-xl flex-col gap-0 p-0 sm:max-w-xl",
          "data-[side=right]:w-full sm:data-[side=right]:w-[min(100vw,36rem)]",
          bucketSheetSurface,
        )}
      >
        <SheetHeader className="border-b border-white/10 px-4 pb-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-4">
          <SheetTitle>{copy.addSheetTitle}</SheetTitle>
          <SheetDescription>
            {mode === "quick"
              ? "Save the idea now. Add execution later."
              : "Add enough context to plan it."}
          </SheetDescription>
          <div className={`relative mt-2 flex gap-1 rounded-full p-1 text-xs ${bucketGlassControl} ${bucketSheen}`}>
            <button data-control-variant="outline" data-selected={mode === "quick"}
              type="button"
              onClick={() => setMode("quick")}
              className={`relative isolate flex-1 overflow-hidden rounded-full px-3 py-1.5 font-medium transition-colors active:translate-y-px ${mode === "quick" ? "text-slate-950" : "text-white/58 hover:text-white"}`}
            >
              {mode === "quick" ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "bucket-add-mode-pill"}
                  className="absolute inset-0 -z-10 rounded-full bg-lime-300"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
              Quick
            </button>
            <button data-control-variant="outline" data-selected={mode === "detailed"}
              type="button"
              onClick={() => setMode("detailed")}
              className={`relative isolate flex-1 overflow-hidden rounded-full px-3 py-1.5 font-medium transition-colors active:translate-y-px ${mode === "detailed" ? "text-slate-950" : "text-white/58 hover:text-white"}`}
            >
              {mode === "detailed" ? (
                <motion.span
                  layoutId={reduceMotion ? undefined : "bucket-add-mode-pill"}
                  className="absolute inset-0 -z-10 rounded-full bg-lime-300"
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
              ) : null}
              Detailed
            </button>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>{copy.fieldTitle}</Label>
              <Input
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="What do you dream of?"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>{copy.fieldType}</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    update("type", (v as BucketType) ?? "travel")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKET_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {getBucketTypeLabel(t, copy)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{copy.fieldPriority}</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) =>
                    update("priority", (v as BucketPriority) ?? "medium")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUCKET_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {getBucketPriorityLabel(p, copy)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>{copy.fieldWhyMatters}</Label>
              <Textarea
                value={form.why_this_matters}
                onChange={(e) => update("why_this_matters", e.target.value)}
                placeholder="Why does this dream matter to you?"
                rows={3}
              />
            </div>

            {mode === "detailed" ? (
              <>
                <div className="space-y-1">
                  <Label>{copy.fieldDescription}</Label>
                  <Textarea
                    value={form.description}
                    onChange={(e) => update("description", e.target.value)}
                    placeholder="Describe the shape of it…"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{copy.fieldDifficulty}</Label>
                    <Select
                      value={form.difficulty}
                      onValueChange={(v) =>
                        update("difficulty", (v as BucketDifficulty) ?? "med")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUCKET_DIFFICULTIES.map((d) => (
                          <SelectItem key={d} value={d}>
                            {getBucketDifficultyLabel(d, copy)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>{copy.fieldTimeHorizon}</Label>
                    <Select
                      value={form.time_horizon}
                      onValueChange={(v) =>
                        update(
                          "time_horizon",
                          (v as BucketTimeHorizon) ?? "1_3_years",
                        )
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUCKET_TIME_HORIZONS.map((h) => (
                          <SelectItem key={h} value={h}>
                            {getBucketTimeHorizonLabel(h, copy)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>{copy.fieldEstimatedCost}</Label>
                    <Input
                      type="number"
                      placeholder="4500"
                      value={form.estimated_cost}
                      onChange={(e) =>
                        update("estimated_cost", e.target.value)
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{copy.fieldCostBand}</Label>
                    <Select
                      value={form.cost_band}
                      onValueChange={(v) =>
                        update("cost_band", (v as BucketCostBand) ?? "$$")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {BUCKET_COST_BANDS.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label>{copy.fieldTargetMonth}</Label>
                    <Input
                      type="month"
                      value={form.target_month}
                      onChange={(e) => update("target_month", e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>{copy.fieldTags}</Label>
                    <Input
                      placeholder="nature, winter, solo"
                      value={form.category_tags}
                      onChange={(e) =>
                        update("category_tags", e.target.value)
                      }
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>{copy.fieldInspirationQuote}</Label>
                  <Input
                    value={form.quote_inspiration}
                    onChange={(e) =>
                      update("quote_inspiration", e.target.value)
                    }
                    placeholder="A quote that captures why this matters"
                  />
                </div>

                <div className="space-y-1">
                  <Label>{copy.fieldNotes}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => update("notes", e.target.value)}
                    rows={3}
                  />
                </div>

                {form.type === "travel" ? (
                  <>
                    <Separator />
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-lime-500" />
                      <p className="text-sm font-medium">
                        Travel details
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>{copy.fieldDestinationName}</Label>
                        <Input
                          value={form.destination_name}
                          onChange={(e) =>
                            update("destination_name", e.target.value)
                          }
                          placeholder="Iceland"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{copy.fieldDestinationCity}</Label>
                        <Input
                          value={form.destination_city}
                          onChange={(e) =>
                            update("destination_city", e.target.value)
                          }
                          placeholder="Reykjavík"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>{copy.fieldDestinationAirport}</Label>
                        <Input
                          value={form.destination_airport}
                          onChange={(e) =>
                            update(
                              "destination_airport",
                              e.target.value.toUpperCase().slice(0, 3),
                            )
                          }
                          placeholder="KEF"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{copy.fieldOriginAirport}</Label>
                        <Input
                          value={form.origin_airport}
                          onChange={(e) =>
                            update(
                              "origin_airport",
                              e.target.value.toUpperCase().slice(0, 3),
                            )
                          }
                          placeholder="JFK"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                      <div className="space-y-1">
                        <Label>{copy.fieldBestSeason}</Label>
                        <Input
                          value={form.best_season}
                          onChange={(e) =>
                            update("best_season", e.target.value)
                          }
                          placeholder="Sep–Mar"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>{copy.fieldTravelBudget}</Label>
                        <Select
                          value={form.travel_budget_level}
                          onValueChange={(v) =>
                            update(
                              "travel_budget_level",
                              (v as BucketTravelBudgetLevel) ?? "mid",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUCKET_TRAVEL_BUDGET_LEVELS.map((b) => (
                              <SelectItem key={b} value={b}>
                                {b}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label>{copy.fieldTravelStyle}</Label>
                        <Select
                          value={form.travel_style}
                          onValueChange={(v) =>
                            update(
                              "travel_style",
                              (v as BucketTravelStyle) ?? "couple",
                            )
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {BUCKET_TRAVEL_STYLES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="space-y-1">
                        <Label>{copy.fieldTripLength}</Label>
                        <Input
                          type="number"
                          min={1}
                          max={365}
                          value={form.trip_length_days}
                          onChange={(e) =>
                            update("trip_length_days", e.target.value)
                          }
                          placeholder="8"
                        />
                      </div>
                      <div className="flex items-end pb-1">
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={form.flight_watch_enabled}
                            onCheckedChange={(v) =>
                              update("flight_watch_enabled", v === true)
                            }
                          />
                          {copy.fieldFlightWatch}
                        </label>
                      </div>
                    </div>
                  </>
                ) : null}
              </>
            ) : null}
          </div>
        </div>

        <SheetFooter className="grid grid-cols-1 border-t border-white/10 bg-white/[0.035] px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3 sm:flex sm:flex-row sm:px-6 sm:py-3">
          <SheetClose
            render={
              <Button variant="ghost" size="sm" className={cn(bucketGlassControl, bucketControlSize, "w-full sm:w-auto")}>
                {copy.cancel}
              </Button>
            }
          />
          <Button
            variant="outline"
            size="sm"
            className={cn(bucketGlassControl, bucketControlSize, "w-full sm:w-auto")}
            onClick={() => handleSave(false)}
            disabled={!form.title.trim() || createBucket.isPending}
          >
            {createBucket.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            {copy.saveQuick}
          </Button>
          <Button
            size="sm"
            className={cn(bucketPrimaryControl, bucketControlSize, "w-full sm:w-auto")}
            onClick={() => handleSave(true)}
            disabled={!form.title.trim() || createBucket.isPending}
          >
            {copy.saveDetailed}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
