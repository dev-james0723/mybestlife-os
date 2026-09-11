"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Save, Check, X, Pencil, Send, Square, Loader2, Image as ImageIcon } from "lucide-react";
import type { MindSkill } from "@/lib/mind-council/types";
import { mentionedAdvisorIds, removeMentions, type CouncilRoom as Room, type CouncilMessage, type CouncilViewer, type CouncilEvent } from "@/lib/mind-council/room-contract";
import { roomCopy } from "@/lib/mind-council/room-copy";
import { MindCouncilRichText } from "./MindCouncilRichText";
import { CouncilScene, CouncilOrb } from "./CouncilScene";
import styles from "./CouncilRoom.module.css";

type LastTurn = { id: string; prompt: string; exchange: boolean; status: string };
export type CouncilSnapshot = { room: Room; messages: CouncilMessage[]; viewer: CouncilViewer; lastTurn?: LastTurn | null; busy?: boolean };
type RetryTurn = { id: string; message: string; exchange: boolean };
export async function councilJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...init?.headers } });
  const value = await response.json();
  if (!response.ok) throw new Error(typeof value?.error === "string" ? value.error : "Request failed.");
  return value as T;
}
const mergeMessages = (old: CouncilMessage[], next: CouncilMessage[]) => {
  const items = new Map(old.map((m) => [m.id, m]));
  next.forEach((m) => items.set(m.id, m));
  return [...items.values()].sort((a, b) => a.created_at.localeCompare(b.created_at) || a.step - b.step);
};
export function CouncilRoom({ snapshot, skills, locale, isNew = false, onClose, onSaved }: {
  snapshot: CouncilSnapshot; skills: MindSkill[]; locale: string; isNew?: boolean; onClose: () => void; onSaved: (room: Room) => void;
}) {
  const copy = roomCopy(locale);
  const [room, setRoom] = useState(snapshot.room);
  const [messages, setMessages] = useState(snapshot.messages);
  const [draft, setDraft] = useState("");
  const [exchange, setExchange] = useState(true);
  const [sending, setSending] = useState(false);
  const [externalBusy, setExternalBusy] = useState(Boolean(snapshot.busy));
  const [activeAdvisor, setActiveAdvisor] = useState<string | null>(null);
  const [round, setRound] = useState(0);
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sceneError, setSceneError] = useState<string | null>(null);
  const [retry, setRetry] = useState<RetryTurn | null>(() => snapshot.lastTurn && snapshot.lastTurn.status !== "complete"
    ? { id: snapshot.lastTurn.id, message: snapshot.lastTurn.prompt, exchange: snapshot.lastTurn.exchange } : null);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(room.name);
  const [hideScene, setHideScene] = useState(false);
  const [caret, setCaret] = useState(0);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuDismissed, setMenuDismissed] = useState(false);
  const alive = useRef(true);
  const started = useRef(false);
  const sendingRef = useRef(false);
  const scenePending = useRef(false);
  const turnAbort = useRef<AbortController | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const input = useRef<HTMLTextAreaElement>(null);
  const messageList = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const endpoint = `/api/mind-council/rooms/${room.id}`;
  const targets = useMemo(() => mentionedAdvisorIds(draft, room.advisors), [draft, room.advisors]);
  const mentionMatch = /(?:^|\s)@([^@\n]*)$/.exec(draft.slice(0, caret));
  const options = !menuDismissed && mentionMatch ? room.advisors.filter((a) => a.name.toLocaleLowerCase().startsWith(mentionMatch[1].toLocaleLowerCase())).slice(0, 4) : [];
  const selectedOption = Math.min(menuIndex, options.length - 1);

  const refresh = useCallback(async () => {
    const next = await councilJson<CouncilSnapshot>(endpoint);
    if (!alive.current) return;
    setRoom((current) => ({ ...next.room, is_saved: current.is_saved || next.room.is_saved,
      ...(current.scene_status === "ready" && next.room.scene_status !== "ready" ? {
        scene_status: current.scene_status, scene_version: current.scene_version, scene_error: current.scene_error, scene_model: current.scene_model,
      } : {}) }));
    setMessages((old) => mergeMessages(old, next.messages));
    if (!sendingRef.current) {
      setExternalBusy(Boolean(next.busy));
      if (next.lastTurn?.status === "complete") setRetry(null);
      else if (next.lastTurn) setRetry({ id: next.lastTurn.id, message: next.lastTurn.prompt, exchange: next.lastTurn.exchange });
    }
  }, [endpoint]);

  const generateScene = useCallback(async (again: boolean) => {
    if (scenePending.current) return;
    scenePending.current = true;
    setSceneError(null);
    setRoom((r) => ({ ...r, scene_status: "generating" }));
    try {
      const result = await councilJson<{ room: Room }>(`${endpoint}/scene`, { method: "POST", body: JSON.stringify({ retry: again }) });
      if (alive.current) setRoom((r) => ({ ...r, scene_status: result.room.scene_status, scene_version: result.room.scene_version,
        scene_error: result.room.scene_error, scene_model: result.room.scene_model }));
    } catch (e) {
      if (alive.current) {
        setSceneError(e instanceof Error ? e.message : copy.sceneFailed);
        // Refresh distinguishes a shared in-progress lease from an actual provider failure.
        try { await refresh(); } catch { setRoom((r) => ({ ...r, scene_status: "error" })); }
      }
    } finally { scenePending.current = false; }
  }, [endpoint, refresh, copy.sceneFailed]);

  const sendTurn = useCallback(async (text: string, id: string, exchangeMode: boolean) => {
    if (!text.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true); setError(null); setExternalBusy(false);
    setRetry({ id, message: text, exchange: exchangeMode });
    const abort = new AbortController(); turnAbort.current = abort;
    let done = false;
    let conflict = false;
    try {
      const response = await fetch(`${endpoint}/turn`, { method: "POST", signal: abort.signal,
        headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId: id, message: text, exchange: exchangeMode, locale }) });
      if (!response.ok) {
        const problem = await response.json();
        if (response.status === 409) conflict = true;
        throw new Error(problem.error || copy.error);
      }
      if (!response.body) throw new Error(copy.interrupted);
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      const consume = (line: string) => {
        if (!line.trim() || !alive.current) return;
        const event = JSON.parse(line) as CouncilEvent;
        if (event.type === "status") { setActiveAdvisor(event.advisorId); setRound(event.round); }
        if (event.type === "message") {
          setMessages((old) => mergeMessages(old, [event.message]));
          if (event.message.kind === "user") setDraft((previous) => previous === text ? "" : previous);
        }
        if (event.type === "error") throw new Error(event.error);
        if (event.type === "done") { done = true; setRetry(null); }
      };
      while (true) {
        const chunk = await reader.read();
        buffer += decoder.decode(chunk.value, { stream: !chunk.done });
        const lines = buffer.split("\n"); buffer = lines.pop() ?? "";
        lines.forEach(consume);
        if (chunk.done) break;
      }
      consume(buffer);
      if (!done) throw new Error(copy.interrupted);
    } catch (e) {
      if (alive.current) setError(abort.signal.aborted ? copy.interrupted : e instanceof Error ? e.message : copy.error);
    } finally {
      sendingRef.current = false;
      if (alive.current) { setSending(false); setActiveAdvisor(null); }
      if (turnAbort.current === abort) turnAbort.current = null;
      if (conflict && alive.current) { try { await refresh(); } catch { /* retain the original error and draft */ } }
    }
  }, [endpoint, locale, refresh, copy.error, copy.interrupted]);

  useEffect(() => {
    alive.current = true;
    // A cancellable scheduled start avoids duplicate side effects in Strict Mode.
    const timer = setTimeout(() => {
      if (started.current) return;
      started.current = true;
      if (isNew) {
        if (snapshot.room.scene_status === "idle") void generateScene(false);
        if (!snapshot.messages.length) void sendTurn(snapshot.room.initial_question, snapshot.room.id, true);
      }
    }, 0);
    return () => { clearTimeout(timer); alive.current = false; turnAbort.current?.abort(); if (typingTimer.current) clearTimeout(typingTimer.current); };
  }, [generateScene, sendTurn, isNew, snapshot]);
  useEffect(() => {
    if (room.scene_status !== "generating" && !externalBusy) return;
    const timer = setInterval(() => { void refresh().catch(() => { /* visible status stays pending; explicit retry remains available */ }); }, 3000);
    return () => clearInterval(timer);
  }, [room.scene_status, externalBusy, refresh]);
  useEffect(() => {
    const element = messageList.current;
    if (element && nearBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages, activeAdvisor]);

  const mention = (advisorId: string) => {
    const advisor = room.advisors.find((a) => a.id === advisorId);
    if (!advisor) return;
    if (targets.includes(advisorId)) { input.current?.focus(); return; }
    const before = draft.slice(0, caret); const after = draft.slice(caret);
    const start = mentionMatch && options.length ? before.lastIndexOf("@") : caret;
    const prefix = draft.slice(0, start);
    const inserted = `${prefix}${prefix && !/\s$/.test(prefix) ? " " : ""}@${advisor.name} `;
    setDraft(inserted + after); setCaret(inserted.length); setMenuDismissed(true);
    requestAnimationFrame(() => { input.current?.focus(); input.current?.setSelectionRange(inserted.length, inserted.length); });
  };
  const save = async (rename = false) => {
    setSaving(true); setError(null);
    try {
      const result = await councilJson<{ room: Room }>(endpoint, { method: "PATCH", body: JSON.stringify(rename ? { name } : { is_saved: true }) });
      setRoom((r) => ({ ...r, name: result.room.name, is_saved: result.room.is_saved }));
      setEditing(false); onSaved(result.room);
    } catch (e) { setError(e instanceof Error ? e.message : copy.error); }
    finally { setSaving(false); }
  };
  return <Dialog.Root open onOpenChange={(open) => { if (!open && (room.is_saved || window.confirm(copy.leaveUnsaved))) onClose(); }}>
    <Dialog.Portal><Dialog.Backdrop className={styles.backdrop} />
      <Dialog.Popup className={`${styles.modal} ${hideScene ? styles.sceneHidden : ""}`}>
        <CouncilScene room={room} viewer={snapshot.viewer} skills={skills} copy={copy} targets={targets} activeAdvisor={activeAdvisor}
          typing={typing || (sending && !activeAdvisor)} onMention={mention} onRetry={() => void generateScene(true)} error={sceneError} onHide={() => setHideScene(true)} />
        <section className={styles.chat}>
          <header className={styles.chatHeader}>
            <div className={styles.titleRow}>
              <div className="min-w-0 flex-1"><Dialog.Title className={styles.title}>{room.name}</Dialog.Title>
                {editing && <form onSubmit={(e) => { e.preventDefault(); void save(true); }} className={styles.actions}>
                  <input className={styles.input} value={name} maxLength={100} aria-label={copy.name} onChange={(e) => setName(e.target.value)} />
                  <button className={styles.button} disabled={saving || !name.trim()}>{copy.saveName}</button>
                </form>}
              </div>
              <div className={styles.headerActions}>
                <button className={styles.iconButton} aria-label={copy.edit} onClick={() => { setName(room.name); setEditing((v) => !v); }}><Pencil size={16} /></button>
                <button className={styles.button} onClick={() => void save()} disabled={saving || room.is_saved}>
                  {room.is_saved ? <Check size={16} /> : <Save size={16} />}{room.is_saved ? copy.savedLabel : copy.save}</button>
                <Dialog.Close className={styles.iconButton} aria-label={copy.close}><X size={18} /></Dialog.Close>
              </div>
            </div>
            <div className={styles.memberStrip}>{room.advisors.map((a) => <button key={a.id} type="button" aria-label={`@${a.name}`} aria-pressed={targets.includes(a.id)}
              className={`${styles.memberButton} ${targets.includes(a.id) ? styles.tagged : ""} ${activeAdvisor === a.id ? styles.active : ""}`} onClick={() => mention(a.id)}>
              <CouncilOrb name={a.name} skill={skills.find((s) => s.skillId === a.id)} />{a.name}
            </button>)}{hideScene && <button className={styles.button} onClick={() => setHideScene(false)}><ImageIcon size={16} />{copy.showRoom}</button>}</div>
          </header>
          <div ref={messageList} className={styles.messages} role="log" aria-label={copy.room} aria-live="polite" aria-relevant="additions"
            onScroll={(e) => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100; }}>
            {!messages.length && <p className={styles.empty}>{copy.emptyChat}</p>}
            {messages.map((message) => <article key={message.id} className={`${styles.message} ${message.kind === "user" ? styles.userMessage : ""} ${message.kind === "summary" ? styles.summaryMessage : ""}`}>
              <p className={styles.messageName}>{message.kind === "user" ? copy.you : message.kind === "summary" ? copy.summary : message.display_name}</p>
              <div className={styles.bubble}><MindCouncilRichText source={message.content} /></div>
            </article>)}
            <div className={styles.status} role="status">{sending && <><Loader2 size={14} className={styles.spinner} />
              {room.advisors.find((a) => a.id === activeAdvisor)?.name || (activeAdvisor === "council-chair" ? copy.summary : copy.you)} · {copy.thinking}{round > 0 ? ` · ${copy.round} ${round}` : ""}</>}
              {!sending && externalBusy && copy.reconnect}</div>
            {error && <p role="alert" className={styles.error}>{error}</p>}
            {retry && !sending && !externalBusy && <button className={styles.button} onClick={() => void sendTurn(retry.message, retry.id, retry.exchange)}>{copy.retry}</button>}
          </div>
          <form className={styles.composer} onSubmit={(e) => { e.preventDefault(); if (!externalBusy) void sendTurn(draft, crypto.randomUUID(), exchange); }}>
            <div className={styles.recipientRow}><span>{copy.replyingTo}: {targets.length ? room.advisors.filter((a) => targets.includes(a.id)).map((a) => a.name).join(", ") : copy.everyone}</span>
              {targets.length > 0 && <button type="button" className={styles.chip} onClick={() => { const text = removeMentions(draft, room.advisors); setDraft(text); setCaret(text.length); input.current?.focus(); }}>{copy.everyone}</button>}</div>
            <div className={styles.composerBox}>
              {options.length > 0 && <div className={styles.mentionMenu} id="council-mentions" role="listbox" aria-label={copy.choose}>
                {options.map((a, i) => <button key={a.id} id={`mention-${i}`} className={styles.mentionOption} type="button" role="option" aria-selected={i === selectedOption}
                  onPointerDown={(e) => e.preventDefault()} onClick={() => mention(a.id)}>{a.name}</button>)}
              </div>}
              <textarea ref={input} className={styles.input} value={draft} maxLength={4000} rows={2} aria-label={copy.composer}
                aria-controls={options.length ? "council-mentions" : undefined} aria-activedescendant={options.length ? `mention-${selectedOption}` : undefined}
                placeholder={copy.composer} onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
                onBlur={() => { setTyping(false); setMenuDismissed(true); }}
                onChange={(e) => { setDraft(e.target.value); setCaret(e.target.selectionStart); setMenuDismissed(false); setMenuIndex(0); setTyping(true);
                  if (typingTimer.current) clearTimeout(typingTimer.current); typingTimer.current = setTimeout(() => setTyping(false), 1200); }}
                onKeyDown={(e) => {
                  if (e.nativeEvent.isComposing) return;
                  if (options.length && (e.key === "ArrowDown" || e.key === "ArrowUp")) { e.preventDefault(); setMenuIndex((i) => (i + (e.key === "ArrowDown" ? 1 : -1) + options.length) % options.length); }
                  else if (options.length && (e.key === "Enter" || e.key === "Tab")) { e.preventDefault(); mention(options[selectedOption].id); }
                  else if (e.key === "Escape") { setMenuDismissed(true); if (options.length) { e.preventDefault(); e.stopPropagation(); } }
                  else if (e.key === "Enter" && !e.shiftKey && !externalBusy) { e.preventDefault(); void sendTurn(draft, crypto.randomUUID(), exchange); }
                }} />
            </div>
            <div className={styles.composerActions}><label className={styles.exchangeLabel} title={copy.exchangeHint}>
              <input type="checkbox" checked={exchange} onChange={(e) => setExchange(e.target.checked)} />{copy.exchange}</label>
              {sending ? <button type="button" className={styles.button} onClick={() => turnAbort.current?.abort()}><Square size={14} />{copy.stop}</button>
                : <button className={styles.primary} disabled={!draft.trim() || externalBusy}><Send size={16} />{copy.send}</button>}
            </div>
            <Dialog.Description className={styles.disclaimer}>{copy.disclaimer}</Dialog.Description>
          </form>
        </section>
      </Dialog.Popup>
    </Dialog.Portal>
  </Dialog.Root>;
}
