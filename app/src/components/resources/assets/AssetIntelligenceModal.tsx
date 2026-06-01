"use client";

/**
 * Asset Intelligence Modal — an immersive, AI-native detail view.
 *
 * Top: hero (visual + identity + primary actions) and a snapshot strip.
 * Body: the evidence panel (images + linked documents, with live Document
 * Health) plus, once the user runs an analysis, the AI intelligence sections
 * (Why This Matters, Asset DNA, Hidden Connections, If This Disappeared,
 * Recommendation, Insurance, Maintenance, Activation Plan, Suggested Actions).
 *
 * AI analysis is on-demand and cached server-side, so opening the modal is
 * cheap; the heavy report is only generated when the user asks.
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sparkles,
  Pencil,
  Trash2,
  Star,
  MapPin,
  ImageIcon,
  Package,
  Loader2,
  ShieldCheck,
  Wrench,
  Link2,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  CalendarClock,
  Plus,
  UploadCloud,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { EASE_OUT_EXPO } from "@/lib/animation/easings";
import { useAppStore } from "@/stores/app-store";
import { getAssetIntelUiCopy } from "@/lib/i18n/asset-intelligence-ui";
import { getResourcesUiCopy } from "@/lib/i18n/resources-ui";
import { AssetCategoryPill } from "./AssetCategoryPill";
import { DocumentPickerModal } from "./DocumentPickerModal";
import { useProjects } from "@/hooks/use-projects";
import { useTasks } from "@/hooks/use-tasks";
import { useGoals } from "@/hooks/use-goals";
import { useNotes } from "@/hooks/use-notes";
import { useDocuments } from "@/hooks/use-documents";
import { useAnalyzeAsset } from "@/hooks/use-asset-ai";
import {
  useAssetImages,
  useAssetDocuments,
  useCreateAssetDocument,
  useDeleteAssetDocument,
  useSetPrimaryAssetImage,
  useDeleteAssetImage,
  assetImagesKey,
} from "@/hooks/use-asset-media";
import { computeDocumentHealth } from "@/lib/assets/asset-intelligence-client";
import { buildAssetInsightContext } from "@/lib/assets/asset-insight-context";
import { type Asset, type AssetCategoryKey } from "@/types/assets";
import {
  ASSET_DOCUMENT_ROLES,
  type AssetDocumentRole,
  type AssetIntelligenceReport,
} from "@/types/asset-intelligence";

function formatMoney(value: number | null | undefined): string {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

export type AssetIntelligenceModalProps = {
  asset: Asset | null;
  allAssets: Asset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (asset: Asset) => void;
  onDelete: (asset: Asset) => void;
  onToggleFavorite: (asset: Asset) => void;
  categoryLabel: string | null;
};

export function AssetIntelligenceModal({
  asset,
  allAssets,
  open,
  onOpenChange,
  onEdit,
  onDelete,
  onToggleFavorite,
  categoryLabel,
}: AssetIntelligenceModalProps) {
  const language = useAppStore((s) => s.language);
  const t = getAssetIntelUiCopy(language).modal;
  const resources = getResourcesUiCopy(language);
  const prefersReduced = useReducedMotion();
  const queryClient = useQueryClient();

  const assetId = asset?.id ?? null;
  const { data: images } = useAssetImages(open ? assetId : null);
  const { data: docLinks } = useAssetDocuments(open ? assetId : null);
  const { data: documents } = useDocuments();
  const projects = useProjects();
  const tasks = useTasks();
  const goals = useGoals();
  const notes = useNotes();

  const analyze = useAnalyzeAsset();
  const setPrimary = useSetPrimaryAssetImage(assetId ?? "");
  const deleteImage = useDeleteAssetImage(assetId ?? "");
  const createDocLink = useCreateAssetDocument();
  const deleteDocLink = useDeleteAssetDocument(assetId ?? "");

  const [report, setReport] = useState<AssetIntelligenceReport | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [pendingRole, setPendingRole] = useState<AssetDocumentRole>("receipt");
  const uploadRef = useRef<HTMLInputElement>(null);

  const documentRoles = useMemo(
    () => (docLinks ?? []).map((d) => d.document_role),
    [docLinks],
  );
  const imageTypes = useMemo(
    () => (images ?? []).map((i) => i.image_type),
    [images],
  );

  const liteHealth = useMemo(() => {
    if (!asset) return null;
    return computeDocumentHealth({
      asset,
      documentRoles,
      imageTypes,
    });
  }, [asset, documentRoles, imageTypes]);

  const primaryImage = useMemo(
    () => (images ?? []).find((i) => i.is_primary) ?? (images ?? [])[0] ?? null,
    [images],
  );

  const documentsById = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of documents ?? []) map.set(d.id, d.name);
    return map;
  }, [documents]);

  const handleAnalyze = useCallback(
    async (forceRefresh = false) => {
      if (!asset) return;
      setAnalyzeError(null);
      try {
        const context = buildAssetInsightContext({
          asset,
          allAssets,
          documentRoles,
          imageTypes,
          projects: projects.data ?? [],
          tasks: tasks.data ?? [],
          goals: goals.data ?? [],
          notes: notes.data ?? [],
        });
        const res = await analyze.mutateAsync({
          assetId: asset.id,
          context,
          forceRefresh,
        });
        setReport(res.result);
      } catch {
        setAnalyzeError(t.analyzeError);
      }
    },
    [
      asset,
      allAssets,
      analyze,
      documentRoles,
      imageTypes,
      projects.data,
      tasks.data,
      goals.data,
      notes.data,
      t.analyzeError,
    ],
  );

  const handleUpload = useCallback(
    async (file: File | undefined) => {
      if (!file || !asset || !file.type.startsWith("image/")) return;
      const buf = await file.arrayBuffer();
      let binary = "";
      const bytes = new Uint8Array(buf);
      for (let i = 0; i < bytes.length; i++)
        binary += String.fromCharCode(bytes[i]!);
      const res = await fetch("/api/ai/assets/upload-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: asset.id,
          data: btoa(binary),
          mimeType: file.type,
          imageType: "uploaded_product_photo",
        }),
      }).catch(() => null);
      if (res?.ok) {
        queryClient.invalidateQueries({ queryKey: assetImagesKey(asset.id) });
        queryClient.invalidateQueries({ queryKey: ["asset-images", "primary-all"] });
      }
    },
    [asset, queryClient],
  );

  if (!asset) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          size="5xl"
          className="max-h-[90vh] overflow-y-auto p-0"
        >
          {/* ── Hero ── */}
          <div className="relative grid grid-cols-1 gap-0 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-muted/60 to-muted/20 md:aspect-auto">
              {primaryImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={primaryImage.image_url}
                  alt={asset.name}
                  className="size-full object-cover"
                />
              ) : (
                <div className="flex size-full min-h-[220px] items-center justify-center">
                  <Package className="size-16 text-muted-foreground/30" />
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  {categoryLabel && (
                    <AssetCategoryPill
                      categoryKey={asset.category_key as AssetCategoryKey | null}
                      label={categoryLabel}
                    />
                  )}
                  <h2 className="text-2xl font-bold leading-tight tracking-tight">
                    {asset.name}
                  </h2>
                  {asset.location && (
                    <p className="flex items-center gap-1 text-sm text-muted-foreground">
                      <MapPin className="size-3.5" /> {asset.location}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => onToggleFavorite(asset)}
                  aria-pressed={asset.is_favorite}
                  className="inline-flex size-9 items-center justify-center rounded-full hover:bg-muted"
                >
                  <Star
                    className={cn(
                      "size-5",
                      asset.is_favorite
                        ? "fill-[var(--accent-pink)] text-[var(--accent-pink)]"
                        : "text-muted-foreground",
                    )}
                  />
                </button>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                <Button
                  variant="gradient-pink"
                  onClick={() => handleAnalyze(false)}
                  disabled={analyze.isPending}
                >
                  {analyze.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {t.analyzing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      {report ? t.reanalyze : t.analyze}
                    </>
                  )}
                </Button>
                <Button variant="outline" onClick={() => onEdit(asset)}>
                  <Pencil className="size-4" /> {t.edit}
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => onDelete(asset)}
                >
                  <Trash2 className="size-4" /> {t.delete}
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-6 px-5 pb-6">
            {/* ── Snapshot strip ── */}
            <SnapshotStrip
              t={t}
              asset={asset}
              docHealth={report?.documentHealth.score ?? liteHealth?.score ?? 0}
              recommended={report?.recommendedAction.label ?? null}
              riskLevel={report?.recommendedAction.urgency ?? null}
            />

            {analyzeError && (
              <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                {analyzeError}
              </p>
            )}

            {/* ── Evidence / attachments ── */}
            <EvidencePanel
              t={t}
              resources={resources}
              images={images ?? []}
              docLinks={docLinks ?? []}
              documentsById={documentsById}
              liteHealth={liteHealth}
              onSetPrimary={(id) => setPrimary.mutate(id)}
              onDeleteImage={(id) => deleteImage.mutate(id)}
              onDeleteDocLink={(id) => deleteDocLink.mutate(id)}
              onUploadClick={() => uploadRef.current?.click()}
              onLinkDoc={() => setDocPickerOpen(true)}
              pendingRole={pendingRole}
              setPendingRole={setPendingRole}
            />

            {/* ── AI intelligence sections ── */}
            {report ? (
              <ReportSections t={t} report={report} prefersReduced={prefersReduced} />
            ) : (
              <div className="rounded-2xl border border-dashed border-[var(--accent-pink)]/30 bg-[var(--accent-pink)]/5 p-6 text-center">
                <Sparkles className="mx-auto mb-2 size-7 text-[var(--accent-pink)]" />
                <h3 className="text-base font-semibold">{t.notAnalyzedTitle}</h3>
                <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                  {t.notAnalyzedBody}
                </p>
                <Button
                  variant="gradient-pink"
                  className="mt-4"
                  onClick={() => handleAnalyze(false)}
                  disabled={analyze.isPending}
                >
                  {analyze.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" /> {t.analyzing}
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" /> {t.analyze}
                    </>
                  )}
                </Button>
              </div>
            )}

            <p className="text-center text-[11px] text-muted-foreground">
              {t.estimateDisclaimer}
            </p>
          </div>

          <input
            ref={uploadRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files?.[0])}
          />
        </DialogContent>
      </Dialog>

      <DocumentPickerModal
        open={docPickerOpen}
        onOpenChange={setDocPickerOpen}
        selectedId={null}
        onSelect={(id) => {
          if (id && asset) {
            createDocLink.mutate({
              asset_id: asset.id,
              document_id: id,
              document_role: pendingRole,
            });
          }
          setDocPickerOpen(false);
        }}
      />
    </>
  );
}

