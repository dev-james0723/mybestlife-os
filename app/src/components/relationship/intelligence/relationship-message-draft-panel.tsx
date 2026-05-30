"use client";

/**
 * Message Draft panel (spec §13.6). Generates a follow-up DRAFT in a chosen
 * tone/purpose. NEVER sends — only copy or save. Reinforced with explicit
 * "drafts are never sent automatically" copy.
 */

import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { toast } from "sonner";
import { Mail, Copy, Check, Save, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAppStore } from "@/stores/app-store";
import { getRelationshipUiCopy } from "@/lib/i18n/relationship-ui";
import { requestDraftMessage } from "@/lib/relationships/insight-api";
import { useCreateRelationshipDraft } from "@/hooks/use-relationship-intelligence";
import {
  MESSAGE_DRAFT_PURPOSES,
  MESSAGE_DRAFT_TONES,
  type DraftMessageResult,
  type MessageDraftPurpose,
  type MessageDraftTone,
} from "@/types/relationship-intelligence";

type Props = {
  relationshipId: string;
  /** Compact context string the modal already assembled. */
  context?: string;
};

export function RelationshipMessageDraftPanel({ relationshipId, context }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getRelationshipUiCopy(language), [language]);
  const reduce = useReducedMotion();
  const createDraft = useCreateRelationshipDraft();

  const [purpose, setPurpose] = useState<MessageDraftPurpose>("follow_up");
  const [tone, setTone] = useState<MessageDraftTone>("warm");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DraftMessageResult | null>(null);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setLoading(true);
    try {
      const { result: r } = await requestDraftMessage({
        relationshipId,
        purpose,
        tone,
        language,
        context,
      });
      setResult(r);
    } catch {
      toast.error(copy.wizardError);
    } finally {
      setLoading(false);
    }
  }

  async function copyText() {
    if (!result) return;
    const text = [result.subject ? `${result.subject}\n\n` : "", result.body]
      .join("")
      .trim();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  }

  function save() {
    if (!result) return;
    createDraft.mutate({
      relationship_id: relationshipId,
      purpose,
      tone,
      language,
      subject: result.subject ?? null,
      body: result.body,
      status: "draft",
    });
    toast.success(copy.draftSave);
  }

  return (
    <section className="space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Mail className="h-4 w-4" aria-hidden />
        {copy.modalDraftFollowUp}
      </h3>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {copy.draftPurpose}
          </label>
          <Select
            value={purpose}
            onValueChange={(v) => setPurpose(v as MessageDraftPurpose)}
          >
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_DRAFT_PURPOSES.map((p) => (
                <SelectItem key={p} value={p}>
                  {p.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {copy.draftTone}
          </label>
          <Select value={tone} onValueChange={(v) => setTone(v as MessageDraftTone)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MESSAGE_DRAFT_TONES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button size="sm" variant="outline" onClick={generate} disabled={loading}>
        <Sparkles className="mr-1.5 h-3.5 w-3.5" />
        {loading ? copy.draftGenerating : copy.draftGenerate}
      </Button>

      {result && (
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2 rounded-md border border-border bg-card/40 p-3"
        >
          {result.subject && (
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{copy.draftSubject}: </span>
              {result.subject}
            </p>
          )}
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {result.body}
          </p>
          {result.caution && (
            <p className="rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-700 dark:text-amber-400">
              {copy.draftCaution}: {result.caution}
            </p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <Button size="sm" variant="outline" onClick={copyText}>
              {copied ? (
                <Check className="mr-1 h-3.5 w-3.5" />
              ) : (
                <Copy className="mr-1 h-3.5 w-3.5" />
              )}
              {copied ? copy.draftCopied : copy.draftCopy}
            </Button>
            <Button size="sm" variant="ghost" onClick={save}>
              <Save className="mr-1 h-3.5 w-3.5" />
              {copy.draftSave}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">{copy.draftNeverSent}</p>
        </motion.div>
      )}
    </section>
  );
}
