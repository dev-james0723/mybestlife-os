"use client";

import { Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
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

import type { BucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import {
  getBucketDifficultyLabel,
  getBucketPriorityLabel,
  getBucketTimeHorizonLabel,
  getBucketTypeLabel,
} from "@/lib/bucket-list/presentation";
import { airportCoords } from "@/lib/bucket-list/flight-watch";
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
  type BucketDreamAutofillResult,
  type BucketFieldConfidence,
  type BucketPriority,
  type BucketTimeHorizon,
  type BucketTravelBudgetLevel,
  type BucketTravelStyle,
  type BucketType,
  type CreateBucketItemInput,
} from "@/types/bucket-list";

// ─── Editable draft shape ──────────────────────────────────────────────────────

export type DreamDraftForm = {
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

  // Carried from the AI result for badges / clarifying questions.
  fieldConfidence: Record<string, BucketFieldConfidence>;
  missingFields: string[];
};

/** Build an editable form from a validated AI autofill result. */
export function draftFromAutofill(
  result: BucketDreamAutofillResult,
): DreamDraftForm {
  const travel = result.travel ?? null;
  return {
    title: result.title ?? "",
    description: result.description ?? "",
    why_this_matters: result.why_this_matters ?? "",
    type: result.type,
    priority: result.priority ?? "medium",
    difficulty: result.difficulty ?? "med",
    time_horizon: result.time_horizon ?? "1_3_years",
    estimated_cost:
      typeof result.estimated_cost === "number"
        ? String(result.estimated_cost)
        : "",
    cost_currency: result.cost_currency || "USD",
    cost_band: result.cost_band ?? "$$",
    target_month: result.target_month ?? "",
    category_tags: (result.category_tags ?? []).join(", "),
    quote_inspiration: result.quote_inspiration ?? "",
    notes: result.notes ?? "",

    destination_name: travel?.destination_name ?? "",
    destination_city: travel?.destination_city ?? "",
    destination_country: travel?.destination_country ?? "",
    destination_airport: travel?.destination_airport ?? "",
    origin_airport: travel?.origin_airport ?? "",
    best_season: travel?.best_season ?? "",
    travel_budget_level: travel?.travel_budget_level ?? "mid",
    travel_style: travel?.travel_style ?? "couple",
    trip_length_days:
      typeof travel?.trip_length_days === "number"
        ? String(travel.trip_length_days)
        : "",
    flight_watch_enabled: travel?.flight_watch_enabled ?? false,

    fieldConfidence: result.field_confidence ?? {},
    missingFields: result.missing_fields ?? [],
  };
}

/** Convert the confirmed draft into the repository create input. */
export function draftToCreateInput(form: DreamDraftForm): CreateBucketItemInput {
  const input: CreateBucketItemInput = {
    title: form.title.trim(),
    description: form.description.trim() || null,
    why_this_matters: form.why_this_matters.trim() || null,
    type: form.type,
    priority: form.priority,
    difficulty: form.difficulty,
    time_horizon: form.time_horizon,
    estimated_cost: form.estimated_cost ? Number(form.estimated_cost) : null,
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
    const destCoords = airportCoords(form.destination_airport || null);
    const originCoords = airportCoords(form.origin_airport || null);
    Object.assign(input, {
      destination_name: form.destination_name.trim() || null,
      destination_city: form.destination_city.trim() || null,
      destination_country: form.destination_country.trim() || null,
      destination_airport: form.destination_airport.trim().toUpperCase() || null,
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

  return input;
}

// ─── Confidence badge ──────────────────────────────────────────────────────────

const CONFIDENCE_CLASS: Record<BucketFieldConfidence, string> = {
  high: "border-emerald-400/40 bg-emerald-400/10 text-emerald-600 dark:text-emerald-300",
  medium: "border-amber-400/40 bg-amber-400/10 text-amber-600 dark:text-amber-300",
  low: "border-orange-400/40 bg-orange-400/10 text-orange-600 dark:text-orange-300",
  missing: "border-rose-400/40 bg-rose-400/10 text-rose-600 dark:text-rose-300",
};

function ConfidenceBadge({
  level,
  copy,
}: {
  level: BucketFieldConfidence | undefined;
  copy: BucketListUiCopy;
}) {
  if (!level) return null;
  const label =
    level === "high"
      ? copy.aiConfidenceHigh
      : level === "medium"
        ? copy.aiConfidenceMedium
        : level === "low"
          ? copy.aiConfidenceLow
          : copy.aiConfidenceMissing;
  return (
    <Badge
      variant="outline"
      className={`ml-2 px-1.5 py-0 text-[10px] font-medium ${CONFIDENCE_CLASS[level]}`}
    >
      {label}
    </Badge>
  );
}

// ─── Clarifying questions (Step 7: ask up to 3 focused questions) ───────────────

function deriveQuestions(
  form: DreamDraftForm,
  copy: BucketListUiCopy,
): string[] {
  const missing = new Set(form.missingFields);
  const isMissing = (...fields: string[]) =>
    fields.some((f) => missing.has(f));
  const questions: string[] = [];

  if (isMissing("target_month", "target_date") || !form.target_month) {
    questions.push(copy.aiQuestionWhen);
  }
  if (form.type === "travel") {
    if (isMissing("destination_name", "destination_country") && !form.destination_name) {
      questions.push(copy.aiQuestionDestination);
    }
    if (isMissing("travel_budget_level", "estimated_cost", "cost_band")) {
      questions.push(copy.aiQuestionBudget);
    }
  } else if (isMissing("estimated_cost", "cost_band") && !form.estimated_cost) {
    questions.push(copy.aiQuestionCost);
  }
  if (isMissing("why_this_matters") || !form.why_this_matters.trim()) {
    questions.push(copy.aiQuestionWhy);
  }

  return questions.slice(0, 3);
}

// ─── Component ─────────────────────────────────────────────────────────────────

export function DreamAutofillReview({
  form,
  onChange,
  copy,
}: {
  form: DreamDraftForm;
  onChange: <K extends keyof DreamDraftForm>(
    key: K,
    value: DreamDraftForm[K],
  ) => void;
  copy: BucketListUiCopy;
}) {
  const conf = (field: string) => form.fieldConfidence[field];
  const questions = deriveQuestions(form, copy);

  return (
    <div className="space-y-4">
      {questions.length > 0 ? (
        <div className="rounded-lg border border-lime-400/30 bg-lime-400/5 px-4 py-3">
          <p className="mb-1.5 text-sm font-medium">{copy.aiClarifyTitle}</p>
          <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            {questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="space-y-1">
        <Label className="flex items-center">
          {copy.fieldTitle}
          <ConfidenceBadge level={conf("title")} copy={copy} />
        </Label>
        <Input
          value={form.title}
          onChange={(e) => onChange("title", e.target.value)}
          autoFocus
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="flex items-center">
            {copy.fieldType}
            <ConfidenceBadge level={conf("type")} copy={copy} />
          </Label>
          <Select
            value={form.type}
            onValueChange={(v) => onChange("type", (v as BucketType) ?? "travel")}
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
          <Label className="flex items-center">
            {copy.fieldPriority}
            <ConfidenceBadge level={conf("priority")} copy={copy} />
          </Label>
          <Select
            value={form.priority}
            onValueChange={(v) =>
              onChange("priority", (v as BucketPriority) ?? "medium")
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
        <Label className="flex items-center">
          {copy.fieldWhyMatters}
          <ConfidenceBadge level={conf("why_this_matters")} copy={copy} />
        </Label>
        <Textarea
          value={form.why_this_matters}
          onChange={(e) => onChange("why_this_matters", e.target.value)}
          rows={3}
          placeholder={copy.aiQuestionWhy}
        />
      </div>

      <div className="space-y-1">
        <Label className="flex items-center">
          {copy.fieldDescription}
          <ConfidenceBadge level={conf("description")} copy={copy} />
        </Label>
        <Textarea
          value={form.description}
          onChange={(e) => onChange("description", e.target.value)}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="flex items-center">
            {copy.fieldDifficulty}
            <ConfidenceBadge level={conf("difficulty")} copy={copy} />
          </Label>
          <Select
            value={form.difficulty}
            onValueChange={(v) =>
              onChange("difficulty", (v as BucketDifficulty) ?? "med")
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
          <Label className="flex items-center">
            {copy.fieldTimeHorizon}
            <ConfidenceBadge level={conf("time_horizon")} copy={copy} />
          </Label>
          <Select
            value={form.time_horizon}
            onValueChange={(v) =>
              onChange("time_horizon", (v as BucketTimeHorizon) ?? "1_3_years")
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

      <div className="grid grid-cols-3 gap-3">
        <div className="col-span-2 space-y-1">
          <Label className="flex items-center">
            {copy.fieldEstimatedCost}
            <ConfidenceBadge level={conf("estimated_cost")} copy={copy} />
          </Label>
          <Input
            type="number"
            value={form.estimated_cost}
            onChange={(e) => onChange("estimated_cost", e.target.value)}
            placeholder="4500"
          />
        </div>
        <div className="space-y-1">
          <Label>{copy.fieldCostBand}</Label>
          <Select
            value={form.cost_band}
            onValueChange={(v) =>
              onChange("cost_band", (v as BucketCostBand) ?? "$$")
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

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="flex items-center">
            {copy.fieldTargetMonth}
            <ConfidenceBadge level={conf("target_month")} copy={copy} />
          </Label>
          <Input
            type="month"
            value={form.target_month}
            onChange={(e) => onChange("target_month", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="flex items-center">
            {copy.fieldTags}
            <ConfidenceBadge level={conf("category_tags")} copy={copy} />
          </Label>
          <Input
            value={form.category_tags}
            onChange={(e) => onChange("category_tags", e.target.value)}
            placeholder="nature, winter, solo"
          />
        </div>
      </div>

      {form.type === "travel" ? (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-lime-500" />
            <p className="text-sm font-medium">{copy.detailTravelLogistics}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center">
                {copy.fieldDestinationName}
                <ConfidenceBadge level={conf("destination_name")} copy={copy} />
              </Label>
              <Input
                value={form.destination_name}
                onChange={(e) => onChange("destination_name", e.target.value)}
                placeholder="Iceland"
              />
            </div>
            <div className="space-y-1">
              <Label className="flex items-center">
                {copy.fieldDestinationCountry}
                <ConfidenceBadge
                  level={conf("destination_country")}
                  copy={copy}
                />
              </Label>
              <Input
                value={form.destination_country}
                onChange={(e) =>
                  onChange("destination_country", e.target.value)
                }
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{copy.fieldDestinationAirport}</Label>
              <Input
                value={form.destination_airport}
                onChange={(e) =>
                  onChange(
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
                  onChange(
                    "origin_airport",
                    e.target.value.toUpperCase().slice(0, 3),
                  )
                }
                placeholder="JFK"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="flex items-center">
                {copy.fieldBestSeason}
                <ConfidenceBadge level={conf("best_season")} copy={copy} />
              </Label>
              <Input
                value={form.best_season}
                onChange={(e) => onChange("best_season", e.target.value)}
                placeholder="Sep–Mar"
              />
            </div>
            <div className="space-y-1">
              <Label>{copy.fieldTravelBudget}</Label>
              <Select
                value={form.travel_budget_level}
                onValueChange={(v) =>
                  onChange(
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
                  onChange("travel_style", (v as BucketTravelStyle) ?? "couple")
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

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>{copy.fieldTripLength}</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={form.trip_length_days}
                onChange={(e) => onChange("trip_length_days", e.target.value)}
                placeholder="8"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={form.flight_watch_enabled}
                  onCheckedChange={(v) =>
                    onChange("flight_watch_enabled", v === true)
                  }
                />
                {copy.fieldFlightWatch}
              </label>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
