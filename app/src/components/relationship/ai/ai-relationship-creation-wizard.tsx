"use client";

/**
 * AIRelationshipCreationWizard
 *
 * The AI-first entry path for adding a person (spec §4). Two steps:
 *   1. Capture — choose a method (paste / describe / name) and provide input.
 *   2. Review  — AI-drafted fields with confidence badges; the user edits and
 *      confirms. NOTHING is saved until the user clicks Save (spec §4 step 4).
 *
 * On save it hands a `RelationshipInsert` back to the parent, which uses the
 * existing optimistic `useCreateRelationship` mutation — no parallel system.
 */

import { useMemo, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Sparkles, FileText, MessageSquareText, UserPlus2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import {
  CATEGORY_DROPDOWN_ORDER,
  STRENGTH_DROPDOWN_ORDER,
  getCategoryLabel,
  getStrengthLabel,
} from "@/components/relationship/utils/relationship-display";
import { requestRelationshipAutofill } from "@/lib/relationships/insight-api";
import { parseTagsInput, formatTagsForInput } from "@/types/relationship";
import type {
  RelationshipCategory,
  RelationshipStrength,
} from "@/types/relationship";
import type {
  FieldConfidence,
  RelationshipAutofillResult,
} from "@/types/relationship-intelligence";
import type { RelationshipInsert } from "@/types/relationship";
import type { Project } from "@/types/database";

type Method = "paste" | "describe" | "name";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: readonly Project[];
  onSave: (payload: RelationshipInsert) => void;
  isSaving?: boolean;
};

const PROGRESS_KEYS = [
  "wizardProgressReading",
  "wizardProgressIdentifying",
  "wizardProgressContact",
  "wizardProgressCommitments",
  "wizardProgressNextAction",
  "wizardProgressPreparing",
] as const;