// ---------------------------------------------------------------------------

type ModalCopy = ReturnType<typeof getAssetIntelUiCopy>["modal"];

function SnapshotStrip({
  t,
  asset,
  docHealth,
  recommended,
  riskLevel,
}: {
  t: ModalCopy;
  asset: Asset;
  docHealth: number;
  recommended: string | null;
  riskLevel: "low" | "medium" | "high" | null;
}) {
  const items = [
    { label: t.snapshotCurrentValue, value: formatMoney(asset.current_value ?? asset.value) },
    { label: t.snapshotPurchaseValue, value: formatMoney(asset.value) },
    { label: t.snapshotDocHealth, value: `${docHealth}%` },
    {
      label: t.snapshotRisk,
      value: riskLevel ? riskLevel.toUpperCase() : "—",
    },
    { label: t.snapshotRecommended, value: recommended ?? "—" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {items.map((it) => (
        <div
          key={it.label}
          className="rounded-xl border border-border/60 bg-muted/20 p-3"
        >
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {it.label}
          </p>
          <p className="mt-1 truncate text-sm font-semibold">{it.value}</p>
        </div>
      ))}
    </div>
  );
}

function SectionCard({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-card/40 p-5">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        <span className="text-[var(--accent-pink)]">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function EvidencePanel({
  t,
  resources,
  images,
  docLinks,
  documentsById,
  liteHealth,
  onSetPrimary,
  onDeleteImage,
  onDeleteDocLink,
  onUploadClick,
  onLinkDoc,
  pendingRole,
  setPendingRole,
}: {
  t: ModalCopy;
  resources: ReturnType<typeof getResourcesUiCopy>;
  images: { id: string; image_url: string; is_primary: boolean; image_type: string }[];
  docLinks: { id: string; document_id: string; document_role: AssetDocumentRole }[];
  documentsById: Map<string, string>;
  liteHealth: { score: number; missingItems: string[] } | null;
  onSetPrimary: (id: string) => void;
  onDeleteImage: (id: string) => void;
  onDeleteDocLink: (id: string) => void;
  onUploadClick: () => void;
  onLinkDoc: () => void;
  pendingRole: AssetDocumentRole;
  setPendingRole: (r: AssetDocumentRole) => void;
}) {
  return (
    <SectionCard icon={<ImageIcon className="size-4" />} title={t.attachments}>
      <div className="space-y-4">
        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={img.image_url}
                  alt=""
                  className={cn(
                    "size-20 rounded-lg object-cover ring-2 ring-transparent",
                    img.is_primary && "ring-[var(--accent-pink)]",
                  )}
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1 rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                  {!img.is_primary && (
                    <button
                      type="button"
                      onClick={() => onSetPrimary(img.id)}
                      className="rounded-full bg-background/90 p-1"
                      aria-label="Set primary"
                    >
                      <Star className="size-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onDeleteImage(img.id)}
                    className="rounded-full bg-background/90 p-1 text-destructive"
                    aria-label="Delete"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="space-y-2">
          {docLinks.map((d) => (
            <div
              key={d.id}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm"
            >
              <span className="flex items-center gap-2 truncate">
                <Link2 className="size-3.5 text-muted-foreground" />
                <span className="truncate">
                  {documentsById.get(d.document_id) ?? d.document_id}
                </span>
                <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                  {d.document_role}
                </span>
              </span>
              <button
                type="button"
                onClick={() => onDeleteDocLink(d.id)}
                aria-label="Unlink"
              >
                <X className="size-3.5 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" onClick={onUploadClick}>
            <UploadCloud className="size-3.5" /> {t.uploadDocument}
          </Button>
          <div className="flex items-center gap-1">
            <Select
              value={pendingRole}
              onValueChange={(v) => setPendingRole(v as AssetDocumentRole)}
            >
              <SelectTrigger className="h-8 w-[130px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSET_DOCUMENT_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={onLinkDoc}>
              <Plus className="size-3.5" /> {resources.assetForm.linkedDocumentChoose}
            </Button>
          </div>
        </div>

        {liteHealth && liteHealth.missingItems.length > 0 && (
          <p className="text-xs text-muted-foreground">
            {t.missing}: {liteHealth.missingItems.join(", ")}
          </p>
        )}
      </div>
    </SectionCard>
  );
}

function ReportSections({
  t,
  report,
  prefersReduced,
}: {
  t: ModalCopy;
  report: AssetIntelligenceReport;
  prefersReduced: boolean | null;
}) {
  return (
    <div className="space-y-5">
      {report.whyThisAssetMatters && (
        <SectionCard icon={<Lightbulb className="size-4" />} title={t.whyMatters}>
          <p className="text-sm leading-relaxed text-foreground/90">
            {report.whyThisAssetMatters}
          </p>
        </SectionCard>
      )}

      {report.dna.length > 0 && (
        <SectionCard icon={<Sparkles className="size-4" />} title={t.assetDna}>
          <div className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            {report.dna.map((d, i) => (
              <div key={d.key}>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span className="font-medium">{d.label}</span>
                  <span className="text-muted-foreground">{d.score}</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <motion.div
                    className="h-full rounded-full bg-[var(--accent-pink)]"
                    initial={prefersReduced ? false : { width: 0 }}
                    animate={{ width: `${d.score}%` }}
                    transition={{ duration: 0.7, delay: i * 0.04, ease: EASE_OUT_EXPO }}
                  />
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}

      {report.documentHealth && (
        <SectionCard icon={<CheckCircle2 className="size-4" />} title={t.documentHealth}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{report.documentHealth.score}%</span>
            <span className="text-sm text-muted-foreground">
              {report.documentHealth.explanation}
            </span>
          </div>
          {report.documentHealth.missingItems.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t.missing}: {report.documentHealth.missingItems.join(", ")}
            </p>
          )}
        </SectionCard>
      )}

      {report.hiddenConnections.length > 0 && (
        <SectionCard icon={<Link2 className="size-4" />} title={t.hiddenConnections}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {report.hiddenConnections.map((c, i) => (
              <motion.div
                key={i}
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06, ease: EASE_OUT_EXPO }}
                className="rounded-xl border border-border/60 bg-muted/20 p-3"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold">{c.title}</span>
                  <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {c.sourceType}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{c.explanation}</p>
                {c.suggestedAction && (
                  <p className="mt-1.5 text-xs font-medium text-[var(--accent-pink)]">
                    → {c.suggestedAction}
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        </SectionCard>
      )}

      {report.ifDisappearedTomorrow && (
        <motion.div
          initial={prefersReduced ? { opacity: 0 } : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: EASE_OUT_EXPO }}
        >
          <SectionCard icon={<AlertTriangle className="size-4" />} title={t.ifDisappeared}>
            <p className="text-sm leading-relaxed text-foreground/90">
              {report.ifDisappearedTomorrow}
            </p>
          </SectionCard>
        </motion.div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard icon={<CheckCircle2 className="size-4" />} title={t.recommendation}>
          <p className="text-base font-semibold">{report.recommendedAction.label}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {report.recommendedAction.reason}
          </p>
        </SectionCard>

        <SectionCard icon={<ShieldCheck className="size-4" />} title={t.insurance}>
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold">{report.insuranceReadiness.score}%</span>
            <span className="text-sm text-muted-foreground">
              {report.insuranceReadiness.explanation}
            </span>
          </div>
          {report.insuranceReadiness.missingProof.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {t.missing}: {report.insuranceReadiness.missingProof.join(", ")}
            </p>
          )}
        </SectionCard>
      </div>

      {report.maintenanceSuggestions.length > 0 && (
        <SectionCard icon={<Wrench className="size-4" />} title={t.maintenance}>
          <ul className="space-y-2">
            {report.maintenanceSuggestions.map((m, i) => (
              <li key={i} className="text-sm">
                <span className="font-medium">{m.title}</span>
                {m.cadence && (
                  <span className="ml-2 text-xs text-muted-foreground">({m.cadence})</span>
                )}
                <p className="text-xs text-muted-foreground">{m.detail}</p>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      {report.activationPlan && report.activationPlan.days.length > 0 && (
        <SectionCard icon={<CalendarClock className="size-4" />} title={t.activationPlan}>
          <p className="mb-3 text-sm text-muted-foreground">
            {report.activationPlan.goal}
          </p>
          <div className="space-y-2">
            {report.activationPlan.days.map((d, i) => (
              <motion.div
                key={d.day}
                initial={prefersReduced ? { opacity: 0 } : { opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, ease: EASE_OUT_EXPO }}
                className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 px-3 py-2"
              >
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-pink)]/15 text-xs font-semibold text-[var(--accent-pink)]">
                  {d.day}
                </span>
                <div className="text-sm">
                  <p>{d.action}</p>
                  {d.reflectionQuestion && (
                    <p className="mt-0.5 text-xs italic text-muted-foreground">
                      {d.reflectionQuestion}
                    </p>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </SectionCard>
      )}

      {report.personalMeaningInsight && (
        <SectionCard icon={<Lightbulb className="size-4" />} title={t.personalMeaning}>
          <p className="text-sm italic leading-relaxed text-foreground/90">
            {report.personalMeaningInsight}
          </p>
        </SectionCard>
      )}

      {report.suggestedNextActions.length > 0 && (
        <SectionCard icon={<CheckCircle2 className="size-4" />} title={t.suggestedActions}>
          <ul className="space-y-2">
            {report.suggestedNextActions.map((a, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm"
              >
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[var(--accent-pink)]" />
                <span>
                  <span className="font-medium">{a.label}</span>
                  {a.detail && (
                    <span className="block text-xs text-muted-foreground">{a.detail}</span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}
