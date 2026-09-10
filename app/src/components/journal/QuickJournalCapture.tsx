"use client";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { OSPrimaryAction } from "@/components/ui/os-primitives";

/** A plain entry uses the deployed journal content column; no inferred emotion or AI. */
export function QuickJournalCapture({ chinese }: { chinese: boolean }) {
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [locked, setLocked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const operation = useRef<{id: string; text: string} | null>(null);
  const gate = useRef(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const queryClient = useQueryClient();
  useEffect(() => {
    if (!text || saved) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [text, saved]);
  const save = async () => {
    if (gate.current) return;
    if (!text.trim()) { setError(chinese ? "先寫下一件事，其他資料可以稍後補充。" : "Write one thing first. You can add details later."); input.current?.focus(); return; }
    gate.current = true; setBusy(true); setError("");
    const op = operation.current ?? {id: crypto.randomUUID(), text: text.trim()}; operation.current = op; setLocked(true);
    try {
      const client = createClient();
      const {data: {user}, error: authError} = await client.auth.getUser();
      if (authError || !user) throw new Error("auth");
      const {error: writeError} = await client.from("journal_entries").upsert({id:op.id,user_id:user.id,entry_date:format(new Date(), "yyyy-MM-dd"),topic:"Quick Reset",content:op.text,bullets:[op.text]}, {onConflict:"id",ignoreDuplicates:true});
      if (writeError) throw writeError;
      const {data, error: readError} = await client.from("journal_entries").select("id,content").eq("id",op.id).eq("user_id",user.id).single();
      if (readError || data.content !== op.text) throw new Error("unconfirmed");
      setSaved(true);
      await queryClient.invalidateQueries({queryKey:["journal-entries"]});
    } catch { setError(chinese ? "未能確認儲存。文字仍保留在此，請重試同一筆記。" : "Save could not be confirmed. Your writing is kept here; retry the same entry."); }
    finally { setBusy(false); gate.current = false; }
  };
  return <section className="space-y-3 rounded-2xl border border-border bg-card/60 p-4 sm:p-5">
    <h2 className="text-lg font-semibold">{chinese ? "快速記下今日一件事" : "Write down one thing from today"}</h2>
    <p className="text-sm text-muted-foreground">{chinese ? "只需一句話。情緒、分類與 AI 整理均可稍後再做。" : "One sentence is enough. Emotions, categories and AI reflection can wait."}</p>
    <label className="block space-y-2 text-sm"><span>{chinese ? "你想記下甚麼？" : "What would you like to remember?"}</span><Textarea ref={input} value={text} maxLength={10000} rows={3} disabled={busy || locked} onChange={(event) => {setText(event.target.value);setError("");}} aria-invalid={!!error} placeholder={chinese ? "例如：今日散步後，思路清晰了一點。" : "For example, a short walk helped me think more clearly today."}/></label>
    {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    {saved ? <p role="status" className="text-sm">{chinese ? "已儲存到日記。你可以在下方最近記錄找到。" : "Saved to your journal. Find it in your recent entries below."}</p> : <OSPrimaryAction onClick={() => void save()} disabled={busy}>{busy ? (chinese ? "儲存中…" : "Saving…") : (chinese ? "儲存筆記（不使用 AI）" : "Save entry without AI")}</OSPrimaryAction>}
  </section>;
}
