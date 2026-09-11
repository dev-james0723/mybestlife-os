"use client";
/* eslint-disable @next/next/no-img-element -- Room thumbnails use an authenticated same-origin image route. */
import { useRef, useState } from "react";
import { Check, Loader2, Plus, Sparkles, Users } from "lucide-react";
import type { MindSkill } from "@/lib/mind-council/types";
import type { MindCouncilUiCopy } from "@/lib/i18n/mind-council-ui";
import { advisorDisplayName } from "@/lib/mind-council/conversation-contract";
import { MAX_COUNCIL_ADVISORS, type CouncilRoom as Room, type CouncilViewer } from "@/lib/mind-council/room-contract";
import { roomCopy } from "@/lib/mind-council/room-copy";
import { AdvisorPortrait } from "./AdvisorPortrait";
import { SkillLibrary } from "./SkillLibrary";
import { CouncilRoom, councilJson, type CouncilSnapshot } from "./CouncilRoom";
import styles from "./CouncilRoom.module.css";
type Tab = "create" | "saved" | "library";
export function CouncilWorkspace({ skills, ui, locale, onChat, onProfile, onCreateAdvisor }: {
  skills: MindSkill[]; ui: MindCouncilUiCopy; locale: string; onChat: (skill: MindSkill) => void;
  onProfile: (skill: MindSkill) => void; onCreateAdvisor: () => void;
}) {
  const copy = roomCopy(locale);
  const [tab, setTab] = useState<Tab>("create");
  const [question, setQuestion] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [recommended, setRecommended] = useState<string[]>([]);
  const [rationale, setRationale] = useState("");
  const [manual, setManual] = useState(false);
  const [search, setSearch] = useState("");
  const [template, setTemplate] = useState("surprise");
  const [recommending, setRecommending] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Room[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [active, setActive] = useState<{ snapshot: CouncilSnapshot; isNew: boolean } | null>(null);
  const recommendationAbort = useRef<AbortController | null>(null);
  const creation = useRef<{ signature: string; id: string } | null>(null);
  const creatingRef = useRef(false);
  const add = (id: string) => setSelected((old) => old.includes(id) || old.length >= MAX_COUNCIL_ADVISORS ? old : [...old, id]);
  const toggle = (id: string) => setSelected((old) => old.includes(id) ? old.filter((x) => x !== id) : old.length < MAX_COUNCIL_ADVISORS ? [...old, id] : old);
  const recommend = async () => {
    if (!question.trim()) return;
    recommendationAbort.current?.abort();
    const abort = new AbortController(); recommendationAbort.current = abort;
    setRecommending(true); setError(null);
    try {
      const result = await councilJson<{ recommendedSkillIds?: string[]; rationale?: string }>("/api/mind-council/recommend", {
        method: "POST", signal: abort.signal, body: JSON.stringify({ query: question, locale }),
      });
      if (abort.signal.aborted) return;
      const ids = [...new Set(result.recommendedSkillIds ?? [])].filter((id) => skills.some((s) => s.skillId === id)).slice(0, MAX_COUNCIL_ADVISORS);
      setRecommended(ids); setSelected(ids); setRationale(result.rationale ?? ""); setManual(false);
      if (!ids.length) setManual(true);
    } catch (e) { if (!abort.signal.aborted) setError(e instanceof Error ? e.message : copy.error); }
    finally { if (recommendationAbort.current === abort) setRecommending(false); }
  };
  const loadSaved = async (more = false) => {
    setLoadingSaved(true); setError(null);
    try {
      const result = await councilJson<{ rooms: Room[]; nextCursor: string | null }>(`/api/mind-council/rooms${more && nextCursor ? `?before=${encodeURIComponent(nextCursor)}` : ""}`);
      setSaved((old) => more ? [...old, ...result.rooms.filter((r) => !old.some((x) => x.id === r.id))] : result.rooms);
      setNextCursor(result.nextCursor);
    } catch (e) { setError(e instanceof Error ? e.message : copy.error); }
    finally { setLoadingSaved(false); }
  };
  const openRoom = async (id: string) => {
    setError(null); setLoadingSaved(true);
    try { setActive({ snapshot: await councilJson<CouncilSnapshot>(`/api/mind-council/rooms/${id}`), isNew: false }); }
    catch (e) { setError(e instanceof Error ? e.message : copy.error); }
    finally { setLoadingSaved(false); }
  };
  const run = async () => {
    if (!question.trim() || selected.length < 2 || creatingRef.current) return;
    creatingRef.current = true; setCreating(true); setError(null);
    const signature = JSON.stringify({ question, selected, template });
    if (creation.current?.signature !== signature) creation.current = { signature, id: crypto.randomUUID() };
    try {
      const result = await councilJson<{ room: Room; viewer: CouncilViewer }>("/api/mind-council/rooms", {
        method: "POST", body: JSON.stringify({ id: creation.current.id, advisorIds: selected, question, template }),
      });
      const snapshot = await councilJson<CouncilSnapshot>(`/api/mind-council/rooms/${result.room.id}`);
      setActive({ snapshot, isNew: snapshot.messages.length === 0 });
      creation.current = null;
    } catch (e) { setError(e instanceof Error ? e.message : copy.error); }
    finally { creatingRef.current = false; setCreating(false); }
  };
  const visibleSkills = (manual ? skills : recommended.map((id) => skills.find((s) => s.skillId === id)).filter((s): s is MindSkill => Boolean(s)))
    .filter((s) => !manual || `${s.lensTitle} ${s.lensSubtitle}`.toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  return <div className={styles.workspace}>
    <nav className={styles.tabs} aria-label={ui.pageTitle}>{(["create", "saved", "library"] as Tab[]).map((value) => <button key={value} type="button" className={styles.tab}
      aria-pressed={tab === value} onClick={() => { setTab(value); setError(null); if (value === "saved") void loadSaved(); }}>{copy[value]}</button>)}</nav>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {tab === "create" && <section className={styles.builder}>
      <div className={styles.progress}>{[copy.start, copy.assemble, copy.room].map((label, i) => <span key={label} className={styles.step}><b>{i + 1}</b>{label}</span>)}</div>
      <h2>{copy.question}</h2><p className={styles.muted}>{copy.intro}</p>
      <textarea className={styles.textarea} aria-label={copy.question} rows={3} maxLength={4000} disabled={creating} placeholder={copy.placeholder} value={question}
        onChange={(e) => { setQuestion(e.target.value); recommendationAbort.current?.abort(); setRecommending(false); setRecommended([]); setRationale(""); }} />
      <div className={styles.actions}>
        <button type="button" className={selected.length >= 2 ? styles.button : styles.primary} onClick={() => void recommend()} disabled={!question.trim() || recommending || creating}>
          {recommending ? <Loader2 size={17} className={styles.spinner} /> : <Sparkles size={17} />}{recommending ? copy.recommending : copy.recommend}</button>
        <button type="button" className={styles.button} onClick={() => setManual((v) => !v)} disabled={creating}><Users size={17} />{copy.choose}</button>
      </div>
      {(manual || recommended.length > 0) && <div className={styles.recommendations} aria-busy={recommending}>
        <div className={styles.actions}><h3 className="text-lg font-semibold">{manual ? copy.choose : copy.recommended}</h3>
          <span className={styles.muted}>{selected.length}/{MAX_COUNCIL_ADVISORS} {copy.chosen}</span></div>
        {!manual && rationale && <p className={`${styles.muted} mt-2`}>{rationale}</p>}
        {manual && <input className={`${styles.input} mt-3`} value={search} placeholder={copy.search} aria-label={copy.search} onChange={(e) => setSearch(e.target.value)} />}
        <div className={styles.cards}>{visibleSkills.map((skill) => <button key={skill.skillId} type="button" className={styles.advisorCard}
          aria-pressed={selected.includes(skill.skillId)} disabled={creating || (!selected.includes(skill.skillId) && selected.length >= MAX_COUNCIL_ADVISORS)} onClick={() => toggle(skill.skillId)}>
          {selected.includes(skill.skillId) && <Check className={styles.check} size={18} />}<AdvisorPortrait skill={skill} className="h-14 w-14" pixelSize={56} rounded="rounded-full" />
          <strong>{advisorDisplayName(skill.lensTitle)}</strong><span className={styles.muted}>{skill.lensSubtitle}</span>
        </button>)}</div>
      </div>}
      {selected.length > 0 && <div className={styles.runBar}>
        <div><div className={styles.selected}>{selected.map((id) => <button key={id} type="button" className={styles.chip} disabled={creating} onClick={() => toggle(id)}>
          {advisorDisplayName(skills.find((s) => s.skillId === id)?.lensTitle ?? id)} ×</button>)}</div>
          <p className={`${styles.muted} mt-2`}>{selected.length}/{MAX_COUNCIL_ADVISORS} {copy.chosen}</p></div>
        <div className={styles.actions}><label className={styles.muted}>{copy.setting} <select className={styles.select} value={template} onChange={(e) => setTemplate(e.target.value)} disabled={creating}>
          <option value="surprise">{copy.surprise}</option><option value="sunset-library">{copy.sunset}</option><option value="garden-room">{copy.garden}</option>
          <option value="city-loft">{copy.loft}</option><option value="coastal-retreat">{copy.coast}</option></select></label>
          <button type="button" className={styles.primary} onClick={() => void run()} disabled={selected.length < 2 || !question.trim() || creating}>
            {creating ? <Loader2 size={17} className={styles.spinner} /> : <Users size={17} />}{creating ? copy.creating : copy.run}</button></div>
      </div>}
      <p className={styles.notice}>{copy.dataNotice} {copy.disclaimer}</p>
    </section>}
    {tab === "saved" && <section aria-label={copy.saved}>
      {!saved.length && !loadingSaved && <p className={styles.empty}>{copy.emptySaved}</p>}
      <div className={styles.savedGrid}>{saved.map((r) => <article key={r.id} className={styles.savedCard}>
        {r.scene_status === "ready" && <img src={`/api/mind-council/rooms/${r.id}/scene?v=${r.scene_version}`} alt={r.name} loading="lazy" className="w-full rounded-xl aspect-[4/3] object-contain" />}
        <h3 className="font-semibold break-words">{r.name}</h3><p className={styles.muted}>{r.advisors.map((a) => a.name).join(" · ")}</p>
        <button className={styles.button} disabled={loadingSaved} onClick={() => void openRoom(r.id)}>{copy.open}</button>
      </article>)}</div>
      {loadingSaved && <p role="status" className={`${styles.muted} mt-4`}>{copy.loading}</p>}
      {nextCursor && <button className={`${styles.button} mt-4`} disabled={loadingSaved} onClick={() => void loadSaved(true)}>{copy.loadMore}</button>}
    </section>}
    {tab === "library" && <section>
      <div className={`${styles.actions} mb-6`}><button className={styles.primary} onClick={onCreateAdvisor}><Plus size={17} />{ui.createSkillTitle}</button>
        {selected.length > 0 && <button className={styles.button} onClick={() => { setTab("create"); setManual(true); }}>{copy.create} · {selected.length}/4</button>}</div>
      <SkillLibrary ui={ui} skills={skills} councilIds={selected} councilFull={selected.length >= MAX_COUNCIL_ADVISORS}
        onChat={onChat} onProfile={onProfile} onAddCouncil={(skill) => add(skill.skillId)} />
    </section>}
    {active && <CouncilRoom key={active.snapshot.room.id} snapshot={active.snapshot} isNew={active.isNew} skills={skills} locale={locale}
      onClose={() => { setActive(null); if (tab === "saved") void loadSaved(); }} onSaved={(updated) => setSaved((old) => [updated, ...old.filter((r) => r.id !== updated.id)])} />}
  </div>;
}
