"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Building2,
  Calendar,
  ExternalLink,
  FileText,
  MapPin,
  MessageCircle,
  Paperclip,
  Plus,
  Trash2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
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
import { LoadingPage } from "@/components/shared/loading-state";
import { useAppStore } from "@/stores/app-store";
import { useLocaleSlug } from "@/hooks/use-locale-slug";
import { withLocalePrefix } from "@/lib/i18n/locale-path";
import { getCareerVaultCopy } from "@/lib/i18n/career-vault-ui";
import {
  useCareerOpportunity,
  useCreateInteraction,
  useDeleteInteraction,
  useDeleteOpportunity,
  useOpportunityAttachedFiles,
  useOpportunityInteractions,
  useSetOpportunityAttachedFiles,
  useSetOpportunityStage,
  useUpdateOpportunity,
} from "@/hooks/use-career-opportunities";
import { downloadVaultFile } from "@/lib/career-vault/bundle-exporter";
import type {
  OpportunityInteractionType,
  OpportunityStage,
} from "@/types/career-vault";
import { STAGE_ORDER } from "./PipelineConstants";
import { VaultFilePicker } from "./VaultFilePicker";

interface OpportunityDetailViewProps {
  opportunityId: string;
}

const INTERACTION_TYPES: OpportunityInteractionType[] = [
  "note",
  "email_sent",
  "email_received",
  "phone_call",
  "interview",
  "offer_received",
  "feedback",
];

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString();
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

