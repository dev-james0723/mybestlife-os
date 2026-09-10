"use client";

import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { useQuery } from "@tanstack/react-query";
import { Fish, Leaf, Waves, RotateCw, X, Check, BookOpen, Sprout, ArrowRight, Eye, SlidersHorizontal } from "lucide-react";
import { useGardenPond } from "@/hooks/use-garden-pond";
import { gardenPondRepository } from "@/lib/repositories/garden-pond";
import { assessPond, pondCells, pondLayoutKey, previewPondPlacement, tracePondRoute, type PondKind, type PondSpecies } from "@/lib/garden/pond";
import type { PondModule, PondSave } from "@/lib/garden/pond-persistence";
import { pondCompanionHint } from "@/lib/garden/pond-companion";
import type { GardenCue } from "@/lib/garden/audio";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import type { PondFrame } from "./pond-world";
import styles from "./pond.module.css";
import PondEvidenceLinks from "./PondEvidenceLinks";
import { pondHabitCalendar } from "@/lib/garden/pond-calendar";

type Props = { userId: string; open: boolean; frameRef: RefObject<PondFrame>; onClose: () => void; sound: (cue: GardenCue) => void; zh: boolean; fallback: boolean; reduced: boolean; buddyName: string | null };
export default function PondPanel({ userId, open, frameRef, onClose, sound, zh, fallback, reduced, buddyName }: Props) {
  const language = useAppStore((state) => state.language);
  const pond = useGardenPond(userId, open), world = pond.data?.world;
  const [tab, setTab] = useState<"arrange" | "observe" | "life">("arrange");
  const [focused, setFocused] = useState(false);
  const [selected, setSelected] = useState<string>("starter-reed-2"), [slot, setSlot] = useState<number | null>(null), [rotation, setRotation] = useState(0);
  const [recipe, setRecipe] = useState<PondKind>("reed"), [grantChoice, setGrant] = useState<string | null>(null);
  const [anchors, setAnchors] = useState<number[]>([]), [routeDone, setRouteDone] = useState(-1);
  const [guided, setGuided] = useState<{ version: number; anchors: number[]; path: number[]; layout: string } | null>(null);
  const [clock, setClock] = useState(0), [gratitudeSources, setGratitudeSources] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState(""), [kind, setKind] = useState<PondModule>("rest"), [source, setSource] = useState(""), [title, setTitle] = useState("");
  const [editing, setEditing] = useState<{ id: string; version: number } | null>(null);
  const [scope, setScope] = useState<"completion" | "chosen_step">("completion"), [plannedFor, setPlannedFor] = useState("");
  const intentionForm = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const lastRevision = useRef<number | null>(null), lastDiscoveries = useRef<number | null>(null);
  const connections = pond.data?.connections ?? [];
  const choices = useQuery({ queryKey: ["garden", userId, "pond-choices", connections, world?.revision], queryFn: () => gardenPondRepository.choices(userId, connections), enabled: open && connections.length > 0 && (tab === "life" || (tab === "arrange" && !!pond.data?.grants.some(item => item.id === grantChoice || item.consumed_by === selected))), staleTime: 15_000 });
  const t = (en: string, chinese: string) => zh ? chinese : en;
  const kinds: Record<PondKind, string> = { reed: t("Shore reeds", "岸草"), leaf: t("Lily leaf", "浮葉"), stone: t("Flow stone", "導流石"), perch: t("Quiet perch", "棲息點") };
  const species: Record<PondSpecies, string> = { dawnfish: t("Dawnfish", "晨光魚"), leafsnail: t("Leaf snail", "葉影螺"), dragonfly: t("Bluewing", "藍翅蜻蜓") };
  const modules: Record<PondModule, string> = { task: t("Tasks", "任務"), habit: t("Habits", "習慣"), gratitude: t("Gratitude", "感謝"), rest: t("Chosen rest", "自選休息") };
  const locked = !pond.storageReady || !!pond.pending || pond.sending;
  const habitat = world ? assessPond(world.objects, world.discoveries) : null;
  const cells = world ? pondCells(world.objects) : [];
  const freeGrants = pond.data?.grants.filter((item) => !item.consumed_by) ?? [];
  const grant = freeGrants.some((item) => item.id === grantChoice) ? grantChoice : null;
  const selectionId = pond.data?.grants.find((item) => item.id === grantChoice)?.consumed_by ?? selected;
  const selectedObject = world?.objects.find((item) => item.id === selectionId);
  const selectedTaskChoice = kind === "task" ? choices.data?.tasks.find((task) => task.id === source) : undefined;
  const selectedGrant = pond.data?.grants.find((item) => item.id === (grant ?? selectedObject?.grant_id));
  const selectedIntention = pond.data?.intentions.find(item => item.id === selectedGrant?.intention_id);
  const companionHint = pond.data ? pondCompanionHint(pond.data, tab) : null;
  const routeObserved = !!guided && routeDone === guided.version && guided.anchors.join(",") === anchors.join(",") && !!world && guided.layout === pondLayoutKey(world.objects);
  const currentRoute = guided && world && guided.anchors.join(",") === anchors.join(",") && guided.layout === pondLayoutKey(world.objects) ? guided.path : null;
  const chooseSlot = useCallback((value: number) => {
    if (tab === "observe") {
      setAnchors((current) => current.length >= 3 ? [value] : [...current, value]);
    } else if (tab === "arrange") setSlot(value);
  }, [tab]);
  useEffect(() => {
    if (open) panelRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    const frame = frameRef.current;
    frame.open = open;
    frame.activity = tab;
    frame.onSlot = chooseSlot;
    frame.onRouteComplete = setRouteDone;
    return () => { frame.open = false; frame.onSlot = null; frame.onRouteComplete = undefined; };
  }, [open, frameRef, chooseSlot, tab]);
  useEffect(() => { frameRef.current.anchors = anchors; }, [anchors, frameRef]);
  useEffect(() => {
    if (!open) return;
    const tick = () => setClock(Date.now());
    const initial = window.setTimeout(tick, 0), timer = window.setInterval(tick, 15_000);
    return () => { window.clearTimeout(initial); window.clearInterval(timer); };
  }, [open]);
  useEffect(() => {
    if (!world) return;
    frameRef.current.world = world;
    if (lastRevision.current !== null && world.revision > lastRevision.current && pond.pending) sound("confirm");
    if (lastDiscoveries.current !== null && world.discoveries.length > lastDiscoveries.current) {
      sound("discover"); emitOSBuddyEvent({ type: "garden:achievement", achievement: "discover" });
    }
    lastRevision.current = world.revision; lastDiscoveries.current = world.discoveries.length;
  }, [world, frameRef, sound, pond.pending]);
  useEffect(() => {
    frameRef.current.selectedSlot = slot;
    frameRef.current.ghost = slot === null ? null : grant ? { id: `pending:${grant}`, kind: recipe, slot, rotation, grant_id: grant } : selectedObject ? { ...selectedObject, slot, rotation } : null;
  }, [slot, rotation, selectedObject, frameRef, grant, recipe]);
  const close = () => { frameRef.current.open = false; onClose(); };
  function editIntention(intention: PondSave["intentions"][number]) {
    setEditing({ id: intention.id, version: intention.version });
    setKind(intention.source_kind); setSource(intention.source_id ?? ""); setTitle(intention.title);
    setScope(intention.scope); setPlannedFor(intention.planned_for ?? "");
    intentionForm.current?.scrollIntoView({ block: "nearest" });
  }
  function clearIntentionEditor() { setEditing(null); setSource(""); setTitle(""); setScope("completion"); setPlannedFor(""); }
  async function saveIntention() {
    const fields = { source_kind: kind, source_id: source || null, title, scope: kind === "task" ? scope : "completion" as const, planned_for: plannedFor || null, ...(kind === "habit" ? { source_calendar: pondHabitCalendar() } : {}) };
    const saved = editing
      ? await pond.execute({ kind: "intention", action: "revise", intention_id: editing.id, intention_version: editing.version, ...fields })
      : await pond.execute({ kind: "select", ...fields });
    if (saved) { clearIntentionEditor(); setNotice(t("Your step is saved. You can adjust it as life changes.", "已記下這一小步，生活改變時可以再調整。")); }
  }
  function guide() {
    if (!world) return;
    const route = tracePondRoute(anchors, world.objects);
    if (!route.ok) {
      setNotice(route.reason === "blocked" ? t("A plant or stone blocks this route. Leave connected water between your ripples.", "植物或石頭擋住了路，試著留下連接的水面。") : t("Choose three different water positions with a bend between them.", "選三個不同的水面位置，讓路線帶一個轉彎。")); return;
    }
    frameRef.current.route = route.path; frameRef.current.routeVersion++;
    setGuided({ version: frameRef.current.routeVersion, anchors: [...anchors], path: route.path, layout: pondLayoutKey(world.objects) });
    if (reduced || fallback) setRouteDone(frameRef.current.routeVersion);
    setNotice(reduced || fallback
      ? t("Your route is shown in position order. You can record this observation without watching motion or listening for a cue.", "路線已按位置順序列出，不用追蹤動畫或聆聽提示，也可以記下這次觀察。")
      : t("Watch the fish follow your route. Then record the observation.", "看看魚怎樣沿著你選的水道前進，再記下這次觀察。")); sound("refill");
  }
  async function place() {
    if (!world || slot === null) return;
    if (grant) {
      if (cells[slot]) { setNotice(t("That position is occupied. Choose water or store the existing object first.", "這個位置已有物件，請另選水面，或先把原物件收回工具盤。")); return; }
      const confirmed = await pond.execute({ kind: "build", grant_id: grant, recipe, slot, rotation });
      if (confirmed) {
        const built = confirmed.world.objects.find((object) => object.grant_id === grant);
        if (built) { setSelected(built.id); setSlot(built.slot); setGrant(null); }
        setNotice(t("Your chosen step is now part of this pond.", "你選的一小步，已經成為魚塘的一部分。"));
      }
    } else {
      try { previewPondPlacement(world, selectionId, slot, rotation); }
      catch (error) { setNotice(error instanceof Error ? error.message : t("Choose a free position.", "請選空位置。")); return; }
      await pond.execute({ kind: "move", object_id: selectionId, slot, rotation });
    }
  }
  if (!open) return null;
  return <aside ref={panelRef} tabIndex={-1} className={styles.panel} aria-label={t("Living pond", "活水魚塘")} data-pond-panel data-fallback={fallback} data-activity={tab} data-focused={focused && tab !== "life" && !fallback}>
    <header className={styles.heading}><div><span>MY GARDEN · LIVING WATER</span><h2>{t("A little life, taking shape.", "讓一角生命，慢慢成形。")}</h2></div><button onClick={close} aria-label={t("Return to garden", "返回花園")}><X size={18}/></button></header>
    {!world ? <div className={styles.content}><p>{pond.isError ? t("Your pond connection is not ready. Your existing garden is safe.", "魚塘暫時未能連接，你原有的花園仍然保留。") : t("Opening your saved pond…", "正在打開你的魚塘…")}</p>{pond.isError && <button onClick={() => void pond.refetch()}>{t("Retry connection", "重試連接")}</button>}</div> : <>
      <nav className={styles.tabs} aria-label={t("Pond activities", "魚塘活動")}>
        <button aria-pressed={tab === "arrange"} onClick={() => { setTab("arrange"); setNotice(""); }}><Sprout size={16}/>{t("Arrange", "佈置")}</button>
        <button aria-pressed={tab === "observe"} onClick={() => { setTab("observe"); setNotice(""); }}><Fish size={16}/>{t("Observe", "觀察")}</button>
        <button aria-pressed={tab === "life"} onClick={() => { setTab("life"); setNotice(""); }}><Leaf size={16}/>{t("My next step", "生活的一步")}</button>
      </nav>
      {!fallback && tab !== "life" && <button className={styles.focusToggle} aria-expanded={!focused} aria-controls="pond-activity-tools" onClick={() => setFocused(value => !value)}>{focused ? <SlidersHorizontal size={16}/> : <Eye size={16}/>} {focused ? t("Show pond tools", "打開魚塘工具") : t("Focus on pond", "專心看魚塘")}</button>}
      <div id="pond-activity-tools" className={styles.content} hidden={focused && tab !== "life" && !fallback}>
        <p className={styles.save} role="status">{pond.pending ? t("Change kept · awaiting confirmation", "已保留操作 · 等待同步確認") : t("Saved to your account", "已儲存於帳戶")}</p>
        {pond.syncError && <div className={styles.message} role="alert"><p>{pond.syncError}</p><button onClick={() => void pond.flush()} disabled={pond.sending}>{t("Retry sync", "重試同步")}</button>{pond.canDiscard && <button onClick={() => void pond.discard()}>{t("Clear proposed change", "取消這次未儲存的操作")}</button>}</div>}
        {tab === "arrange" && <>
          <p>{t("Place a reed, leave a waterway. Existing objects are always yours to rearrange.", "種一株岸草，留一條水道。已有物件可以隨時免費重新佈置。")}</p>
          <div className={styles.inventory}>{world.objects.map((object) => <button key={object.id} aria-pressed={!grant && selectionId === object.id} onClick={() => { setSelected(object.id); setGrant(null); setRotation(object.rotation); setSlot(object.slot); }}><span>{kinds[object.kind]}</span><small>{object.slot === null ? t("In your kit", "工具盤內") : t(`Position ${object.slot + 1}`, `位置 ${object.slot + 1}`)}</small></button>)}</div>
          {!!freeGrants.length && <label className={styles.field}>{t("Build from a life opportunity", "使用生活建設機會")}<select aria-label={t("Build from a life opportunity", "使用生活建設機會")} value={grant ?? ""} onChange={(event) => setGrant(event.target.value || null)}><option value="">{t("Rearrange owned objects", "重新佈置已有物件")}</option>{freeGrants.map((item) => <option key={item.id} value={item.id}>{modules[item.source_kind]} · {pond.data?.intentions.find((i) => i.id === item.intention_id)?.title ?? t("A step you chose", "自己選的一步")}</option>)}</select></label>}
          {grant && <label className={styles.field}>{t("Choose what to build", "想建造甚麼")}<select aria-label={t("Choose what to build", "想建造甚麼")} value={recipe} onChange={(event) => setRecipe(event.target.value as PondKind)}>{Object.entries(kinds).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></label>}
          <div className={styles.actions}><button onClick={() => setRotation((rotation + 1) % 4)}><RotateCw size={16}/>{t("Rotate", "旋轉")} {rotation * 90}°</button><button disabled={locked || slot === null} onClick={() => void place()} className={styles.primary}><Check size={16}/>{t("Place here", "放在這裡")}</button>{!grant && selectedObject?.slot !== null && <button disabled={locked} onClick={() => void pond.execute({ kind: "move", object_id: selectionId, slot: null, rotation })}>{t("Return to kit", "收回工具盤")}</button>}</div>
          {selectedObject?.grant_id && <p className={styles.origin}>{t("This object came from", "這件物件來自")} {pond.data?.intentions.find((i) => i.id === pond.data?.grants.find((g) => g.id === selectedObject.grant_id)?.intention_id)?.title ?? t("a step you chose", "曾經選擇的一小步")}.</p>}
          {selectedGrant && <p className={styles.quiet}>{selectedGrant.evidence_kind === "self_report" ? t("From a step you personally confirmed.", "來自你自己確認的一次行動。") : t("From a completion saved in your life module.", "來自生活模組內已儲存的完成紀錄。")}</p>}
          {selectedIntention?.source_kind === "habit" && <p className={styles.quiet}>{t("Habit day:", "習慣日期：")} {selectedIntention.occurrence} · {selectedIntention.zone_at_selection}</p>}
          {pond.data && selectedIntention && <PondEvidenceLinks save={pond.data} intention={selectedIntention} choices={choices.data} execute={pond.execute} refresh={() => void choices.refetch()} locked={locked} loadFailed={choices.isError} zh={zh} />}
        </>}
        {tab === "observe" && <>
          <p>{t("Choose three water positions. Guide the fish around a bend, then record what you notice.", "選三個水面位置，引導魚繞過轉彎，再記下你的發現。")}</p>
          <div className={styles.actions}><span>{anchors.map((s) => s + 1).join(" → ") || t("Pick your first ripple", "選第一道水紋")}</span><button onClick={() => setAnchors([])}>{t("Start again", "重新選擇")}</button><button className={styles.primary} onClick={guide} disabled={anchors.length !== 3}><Waves size={16}/>{t("Guide fish", "引導魚群")}</button></div>
          {currentRoute && <p className={styles.quiet} role="status" aria-label={t("Fish route", "魚群路線")} data-pond-route={currentRoute.join(",")}><strong>{t("Fish route", "魚群路線")}</strong> · {currentRoute.map((position) => position + 1).join(" → ")}</p>}
          <div className={styles.species}>{(["dawnfish", "leafsnail", "dragonfly"] as const).map((animal) => <div key={animal}><div><strong>{species[animal]} {world.discoveries.includes(animal) && "✓"}</strong><small>{animal === "dawnfish" ? t(`${habitat?.largestOpenWater} connected water positions · guide a bend`, `${habitat?.largestOpenWater} 格連接水面 · 引導轉彎`) : animal === "leafsnail" ? t("Two neighbouring reeds with open water beside them", "兩株相鄰岸草，旁邊留水面") : t("Fish + snail observed · perch, leaf and two water positions", "已觀察魚與螺 · 棲息點、葉影及兩格水面")}</small></div><button disabled={locked || !habitat?.[animal] || (animal === "dawnfish" && !routeObserved)} onClick={() => void pond.execute({ kind: "observe", species: animal, anchors: animal === "dawnfish" ? anchors : [] })}><BookOpen size={16}/>{t("Record", "記錄")}</button></div>)}</div>
          {world.fish_ready_at && <div className={styles.message}><p>{world.fish_adult ? t("Your first fish have grown. Their progress stays with you.", "第一批魚長大了。牠們的成長會一直保留。") : t("Your first observation started their growth. Check whenever you like; nothing is lost if you are away.", "第一次觀察啟動了成長。方便時再來看看，離開不會失去成果。")}</p>{!world.fish_adult && <button disabled={locked || Date.parse(world.fish_ready_at) > clock} onClick={() => void pond.execute({ kind: "grow" })}>{t("See their growth", "看看成長")}</button>}</div>}
        </>}
        {tab !== "life" && <details open={fallback || undefined} className={styles.positions}><summary>{fallback ? t("Accessible pond positions", "魚塘位置操作") : t("Choose a position with buttons", "用按鈕選擇位置")}</summary><div className={styles.grid}>{Array.from({ length: 12 }, (_, position) => <button key={position} aria-pressed={tab === "observe" ? anchors.includes(position) : slot === position} onClick={() => chooseSlot(position)} aria-label={t(`Position ${position + 1}, ${cells[position] ? kinds[cells[position]!] : "water"}`, `位置 ${position + 1}，${cells[position] ? kinds[cells[position]!] : "水面"}`)}><span>{cells[position] ? kinds[cells[position]!] : t("Water", "水面")}</span><small>{position + 1}</small></button>)}</div></details>}
        {tab === "life" && <>
          <p>{t("Choose one useful step. A confirmed action can add one object; you decide what and where. You can skip today and keep playing.", "選一件對自己有用的小事，完成後可以添一件物件，由你決定種類與位置。今天也可以略過，繼續遊玩。")}</p>
          <details><summary>{t("Connected life modules", "連接的生活模組")}</summary>{(Object.keys(modules) as PondModule[]).map((module) => <label className={styles.check} key={module}><input type="checkbox" checked={pond.data?.connections.includes(module) ?? false} disabled={locked} onChange={(event) => void pond.execute({ kind: "connections", modules: event.target.checked ? [...(pond.data?.connections ?? []), module] : (pond.data?.connections ?? []).filter((m) => m !== module) })}/>{modules[module]}</label>)}<small>{t("Only completion facts are connected. Journal text and emotions are never scored.", "只連接完成紀錄，不替日記內容或情緒打分。")}</small></details>
          <label className={styles.check}><input type="checkbox" checked={pond.data?.invitations.enabled ?? false} disabled={locked} onChange={(event) => void pond.execute({ kind: "buddy-settings", enabled: event.target.checked })}/>{t("Buddy invitations for new pond changes", "讓 Buddy 邀請我看看魚塘的新變化")}</label>
          <p className={styles.quiet}>{t("Only while the OS is open. Uses your Garden quiet hours and OS notification settings, with at most one invitation in 24 hours and three in seven days.", "只會在 OS 開啟時出現，遵守花園安靜時段及 OS 通知設定；24 小時最多一次、七天最多三次。")}</p>
          {pond.data?.invitations.pause_until && <p className={styles.quiet}>{t("Invitations are taking a break. You can turn them off, or resume when you want.", "主動邀請正在休息。你可以關閉，或在想收到時重新開啟。")}</p>}
          {pond.data?.intentions.filter((i) => i.status === "active" || i.status === "paused").map((i) => <div className={styles.intention} key={i.id} data-intention={i.id} data-status={i.status}>
            <strong>{i.title}</strong><small>{modules[i.source_kind]}</small>
            {i.status === "paused" && <p>{t("Taking a break · resume whenever it fits", "先放一放 · 合適時再繼續")}</p>}
            {i.planned_for && <small>{t("When it fits:", "預計安排：")} {i.planned_for}</small>}
            {i.source_kind === "habit" && <small>{t("Selected habit day:", "這次選定的習慣日期：")} {i.occurrence} · {i.zone_at_selection}</small>}
            {i.scope === "chosen_step" && <small>{t("A part you chose · confirmed by you", "你選的一小部分 · 由你自己確認")}</small>}
            {!i.source_id && (i.source_kind === "task" || i.source_kind === "habit") && <small>{t("The original record was removed. You can use a linked saved action, or adjust this step.", "原本的紀錄已移除。可以使用關聯的已保存行動，或調整這一步。")}</small>}
            {i.source_kind === "gratitude" && !i.source_id && <label className={styles.field}>{t("Choose the gratitude record you saved", "選擇剛儲存的感謝紀錄")}
              <select aria-label={t("Choose the gratitude record you saved", "選擇剛儲存的感謝紀錄")} value={gratitudeSources[i.id] ?? ""} onChange={(event) => setGratitudeSources((current) => ({ ...current, [i.id]: event.target.value }))}>
                <option value="">{t("Select a saved record", "選擇已儲存的紀錄")}</option>
                {choices.data?.gratitude?.filter((record) => Date.parse(record.created_at) >= Date.parse(i.selected_at)).map((record) => <option key={record.id} value={record.id}>{t("Saved", "儲存於")} {new Date(record.created_at).toLocaleString(zh ? "zh-TW" : "en-US")}</option>)}
              </select>
              <button onClick={() => void choices.refetch()}>{t("Refresh saved records", "重新讀取紀錄")}</button>
            </label>}
            <div className={styles.actions}>
              {i.source_kind !== "rest" && <Link href={withAppLocalePrefix(language, i.source_kind === "task" ? "/tasks" : i.source_kind === "habit" ? "/habits" : "/grateful-things")}>{t("Open life module", "打開生活模組")} <ArrowRight size={14}/></Link>}
              {i.status === "active" && <button disabled={locked || ((i.source_kind === "task" || i.source_kind === "habit") && !i.source_id) || (i.source_kind === "gratitude" && !i.source_id && !gratitudeSources[i.id])} onClick={() => void pond.execute({ kind: "claim", intention_id: i.id, intention_version: i.version, ...(i.source_kind === "rest" || i.scope === "chosen_step" ? { confirmed: true } : {}), ...(i.source_kind === "gratitude" && !i.source_id ? { source_id: gratitudeSources[i.id] } : {}) })}>{i.scope === "chosen_step" ? t("I did this chosen part", "我完成了這一小部分") : i.source_kind === "rest" ? t("I did my chosen rest", "我完成了自己選的休息") : t("Check my saved action", "確認已儲存的行動")}</button>}
              <button disabled={locked} onClick={() => void pond.execute({ kind: "intention", action: i.status === "paused" ? "resume" : "pause", intention_id: i.id, intention_version: i.version })}>{i.status === "paused" ? t("Resume step", "繼續這一步") : t("Pause step", "先暫停")}</button>
              <button disabled={locked} onClick={() => editIntention(i)}>{t("Adjust step", "調整這一步")}</button>
              <button disabled={locked} onClick={() => void pond.execute({ kind: "skip", intention_id: i.id, intention_version: i.version })}>{t("Skip this step", "略過這一步")}</button>
            </div>
            {pond.data && <PondEvidenceLinks save={pond.data} intention={i} choices={choices.data} execute={pond.execute} refresh={() => void choices.refetch()} locked={locked} loadFailed={choices.isError} zh={zh} />}
          </div>)}
          <div ref={intentionForm} data-intention-editor>
          {editing && <p>{t("Adjusting your selected step. Its identity and earned garden progress stay intact.", "正在調整同一小步，花園已有成果會保留。")}</p>}
          <label className={styles.field}>{t("Choose a source", "選擇來源")}<select aria-label={t("Choose a source", "選擇來源")} value={kind} onChange={(event) => { setKind(event.target.value as PondModule); setSource(""); setScope("completion"); if (event.target.value === "gratitude") setTitle(t("Notice one thing I appreciate", "記下一件值得感謝的事")); }}><option value="rest">{modules.rest}</option><option value="task">{modules.task}</option><option value="habit">{modules.habit}</option><option value="gratitude">{modules.gratitude}</option></select></label>
          {!connections.includes(kind) && <p className={styles.quiet}>{t("Connect this life module above to choose a step from it.", "先在上方連接這個生活模組，再選一件想做的事。")}</p>}
          {connections.includes(kind) && (choices.isError || (kind === "task" && choices.data?.tasksAvailable === false) || (kind === "habit" && choices.data?.habitsAvailable === false) || (kind === "gratitude" && choices.data?.gratitudeAvailable === false)) && <p className={styles.message} role="status">{t("This life module could not be loaded. Try refreshing, or choose another kind of step.", "暫時未能讀取這個生活模組。可以重新讀取，或先選另一種小步。")} <button onClick={() => void choices.refetch()}>{t("Retry", "重新讀取")}</button></p>}
          {(kind === "task" || kind === "habit") && <label className={styles.field}>{t("Your action", "你的行動")}<select aria-label={t("Your action", "你的行動")} value={source} onChange={(event) => { setSource(event.target.value); const item = event.target.selectedOptions[0], task = choices.data?.tasks.find((choice) => choice.id === event.target.value); setTitle(kind === "task" ? task?.title ?? "" : item.textContent ?? ""); if (task?.recorded_today) setScope("completion"); }}><option value="">{t("Select one", "選一件")}</option>{editing && source && !(kind === "task" ? choices.data?.tasks : choices.data?.habits)?.some((item) => item.id === source) && <option value={source}>{t("Current linked action", "目前連結的行動")}</option>}{kind === "task" ? choices.data?.tasks?.map((task) => <option key={task.id} value={task.id}>{task.title}{task.recorded_today ? t(" · Recorded today", " · 今天已完成") : ""}</option>) : choices.data?.habits?.map((habit) => <option key={habit.id} value={habit.id}>{habit.name}</option>)}</select></label>}
          {(kind === "task" || kind === "habit") && connections.includes(kind) && <button disabled={choices.isFetching} onClick={() => void choices.refetch()}>{t("Refresh actions", "重新讀取行動")}</button>}
          {selectedTaskChoice?.recorded_today && <p className={styles.quiet}>{t("This completion was saved while Tasks was connected, within today’s garden window. Choose it, then check the saved action to bring it into your pond.", "這項完成紀錄是在連接 Tasks 後、今天的花園時段內保存的。選定後確認已儲存的行動，就能把這一步連到魚塘。")}</p>}
          <label className={styles.field}>{t("The small step I choose", "我想做的一小步")}<input value={title} maxLength={180} onChange={(event) => setTitle(event.target.value)} placeholder={t("For example, take a walk", "例如：出去散步一會")}/></label>
          {kind === "task" && !selectedTaskChoice?.recorded_today && <label className={styles.check}><input type="checkbox" checked={scope === "chosen_step"} onChange={(event) => setScope(event.target.checked ? "chosen_step" : "completion")}/>{t("I am choosing just part of this task", "我想先完成這項任務的一小部分")}</label>}
          {kind === "task" && scope === "chosen_step" && <p className={styles.quiet}>{t("Name the part above and confirm it yourself when done. Your task stays unchanged. This part and the later full task share one building opportunity.", "在上方寫下這次想做的部分，完成後由你確認，原任務狀態不會改動。這一小部分和之後整項任務完成，共用一次建設機會。")}</p>}
          <label className={styles.field}>{t("Planned date (optional)", "預計日期（可留空）")}<input type="date" value={plannedFor} onChange={(event) => setPlannedFor(event.target.value)}/></label>
          {editing && kind === "habit" && <p className={styles.quiet}>{t("Changing your plan keeps the original habit occurrence. Choose a new step for a new habit day.", "改安排會保留原本選定的那次習慣；想做新一天的習慣，可以另外選一小步。")}</p>}
          {!editing && kind === "habit" && <p className={styles.quiet}>{t("Today's Habit check-in on this device:", "這部裝置上的今日習慣打卡：")} {pondHabitCalendar().date}</p>}
          <div className={styles.actions}><button className={styles.primary} disabled={locked || !title.trim() || ((kind === "task" || kind === "habit") && !source) || !pond.data?.connections.includes(kind)} onClick={() => void saveIntention()}>{editing ? t("Save step changes", "儲存這次調整") : t("Choose this step", "選這一小步")}</button>{editing && <button onClick={clearIntentionEditor}>{t("Cancel adjustment", "取消調整")}</button>}</div>
          </div>
          <p className={styles.quiet}>{t("Up to two building opportunities in 24 hours and six in seven days. Further actions are acknowledged without extra objects. Earned opportunities never expire.", "24 小時內最多兩次建設機會，七天內最多六次；之後的生活行動仍會記下，已有機會不會過期。")}</p>
        </>}
        {notice && <p role="status" className={styles.message}>{notice}</p>}
        {buddyName && companionHint && <p className={styles.buddy}><strong>{buddyName}</strong> {t(companionHint.en, companionHint.zh)}</p>}
      </div>
    </>}
  </aside>;
}
