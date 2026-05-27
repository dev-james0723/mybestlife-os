"use client";

import { useRef, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Upload } from "lucide-react";
import { FieldConfidenceBadge } from "@/components/vault/FieldConfidenceBadge";
import type {
  ConfidenceLevel,
  FieldSource,
  PricingPlan,
  SoftwareAlternative,
} from "@/types/vault-smart-autofill";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getVaultUiCopy } from "@/lib/i18n/vault-ui";
import type { SoftwareVaultEntry } from "@/types/database";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ICON_ACCEPT = {
  "image/png": [".png"],
  "image/jpeg": [".jpg", ".jpeg"],
  "image/webp": [".webp"],
  "image/svg+xml": [".svg"],
  "image/x-icon": [".ico"],
  "image/vnd.microsoft.icon": [".ico"],
  "image/gif": [".gif"],
} as const;

const MAX_ICON_BYTES = 2 * 1024 * 1024;

export type VaultFormState = {
  app_name: string;
  website_url: string;
  icon_url: string;
  category: string;
  platforms: string;
  use_cases: string;
  status: SoftwareVaultEntry["status"];
  priority: SoftwareVaultEntry["priority"];
  cost_type: SoftwareVaultEntry["cost_type"];
  cost_amount: string;
  cost_period: string;
  why_i_use_it: string;
  best_feature: string;
  biggest_downside: string;
  best_alternative: string;
  replaces: string;
  tags: string;
  default_tool_for: string;
  summary: string;
};

export const EMPTY_FORM: VaultFormState = {
  app_name: "",
  website_url: "",
  icon_url: "",
  category: "",
  platforms: "",
  use_cases: "",
  status: "Testing",
  priority: "Nice-to-have",
  cost_type: "Free",
  cost_amount: "",
  cost_period: "",
  why_i_use_it: "",
  best_feature: "",
  biggest_downside: "",
  best_alternative: "",
  replaces: "",
  tags: "",
  default_tool_for: "",
  summary: "",
};

export const statusOptions: { value: SoftwareVaultEntry["status"]; label: string }[] = [
  { value: "Testing", label: "Testing" },
  { value: "Active", label: "Active" },
  { value: "Retired", label: "Retired" },
  { value: "Wishlist", label: "Wishlist" },
];

export const priorityOptions: { value: SoftwareVaultEntry["priority"]; label: string }[] = [
  { value: "Must-have", label: "Must-have" },
  { value: "Nice-to-have", label: "Nice-to-have" },
  { value: "Optional", label: "Optional" },
];

export const costTypeOptions: { value: SoftwareVaultEntry["cost_type"]; label: string }[] = [
  { value: "Free", label: "Free" },
  { value: "Freemium", label: "Freemium" },
  { value: "Paid", label: "Paid" },
  { value: "Subscription", label: "Subscription" },
];

export function entryToForm(e: SoftwareVaultEntry): VaultFormState {
  return {
    app_name: e.app_name,
    website_url: e.website_url ?? "",
    icon_url: e.icon_url ?? "",
    category: e.category ?? "",
    platforms: e.platforms ?? "",
    use_cases: e.use_cases ?? "",
    status: e.status,
    priority: e.priority,
    cost_type: e.cost_type,
    cost_amount: e.cost_amount != null ? String(e.cost_amount) : "",
    cost_period: e.cost_period ?? "",
    why_i_use_it: e.why_i_use_it ?? "",
    best_feature: e.best_feature ?? "",
    biggest_downside: e.biggest_downside ?? "",
    best_alternative: e.best_alternative ?? "",
    replaces: e.replaces ?? "",
    tags: e.tags ?? "",
    default_tool_for: e.default_tool_for ?? "",
    summary: e.summary ?? "",
  };
}

type FieldKey = keyof VaultFormState;

export type VaultFormMetadata = {
  pricing_plans?: PricingPlan[];
  selected_plan_id?: string | null;
  billing_cycle?: string | null;
  cost_currency?: string | null;
  alternative_options?: SoftwareAlternative[];
  field_sources?: FieldSource[];
  field_confidence?: Record<string, ConfidenceLevel>;
};

type Props = {
  form: VaultFormState;
  onChange: (patch: Partial<VaultFormState>) => void;
  aiFields?: Set<string>;
  fieldConfidence?: Record<string, ConfidenceLevel>;
  fieldSources?: FieldSource[];
  alternativeOptions?: SoftwareAlternative[];
  onFieldUserEdit?: (field: keyof VaultFormState) => void;
};

