"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Star,
  Trash2,
  Pencil,
  Save,
  Wand2,
  Calendar as CalendarIcon,
  MapPin,
  FolderOpen,
  Wallet,
  ListChecks,
  BookHeart,
  Images,
  Loader2,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";

import { useAppStore } from "@/stores/app-store";
import { getBucketListUiCopy } from "@/lib/i18n/bucket-list-ui";
import { useBucketListStore } from "@/stores/bucket-list-store";
import {
  useBucketIntegrations,
  useBucketItem,
  useBucketReflections,
  useDeleteBucketItem,
  useMarkBucketCompleted,
  useUpdateBucketItem,
} from "@/hooks/use-bucket-list";
import { useReframeDream } from "@/hooks/use-bucket-ai";
import type { BucketItem } from "@/types/bucket-list";
import {
  bucketStatusBadgeClass,
  bucketTypeBadgeClass,
  estimateBucketProgress,
  getBucketStatusLabel,
  getBucketTypeLabel,
  bucketTargetMonthLabel,
} from "@/lib/bucket-list/presentation";
import { ReflectionSheet } from "./reflection-sheet";
import { useBucketDreamImage } from "@/hooks/use-bucket-dream-image";
import { DreamCoverBackground } from "./dream-cover-background";
import { DreamInspirationGallery } from "./images/dream-inspiration-gallery";
import { DreamIntelligencePanel } from "./intelligence/dream-intelligence-panel";
import { TravelExplorerConsole } from "./travel/travel-explorer-console";
import { DreamMemoryTimeline } from "./memory/dream-memory-timeline";
import { DreamChangedMePanel } from "./memory/dream-changed-me-panel";
import { DreamBeforeAfterReflection } from "./memory/dream-before-after-reflection";
import { DreamMemoryPhotoGallery } from "./memory/dream-memory-photo-gallery";

