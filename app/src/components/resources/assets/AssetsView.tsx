"use client";

import { useState, useMemo, useCallback } from "react";
import { PageShell } from "@/components/shared/page-shell";
import { FilterBar, type ViewMode } from "@/components/shared/filter-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePickerInput } from "@/components/ui/date-picker-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Pencil,
  Trash2,
  MapPin,
  Calendar,
  DollarSign,
  FileText,
  Star,
  Link2,
  X,
  Sparkles,
  ShoppingBag,
} from "lucide-react";
import {
  useAssets,
  useCreateAsset,
  useUpdateAsset,
  useDeleteAsset,
  useToggleAssetFavorite,
} from "@/hooks/use-assets";
import { useDocuments } from "@/hooks/use-documents";
import { usePrimaryAssetImages } from "@/hooks/use-asset-media";
import { formatDate } from "@/lib/utils/date";
import type { Document } from "@/types/database";
import {
  ASSET_CATEGORY_KEYS,
  isAssetCategoryKey,
  type Asset,
  type AssetCategoryKey,
} from "@/types/assets";
import { getResourcesUiCopy } from "@/lib/i18n/resources-ui";
import { getAssetIntelUiCopy } from "@/lib/i18n/asset-intelligence-ui";
import { computeDocumentHealth } from "@/lib/assets/asset-intelligence-client";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { AssetCard, type AssetCardBadge } from "./AssetCard";
import { AssetCategoryPill } from "./AssetCategoryPill";
import { AssetsEmptyState } from "./AssetsEmptyState";
import { AssetsLoadingSkeleton } from "./AssetsLoadingSkeleton";
import { DocumentPickerModal } from "./DocumentPickerModal";
import { AssetIntelligenceModal } from "./AssetIntelligenceModal";
import { AssetPageIntelligence } from "./AssetPageIntelligence";
import { PotentialAssetAnalyzer } from "./PotentialAssetAnalyzer";
import { AIAssetCreationWizard } from "./ai/AIAssetCreationWizard";
import {
  CategoryFilterChips,
  ALL_CATEGORIES_VALUE,
  type CategoryChipValue,
} from "./CategoryFilterChips";

const ALL_CATEGORIES = ALL_CATEGORIES_VALUE;
type CategoryFilter = CategoryChipValue;

const sortOptions = [
  { value: "created_at", label: "Recently added" },
  { value: "name", label: "Name" },
  { value: "current_value", label: "Value" },
  { value: "purchase_date", label: "Purchase date" },
];

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

/** Display value preference: current_value > purchase value. */
function displayAssetValue(a: Asset): number | null {
  if (a.current_value != null) return Number(a.current_value);
  if (a.value != null) return Number(a.value);
  return null;
}

type FormState = {
  name: string;
  category_key: AssetCategoryKey | "";
  value: string;
  current_value: string;
  location: string;
  purchase_date: string;
  serial_number: string;
  notes: string;
  document_id: string | null;
};

const EMPTY_FORM: FormState = {
  name: "",
  category_key: "",
  value: "",
  current_value: "",
  location: "",
  purchase_date: "",
  serial_number: "",
  notes: "",
  document_id: null,
};