export function VaultEntryForm({
  form,
  onChange,
  aiFields,
  fieldConfidence,
  fieldSources,
  alternativeOptions = [],
  onFieldUserEdit,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = getVaultUiCopy(language);
  const f = copy.form;
  const fields = copy.fields;
  /** When set, image at this exact URL failed to load (clears automatically when URL changes). */
  const [iconFailedForUrl, setIconFailedForUrl] = useState<string | null>(null);
  const [isUploadingIcon, setIsUploadingIcon] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trimmedIconUrl = String(form.icon_url ?? "").trim();
  const iconLoadFailed = iconFailedForUrl !== null && iconFailedForUrl === trimmedIconUrl;
  const appNameFallback = String(form.app_name ?? "").trim();
  const iconInvalidTypeCopy = f.iconInvalidType;
  const iconUploadFailedCopy = f.iconUploadFailed;

  const uploadIconFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error(iconInvalidTypeCopy);
      return;
    }
    if (file.size === 0 || file.size > MAX_ICON_BYTES) {
      toast.error(iconUploadFailedCopy);
      return;
    }
    setIsUploadingIcon(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/vault/icon-upload", { method: "POST", body });
      if (!res.ok) {
        toast.error(iconUploadFailedCopy);
        return;
      }
      const data = (await res.json()) as { icon_url?: string };
      if (data.icon_url) {
        setIconFailedForUrl(null);
        onChange({ icon_url: data.icon_url });
      } else {
        toast.error(iconUploadFailedCopy);
      }
    } catch {
      toast.error(iconUploadFailedCopy);
    } finally {
      setIsUploadingIcon(false);
    }
  };

  const onDropIcon = (accepted: File[]) => {
    const file = accepted[0];
    if (file) void uploadIconFile(file);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropIcon,
    accept: ICON_ACCEPT,
    maxFiles: 1,
    maxSize: MAX_ICON_BYTES,
    noClick: true,
    noKeyboard: true,
    disabled: isUploadingIcon,
  });

  const sourceFor = (key: string) => fieldSources?.find((s) => s.field === key);

  const labelWithBadge = (label: string, key: FieldKey, required?: boolean) => (
    <Label className="flex items-center gap-1.5 flex-wrap">
      {label}
      {required && " *"}
      {fieldConfidence?.[key] ? (
        <FieldConfidenceBadge
          field={key}
          confidence={fieldConfidence[key]}
          source={sourceFor(key)}
        />
      ) : aiFields?.has(key) ? (
        <Sparkles className="h-3 w-3 text-primary" aria-label={f.aiBadge} />
      ) : null}
    </Label>
  );

  const handleFieldChange = (key: FieldKey, value: string) => {
    onChange({ [key]: value } as Partial<VaultFormState>);
    onFieldUserEdit?.(key);
  };

  const input = (
    label: string,
    key: FieldKey,
    placeholder?: string,
    opts?: { type?: string; required?: boolean },
  ) => (
    <div className="space-y-2">
      {labelWithBadge(label, key, opts?.required)}
      <Input
        type={opts?.type}
        value={form[key]}
        onChange={(ev) => handleFieldChange(key, ev.target.value)}
        placeholder={placeholder}
        {...(opts?.type === "number" ? { step: "0.01", min: 0 } : {})}
      />
    </div>
  );

  const textarea = (label: string, key: FieldKey, rows = 2) => (
    <div className="space-y-2">
      {labelWithBadge(label, key)}
      <Textarea
        value={form[key]}
        onChange={(ev) => handleFieldChange(key, ev.target.value)}
        rows={rows}
      />
    </div>
  );

  const select = <V extends string>(
    label: string,
    key: FieldKey,
    options: { value: V; label: string }[],
  ) => (
    <div className="space-y-2">
      {labelWithBadge(label, key)}
      <Select
        value={form[key] as string}
        onValueChange={(v) => {
          if (v !== null) onChange({ [key]: v } as Partial<VaultFormState>);
        }}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div className="space-y-6 pt-2">
      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {f.sectionBasic}
        </p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <div
            {...getRootProps()}
            className="flex shrink-0 flex-col items-center gap-2 sm:items-start"
          >
            <span className="text-xs font-medium text-muted-foreground">{f.iconPreview}</span>
            <div
              className={cn(
                "relative flex h-[72px] w-[72px] items-center justify-center overflow-hidden rounded-xl border border-border bg-muted shadow-sm ring-1 ring-border/60 transition-colors",
                isDragActive && "border-primary bg-primary/5 ring-primary/40",
              )}
            >
              <input {...getInputProps()} />
              {isUploadingIcon ? (
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              ) : trimmedIconUrl && !iconLoadFailed ? (
                // eslint-disable-next-line @next/next/no-img-element -- user-supplied or vault-hosted URL
                <img
                  src={trimmedIconUrl}
                  alt={f.iconPreview}
                  width={72}
                  height={72}
                  className="h-full w-full object-contain p-1"
                  onError={() => setIconFailedForUrl(trimmedIconUrl)}
                />
              ) : (
                <span className="text-2xl font-semibold text-muted-foreground">
                  {(appNameFallback || "?").charAt(0).toUpperCase()}
                </span>
              )}
              {isDragActive && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                  <Upload className="h-5 w-5 text-primary" />
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml,image/x-icon,image/gif"
              className="hidden"
              onChange={(ev) => {
                const file = ev.target.files?.[0];
                if (file) void uploadIconFile(file);
                ev.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8"
              disabled={isUploadingIcon}
              onClick={() => fileInputRef.current?.click()}
            >
              {isUploadingIcon ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="mr-1.5 h-3.5 w-3.5" />
              )}
              {isUploadingIcon ? f.iconUploading : f.changeIcon}
            </Button>
            <p className="max-w-[9rem] text-center text-[11px] leading-snug text-muted-foreground sm:text-left">
              {f.iconUploadHint}
            </p>
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            {input(f.appName, "app_name", f.appNamePh, { required: true })}
          </div>
        </div>
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {input(f.websiteUrl, "website_url", "https://")}
            {input(f.iconUrl, "icon_url", f.iconUrlPh)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {input(fields.category, "category", f.categoryPh)}
            {input(fields.platforms, "platforms", f.platformsPh)}
          </div>
          {textarea(f.summary, "summary", 2)}
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {f.sectionUsage}
        </p>
        <div className="space-y-4">
          {textarea(fields.useCases, "use_cases", 3)}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {select(fields.status, "status", statusOptions)}
            {select(fields.priority, "priority", priorityOptions)}
            {select(f.costType, "cost_type", costTypeOptions)}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {input(f.costAmount, "cost_amount", f.costAmountPh, { type: "number" })}
            {input(f.costPeriod, "cost_period", f.costPeriodPh)}
          </div>
        </div>
      </div>

      <Separator />

      <div>
        <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          {f.sectionOpinion}
        </p>
        <div className="space-y-4">
          {textarea(fields.whyUseIt, "why_i_use_it", 3)}
          {textarea(fields.bestFeature, "best_feature")}
          {textarea(fields.biggestDownside, "biggest_downside")}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              {labelWithBadge(fields.bestAlternative, "best_alternative")}
              {alternativeOptions.length > 1 ? (
                <Select
                  value={form.best_alternative}
                  onValueChange={(v) => {
                    if (v != null) handleFieldChange("best_alternative", v);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={fields.bestAlternative} />
                  </SelectTrigger>
                  <SelectContent>
                    {alternativeOptions.map((alt) => (
                      <SelectItem key={alt.name} value={alt.name}>
                        {alt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              <Input
                value={form.best_alternative}
                onChange={(ev) => handleFieldChange("best_alternative", ev.target.value)}
              />
            </div>
            {input(fields.replaces, "replaces")}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {input(fields.defaultToolFor, "default_tool_for")}
            {input(fields.tags, "tags", f.tagsPh)}
          </div>
        </div>
      </div>
    </div>
  );
}

const VALID_STATUSES: SoftwareVaultEntry["status"][] = [
  "Testing",
  "Active",
  "Retired",
  "Wishlist",
];
const VALID_PRIORITIES: SoftwareVaultEntry["priority"][] = [
  "Must-have",
  "Nice-to-have",
  "Optional",
];
const VALID_COST_TYPES: SoftwareVaultEntry["cost_type"][] = [
  "Free",
  "Freemium",
  "Paid",
  "Subscription",
];

function asString(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (Array.isArray(v)) return v.map((x) => asString(x)).filter(Boolean).join(", ");
  return "";
}

function normalizeStatus(raw: unknown): SoftwareVaultEntry["status"] {
  const s = asString(raw).trim();
  if (VALID_STATUSES.includes(s as SoftwareVaultEntry["status"])) return s as SoftwareVaultEntry["status"];
  const low = s.toLowerCase();
  if (low === "active" || low === "using" || low === "in use") return "Active";
  if (low === "retired" || low === "archived") return "Retired";
  if (low === "wishlist" || low === "wish") return "Wishlist";
  return "Testing";
}

function normalizePriority(raw: unknown): SoftwareVaultEntry["priority"] {
  const s = asString(raw).trim();
  if (VALID_PRIORITIES.includes(s as SoftwareVaultEntry["priority"])) return s as SoftwareVaultEntry["priority"];
  const low = s.toLowerCase();
  if (low === "must-have" || low === "must have" || low === "core" || low === "essential") return "Must-have";
  if (low === "optional" || low === "low") return "Optional";
  return "Nice-to-have";
}

function normalizeCostType(raw: unknown): SoftwareVaultEntry["cost_type"] {
  const s = asString(raw).trim();
  if (VALID_COST_TYPES.includes(s as SoftwareVaultEntry["cost_type"])) return s as SoftwareVaultEntry["cost_type"];
  const low = s.toLowerCase();
  if (low.includes("subscription") || low === "sub") return "Subscription";
  if (low.includes("freemium")) return "Freemium";
  if (low.includes("paid") || low.includes("purchase")) return "Paid";
  if (low.includes("free")) return "Free";
  return "Free";
}

/** Coerce enums + string fields so Postgres CHECK constraints and .trim() never see bad types. */
function normalizeVaultFormEnums(form: VaultFormState): VaultFormState {
  return {
    app_name: asString(form.app_name),
    website_url: asString(form.website_url),
    icon_url: asString(form.icon_url),
    category: asString(form.category),
    platforms: asString(form.platforms),
    use_cases: asString(form.use_cases),
    status: normalizeStatus(form.status),
    priority: normalizePriority(form.priority),
    cost_type: normalizeCostType(form.cost_type),
    cost_amount: asString(form.cost_amount),
    cost_period: asString(form.cost_period),
    why_i_use_it: asString(form.why_i_use_it),
    best_feature: asString(form.best_feature),
    biggest_downside: asString(form.biggest_downside),
    best_alternative: asString(form.best_alternative),
    replaces: asString(form.replaces),
    tags: asString(form.tags),
    default_tool_for: asString(form.default_tool_for),
    summary: asString(form.summary),
  };
}

function trimmed(v: unknown): string {
  return asString(v).trim();
}

/**
 * AI autofill / DB rows may deliver numbers, nulls, or arrays for fields that
 * the form expects as strings. Coerce everything to strings before storing it
 * in VaultFormState so downstream .trim()/.charAt() calls never crash.
 */
export function sanitizeVaultFormPatch(
  patch: Partial<Record<keyof VaultFormState, unknown>>,
): Partial<VaultFormState> {
  const out: Partial<VaultFormState> = {};
  for (const [rawKey, rawValue] of Object.entries(patch)) {
    const key = rawKey as keyof VaultFormState;
    if (rawValue === undefined) continue;
    if (key === "status") {
      out.status = normalizeStatus(asString(rawValue));
    } else if (key === "priority") {
      out.priority = normalizePriority(asString(rawValue));
    } else if (key === "cost_type") {
      out.cost_type = normalizeCostType(asString(rawValue));
    } else {
      (out as Record<string, string>)[key] = asString(rawValue);
    }
  }
  return out;
}

export function buildCreatePayload(
  form: VaultFormState,
  aiFields?: Set<string>,
  metadata?: VaultFormMetadata,
) {
  const f = normalizeVaultFormEnums(form);
  const costAmountStr = asString(f.cost_amount).trim();
  const parsedCost = costAmountStr === "" ? null : Number.parseFloat(costAmountStr);
  const costAmount = parsedCost != null && Number.isFinite(parsedCost) ? parsedCost : null;
  const billing = metadata?.billing_cycle as VaultFormMetadata["billing_cycle"];
  return {
    app_name: trimmed(f.app_name),
    website_url: trimmed(f.website_url) || null,
    icon_url: trimmed(f.icon_url) || null,
    category: trimmed(f.category) || null,
    platforms: trimmed(f.platforms) || null,
    use_cases: trimmed(f.use_cases) || null,
    status: f.status,
    priority: f.priority,
    cost_type: f.cost_type,
    cost_amount: costAmount,
    cost_period: trimmed(f.cost_period) || null,
    cost_currency: metadata?.cost_currency ?? null,
    billing_cycle:
      billing && ["monthly", "annually", "one-time", "usage-based", "unknown"].includes(billing)
        ? (billing as import("@/types/vault-smart-autofill").BillingCycle)
        : null,
    why_i_use_it: trimmed(f.why_i_use_it) || null,
    best_feature: trimmed(f.best_feature) || null,
    biggest_downside: trimmed(f.biggest_downside) || null,
    best_alternative: trimmed(f.best_alternative) || null,
    replaces: trimmed(f.replaces) || null,
    tags: trimmed(f.tags) || null,
    default_tool_for: trimmed(f.default_tool_for) || null,
    summary: trimmed(f.summary) || null,
    ai_generated_fields: aiFields ? Array.from(aiFields) : undefined,
    pricing_plans: metadata?.pricing_plans ?? [],
    selected_plan_id: metadata?.selected_plan_id ?? null,
    alternative_options: metadata?.alternative_options ?? [],
    field_sources: metadata?.field_sources ?? [],
    field_confidence: metadata?.field_confidence ?? {},
    pricing_last_checked_at: new Date().toISOString(),
  };
}
