"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { AICoachCopy } from "@/lib/i18n/ai-coach-ui";
import {
  useCreateCustomPrompt,
  useCustomPrompt,
  useUpdateCustomPrompt,
} from "@/hooks/use-ai-coach";
import { extractVariables } from "@/lib/prompts/variable-extractor";
import {
  CAREER_VAULT_CATEGORIES,
  CAREER_VAULT_CATEGORY_EMOJI,
} from "@/lib/career-vault/constants";
import type { CareerVaultCategory } from "@/types/career-vault";

interface Props {
  open: boolean;
  editingId: string | null;
  copy: AICoachCopy;
  onClose: () => void;
}

const ICONS = ["💡", "📄", "🎯", "🧭", "🎤", "🔄", "📚", "✍️", "🕵️", "🚀", "🧠", "🗂️"];

export function CustomPromptModal({ open, editingId, copy, onClose }: Props) {
  const existing = useCustomPrompt(editingId);
  const create = useCreateCustomPrompt();
  const update = useUpdateCustomPrompt();

  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("💡");
  const [tagsInput, setTagsInput] = useState("");
  const [body, setBody] = useState("");
  const [attach, setAttach] = useState<CareerVaultCategory[]>([]);
  const [optionalSet, setOptionalSet] = useState<Set<string>>(new Set());

  const [prevKey, setPrevKey] = useState<string>("");
  const key = `${open ? "o" : "c"}-${editingId ?? "new"}-${existing.data?.updated_at ?? ""}`;
  if (prevKey !== key) {
    setPrevKey(key);
    if (!open) {
      // no-op; let mount state linger for close animation
    } else if (editingId && existing.data) {
      const d = existing.data;
      setTitle(d.title);
      setIcon(d.icon || "💡");
      setTagsInput(d.tags.join(", "));
      setBody(d.prompt_body);
      setAttach(d.attachment_categories as CareerVaultCategory[]);
      setOptionalSet(new Set(d.optional_variables));
    } else if (!editingId) {
      setTitle("");
      setIcon("💡");
      setTagsInput("");
      setBody("");
      setAttach([]);
      setOptionalSet(new Set());
    }
  }

  // Derive a fresh set each render so optional flags stay in sync with the
  // detected variables without needing an effect + setState.
  const detectedVars = useMemo(() => extractVariables(body), [body]);
  const effectiveOptional = useMemo(() => {
    const next = new Set<string>();
    for (const v of detectedVars) {
      if (optionalSet.has(v)) next.add(v);
    }
    return next;
  }, [detectedVars, optionalSet]);

  const parsedTags = useMemo(() => {
    return tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 12);
  }, [tagsInput]);

  const canSave = title.trim().length > 0 && body.trim().length > 0;
  const saving = create.isPending || update.isPending;

  const handleSave = async () => {
    if (!canSave) return;
    const required = detectedVars.filter((v) => !effectiveOptional.has(v));
    const optional = detectedVars.filter((v) => effectiveOptional.has(v));
    const payload = {
      title: title.trim(),
      prompt_body: body,
      icon,
      tags: parsedTags,
      attachment_categories: attach,
      required_variables: required,
      optional_variables: optional,
    };
    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, updates: payload });
      } else {
        await create.mutateAsync(payload);
      }
      onClose();
    } catch {
      /* toast already surfaced by hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editingId ? copy.custom.edit : copy.custom.create}
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <Label htmlFor="cp-title">{copy.custom.fields.title}</Label>
            <Input
              id="cp-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={copy.custom.placeholders.title}
              maxLength={120}
            />
          </div>

          <div className="grid gap-2">
            <Label>{copy.custom.fields.icon}</Label>
            <div className="flex flex-wrap gap-1">
              {ICONS.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={icon === e}
                  onClick={() => setIcon(e)}
                  className={`grid h-9 w-9 place-items-center rounded-md border text-lg transition-colors ${
                    icon === e
                      ? "border-foreground bg-foreground/5"
                      : "border-border hover:bg-accent"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cp-tags">{copy.custom.fields.tags}</Label>
            <Input
              id="cp-tags"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder={copy.custom.placeholders.tags}
              maxLength={200}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cp-body">{copy.custom.fields.body}</Label>
            <Textarea
              id="cp-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={copy.custom.placeholders.body}
              rows={9}
              className="font-mono text-sm"
            />
            <p className="text-[11px] text-muted-foreground">
              {copy.custom.bodyHint}
            </p>
          </div>

          <div className="grid gap-2">
            <Label>{copy.custom.detectedVars}</Label>
            {detectedVars.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {copy.custom.noVarsDetected}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {detectedVars.map((v) => {
                  const isOptional = effectiveOptional.has(v);
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        setOptionalSet((prev) => {
                          const next = new Set(prev);
                          if (next.has(v)) next.delete(v);
                          else next.add(v);
                          return next;
                        })
                      }
                      className="group"
                    >
                      <Badge
                        variant={isOptional ? "outline" : "secondary"}
                        className="gap-1 font-normal"
                      >
                        [{v}]
                        <span className="text-[10px] uppercase text-muted-foreground">
                          {isOptional
                            ? copy.flow.variables.optionalBadge
                            : copy.flow.variables.requiredBadge}
                        </span>
                      </Badge>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="grid gap-2">
            <Label>{copy.custom.fields.attachmentCategories}</Label>
            <div className="flex flex-wrap gap-2">
              {CAREER_VAULT_CATEGORIES.map((c) => {
                const checked = attach.includes(c);
                return (
                  <label
                    key={c}
                    className="flex cursor-pointer items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(v) =>
                        setAttach((prev) =>
                          v === true
                            ? [...prev, c]
                            : prev.filter((x) => x !== c),
                        )
                      }
                    />
                    <span aria-hidden>{CAREER_VAULT_CATEGORY_EMOJI[c]}</span>
                    <span>{c.replace("_", " ")}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            {copy.custom.cancel}
          </Button>
          <Button disabled={!canSave || saving} onClick={handleSave}>
            {saving ? copy.custom.saving : copy.custom.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
