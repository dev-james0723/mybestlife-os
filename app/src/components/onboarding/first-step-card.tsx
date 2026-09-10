"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { OSControl, OSFrostedPanel, OSPrimaryAction } from "@/components/ui/os-primitives";
import { Input } from "@/components/ui/input";
import { useProfile } from "@/hooks/use-settings";
import { useAppStore } from "@/stores/app-store";
import { useLocalizedPath } from "@/hooks/use-locale-slug";
import { saveFirstStep, type FirstStep } from "@/lib/repositories/first-step";

export function FirstStepCard({ onCommitted, initialTitle = "", initialMinutes = 20 }: { onCommitted?: () => void; initialTitle?: string; initialMinutes?: number }) {
  const chinese = useAppStore((s) => s.language).startsWith("zh");
  const { data: profile } = useProfile();
  const queryClient = useQueryClient();
  const plannerHref = useLocalizedPath("/daily-planner");
  const [title, setTitle] = useState(initialTitle);
  const [minutes, setMinutes] = useState([10,20,30,60].includes(initialMinutes) ? initialMinutes : 20);
  const [pending, setPending] = useState<FirstStep | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(false);
  const gate = useRef(false);
  const key = profile?.id ? `mybestlife:first-step:${profile.id}` : null;
  useEffect(() => {
    if (!key) return;
    try { const raw = sessionStorage.getItem(key); if (raw) { const op = JSON.parse(raw) as FirstStep; if (typeof op.id === "string" && typeof op.title === "string" && /^\d{4}-\d{2}-\d{2}$/.test(op.date)) { setPending(op); setTitle(op.title); setMinutes(op.minutes); } } } catch { /* In-memory retry still works if storage is unavailable. */ }
  }, [key]);
  const save = async () => {
    if (!title.trim() || gate.current || !key) return;
    gate.current = true; setBusy(true); setError(false);
    let date: string;
    try { date = new Intl.DateTimeFormat("en-CA", { timeZone: profile?.timezone || undefined, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); } catch { date = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date()); }
    const operation = pending ?? { id: crypto.randomUUID(), title: title.trim(), minutes, date };
    setPending(operation);
    try { sessionStorage.setItem(key, JSON.stringify(operation)); } catch { /* Do not claim durable retry if storage is blocked. */ }
    try {
      await saveFirstStep(operation);
      setSaved(true);
      try { sessionStorage.removeItem(key); } catch { /* The repeated id remains safe. */ }
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["tasks"] }), queryClient.invalidateQueries({ queryKey: ["daily-plan"] }), queryClient.invalidateQueries({ queryKey: ["calendar"] })]);
    } catch { setError(true); }
    finally { setBusy(false); gate.current = false; }
  };
  return <OSFrostedPanel className="space-y-3 p-4 sm:p-5" aria-label={chinese ? "安排今日一件事" : "Plan one thing today"}>
    <h2 className="text-lg font-semibold">{saved ? (chinese ? "已加入今日 Must Do 清單" : "Saved to today’s Must Do list") : (chinese ? "今日，先做好一件事" : "Make room for one thing today")}</h2>
    {saved ? <><p className="text-sm">{title} · {minutes} {chinese ? "分鐘（預計）" : "minutes estimated"}</p><OSPrimaryAction render={<Link href={`${plannerHref}?mode=free&date=${pending?.date ?? ""}`} />} onClick={onCommitted}>{chinese ? "查看今日計劃" : "View today’s plan"}</OSPrimaryAction>{onCommitted && <OSControl onClick={onCommitted}>{chinese ? "留在此頁" : "Stay on this page"}</OSControl>}</> : <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
      <label className="block space-y-1 text-sm"><span>{chinese ? "你想完成哪一小步？" : "What is one small step you want to take?"}</span><Input value={title} maxLength={500} required disabled={busy || !!pending} onChange={(event) => setTitle(event.target.value)} placeholder={chinese ? "例如：整理明天會議的三個重點" : "For example, outline three points for tomorrow’s meeting"} /></label>
      <div className="flex flex-wrap items-end gap-3"><label className="space-y-1 text-sm"><span className="block">{chinese ? "預計時間" : "Time to set aside"}</span><select className="h-11 rounded-xl border px-3" value={minutes} disabled={busy || !!pending} onChange={(event) => setMinutes(Number(event.target.value))}>{[10,20,30,60].map((n) => <option key={n} value={n}>{n} {chinese ? "分鐘" : "minutes"}</option>)}</select></label><OSPrimaryAction type="submit" disabled={busy || !title.trim() || !key}>{busy ? (chinese ? "儲存中…" : "Saving…") : pending ? (chinese ? "重試加入同一任務" : "Retry the same task") : (chinese ? "加入今日計劃" : "Add to today’s plan")}</OSPrimaryAction></div>
      <p className="text-xs text-muted-foreground">{chinese ? "儲存一項任務到今日 Must Do 清單，開始時間可以稍後安排。" : "Save a task to today’s Must Do list. Choose a start time later."}</p>
      {error && <p role="alert" className="text-sm text-destructive">{chinese ? "未能確認整個儲存流程完成。請重試，已建立的任務不會重複新增。" : "We could not confirm the whole save completed. Retry; an existing task will not be duplicated."}</p>}
    </form>}
  </OSFrostedPanel>;
}