export function OpportunityDetailView({
  opportunityId,
}: OpportunityDetailViewProps) {
  const language = useAppStore((s) => s.language);
  const copy = getCareerVaultCopy(language);
  const d = copy.pipeline.detail;
  const localeSlug = useLocaleSlug();
  const router = useRouter();

  const query = useCareerOpportunity(opportunityId);
  const filesQuery = useOpportunityAttachedFiles(query.data);
  const interactionsQuery = useOpportunityInteractions(opportunityId);
  const updateMutation = useUpdateOpportunity();
  const setStageMutation = useSetOpportunityStage();
  const setFilesMutation = useSetOpportunityAttachedFiles();
  const deleteMutation = useDeleteOpportunity();
  const createInteraction = useCreateInteraction();
  const deleteInteraction = useDeleteInteraction(opportunityId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Local edit buffers (flush onBlur to keep UX snappy)
  const [jobDescription, setJobDescription] = useState("");
  const [notes, setNotes] = useState("");
  const [salary, setSalary] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [excitement, setExcitement] = useState("");
  const [match, setMatch] = useState("");
  const [nextActionDate, setNextActionDate] = useState("");

  // Interaction form
  const [iType, setIType] = useState<OpportunityInteractionType>("note");
  const [iContent, setIContent] = useState("");
  const [iWhen, setIWhen] = useState("");

  useEffect(() => {
    const o = query.data;
    if (!o) return;
    setJobDescription(o.job_description ?? "");
    setNotes(o.notes ?? "");
    setSalary(o.salary_range ?? "");
    setContactName(o.contact_name ?? "");
    setContactEmail(o.contact_email ?? "");
    setExcitement(
      o.excitement_score !== null && o.excitement_score !== undefined
        ? String(o.excitement_score)
        : "",
    );
    setMatch(
      o.match_score !== null && o.match_score !== undefined
        ? String(o.match_score)
        : "",
    );
    setNextActionDate(o.next_action_date ? o.next_action_date.slice(0, 10) : "");
  }, [query.data]);

  if (query.isLoading || !query.data) return <LoadingPage />;

  const opportunity = query.data;
  const pipelineHref = withLocalePrefix(localeSlug, "/career/pipeline");

  const save = (updates: Parameters<typeof updateMutation.mutate>[0]["updates"]) =>
    updateMutation.mutate({ id: opportunity.id, updates });

  const saveNumber = (raw: string, field: "excitement_score" | "match_score") => {
    if (!raw.trim()) return save({ [field]: null });
    const n = Number(raw);
    if (Number.isNaN(n) || n < 1 || n > 10) return;
    save({ [field]: n });
  };

  const handleStageChange = (next: OpportunityStage) => {
    if (next === opportunity.stage) return;
    setStageMutation.mutate({ id: opportunity.id, stage: next });
  };

  const handleFilesChange = (ids: string[]) => {
    setFilesMutation.mutate({ id: opportunity.id, fileIds: ids });
  };

  const handleAddInteraction = async () => {
    if (!iContent.trim()) return;
    try {
      await createInteraction.mutateAsync({
        opportunityId: opportunity.id,
        interactionType: iType,
        content: iContent.trim(),
        happenedAt: iWhen ? new Date(iWhen).toISOString() : null,
      });
      toast.success(copy.pipeline.toasts.interactionAdded);
      setIContent("");
      setIWhen("");
    } catch {
      toast.error(copy.pipeline.toasts.updateFailed);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync(opportunity.id);
      router.push(pipelineHref);
    } finally {
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="ghost" size="sm" render={<Link href={pipelineHref} />}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          {copy.pipeline.breadcrumb}
        </Button>
        <span className="text-xs text-muted-foreground">/</span>
        <h1 className="flex-1 truncate text-lg font-semibold sm:text-xl">
          {opportunity.role_title}
        </h1>
        <Button
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => setConfirmDelete(true)}
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {d.deleteBtn}
        </Button>
      </div>

      {/* Overview */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{d.overview}</h2>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3 w-3" /> {opportunity.company_name}
          </span>
          {opportunity.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {opportunity.location}
            </span>
          ) : null}
          {opportunity.applied_date ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" /> {fmtDate(opportunity.applied_date)}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <Label>{copy.pipeline.newModal.stageLabel}</Label>
            <Select
              value={opportunity.stage}
              onValueChange={(v) =>
                v && handleStageChange(v as OpportunityStage)
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((s) => (
                  <SelectItem key={s} value={s}>
                    {copy.pipeline.stages[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{d.excitementLabel}</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={excitement}
              onChange={(e) => setExcitement(e.target.value)}
              onBlur={() => saveNumber(excitement, "excitement_score")}
            />
          </div>
          <div className="space-y-1">
            <Label>{d.matchLabel}</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={match}
              onChange={(e) => setMatch(e.target.value)}
              onBlur={() => saveNumber(match, "match_score")}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>{d.salaryLabel}</Label>
            <Input
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              onBlur={() => save({ salary_range: salary || null })}
            />
          </div>
          <div className="space-y-1">
            <Label>{d.contactLabel}</Label>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                onBlur={() => save({ contact_name: contactName || null })}
                placeholder="Name"
              />
              <Input
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                onBlur={() => save({ contact_email: contactEmail || null })}
                placeholder="Email"
              />
            </div>
          </div>
        </div>

        {opportunity.job_url ? (
          <a
            href={opportunity.job_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {d.jobLink}
          </a>
        ) : null}
      </section>

      {/* Job Description */}
      <section className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{d.jobDescription}</h2>
        <Textarea
          rows={6}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          onBlur={() => save({ job_description: jobDescription || null })}
        />
      </section>

      {/* Attached Files */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex-1 text-sm font-semibold">{d.attachedFiles}</h2>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setPickerOpen(true)}
          >
            <Paperclip className="mr-1 h-3.5 w-3.5" />
            {d.addFromVault}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            render={
              <Link
                href={withLocalePrefix(localeSlug, "/career/vault")}
                target="_blank"
              />
            }
          >
            <Upload className="mr-1 h-3.5 w-3.5" />
            {d.uploadAndAttach}
          </Button>
        </div>

        {(filesQuery.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">{d.noFiles}</p>
        ) : (
          <ul className="divide-y rounded-md border">
            {(filesQuery.data ?? []).map((f) => (
              <li
                key={f.id}
                className="flex items-center gap-3 px-3 py-2 text-xs"
              >
                <FileText className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={withLocalePrefix(localeSlug, `/career/vault/${f.id}`)}
                    className="truncate text-sm font-medium hover:underline"
                  >
                    {f.filename}
                  </Link>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {copy.categories[f.category]}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => downloadVaultFile(f)}
                >
                  {copy.actions.download}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() =>
                    handleFilesChange(
                      opportunity.attached_file_ids.filter((id) => id !== f.id),
                    )
                  }
                >
                  {d.removeFile}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Interactions */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{d.interactions}</h2>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-[140px_1fr_180px_auto]">
          <Select
            value={iType}
            onValueChange={(v) =>
              v && setIType(v as OpportunityInteractionType)
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INTERACTION_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {d.interactionTypes[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={iContent}
            onChange={(e) => setIContent(e.target.value)}
            placeholder={d.interactionContentPlaceholder}
          />
          <Input
            type="datetime-local"
            value={iWhen}
            onChange={(e) => setIWhen(e.target.value)}
            aria-label={d.interactionWhenLabel}
          />
          <Button
            size="sm"
            onClick={handleAddInteraction}
            disabled={!iContent.trim() || createInteraction.isPending}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            {d.interactionSubmit}
          </Button>
        </div>

        {(interactionsQuery.data?.length ?? 0) === 0 ? (
          <p className="text-xs text-muted-foreground">{d.noInteractions}</p>
        ) : (
          <ol className="space-y-2 border-l pl-4">
            {(interactionsQuery.data ?? []).map((i) => (
              <li key={i.id} className="relative">
                <span className="absolute -left-[9px] top-1.5 h-2 w-2 rounded-full bg-primary" />
                <div className="flex items-baseline gap-2">
                  <MessageCircle className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {d.interactionTypes[i.interaction_type]}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    {fmtDateTime(i.happened_at)}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="ml-auto h-5 px-2 text-[10px] text-muted-foreground hover:text-destructive"
                    onClick={() => deleteInteraction.mutate(i.id)}
                  >
                    ×
                  </Button>
                </div>
                <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">
                  {i.content}
                </p>
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* AI Actions (placeholders — wiring beyond phase 4) */}
      <section className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{d.aiActions}</h2>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled>
            <Brain className="mr-1 h-3.5 w-3.5" /> {d.aiAnalyze}
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Brain className="mr-1 h-3.5 w-3.5" /> {d.aiDraft}
          </Button>
          <Button size="sm" variant="outline" disabled>
            <Brain className="mr-1 h-3.5 w-3.5" /> {d.aiPrep}
          </Button>
        </div>
      </section>

      {/* Next Action + Notes */}
      <section className="space-y-3 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{d.nextAction}</h2>
        <div className="space-y-1">
          <Label>{d.nextActionDateLabel}</Label>
          <Input
            type="date"
            value={nextActionDate}
            onChange={(e) => setNextActionDate(e.target.value)}
            onBlur={() =>
              save({
                next_action_date: nextActionDate
                  ? new Date(nextActionDate).toISOString()
                  : null,
              })
            }
          />
        </div>
        <div className="space-y-1">
          <Label>{d.notesLabel}</Label>
          <Textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => save({ notes: notes || null })}
            placeholder={d.notesPlaceholder}
          />
        </div>
      </section>

      {/* Stage timeline */}
      <section className="space-y-2 rounded-xl border bg-card p-4">
        <h2 className="text-sm font-semibold">{d.stageTimeline}</h2>
        <ul className="space-y-1 text-xs">
          {STAGE_ORDER.map((s) => {
            const reached = opportunity.stage_history?.[s];
            if (!reached) return null;
            return (
              <li key={s} className="flex items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {copy.pipeline.stages[s]}
                </span>
                <span className="text-muted-foreground">
                  {d.stageReachedAt(fmtDateTime(reached))}
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <VaultFilePicker
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        copy={copy}
        currentIds={opportunity.attached_file_ids}
        onSave={handleFilesChange}
      />

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{d.confirmDelete.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {d.confirmDelete.description(opportunity.role_title)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{d.confirmDelete.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={deleteMutation.isPending}
            >
              {d.confirmDelete.confirm}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
