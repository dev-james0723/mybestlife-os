"use client";

import { useMemo, useState } from "react";
import {
  Sparkles,
  Plane,
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
import {
  useGenerateDestinationBrief,
  useGenerateTripPlan,
  useReframeDream,
} from "@/hooks/use-bucket-ai";
import type {
  BucketDestinationBrief,
  BucketItem,
  BucketTripPlan,
} from "@/types/bucket-list";
import {
  bucketStatusBadgeClass,
  bucketTypeBadgeClass,
  estimateBucketProgress,
  getBucketStatusLabel,
  getBucketTypeLabel,
  bucketTargetMonthLabel,
} from "@/lib/bucket-list/presentation";
import { FlightWatchPanel } from "./flight-watch-panel";
import { ReflectionSheet } from "./reflection-sheet";

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

  const generateBrief = useGenerateDestinationBrief();
  const generatePlan = useGenerateTripPlan();
  const reframe = useReframeDream();

  const [editingWhy, setEditingWhy] = useState(false);
  const [whyDraft, setWhyDraft] = useState("");

  const open = Boolean(bucketId);

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
        <DialogContent size="3xl" className="max-h-[90vh] overflow-hidden p-0">
          {/* Hero */}
          <div className="relative">
            <div className="h-36 w-full overflow-hidden">
              {item.cover_image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.cover_image_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-emerald-500/40 via-cyan-400/20 to-lime-300/20" />
              )}
              <div className="absolute inset-0 bg-gradient-to-b from-black/0 via-black/15 to-black/70" />
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

          <div className="max-h-[calc(90vh-14rem)] overflow-y-auto px-6 pb-5">
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
                    onClick={() => markCompleted.mutate(item.id)}
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

              {/* Tabs: Overview / Integrations / Travel / Reflect */}
              <Tabs defaultValue="overview">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="integrations">Integrations</TabsTrigger>
                  {item.type === "travel" ? (
                    <TabsTrigger value="travel">Travel</TabsTrigger>
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

                <TabsContent value="integrations" className="space-y-3 pt-4">
                  <IntegrationList
                    items={integrations.data ?? []}
                    onOpenActivate={() => openActivate(item.id)}
                  />
                </TabsContent>

                {item.type === "travel" ? (
                  <TabsContent value="travel" className="space-y-4 pt-4">
                    <FlightWatchPanel item={item} />

                    <section className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          {copy.detailAiDestinationBrief}
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={generateBrief.isPending}
                          onClick={() => generateBrief.mutate({ bucket: item })}
                        >
                          {generateBrief.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Sparkles className="h-4 w-4" />
                          )}
                          {item.ai_destination_brief ? "Refresh" : "Generate"}
                        </Button>
                      </div>
                      {item.ai_destination_brief ? (
                        <DestinationBriefView brief={item.ai_destination_brief} />
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          Grounded AI research about the destination — best time
                          to go, where to stay, what to eat, must-do
                          experiences.
                        </p>
                      )}
                    </section>

                    <section className="rounded-xl border p-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold">
                          {copy.detailAiTripPlan}
                        </h3>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={generatePlan.isPending}
                          onClick={() => generatePlan.mutate({ bucket: item })}
                        >
                          {generatePlan.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plane className="h-4 w-4" />
                          )}
                          {item.ai_trip_plan ? "Regenerate" : "Draft plan"}
                        </Button>
                      </div>
                      {item.ai_trip_plan ? (
                        <TripPlanView plan={item.ai_trip_plan} />
                      ) : (
                        <p className="mt-2 text-sm text-muted-foreground">
                          A day-by-day itinerary tuned to your travel style and
                          budget.
                        </p>
                      )}
                    </section>
                  </TabsContent>
                ) : null}

                <TabsContent value="reflect" className="space-y-3 pt-4">
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

function DestinationBriefView({ brief }: { brief: BucketDestinationBrief }) {
  return (
    <div className="mt-3 space-y-3 text-sm">
      <p>{brief.overview}</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <BriefList title="Best time" items={[brief.best_time]} />
        <BriefList title="Must-do" items={brief.must_do} />
        <BriefList title="Food" items={brief.food} />
        <BriefList title="Stay" items={brief.stay} />
        <BriefList title="Transport" items={brief.transport} />
        {brief.weather_note ? (
          <BriefList title="Weather" items={[brief.weather_note]} />
        ) : null}
      </div>
      {brief.unverified ? (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-xs text-amber-300">
          Some details couldn&apos;t be verified — double-check before booking.
        </p>
      ) : null}
    </div>
  );
}

function BriefList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-1 text-sm">
        {items.map((it, i) => (
          <li key={`${title}-${i}`} className="leading-snug">
            • {it}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TripPlanView({ plan }: { plan: BucketTripPlan }) {
  return (
    <ol className="mt-3 space-y-3 border-l pl-4">
      {plan.days.map((day) => (
        <li key={day.day} className="relative">
          <span className="absolute -left-[25px] top-1 grid h-5 w-5 place-items-center rounded-full border bg-background text-[10px] font-bold">
            {day.day}
          </span>
          <p className="text-sm font-semibold">
            Day {day.day}: {day.theme}
            {day.anchor ? <span className="text-muted-foreground"> · {day.anchor}</span> : null}
          </p>
          <ul className="mt-1 space-y-0.5 text-sm text-muted-foreground">
            <li>
              <span className="font-medium text-foreground">Morning — </span>
              {day.morning}
            </li>
            <li>
              <span className="font-medium text-foreground">Afternoon — </span>
              {day.afternoon}
            </li>
            <li>
              <span className="font-medium text-foreground">Evening — </span>
              {day.evening}
            </li>
          </ul>
        </li>
      ))}
    </ol>
  );
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