export function DetailHubDialog() {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getBucketListUiCopy(language), [language]);

  const bucketId = useBucketListStore((s) => s.selectedBucketId);
  const setSelectedBucketId = useBucketListStore((s) => s.setSelectedBucketId);
  const openActivate = useBucketListStore((s) => s.openActivateModal);
  const openReflection = useBucketListStore((s) => s.openReflectionSheet);

  const bucket = useBucketItem(bucketId);
  const integrations = useBucketIntegrations(bucketId);
  const reflections = useBucketReflections(bucketId);

  const updateBucket = useUpdateBucketItem();
  const deleteBucket = useDeleteBucketItem();
  const markCompleted = useMarkBucketCompleted();

  const reframe = useReframeDream();

  const [editingWhy, setEditingWhy] = useState(false);
  const [whyDraft, setWhyDraft] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  const open = Boolean(bucketId);
  const dreamImage = useBucketDreamImage(bucket.data ?? undefined);

  if (!bucket.data) {
    return (
      <Dialog open={open} onOpenChange={(v) => !v && setSelectedBucketId(null)}>
        <DialogContent size="3xl">
          <DialogHeader>
            <DialogTitle>Loading…</DialogTitle>
            <DialogDescription>
              Fetching dream details from your library.
            </DialogDescription>
          </DialogHeader>
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const item = bucket.data;
  const progress = estimateBucketProgress(item);
  const targetLabel = bucketTargetMonthLabel(item);

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && setSelectedBucketId(null)}>
        <DialogContent
          size="3xl"
          className="flex max-h-[min(90dvh,920px)] flex-col gap-0 overflow-hidden p-0"
        >
          {/* Hero */}
          <div className="relative shrink-0">
            <div className="relative h-36 w-full overflow-hidden">
              <DreamCoverBackground
                image={dreamImage}
                type={item.type}
                variant="hero"
              />
              {dreamImage?.sourceType === "generated" ? (
                <span className="absolute left-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-fuchsia-500/90 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur-sm">
                  <Sparkles className="h-3 w-3" />
                  {copy.visualsAiBadge}
                </span>
              ) : null}
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-3 right-3 z-10 h-7 gap-1 bg-black/40 text-white backdrop-blur-sm hover:bg-black/55"
                onClick={() => setActiveTab("visuals")}
              >
                <Images className="h-3.5 w-3.5" />
                {copy.visualsEditGallery}
              </Button>
            </div>
            <div className="px-6 pb-4 pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${bucketTypeBadgeClass(
                    item.type,
                  )}`}
                >
                  {getBucketTypeLabel(item.type, copy)}
                </span>
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] ${bucketStatusBadgeClass(
                    item.status,
                  )}`}
                >
                  {getBucketStatusLabel(item.status, copy)}
                </span>
                {targetLabel ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarIcon className="h-3 w-3" />
                    {targetLabel}
                  </span>
                ) : null}
                {item.destination_country ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {item.destination_city ?? item.destination_country}
                  </span>
                ) : null}
                <Button
                  size="icon-sm"
                  variant={item.is_featured ? "default" : "ghost"}
                  className={item.is_featured ? "ml-auto bg-lime-400 text-black hover:bg-lime-300" : "ml-auto"}
                  onClick={() =>
                    updateBucket.mutate({
                      id: item.id,
                      data: { is_featured: !item.is_featured },
                    })
                  }
                  aria-label="Toggle featured"
                >
                  <Star
                    className={`h-4 w-4 ${item.is_featured ? "fill-current" : ""}`}
                  />
                </Button>
              </div>
              <DialogHeader className="mt-2">
                <DialogTitle className="text-2xl font-semibold leading-tight">
                  {item.title}
                </DialogTitle>
                {item.description ? (
                  <DialogDescription>{item.description}</DialogDescription>
                ) : null}
              </DialogHeader>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-6 pb-5">
            <div className="space-y-5">
              {/* Progress */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Progress</span>
                  <span className="font-medium text-foreground">{progress}%</span>
                </div>
                <Progress value={progress} className="h-1.5" />
              </div>

              {/* Why it matters */}
              <section className="rounded-xl border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold">
                    {copy.detailWhyMatters}
                  </h3>
                  {!editingWhy ? (
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      onClick={() => {
                        setWhyDraft(item.why_this_matters ?? "");
                        setEditingWhy(true);
                      }}
                      aria-label="Edit reason"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>
                {editingWhy ? (
                  <div className="space-y-2">
                    <Textarea
                      value={whyDraft}
                      onChange={(e) => setWhyDraft(e.target.value)}
                      rows={3}
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setEditingWhy(false)}
                      >
                        {copy.cancel}
                      </Button>
                      <Button
                        size="sm"
                        onClick={async () => {
                          await updateBucket.mutateAsync({
                            id: item.id,
                            data: { why_this_matters: whyDraft || null },
                          });
                          setEditingWhy(false);
                        }}
                      >
                        <Save className="h-4 w-4" />
                        {copy.saveEdits}
                      </Button>
                    </div>
                  </div>
                ) : item.why_this_matters ? (
                  <p className="text-sm italic text-muted-foreground">
                    “{item.why_this_matters}”
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Add a one-line reason — it makes this dream much more likely
                    to happen.
                  </p>
                )}
              </section>

              {/* Activate + quick actions */}
              <section className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={() => openActivate(item.id)}
                  className="bg-lime-400 text-black hover:bg-lime-300"
                >
                  <Sparkles className="h-4 w-4" />
                  {copy.detailActivate}
                </Button>
                {item.status !== "completed" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={async () => {
                      await markCompleted.mutateAsync(item.id);
                      // Invite the user to capture the memory right away.
                      openReflection(item.id);
                    }}
                  >
                    <BookHeart className="h-4 w-4" />
                    {copy.detailRealize}
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openReflection(item.id)}
                  >
                    <BookHeart className="h-4 w-4" />
                    {copy.detailReflect}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={reframe.isPending}
                  onClick={() => reframe.mutate({ bucket: item })}
                >
                  <Wand2 className="h-4 w-4" />
                  {copy.detailReframe}
                </Button>
                <div className="flex-1" />
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (
                      typeof window !== "undefined" &&
                      window.confirm(`Delete "${item.title}"?`)
                    ) {
                      deleteBucket.mutate(item.id);
                      setSelectedBucketId(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  {copy.deleteDream}
                </Button>
              </section>

              <Separator />

              {/* Tabs: Overview / Visuals / Integrations / Travel / Reflect */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="intelligence">{copy.intelTab}</TabsTrigger>
                  <TabsTrigger value="visuals">{copy.visualsTab}</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  {item.type === "travel" ? (
                    <TabsTrigger value="travel">{copy.explorerTab}</TabsTrigger>
                  ) : null}
                  <TabsTrigger value="reflect">Memories</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 pt-4">
                  <FactsGrid item={item} />

                  {item.ai_reframe_suggestions ? (
                    <section className="rounded-xl border bg-muted/30 p-4">
                      <h3 className="mb-2 text-sm font-semibold">
                        Smaller versions to try first
                      </h3>
                      <ul className="space-y-2">
                        {item.ai_reframe_suggestions.smaller_versions.map(
                          (v, i) => (
                            <li
                              key={`${v.title}-${i}`}
                              className="rounded-lg border bg-background p-3"
                            >
                              <p className="text-sm font-semibold">{v.title}</p>
                              <p className="mt-1 text-[13px] text-muted-foreground">
                                {v.description}
                              </p>
                              {v.estimated_cost ? (
                                <p className="mt-1 text-[11px] text-muted-foreground">
                                  ≈ {v.estimated_cost} {v.cost_currency ?? ""}
                                </p>
                              ) : null}
                            </li>
                          ),
                        )}
                      </ul>
                    </section>
                  ) : null}
                </TabsContent>

                <TabsContent value="intelligence" className="pt-4">
                  <DreamIntelligencePanel
                    item={item}
                    copy={copy}
                    onActivate={() => openActivate(item.id)}
                    onReflect={() => openReflection(item.id)}
                    onReframe={() => reframe.mutate({ bucket: item })}
                    onNavigateTab={(tab) => setActiveTab(tab)}
                  />
                </TabsContent>

                <TabsContent value="visuals" className="pt-4">
                  <DreamInspirationGallery item={item} copy={copy} />
                </TabsContent>

                <TabsContent value="integrations" className="space-y-3 pt-4">
                  <IntegrationList
                    items={integrations.data ?? []}
                    onOpenActivate={() => openActivate(item.id)}
                  />
                </TabsContent>

                {item.type === "travel" ? (
                  <TabsContent value="travel" className="pt-4">
                    <TravelExplorerConsole
                      item={item}
                      copy={copy}
                      onNavigateTab={(tab) => setActiveTab(tab)}
                    />
                  </TabsContent>
                ) : null}

                <TabsContent value="reflect" className="space-y-4 pt-4">
                  <DreamMemoryTimeline item={item} copy={copy} />

                  {reflections.data?.[0] ? (
                    <>
                      <DreamChangedMePanel
                        reflection={reflections.data[0]}
                        copy={copy}
                      />
                      <DreamBeforeAfterReflection
                        item={item}
                        reflection={reflections.data[0]}
                        copy={copy}
                      />
                      <DreamMemoryPhotoGallery
                        photos={reflections.data.flatMap(
                          (r) => r.photo_gallery ?? [],
                        )}
                        copy={copy}
                      />
                    </>
                  ) : null}

                  <ReflectionsList
                    items={reflections.data ?? []}
                    onWrite={() => openReflection(item.id)}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <ReflectionSheet />
    </>
  );
}

/**
 * The detail hub is the Dream Intelligence Hub — the dialog that surfaces
 * readiness, why-it-matters, blockers, the smallest version, and the next step
 * (Intelligence tab) alongside visuals, integrations, travel, and memories.
 * Exported under both names so callers can use either.
 */
export const DreamIntelligenceDialog = DetailHubDialog;

// ─── Sub-components ──────────────────────────────────────────────────────────

function FactsGrid({ item }: { item: BucketItem }) {
  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl border p-4 text-sm">
      <Fact label="Priority" value={item.priority} />
      <Fact label="Difficulty" value={item.difficulty} />
      <Fact label="Time horizon" value={item.time_horizon ?? "—"} />
      <Fact
        label="Estimated cost"
        value={
          item.estimated_cost
            ? `${item.estimated_cost.toLocaleString()} ${item.cost_currency}`
            : item.cost_band ?? "—"
        }
      />
      {item.type === "travel" ? (
        <>
          <Fact
            label="Destination"
            value={[item.destination_city, item.destination_country]
              .filter(Boolean)
              .join(", ") || "—"}
          />
          <Fact
            label="Airport route"
            value={
              item.origin_airport && item.destination_airport
                ? `${item.origin_airport} → ${item.destination_airport}`
                : "—"
            }
          />
          <Fact label="Best season" value={item.best_season ?? "—"} />
          <Fact label="Trip length" value={item.trip_length_days ? `${item.trip_length_days} days` : "—"} />
        </>
      ) : null}
      <div className="col-span-2">
        <Fact
          label="Tags"
          value={
            item.category_tags.length ? (
              <span className="flex flex-wrap gap-1">
                {item.category_tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </span>
            ) : (
              "—"
            )
          }
        />
      </div>
    </dl>
  );
}

function Fact({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm">{value}</dd>
    </div>
  );
}

function IntegrationList({
  items,
  onOpenActivate,
}: {
  items: { id: string; kind: string; external_label: string | null; external_url: string | null }[];
  onOpenActivate: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm font-medium">Nothing connected yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Use &ldquo;Activate this dream&rdquo; to wire up projects, tasks,
          budgets, and more.
        </p>
        <Button size="sm" className="mt-3" onClick={onOpenActivate}>
          Activate this dream
        </Button>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((integration) => (
        <li
          key={integration.id}
          className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2"
        >
          <span className="grid h-8 w-8 place-items-center rounded-md bg-background text-muted-foreground">
            {iconForKind(integration.kind)}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">
              {integration.external_label ?? integration.kind}
            </p>
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {integration.kind.replace("_", " ")}
            </p>
          </div>
          {integration.external_url ? (
            <a
              href={integration.external_url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-muted-foreground underline-offset-2 hover:underline"
            >
              open
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

function iconForKind(kind: string) {
  switch (kind) {
    case "project":
      return <FolderOpen className="h-4 w-4" />;
    case "task":
      return <ListChecks className="h-4 w-4" />;
    case "budget":
    case "savings_goal":
      return <Wallet className="h-4 w-4" />;
    case "calendar_event":
      return <CalendarIcon className="h-4 w-4" />;
    case "map_marker":
      return <MapPin className="h-4 w-4" />;
    case "journal_entry":
      return <BookHeart className="h-4 w-4" />;
    default:
      return <Sparkles className="h-4 w-4" />;
  }
}

function ReflectionsList({
  items,
  onWrite,
}: {
  items: { id: string; reflection_text: string | null; ai_summary: string | null; mood: string | null; reflected_on: string }[];
  onWrite: () => void;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-6 text-center">
        <p className="text-sm font-medium">No reflections yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          When you complete this dream, write a few words so it becomes a
          memory.
        </p>
        <Button size="sm" className="mt-3" onClick={onWrite}>
          Write a reflection
        </Button>
      </div>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((r) => (
        <li key={r.id} className="rounded-xl border p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              {new Date(r.reflected_on).toLocaleDateString()}
            </p>
            {r.mood ? (
              <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {r.mood}
              </span>
            ) : null}
          </div>
          {r.ai_summary ? (
            <p className="mt-2 text-sm italic text-muted-foreground">
              {r.ai_summary}
            </p>
          ) : null}
          {r.reflection_text ? (
            <p className="mt-2 text-sm leading-relaxed">{r.reflection_text}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