export function AIRelationshipCreationWizard({
  open,
  onOpenChange,
  projects,
  onSave,
  isSaving,
}: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();

  const [method, setMethod] = useState<Method>("paste");
  const [text, setText] = useState("");
  const [name, setName] = useState("");
  const [phase, setPhase] = useState<"input" | "loading" | "review">("input");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RelationshipAutofillResult | null>(null);
  const [progressIdx, setProgressIdx] = useState(0);

  // Editable draft fields (seeded from AI result, fully user-controlled).
  const [draft, setDraft] = useState<RelationshipInsert | null>(null);
  const [tagsInput, setTagsInput] = useState("");

  function reset() {
    setMethod("paste");
    setText("");
    setName("");
    setPhase("input");
    setError(null);
    setResult(null);
    setDraft(null);
    setTagsInput("");
    setProgressIdx(0);
  }

  function close() {
    onOpenChange(false);
    // Defer reset so it doesn't flash during the close animation.
    setTimeout(reset, 200);
  }

  async function runExtraction() {
    setError(null);
    setPhase("loading");
    setProgressIdx(0);
    const timer = setInterval(() => {
      setProgressIdx((i) => Math.min(i + 1, PROGRESS_KEYS.length - 1));
    }, 700);
    try {
      const { result: r } = await requestRelationshipAutofill({
        text: method === "name" ? undefined : text,
        personName: method === "name" ? name : name || undefined,
        locale: language,
        projects: projects.map((p) => ({
          id: p.id,
          name: p.name,
          description: p.description,
        })),
      });
      setResult(r);
      setDraft({
        person_name: r.person_name,
        photo_url: null,
        category: r.category,
        relationship_strength: r.relationship_strength,
        email: r.email ?? null,
        phone: r.phone ?? null,
        last_contact_date: r.last_contact_date ?? null,
        last_interaction_notes: r.last_interaction_notes ?? null,
        next_action: r.next_action ?? null,
        next_action_date: r.next_action_date ?? null,
        commitments_made: r.commitments_made ?? null,
        preferences_and_details: r.preferences_and_details ?? null,
        general_notes: r.general_notes ?? null,
        tags: r.tags,
        linked_project_id: r.linked_project_id ?? null,
        is_favorite: false,
      });
      setTagsInput(formatTagsForInput(r.tags));
      setPhase("review");
    } catch {
      setError(copy.wizardError);
      setPhase("input");
    } finally {
      clearInterval(timer);
    }
  }

  function patch<K extends keyof RelationshipInsert>(
    key: K,
    value: RelationshipInsert[K],
  ) {
    setDraft((d) => (d ? { ...d, [key]: value } : d));
  }

  function handleSave() {
    if (!draft) return;
    onSave({ ...draft, tags: parseTagsInput(tagsInput) });
  }

  const canExtract =
    method === "name" ? name.trim().length > 0 : text.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent
        size="3xl"
        className="flex max-h-[90vh] flex-col gap-0 p-0"
      >
        <DialogHeader className="border-b border-border px-6 py-4">
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {copy.wizardTitle}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-5">
            <AnimatePresence mode="wait" initial={false}>
              {phase === "input" && (
                <motion.div
                  key="input"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  className="space-y-5"
                >
                  <p className="text-sm text-muted-foreground">
                    {copy.wizardChooseMethod}
                  </p>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <MethodButton
                      active={method === "paste"}
                      icon={<FileText className="h-4 w-4" />}
                      label={copy.wizardMethodPaste}
                      onClick={() => setMethod("paste")}
                    />
                    <MethodButton
                      active={method === "describe"}
                      icon={<MessageSquareText className="h-4 w-4" />}
                      label={copy.wizardMethodDescribe}
                      onClick={() => setMethod("describe")}
                    />
                    <MethodButton
                      active={method === "name"}
                      icon={<UserPlus2 className="h-4 w-4" />}
                      label={copy.wizardMethodName}
                      onClick={() => setMethod("name")}
                    />
                  </div>

                  {method === "name" ? (
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder={copy.wizardNamePlaceholder}
                      autoFocus
                    />
                  ) : (
                    <Textarea
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder={copy.wizardInputPlaceholder}
                      rows={6}
                      autoFocus
                    />
                  )}

                  {error && (
                    <p className="text-sm text-destructive">{error}</p>
                  )}

                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={close}>
                      {copy.cancel}
                    </Button>
                    <Button onClick={runExtraction} disabled={!canExtract}>
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      {copy.wizardExtract}
                    </Button>
                  </div>
                </motion.div>
              )}

              {phase === "loading" && (
                <motion.div
                  key="loading"
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="space-y-3 py-8"
                >
                  {PROGRESS_KEYS.map((k, i) => (
                    <motion.div
                      key={k}
                      initial={false}
                      animate={{
                        opacity: i <= progressIdx ? 1 : 0.35,
                      }}
                      className="flex items-center gap-2 text-sm"
                    >
                      <span
                        className={
                          i < progressIdx
                            ? "text-primary"
                            : i === progressIdx
                              ? "text-foreground"
                              : "text-muted-foreground"
                        }
                      >
                        {i <= progressIdx ? "●" : "○"}
                      </span>
                      <span
                        className={
                          i === progressIdx
                            ? "font-medium text-foreground"
                            : "text-muted-foreground"
                        }
                      >
                        {copy[k]}
                      </span>
                    </motion.div>
                  ))}
                </motion.div>
              )}

              {phase === "review" && draft && result && (
                <motion.div
                  key="review"
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, y: -6 }}
                  className="space-y-4"
                >
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
                    {copy.wizardReviewBanner}
                  </div>

                  <ReviewField
                    label={copy.relFieldName}
                    confidence={result.field_confidence.person_name}
                    copy={copy}
                  >
                    <Input
                      value={draft.person_name}
                      onChange={(e) => patch("person_name", e.target.value)}
                    />
                  </ReviewField>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ReviewField
                      label={copy.relFieldCategory}
                      confidence={result.field_confidence.category}
                      copy={copy}
                    >
                      <Select
                        value={draft.category}
                        onValueChange={(v) =>
                          patch("category", v as RelationshipCategory)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_DROPDOWN_ORDER.map((slug) => (
                            <SelectItem key={slug} value={slug}>
                              {getCategoryLabel(slug, copy)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ReviewField>

                    <ReviewField
                      label={copy.relFieldStrength}
                      confidence={result.field_confidence.relationship_strength}
                      copy={copy}
                    >
                      <Select
                        value={draft.relationship_strength}
                        onValueChange={(v) =>
                          patch(
                            "relationship_strength",
                            v as RelationshipStrength,
                          )
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STRENGTH_DROPDOWN_ORDER.map((slug) => (
                            <SelectItem key={slug} value={slug}>
                              {getStrengthLabel(slug, copy)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </ReviewField>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <ReviewField
                      label={copy.relFieldEmail}
                      confidence={result.field_confidence.email}
                      copy={copy}
                    >
                      <Input
                        value={draft.email ?? ""}
                        onChange={(e) =>
                          patch("email", e.target.value || null)
                        }
                      />
                    </ReviewField>
                    <ReviewField
                      label={copy.relFieldPhone}
                      confidence={result.field_confidence.phone}
                      copy={copy}
                    >
                      <Input
                        value={draft.phone ?? ""}
                        onChange={(e) =>
                          patch("phone", e.target.value || null)
                        }
                      />
                    </ReviewField>
                  </div>

                  <ReviewField
                    label={copy.relDetailSectionNextAction}
                    confidence={result.field_confidence.next_action}
                    copy={copy}
                  >
                    <Textarea
                      value={draft.next_action ?? ""}
                      onChange={(e) =>
                        patch("next_action", e.target.value || null)
                      }
                      rows={2}
                    />
                  </ReviewField>

                  <ReviewField
                    label={copy.relDetailSectionCommitments}
                    confidence={result.field_confidence.commitments_made}
                    copy={copy}
                  >
                    <Textarea
                      value={draft.commitments_made ?? ""}
                      onChange={(e) =>
                        patch("commitments_made", e.target.value || null)
                      }
                      rows={2}
                    />
                  </ReviewField>

                  <ReviewField
                    label={copy.relDetailSectionPreferences}
                    confidence={result.field_confidence.preferences_and_details}
                    copy={copy}
                  >
                    <Textarea
                      value={draft.preferences_and_details ?? ""}
                      onChange={(e) =>
                        patch(
                          "preferences_and_details",
                          e.target.value || null,
                        )
                      }
                      rows={2}
                    />
                  </ReviewField>

                  <ReviewField
                    label={copy.relDetailSectionTags}
                    confidence={result.field_confidence.tags}
                    copy={copy}
                  >
                    <Input
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                    />
                  </ReviewField>

                  {result.suggested_next_actions.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {copy.wizardSuggestedActions}
                      </p>
                      <ul className="space-y-1">
                        {result.suggested_next_actions.map((a, i) => (
                          <li
                            key={i}
                            className="rounded-md bg-muted/50 px-2.5 py-1.5 text-sm text-foreground"
                          >
                            {a}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {result.warnings.length > 0 && (
                    <ul className="space-y-1 text-xs text-muted-foreground">
                      {result.warnings.map((w, i) => (
                        <li key={i}>· {w}</li>
                      ))}
                    </ul>
                  )}

                  <div className="flex justify-between gap-2 pt-2">
                    <Button
                      variant="ghost"
                      onClick={() => setPhase("input")}
                    >
                      {copy.wizardBack}
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                      {copy.wizardSave}
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

function MethodButton({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors ${
        active
          ? "border-primary/40 bg-primary/5 text-foreground"
          : "border-border bg-card/40 text-muted-foreground hover:border-border hover:bg-muted/50"
      }`}
    >
      <span className={active ? "text-primary" : ""}>{icon}</span>
      <span className="min-w-0 truncate">{label}</span>
    </button>
  );
}

function confidenceLabel(
  c: FieldConfidence | undefined,
  copy: ReturnType<typeof getRelationshipUiCopy>,
): { label: string; className: string } | null {
  switch (c) {
    case "high":
      return {
        label: copy.wizardConfidenceHigh,
        className:
          "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
      };
    case "medium":
      return {
        label: copy.wizardConfidenceMedium,
        className:
          "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      };
    case "low":
      return {
        label: copy.wizardConfidenceLow,
        className: "bg-muted text-muted-foreground border-border",
      };
    case "missing":
      return {
        label: copy.wizardConfidenceMissing,
        className:
          "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
      };
    default:
      return null;
  }
}

function ReviewField({
  label,
  confidence,
  copy,
  children,
}: {
  label: string;
  confidence: FieldConfidence | undefined;
  copy: ReturnType<typeof getRelationshipUiCopy>;
  children: React.ReactNode;
}) {
  const badge = confidenceLabel(confidence, copy);
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium text-muted-foreground">
          {label}
        </Label>
        {badge && (
          <Badge
            variant="outline"
            className={`font-normal text-[10px] ${badge.className}`}
          >
            {badge.label}
          </Badge>
        )}
      </div>
      {children}
    </div>
  );
}
