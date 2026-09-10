"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { taskLineageRepository } from "@/lib/repositories/task-lineage";
import { readTaskDerivation, taskDerivationSchema, taskDerivationStorageKey, type TaskDerivationCommand } from "@/lib/tasks/task-lineage";
import type { Task } from "@/types/database";

/** Explicit source relationships; ordinary new-task creation stays independent. */
export function TaskLineageActions({ task, zh }: { task: Task; zh: boolean }) {
  const t = (en: string, chinese: string) => zh ? chinese : en;
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const account = task.user_id;
  const storageKey = taskDerivationStorageKey(account, task.id);
  const identity = `${account}:${task.id}`;
  const identityRef = useRef(identity);
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [relation, setRelation] = useState<TaskDerivationCommand["relation"]>("split");
  const [titles, setTitles] = useState("");
  const [pending, setPending] = useState<TaskDerivationCommand | null>(null);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  useEffect(() => {
    identityRef.current = identity;
  }, [identity]);
  const lineage = useQuery({
    queryKey: ["task-lineage", account, task.id],
    queryFn: () => taskLineageRepository.get(task.id, account),
    enabled: user?.id === account,
  });

  useEffect(() => {
    setReady(false); setPending(null); setOpen(false); setMessage("");
    setTitles(""); setRelation("split");
    try {
      const recovered = readTaskDerivation(localStorage.getItem(storageKey), account, task.id);
      setPending(recovered);
      if (recovered) { setOpen(true); setRelation(recovered.relation); setTitles(recovered.titles.join("\n")); }
      setReady(true);
    } catch { setMessage(zh ? "無法讀取待確認的儲存。請保留此分頁並檢查瀏覽器儲存設定。" : "The pending save could not be read. Keep this tab and check browser storage settings."); }
  }, [account, task.id, storageKey, zh]);

  const labels = {
    split: t("Split into parts", "拆成幾項工作"),
    copy: t("Copy the same outcome", "複製同一次成果"),
    recreate: t("Recreate the same outcome", "重建同一次成果"),
    next_step: t("Create a new next step", "建立新的下一步"),
  };
  const titleList = titles.split("\n").map((title) => title.trim()).filter(Boolean);
  const valid = titleList.every((title) => title.length <= 180)
    && (relation === "split" ? titleList.length >= 2 && titleList.length <= 5 : titleList.length === 1);

  async function save() {
    if (busy.current || !ready || user?.id !== account || (!pending && !valid)) return;
    busy.current = true; setSaving(true); setMessage("");
    const capturedIdentity = identity;
    try {
      const fromAnotherTab = readTaskDerivation(localStorage.getItem(storageKey), account, task.id);
      if (fromAnotherTab && fromAnotherTab.command_id !== pending?.command_id) {
        setPending(fromAnotherTab); setRelation(fromAnotherTab.relation); setTitles(fromAnotherTab.titles.join("\n"));
        setMessage(t("Another save is pending for this task. Review it, then retry the same save.", "這項任務有另一個待確認的保存。請先核對，再重試同一保存。"));
        return;
      }
      const command = pending ?? taskDerivationSchema.parse({ version: 1, account,
        command_id: crypto.randomUUID(), source_id: task.id, relation, titles: titleList });
      // Persist BEFORE the request. An unknown response must reuse this exact command.
      localStorage.setItem(storageKey, JSON.stringify(command));
      setPending(command);
      const result = await taskLineageRepository.derive(command);
      if (readTaskDerivation(localStorage.getItem(storageKey), account, task.id)?.command_id === command.command_id) localStorage.removeItem(storageKey);
      await queryClient.invalidateQueries({ queryKey: ["tasks"] });
      await queryClient.invalidateQueries({ queryKey: ["task-lineage", account] });
      if (identityRef.current !== capturedIdentity) return;
      setPending(null); setTitles(""); setOpen(false);
      setMessage(t(`${result.task_ids.length} related task${result.task_ids.length === 1 ? "" : "s"} saved.`, `已保存 ${result.task_ids.length} 項相關工作。`));
    } catch (error) {
      if (identityRef.current !== capturedIdentity) return;
      // A SQL exception rolls back the entire command; transport failures stay pending.
      if (error && typeof error === "object" && "code" in error && error.code === "P0001") {
        localStorage.removeItem(storageKey); setPending(null);
        setMessage(t("The original task or request changed. Refresh Tasks before trying again.", "原任務或要求已改變。請重新整理任務後再試。"));
      } else {
        setMessage(t("Save is unconfirmed. Retry this same request to check or finish it.", "尚未確認是否保存。請重試同一要求，以核對或完成保存。"));
      }
    } finally { busy.current = false; setSaving(false); }
  }

  return <section aria-label={t("Related tasks", "相關工作")} className="space-y-3">
    <div className="flex items-center gap-2 text-sm font-medium"><GitBranch className="size-4"/>{t("Related tasks", "相關工作")}</div>
    {lineage.data?.relation !== "original" && lineage.data && <p className="text-xs text-muted-foreground">
      {lineage.data.relation === "next_step" ? t("This is a new outcome following an earlier task.", "這是接續先前任務的一次新成果。") : t("This task shares one outcome with its original and other parts. Their completion states remain separate.", "這項工作與原任務及其他部分共用同一次成果，各自保留完成狀態。")}
    </p>}
    {!open && <Button type="button" variant="outline" className="min-h-11" disabled={!ready || user?.id !== account || saving} onClick={() => { setMessage(""); setOpen(true); }}>{t("Split or create a related task", "拆分或建立相關工作")}</Button>}
    {open && <div className="space-y-3 rounded-xl border p-3">
      <fieldset disabled={saving || !!pending} className="space-y-2">
        <legend className="mb-2 text-sm font-medium">{t("How is this related?", "它與原任務有甚麼關係？")}</legend>
        {(["split", "copy", "next_step"] as const).map((kind) => <label key={kind} className="flex min-h-11 items-center gap-2 text-sm">
          <input type="radio" name={`task-relation-${task.id}`} value={kind} checked={relation === kind} onChange={() => { setRelation(kind); setTitles(kind === "copy" ? task.title : ""); }}/>{labels[kind]}
        </label>)}
      </fieldset>
      <p className="text-xs text-muted-foreground">{relation === "next_step"
        ? t("Choose a different concrete outcome, such as revising a draft after feedback. It can become a new Garden step.", "選一項不同的具體成果，例如依回饋修訂初稿；它可以成為新一個花園小步。")
        : t("These records describe one outcome and share one Garden opportunity. Completing one part does not complete the others or the original task.", "這些紀錄屬同一次成果，共用一次花園建設機會。完成一部分不會自動完成其餘部分或原任務。")}</p>
      <Label htmlFor={`task-related-titles-${task.id}`}>{relation === "split" ? t("Two to five task titles, one per line", "每行一項工作名稱，共二至五項") : t("Task title", "工作名稱")}</Label>
      <Textarea id={`task-related-titles-${task.id}`} value={titles} disabled={saving || !!pending} onChange={(event) => setTitles(event.target.value)} rows={relation === "split" ? 3 : 1}/>
      <p className="text-xs text-muted-foreground">{t("New tasks start as To do in the same project. Add their own dates and details afterward.", "新工作會在同一專案以待辦狀態建立；日期與詳細內容可之後各自補上。")}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" className="min-h-11" disabled={saving || !ready || user?.id !== account || (!pending && !valid)} onClick={() => void save()}>{saving ? t("Saving…", "儲存中…") : pending ? t("Retry the same save", "重試同一保存") : t("Create related tasks", "建立相關工作")}</Button>
        {!pending && <Button type="button" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>{t("Cancel", "取消")}</Button>}
      </div>
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