export function AssetsView() {
  const { data: assets, isLoading } = useAssets();
  const { data: documents } = useDocuments();
  const { data: primaryImages } = usePrimaryAssetImages();
  const createAsset = useCreateAsset();
  const updateAsset = useUpdateAsset();
  const deleteAsset = useDeleteAsset();
  const toggleFavorite = useToggleAssetFavorite();
  const prefersReducedMotion = useReducedMotion();

  const language = useAppStore((s) => s.language);
  const copy = getResourcesUiCopy(language);
  const aiCopy = getAssetIntelUiCopy(language);

  const [showWizard, setShowWizard] = useState(false);
  const [intelAsset, setIntelAsset] = useState<Asset | null>(null);
  const [showPotential, setShowPotential] = useState(false);

  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [categoryFilter, setCategoryFilter] =
    useState<CategoryFilter>(ALL_CATEGORIES);
  const [favoritesOnly, setFavoritesOnly] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [selected, setSelected] = useState<Asset | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Asset | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDocPicker, setShowDocPicker] = useState(false);

  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const resetForm = () => setForm(EMPTY_FORM);

  /** Resolve a category label for a card:
   *  1. Prefer constrained category_key → localized copy
   *  2. Fall back to legacy free-text category
   *  3. Null if neither present */
  const resolveCategoryLabel = useCallback(
    (a: Asset): string | null => {
      if (a.category_key && isAssetCategoryKey(a.category_key)) {
        return copy.categories[a.category_key];
      }
      return a.category ?? null;
    },
    [copy.categories],
  );

  const documentsById = useMemo(() => {
    const map = new Map<string, Document>();
    for (const d of documents ?? []) map.set(d.id, d);
    return map;
  }, [documents]);

  /**
   * Lite, field-derived card metadata for the grid — no per-asset media fetch.
   * Full document health (incl. linked documents/images) is computed in the
   * Intelligence Modal where that asset's media is loaded.
   */
  const buildCardMeta = useCallback(
    (a: Asset): { healthScore: number; badges: AssetCardBadge[] } => {
      const health = computeDocumentHealth({
        asset: a,
        documentRoles: [],
        imageTypes: [],
      });
      const badges: AssetCardBadge[] = [];
      const effectiveValue = a.current_value ?? a.value ?? 0;
      if (effectiveValue >= 1500) {
        badges.push({
          key: "high_value",
          label: aiCopy.page.riskLabels.high_replacement_cost,
          tone: "info",
        });
      }
      if (
        (a.category_key === "electronics" ||
          a.category_key === "vehicle" ||
          a.category_key === "musical_instrument") &&
        !a.serial_number
      ) {
        badges.push({
          key: "missing_serial",
          label: aiCopy.page.riskLabels.missing_serial,
          tone: "warn",
        });
      }
      if (health.score < 40) {
        badges.push({
          key: "low_docs",
          label: aiCopy.page.riskLabels.high_value_low_docs,
          tone: "warn",
        });
      }
      return { healthScore: health.score, badges };
    },
    [aiCopy.page.riskLabels],
  );

  const filtered = useMemo(() => {
    if (!assets) return [];
    let list = [...assets];

    if (categoryFilter !== ALL_CATEGORIES) {
      list = list.filter((a) => a.category_key === categoryFilter);
    }

    if (favoritesOnly) {
      list = list.filter((a) => a.is_favorite);
    }

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.category?.toLowerCase().includes(q) ||
          a.location?.toLowerCase().includes(q) ||
          a.notes?.toLowerCase().includes(q) ||
          a.serial_number?.toLowerCase().includes(q) ||
          (a.category_key != null &&
            copy.categories[a.category_key as AssetCategoryKey]
              ?.toLowerCase()
              .includes(q)),
      );
    }

    list.sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "current_value": {
          const av = displayAssetValue(a) ?? -1;
          const bv = displayAssetValue(b) ?? -1;
          return bv - av;
        }
        case "purchase_date": {
          if (!a.purchase_date) return 1;
          if (!b.purchase_date) return -1;
          return (
            new Date(b.purchase_date).getTime() -
            new Date(a.purchase_date).getTime()
          );
        }
        default:
          return (
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime()
          );
      }
    });
    return list;
  }, [assets, search, sortBy, categoryFilter, favoritesOnly, copy.categories]);

  const openDetail = (a: Asset) => {
    setSelected(a);
    setForm({
      name: a.name,
      category_key:
        a.category_key && isAssetCategoryKey(a.category_key)
          ? a.category_key
          : "",
      value: a.value != null ? String(a.value) : "",
      current_value: a.current_value != null ? String(a.current_value) : "",
      location: a.location ?? "",
      purchase_date: a.purchase_date ?? "",
      serial_number: a.serial_number ?? "",
      notes: a.notes ?? "",
      document_id: a.document_id,
    });
    setIsEditing(false);
  };

  const parseMoney = (raw: string): number | null => {
    const v = raw.trim();
    if (!v) return null;
    const n = Number.parseFloat(v);
    return Number.isFinite(n) ? n : null;
  };

  /**
   * Build create/update payload.
   * Legacy `category` is kept in sync with the localized label derived from
   * `category_key` per the "write both" decision — preserves display in
   * clients that haven't upgraded to read category_key yet.
   */
  const buildPayload = () => {
    const categoryKey =
      form.category_key === "" ? null : form.category_key;
    const categoryLabel = categoryKey ? copy.categories[categoryKey] : null;

    return {
      name: form.name.trim(),
      category: categoryLabel,
      category_key: categoryKey,
      value: parseMoney(form.value),
      current_value: parseMoney(form.current_value),
      location: form.location.trim() || null,
      purchase_date: form.purchase_date || null,
      serial_number: form.serial_number.trim() || null,
      notes: form.notes.trim() || null,
      document_id: form.document_id,
    };
  };

  const handleCreate = async () => {
    if (!form.name.trim()) return;
    await createAsset.mutateAsync(buildPayload());
    resetForm();
    setShowCreate(false);
  };

  const handleUpdate = async () => {
    if (!selected || !form.name.trim()) return;
    await updateAsset.mutateAsync({
      id: selected.id,
      data: buildPayload(),
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    const target = deleteTarget ?? selected;
    if (!target) return;
    await deleteAsset.mutateAsync(target.id);
    setSelected(null);
    setDeleteTarget(null);
    setShowDeleteConfirm(false);
  };

  /** Open the edit form (reusing the detail dialog) from the intelligence modal. */
  const openEditFromIntel = (a: Asset) => {
    openDetail(a);
    setIsEditing(true);
    setIntelAsset(null);
  };

  /** Open the delete confirmation from the intelligence modal. */
  const openDeleteFromIntel = (a: Asset) => {
    setDeleteTarget(a);
    setShowDeleteConfirm(true);
    setIntelAsset(null);
  };

  const handleSortChange = useCallback((value: string) => {
    setSortBy(value);
  }, []);

  const handleCategoryFilterChange = useCallback((value: string | null) => {
    if (value == null) {
      setCategoryFilter(ALL_CATEGORIES);
      return;
    }
    setCategoryFilter(
      value === ALL_CATEGORIES || isAssetCategoryKey(value)
        ? (value as CategoryFilter)
        : ALL_CATEGORIES,
    );
  }, []);

  const handleFormCategoryChange = useCallback((value: string | null) => {
    setForm((f) => ({
      ...f,
      category_key: value != null && isAssetCategoryKey(value) ? value : "",
    }));
  }, []);

  const handleFavoriteToggle = useCallback(
    (id: string, current: boolean) => {
      toggleFavorite.mutate({ id, value: !current });
    },
    [toggleFavorite],
  );

  const hasAssets = (assets?.length ?? 0) > 0;
  const filteredIsEmpty = filtered.length === 0;

  const linkedDocument = form.document_id
    ? documentsById.get(form.document_id)
    : null;
  const selectedLinkedDocument = selected?.document_id
    ? documentsById.get(selected.document_id)
    : null;

  return (
    <>
      <PageShell
        title={copy.assets.title}
        description={copy.assets.subtitle}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setShowPotential(true)}
            >
              <ShoppingBag className="size-4" />
              <span className="hidden sm:inline">{aiCopy.cta.analyzePotential}</span>
            </Button>
            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                resetForm();
                setShowCreate(true);
              }}
            >
              <Plus className="size-4" />
              {aiCopy.cta.addManually}
            </Button>
            <Button
              variant="gradient-pink"
              size="lg"
              onClick={() => setShowWizard(true)}
            >
              <Sparkles className="size-4" />
              {aiCopy.cta.addWithAi}
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-3">
          <FilterBar
            search={{
              placeholder: copy.assets.searchPlaceholder,
              value: search,
              onChange: setSearch,
            }}
            sort={{
              options: sortOptions,
              value: sortBy,
              onChange: handleSortChange,
            }}
            viewModes={["list", "grid"]}
            activeViewMode={viewMode}
            onViewModeChange={setViewMode}
          />

          {/*
           * Responsive category filter:
           *  - Mobile (<sm): Select + separate favorites toggle (chip row
           *    would wrap awkwardly and eat vertical space on narrow widths)
           *  - Desktop (sm+): chip row with all categories + favorites facet
           */}
          <div className="sm:hidden flex items-center gap-2">
            <Select
              value={categoryFilter}
              onValueChange={handleCategoryFilterChange}
            >
              <SelectTrigger
                className="flex-1"
                aria-label={copy.assets.filterCategoryPlaceholder}
              >
                <SelectValue
                  placeholder={copy.assets.filterCategoryPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>
                  {copy.assets.filterAllCategories}
                </SelectItem>
                {ASSET_CATEGORY_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>
                    {copy.categories[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <button
              type="button"
              onClick={() => setFavoritesOnly((v) => !v)}
              aria-pressed={favoritesOnly}
              aria-label={copy.assets.favoritesOnly}
              className={cn(
                "inline-flex size-9 shrink-0 items-center justify-center rounded-full border transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
                favoritesOnly
                  ? "border-[var(--accent-pink)]/50 bg-[var(--accent-pink)]/12 text-[var(--accent-pink)]"
                  : "border-border/70 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
              )}
            >
              <Star
                className={cn(
                  "size-4",
                  favoritesOnly &&
                    "fill-[var(--accent-pink)] text-[var(--accent-pink)]",
                )}
              />
            </button>
          </div>

          <div className="hidden sm:block">
            <CategoryFilterChips
              value={categoryFilter}
              onChange={setCategoryFilter}
              favoritesOnly={favoritesOnly}
              onFavoritesOnlyChange={setFavoritesOnly}
              categoryLabels={copy.categories}
              allLabel={copy.assets.filterAllCategories}
              favoritesLabel={copy.assets.favoritesOnly}
            />
          </div>
        </div>

        {!isLoading && hasAssets && (
          <div className="mt-1">
            <AssetPageIntelligence assets={assets ?? []} />
          </div>
        )}

        {isLoading ? (
          <AssetsLoadingSkeleton />
        ) : filteredIsEmpty ? (
          <AssetsEmptyState
            title={hasAssets ? copy.assets.emptyTitle : aiCopy.empty.title}
            description={
              hasAssets ? copy.assets.emptyDescription : aiCopy.empty.description
            }
            ctaLabel={hasAssets ? undefined : aiCopy.cta.addWithAi}
            onCtaClick={hasAssets ? undefined : () => setShowWizard(true)}
          />
        ) : (
          <motion.div
            // Rekey the grid on filter/sort changes so the stagger plays again
            // — a tiny touch of delight that also makes filter feedback feel
            // snappier without masking real loading.
            key={`${categoryFilter}-${favoritesOnly}-${sortBy}`}
            initial={prefersReducedMotion ? undefined : "hidden"}
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: prefersReducedMotion ? 0 : 0.035,
                  delayChildren: prefersReducedMotion ? 0 : 0.02,
                },
              },
            }}
            className={
              viewMode === "grid"
                ? "grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
                : "space-y-3"
            }
          >
            {filtered.map((a) => {
              const meta = buildCardMeta(a);
              return (
                <AssetCard
                  key={a.id}
                  asset={a}
                  categoryLabel={resolveCategoryLabel(a)}
                  valueText={formatMoney(displayAssetValue(a))}
                  imageUrl={primaryImages?.get(a.id) ?? null}
                  documentHealth={meta.healthScore}
                  badges={meta.badges}
                  valueLabel={copy.assetForm.currentValueLabel}
                  docHealthLabel={aiCopy.modal.snapshotDocHealth}
                  openLabel={aiCopy.modal.analyze}
                  onClick={() => setIntelAsset(a)}
                  onToggleFavorite={() =>
                    handleFavoriteToggle(a.id, a.is_favorite)
                  }
                />
              );
            })}
          </motion.div>
        )}
      </PageShell>

      {/* ── Create Asset Modal ── */}
      <Dialog
        open={showCreate}
        onOpenChange={(open) => {
          if (!open) setShowCreate(false);
          else setShowCreate(true);
        }}
      >
        <DialogContent size="xl" className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{copy.assetForm.newTitle}</DialogTitle>
          </DialogHeader>
          <AssetFormBody
            form={form}
            setForm={setForm}
            onOpenDocPicker={() => setShowDocPicker(true)}
            linkedDocumentName={linkedDocument?.name ?? null}
            onCategoryChange={handleFormCategoryChange}
            copy={copy}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              {copy.assetForm.cancel}
            </Button>
            <Button
              variant="gradient-pink"
              onClick={handleCreate}
              disabled={!form.name.trim() || createAsset.isPending}
            >
              {createAsset.isPending
                ? copy.assetForm.creating
                : copy.assetForm.create}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Asset Detail / Edit Modal ── */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <DialogContent size="2xl" className="max-h-[85vh] overflow-y-auto">
          {selected &&
            (isEditing ? (
              <>
                <DialogHeader>
                  <DialogTitle>{copy.assetForm.editTitle}</DialogTitle>
                </DialogHeader>
                <AssetFormBody
                  form={form}
                  setForm={setForm}
                  onOpenDocPicker={() => setShowDocPicker(true)}
                  linkedDocumentName={linkedDocument?.name ?? null}
                  onCategoryChange={handleFormCategoryChange}
                  copy={copy}
                />
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(false)}
                  >
                    {copy.assetForm.cancel}
                  </Button>
                  <Button
                    variant="gradient-pink"
                    onClick={handleUpdate}
                    disabled={!form.name.trim() || updateAsset.isPending}
                  >
                    {updateAsset.isPending
                      ? copy.assetForm.saving
                      : copy.assetForm.save}
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <>
                <DialogHeader>
                  <div className="flex items-start justify-between gap-4 pr-8">
                    <div className="space-y-2">
                      <DialogTitle className="text-xl">
                        {selected.name}
                      </DialogTitle>
                      {resolveCategoryLabel(selected) && (
                        <div className="flex items-center gap-2">
                          <AssetCategoryPill
                            categoryKey={
                              selected.category_key as
                                | AssetCategoryKey
                                | null
                            }
                            label={resolveCategoryLabel(selected) ?? ""}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleFavoriteToggle(
                          selected.id,
                          selected.is_favorite,
                        )
                      }
                      aria-pressed={selected.is_favorite}
                      aria-label={
                        selected.is_favorite
                          ? "Remove from favorites"
                          : "Mark as favorite"
                      }
                      className={cn(
                        "inline-flex size-9 items-center justify-center rounded-full transition-colors",
                        "hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-pink)]/40",
                      )}
                    >
                      <Star
                        className={cn(
                          "size-5 transition-colors",
                          selected.is_favorite
                            ? "fill-[var(--accent-pink)] text-[var(--accent-pink)]"
                            : "text-muted-foreground",
                        )}
                      />
                    </button>
                  </div>
                </DialogHeader>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                    <DetailRow
                      icon={<DollarSign className="size-4" />}
                      label={copy.assetForm.currentValueLabel}
                      value={formatMoney(displayAssetValue(selected))}
                    />
                    {selected.value != null &&
                      selected.current_value != null &&
                      selected.value !== selected.current_value && (
                        <DetailRow
                          icon={<DollarSign className="size-4" />}
                          label={copy.assetForm.purchaseValueLabel}
                          value={formatMoney(selected.value)}
                        />
                      )}
                    {selected.location && (
                      <DetailRow
                        icon={<MapPin className="size-4" />}
                        label={copy.assetForm.locationLabel}
                        value={selected.location}
                      />
                    )}
                    {selected.purchase_date && (
                      <DetailRow
                        icon={<Calendar className="size-4" />}
                        label={copy.assetForm.purchaseDateLabel}
                        value={formatDate(selected.purchase_date)}
                      />
                    )}
                    {selected.serial_number && (
                      <DetailRow
                        icon={<span className="font-mono text-xs">#</span>}
                        label={copy.assetForm.serialNumberLabel}
                        value={selected.serial_number}
                      />
                    )}
                    <DetailRow
                      icon={<Calendar className="size-4" />}
                      label={copy.assetForm.addedLabel}
                      value={formatDate(selected.created_at)}
                    />
                  </div>

                  {selectedLinkedDocument && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">
                          {copy.assetForm.linkedDocumentLabel}
                        </h4>
                        <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
                          <FileText className="size-4 text-muted-foreground" />
                          <span className="font-medium">
                            {selectedLinkedDocument.name}
                          </span>
                          {selectedLinkedDocument.document_type && (
                            <span className="text-xs text-muted-foreground">
                              · {selectedLinkedDocument.document_type}
                            </span>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {selected.notes && (
                    <>
                      <Separator />
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium">
                          {copy.assetForm.notesLabel}
                        </h4>
                        <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                          {selected.notes}
                        </p>
                      </div>
                    </>
                  )}
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    <Trash2 className="size-4" />
                    {copy.assetForm.delete}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="size-4" />
                    {copy.assetForm.edit}
                  </Button>
                </DialogFooter>
              </>
            ))}
        </DialogContent>
      </Dialog>

      {/* ── Document Picker (scoped by open state; shared between create + edit) ── */}
      <DocumentPickerModal
        open={showDocPicker}
        onOpenChange={setShowDocPicker}
        selectedId={form.document_id}
        onSelect={(id) =>
          setForm((f) => ({ ...f, document_id: id }))
        }
      />

      <AlertDialog
        open={showDeleteConfirm}
        onOpenChange={(open) => {
          setShowDeleteConfirm(open);
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {copy.assetForm.deleteConfirmTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {copy.assetForm.deleteConfirmBody(
                (deleteTarget ?? selected)?.name ?? "",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.assetForm.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {copy.assetForm.delete}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── AI Asset Creation Wizard ── */}
      <AIAssetCreationWizard
        open={showWizard}
        onOpenChange={setShowWizard}
        onCreated={(asset) => setIntelAsset(asset)}
      />

      {/* ── Asset Intelligence Modal ── */}
      <AssetIntelligenceModal
        asset={intelAsset}
        allAssets={assets ?? []}
        open={!!intelAsset}
        onOpenChange={(open) => {
          if (!open) setIntelAsset(null);
        }}
        onEdit={openEditFromIntel}
        onDelete={openDeleteFromIntel}
        onToggleFavorite={(a) => handleFavoriteToggle(a.id, a.is_favorite)}
        categoryLabel={intelAsset ? resolveCategoryLabel(intelAsset) : null}
      />

      {/* ── Potential Asset Analyzer ── */}
      <PotentialAssetAnalyzer
        open={showPotential}
        onOpenChange={setShowPotential}
        assets={assets ?? []}
      />
    </>
  );
}

// -------------------------------------------------------------------------
// Subcomponents
// -------------------------------------------------------------------------

type AssetFormBodyProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  onOpenDocPicker: () => void;
  linkedDocumentName: string | null;
  onCategoryChange: (value: string | null) => void;
  copy: ReturnType<typeof getResourcesUiCopy>;
};

function AssetFormBody({
  form,
  setForm,
  onOpenDocPicker,
  linkedDocumentName,
  onCategoryChange,
  copy,
}: AssetFormBodyProps) {
  return (
    <div className="space-y-4 pt-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{copy.assetForm.nameLabel}</Label>
          <Input
            value={form.name}
            onChange={(e) =>
              setForm((f) => ({ ...f, name: e.target.value }))
            }
            placeholder={copy.assetForm.nameRequiredPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label>{copy.assetForm.categoryLabel}</Label>
          <Select
            value={form.category_key || undefined}
            onValueChange={onCategoryChange}
          >
            <SelectTrigger
              className="w-full"
              aria-label={copy.assetForm.categoryLabel}
            >
              <SelectValue
                placeholder={copy.assetForm.categoryPlaceholder}
              />
            </SelectTrigger>
            <SelectContent>
              {ASSET_CATEGORY_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {copy.categories[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{copy.assetForm.purchaseValueLabel}</Label>
          <Input
            value={form.value}
            onChange={(e) =>
              setForm((f) => ({ ...f, value: e.target.value }))
            }
            placeholder={copy.assetForm.purchaseValuePlaceholder}
            inputMode="decimal"
          />
        </div>
        <div className="space-y-2">
          <Label>{copy.assetForm.currentValueLabel}</Label>
          <Input
            value={form.current_value}
            onChange={(e) =>
              setForm((f) => ({ ...f, current_value: e.target.value }))
            }
            placeholder={copy.assetForm.purchaseValuePlaceholder}
            inputMode="decimal"
          />
          <p className="text-xs text-muted-foreground">
            {copy.assetForm.currentValueHint}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{copy.assetForm.locationLabel}</Label>
          <Input
            value={form.location}
            onChange={(e) =>
              setForm((f) => ({ ...f, location: e.target.value }))
            }
            placeholder={copy.assetForm.locationPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label>{copy.assetForm.purchaseDateLabel}</Label>
          <DatePickerInput
            value={form.purchase_date}
            onChange={(v) =>
              setForm((f) => ({ ...f, purchase_date: v }))
            }
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>{copy.assetForm.serialNumberLabel}</Label>
          <Input
            value={form.serial_number}
            onChange={(e) =>
              setForm((f) => ({ ...f, serial_number: e.target.value }))
            }
            placeholder={copy.assetForm.serialNumberPlaceholder}
          />
        </div>
        <div className="space-y-2">
          <Label>{copy.assetForm.linkedDocumentLabel}</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="default"
              onClick={onOpenDocPicker}
              className="flex-1 justify-start"
            >
              <Link2 className="size-4" />
              <span className="truncate text-left">
                {linkedDocumentName ??
                  (form.document_id
                    ? copy.assetForm.linkedDocumentChange
                    : copy.assetForm.linkedDocumentChoose)}
              </span>
            </Button>
            {form.document_id && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={copy.assetForm.linkedDocumentClear}
                onClick={() =>
                  setForm((f) => ({ ...f, document_id: null }))
                }
              >
                <X className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>{copy.assetForm.notesLabel}</Label>
        <Textarea
          value={form.notes}
          onChange={(e) =>
            setForm((f) => ({ ...f, notes: e.target.value }))
          }
          rows={3}
        />
      </div>
    </div>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <div className="mt-0.5 flex size-4 shrink-0 items-center justify-center text-muted-foreground">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <p className="truncate text-foreground">{value}</p>
      </div>
    </div>
  );
}
