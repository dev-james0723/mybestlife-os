"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { createPortal } from "react-dom";
import { Component, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, BookOpen, Check, ChevronDown, Droplets, Flower2, Leaf, Loader2, LockKeyhole, Maximize2, Minimize2, Navigation, Pause, Play, RotateCcw, Settings2, Sprout, Star, Sun, Volume2, VolumeX, X } from "lucide-react";
import { useActiveGarden, useGardenCareHistory, useGardenCollection, useGardenInventory, useGardenLifeActivity, useHarvestPlant, useUseFertilizer, useWaterPlant } from "@/hooks/use-garden";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { getGardenGameCopy } from "@/lib/i18n/garden-game-ui";
import { getGardenUiCopy } from "@/lib/i18n/garden-ui";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { POINTS_PER_STAGE } from "@/lib/repositories/garden";
import { boundPoint, createGardenRound, dayBefore, daySeed, gardenDay, gardenMedal, gardenSnapshot, ROUND_SECONDS, stepGarden, type GardenMode, type Point } from "@/lib/garden/game";
import type { GardenRenderer } from "./GardenScene";
import type { GardenPalette } from "./garden-world";
import { SeedSelector } from "./SeedSelector";
import styles from "./garden-game.module.css";

const Scene = dynamic(() => import("./GardenScene"), { ssr: false });
class SceneBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}
function GardenViewport({ expanded, children }: { expanded: boolean; children: ReactNode }) {
  return expanded ? createPortal(children, document.body) : children;
}
type Preferences = { sound: boolean; lowPower: boolean; gentle: boolean; palette: GardenPalette };
const initialPreferences: Preferences = { sound: false, lowPower: false, gentle: false, palette: "meadow" };

export function GardenGame() {
  const language = useAppStore(s => s.language);
  const ui = getGardenGameCopy(language), gardenUi = getGardenUiCopy(language);
  const { colorMode } = useTheme();
  const osReduced = useReducedMotion();
  const [day, setDay] = useState(gardenDay);
  const active = useActiveGarden(), collection = useGardenCollection(), history = useGardenCareHistory(day), activity = useGardenLifeActivity(day);
  const water = useWaterPlant(), harvest = useHarvestPlant();
  const fertilizer = useUseFertilizer(), inventory = useGardenInventory();
  const roundRef = useRef(createGardenRound(day));
  const renderRef = useRef<GardenRenderer | null>(null);
  const keys = useRef(new Set<string>());
  const container = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const [snapshot, setSnapshot] = useState(() => createGardenRound(day));
  const [mode, setMode] = useState<GardenMode>("relaxed");
  const [preferences, setPreferences] = useState(initialPreferences);
  const prefsRef = useRef(preferences);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [sceneKey, setSceneKey] = useState(0);
  const [settings, setSettings] = useState(false);
  const [guide, setGuide] = useState(false);
  const [showSeeds, setShowSeeds] = useState(false);
  const [careSaved, setCareSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const totalCare = history.data?.total ?? 0;
  const fertilizerCount = inventory.data?.find(item => item.item_type === "fertilizer")?.quantity ?? 0;
  const garden = active.data;
  const alreadyWatered = garden?.last_watered_at === day || history.data?.dates.includes(day);
  const startingDew = Number(activity.data?.task ?? false) + Number(activity.data?.journal ?? false);
  const palette = preferences.palette === "lavender" && totalCare >= 3 ? "lavender" : preferences.palette === "autumn" && totalCare >= 7 ? "autumn" : "meadow";
  const reducedMotion = !!osReduced || preferences.gentle;

  const sync = useCallback(() => setSnapshot(gardenSnapshot(roundRef.current)), []);
  const pause = useCallback(() => {
    keys.current.clear();
    if (roundRef.current.phase === "playing") { roundRef.current.phase = "paused"; roundRef.current.target = null; sync(); }
  }, [sync]);
  const sound = useCallback((kind: "pickup" | "bloom" | "win") => {
    const ctx = audioRef.current;
    if (!prefsRef.current.sound || !ctx || ctx.state !== "running") return;
    const notes = kind === "win" ? [523.25, 659.25, 783.99] : kind === "bloom" ? [523.25, 659.25] : [880];
    notes.forEach((frequency, i) => {
      const oscillator = ctx.createOscillator(), gain = ctx.createGain();
      oscillator.type = "sine"; oscillator.frequency.value = frequency;
      const at = ctx.currentTime + i * 0.09;
      gain.gain.setValueAtTime(0, at); gain.gain.linearRampToValueAtTime(0.045, at + 0.012); gain.gain.exponentialRampToValueAtTime(0.001, at + 0.24);
      oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(at); oscillator.stop(at + 0.25);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }, []);
  function unlockAudio() {
    if (!audioRef.current) {
      try { audioRef.current = new AudioContext(); } catch { return; }
    }
    void audioRef.current.resume().catch(() => {});
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("mylifeos:garden-preferences:v1") ?? "null") as Partial<Preferences> | null;
      const next = { sound: saved?.sound === true, lowPower: saved?.lowPower ?? window.matchMedia("(pointer: coarse)").matches, gentle: saved?.gentle === true, palette: ["meadow", "lavender", "autumn"].includes(saved?.palette ?? "") ? saved!.palette! : "meadow" as GardenPalette };
      // Client-only preferences must hydrate after the matching server render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferences(next);
      prefsRef.current = next;
    } catch { /* Storage is optional; account progress remains available. */ }
    setPrefsLoaded(true);
  }, []);
  useEffect(() => {
    prefsRef.current = preferences;
    if (prefsLoaded) try { localStorage.setItem("mylifeos:garden-preferences:v1", JSON.stringify(preferences)); } catch { /* Private browsing can disable storage. */ }
  }, [preferences, prefsLoaded]);
  useEffect(() => {
    let frame = 0, previous = 0, lastUi = 0, revision = -1, phase = "";
    const tick = (time: number) => {
      const round = roundRef.current;
      const dt = previous ? (time - previous) / 1000 : 0; previous = time;
      const down = keys.current;
      const direction = { x: Number(down.has("arrowright") || down.has("d")) - Number(down.has("arrowleft") || down.has("a")), z: Number(down.has("arrowdown") || down.has("s")) - Number(down.has("arrowup") || down.has("w")) };
      const before = round.revision;
      if (!document.hidden) stepGarden(round, dt, direction);
      if (round.revision !== before && (round.signal === "pickup" || round.signal === "bloom" || round.signal === "win")) sound(round.signal);
      renderRef.current?.(round, time);
      if (revision !== round.revision || phase !== round.phase || (round.phase === "playing" && time - lastUi > 150)) {
        revision = round.revision; phase = round.phase; lastUi = time; sync();
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("blur", pause); document.addEventListener("visibilitychange", visibility);
    const timer = window.setInterval(() => setDay(gardenDay()), 10_000);
    return () => { cancelAnimationFrame(frame); clearInterval(timer); window.removeEventListener("blur", pause); document.removeEventListener("visibilitychange", visibility); void audioRef.current?.close().catch(() => {}); audioRef.current = null; };
  }, [pause, sound, sync]);
  useEffect(() => {
    const observer = new IntersectionObserver(entries => { if (!entries[0]?.isIntersecting) pause(); }, { threshold: 0.05 });
    if (container.current?.parentElement) observer.observe(container.current.parentElement);
    if (expanded) container.current?.focus({ preventScroll: true });
    const resize = () => { if (roundRef.current.phase === "playing" && window.innerHeight < 500 && window.innerWidth < 1100) setExpanded(true); };
    window.addEventListener("resize", resize);
    return () => { observer.disconnect(); window.removeEventListener("resize", resize); };
  }, [expanded, pause]);
  useEffect(() => {
    if (!expanded) return;
    const app = document.querySelector<HTMLElement>('[data-app-design="projects"]');
    const wasInert = app?.inert ?? false;
    if (app) app.inert = true;
    return () => {
      if (app) app.inert = wasInert;
      // The portal remounts the canvas container; restore focus to the current DOM node.
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[data-garden-controls]")?.focus({ preventScroll: true }));
    };
  }, [expanded]);

  const onReady = useCallback(() => setSceneReady(true), []);
  const onUnavailable = useCallback(() => { setUnavailable(true); setGuide(true); setSceneReady(true); }, []);
  const onTarget = useCallback((point: Point) => {
    if (roundRef.current.phase !== "playing") return;
    roundRef.current.target = boundPoint(point); sync();
  }, [sync]);
  function start(nextMode = mode) {
    unlockAudio(); keys.current.clear();
    roundRef.current = createGardenRound(gardenDay(), nextMode, startingDew);
    roundRef.current.phase = "playing";
    if (window.innerHeight < 500 && window.innerWidth < 1100) setExpanded(true);
    sync(); container.current?.focus({ preventScroll: true });
  }
  function resume() { unlockAudio(); roundRef.current.phase = "playing"; sync(); container.current?.focus({ preventScroll: true }); }
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return;
    const key = event.key.toLowerCase();
    if (key === "escape") { event.preventDefault(); pause(); if (expanded) setExpanded(false); return; }
    if (!["arrowleft", "arrowright", "arrowup", "arrowdown", "w", "a", "s", "d"].includes(key) || roundRef.current.phase !== "playing") return;
    event.preventDefault(); keys.current.add(key);
  }
  async function saveCare() {
    try { await water.mutateAsync(); setCareSaved(true); } catch { /* Mutation error is shown inline with a retry action. */ }
  }
  const phase = snapshot.phase, blooms = snapshot.beds.filter(b => b.bloomed).length;
  const signal = snapshot.signal === "pickup" ? ui.pickup : snapshot.signal === "bloom" ? ui.bloom : snapshot.signal === "full" ? ui.full : snapshot.signal === "need-dew" ? ui.needDew : "";
  const showGuide = guide || unavailable;
  const fallback = <div className={styles.fallback}><Sprout size={42} /><h3>{ui.fallback}</h3><p>{ui.fallbackBody}</p><button type="button" onClick={() => { setUnavailable(false); setSceneReady(false); setSceneKey(k => k + 1); }}>{ui.retry3d}</button></div>;
  const careButton = garden && garden.growth_stage < 5 ? <button type="button" className={styles.primary} disabled={!!alreadyWatered || water.isPending || fertilizer.isPending} onClick={() => void saveCare()}>{water.isPending ? <Loader2 className="animate-spin" size={17} /> : alreadyWatered ? <Check size={17} /> : <Droplets size={17} />}{water.isPending ? ui.savePending : alreadyWatered ? ui.watered : ui.water}</button> : null;
  const guideControls = <div className={styles.destinations}>
    <p>{ui.helpHint}</p>
    <div>{snapshot.drops.map(d => <button type="button" key={d.id} disabled={d.collected || phase !== "playing" || snapshot.dew >= 3} data-testid={`garden-drop-${d.id}`} onClick={() => onTarget(d)}><Droplets size={15} />{ui.collect} {d.id + 1}{d.collected && <Check size={13} />}</button>)}</div>
    <div>{snapshot.beds.map(b => <button type="button" key={b.id} disabled={b.bloomed || phase !== "playing" || snapshot.dew < 2} data-testid={`garden-bed-${b.id}`} onClick={() => onTarget(b)}><Flower2 size={15} />{ui.tend} {b.id + 1}{b.bloomed && <Check size={13} />}</button>)}</div>
    <p>{snapshot.dew >= 3 ? ui.full : ui.needDew}</p>
  </div>;

  return <section className={styles.garden} data-testid="garden-game" data-phase={phase} data-day={snapshot.day} data-blooms={blooms} data-dew={snapshot.dew}>
    <GardenViewport expanded={expanded}><div className={`${styles.worldPanel} ${expanded ? styles.expanded : ""} ${expanded ? styles.garden : ""}`} data-expanded={expanded} role={expanded ? "dialog" : undefined} aria-modal={expanded || undefined} aria-label={expanded ? ui.access : undefined} onKeyDown={event => {
      if (!expanded) return;
      if (event.key === "Escape") { event.preventDefault(); pause(); setExpanded(false); }
      if (event.key === "Tab") {
        const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), [tabindex="0"]')).filter(el => el.getClientRects().length > 0);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    }}>
      <div className={styles.worldHeading}>
        <div><p className={styles.eyebrow}>{ui.eyebrow}</p><h2>{ui.title}</h2></div>
        <div className={styles.tools}>
          <button type="button" aria-label={expanded ? ui.collapse : ui.expand} aria-pressed={expanded} onClick={() => setExpanded(e => !e)}>{expanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button>
          <button type="button" aria-label={preferences.sound ? ui.soundOff : ui.soundOn} aria-pressed={preferences.sound} onClick={() => { unlockAudio(); setPreferences(p => ({ ...p, sound: !p.sound })); }}>{preferences.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button>
          <button type="button" aria-label={ui.settings} aria-expanded={settings} onClick={() => { pause(); setSettings(s => !s); }}><Settings2 size={18} /></button>
        </div>
      </div>
      {settings && <div className={styles.settings}>
        <div><strong>{ui.settings}</strong><button type="button" aria-label={ui.closeSettings} onClick={() => setSettings(false)}><X size={18} /></button></div>
        <label><input type="checkbox" checked={preferences.lowPower} onChange={e => setPreferences(p => ({ ...p, lowPower: e.target.checked }))} />{ui.lowPower}</label>
        <label><input type="checkbox" checked={preferences.gentle || !!osReduced} disabled={!!osReduced} onChange={e => setPreferences(p => ({ ...p, gentle: e.target.checked }))} />{ui.motion}</label>
        <p>{ui.settingsNote}</p>
      </div>}
      <div ref={container} className={styles.world} tabIndex={0} role="region" aria-label={ui.access} aria-describedby="garden-input-hint" data-garden-controls onKeyDown={onKeyDown} onKeyUp={e => keys.current.delete(e.key.toLowerCase())} onBlur={() => keys.current.clear()}>
        <SceneBoundary key={sceneKey} fallback={<>{fallback}{guideControls}</>}>
          {unavailable ? fallback : <Scene roundRef={roundRef} renderRef={renderRef} dark={colorMode === "dark"} palette={palette} plant={garden?.plant_type ?? "sunflower"} stage={garden?.growth_stage ?? 2} collectionCount={collection.data?.length ?? 0} reducedMotion={reducedMotion} lowPower={preferences.lowPower} onTarget={onTarget} onReady={onReady} onUnavailable={onUnavailable} />}
        </SceneBoundary>
        {!sceneReady && !unavailable && <p className={styles.loading} role="status"><Loader2 className="animate-spin" size={18} />{ui.loading}</p>}
        {(phase === "playing" || phase === "paused") && <div className={styles.hud}>
          <div><span><Droplets size={16} />{snapshot.dew}<small>/ 3</small></span><span><Flower2 size={16} />{blooms}<small>/ 3</small></span>{snapshot.mode === "challenge" && <span role="timer" aria-label={ui.remaining}>{Math.ceil(ROUND_SECONDS - snapshot.elapsed)}s</span>}</div>
          <button type="button" aria-label={phase === "playing" ? ui.pause : ui.resume} onClick={phase === "playing" ? pause : resume}>{phase === "playing" ? <Pause size={17} /> : <Play size={17} />}</button>
        </div>}
        {phase === "playing" && !unavailable && <div className={styles.worldCaption}><span><Leaf size={13} />{ui.trails[daySeed(snapshot.day) % 7]}</span><span>{ui.objective}</span></div>}
      </div>

      <div className={styles.playBar}>
        {phase === "ready" ? <>
          <div className={styles.playIntro}><p>{ui.introduction}</p><div className={styles.modeSwitch} role="group" aria-label={ui.modeHint}><button type="button" aria-pressed={mode === "relaxed"} onClick={() => setMode("relaxed")}><Leaf size={14} />{ui.relaxed}</button><button type="button" aria-pressed={mode === "challenge"} onClick={() => setMode("challenge")}><Sun size={14} />{ui.challenge}</button></div></div>
          <button type="button" className={styles.primary} onClick={() => start()}><Play size={17} />{ui.play}<ArrowRight size={17} /></button>
        </> : phase === "playing" ? <>
          <div><strong>{ui.objective}</strong><p>{ui.instructions}</p></div><button type="button" aria-expanded={showGuide} onClick={() => setGuide(g => !g)}><Navigation size={16} />{ui.help}<ChevronDown size={14} /></button>
        </> : <div className={styles.result} role="status">
          <div><div className={styles.resultIcon}>{phase === "won" ? <Flower2 size={24} /> : <Leaf size={24} />}</div><h3>{phase === "won" ? ui.done : phase === "paused" ? ui.paused : ui.timeout}</h3><p>{phase === "won" ? alreadyWatered ? ui.practiceDone : ui.doneBody : phase === "paused" ? ui.pausedBody : ui.timeoutBody}</p>{phase === "won" && <span className={styles.stars} aria-label={`${gardenMedal(snapshot)} ${ui.medal}`}>{Array.from({ length: gardenMedal(snapshot) }, (_, i) => <Star key={i} size={19} fill="currentColor" />)}</span>}</div>
          <div className={styles.resultActions}>
            {phase === "won" ? <>{careButton}<button type="button" onClick={() => start()}><RotateCcw size={15} />{ui.replay}</button></> : phase === "paused" ? <><button type="button" className={styles.primary} onClick={resume}><Play size={16} />{ui.resume}</button><button type="button" onClick={() => start()}>{ui.restart}</button></> : <><button type="button" className={styles.primary} onClick={() => { roundRef.current.mode = "relaxed"; setMode("relaxed"); resume(); }}>{ui.continueRelaxed}</button><button type="button" onClick={() => start()}>{ui.restart}</button></>}
          </div>
        </div>}
      </div>
      {phase === "playing" && <p className={styles.feedback} aria-live="polite" aria-atomic="true">{signal || ui.noRush}</p>}
      {showGuide && phase === "playing" && guideControls}
      <p className={styles.controlHint} id="garden-input-hint">{ui.controls}</p>
    </div></GardenViewport>

    {(active.isError || collection.isError || history.isError) && <div className={styles.error} role="alert"><div><strong>{ui.accountError}</strong><p>{ui.accountErrorBody}</p></div><button type="button" onClick={() => { void active.refetch(); void collection.refetch(); void history.refetch(); }}>{ui.retry}</button></div>}
    <div className={styles.careGrid}>
      <div className={styles.carePanel}>
        <p className={styles.eyebrow}><Sprout size={14} />{ui.plantTitle}</p>
        {active.isLoading ? <p>{ui.accountLoading}</p> : garden ? <>
          <div className={styles.plantLine}><h3>{gardenUi.plantLabels[garden.plant_type]}</h3><span>{ui.stage} {garden.growth_stage} / 5</span></div>
          <div className={styles.progress} role="progressbar" aria-label={ui.growth} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(garden.growth_stage >= 5 ? 100 : ((garden.growth_stage - 1) + garden.growth_points / POINTS_PER_STAGE[garden.plant_type]) / 4 * 100)}><i style={{ width: `${garden.growth_stage >= 5 ? 100 : ((garden.growth_stage - 1) + garden.growth_points / POINTS_PER_STAGE[garden.plant_type]) / 4 * 100}%` }} /></div>
          <p>{garden.growth_stage >= 5 ? ui.fullBloom : ui.quickCare}</p>
          {garden.growth_stage >= 5 ? <button type="button" className={styles.primary} disabled={harvest.isPending} onClick={() => harvest.mutate()}><Flower2 size={16} />{ui.harvest}</button> : careButton}
          {garden.growth_stage < 5 && fertilizerCount > 0 && <button type="button" className="mt-2 ml-2" disabled={fertilizer.isPending || water.isPending} onClick={() => fertilizer.mutate()}><Leaf size={16} />{gardenUi.fertilize(fertilizerCount)}</button>}
        </> : !active.isError ? <><h3>{ui.seed}</h3><p>{ui.seedBody}</p><button type="button" className={styles.primary} aria-expanded={showSeeds} onClick={() => setShowSeeds(s => !s)}><Sprout size={17} />{ui.chooseSeed}</button></> : <p>{ui.accountErrorBody}</p>}
        {water.isError && <div role="alert"><p className={styles.errorText}>{ui.saveError}</p><button type="button" disabled={water.isPending} onClick={() => void saveCare()}>{ui.retry}</button></div>}
        {careSaved && !water.isError && <p role="status">{ui.saved}</p>}
      </div>
      <div className={styles.carePanel}>
        <p className={styles.eyebrow}><Sun size={14} />{ui.rhythm}</p>
        <div className={styles.rhythm} aria-label={ui.rhythm}>{Array.from({ length: 7 }, (_, i) => {
          const date = dayBefore(day, 6 - i), tended = history.data?.dates.includes(date);
          return <div key={date} data-tended={!!tended} aria-label={`${date}: ${tended ? ui.wateredDay : ui.restDay}`}><span>{tended ? <Leaf size={17} /> : <span className={styles.dayDot} />}</span><small>{i === 6 ? ui.today : new Intl.DateTimeFormat(language, { weekday: "narrow", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`))}</small></div>;
        })}</div>
        <p>{ui.rhythmHint}</p><small className={styles.reset}>{ui.reset}</small>
      </div>
    </div>
    {showSeeds && !garden && !active.isError && <div className={styles.seedArea}><SeedSelector /></div>}
    <div className={styles.lifePanel}>
      <div><p className={styles.eyebrow}><Sun size={14} />{startingDew} {ui.boost}</p><h3>{ui.lifeTitle}</h3><p>{ui.lifeBody}</p>{phase !== "ready" && <small>{ui.nextTime}</small>}</div>
      <div className={styles.lifeActions}><Link href={withAppLocalePrefix(language, "/tasks")}>{activity.data?.task ? <Check size={17} /> : <Check size={17} />}{activity.data?.task ? ui.taskDone : ui.task}<ArrowRight size={15} /></Link><Link href={withAppLocalePrefix(language, "/journal")}>{activity.data?.journal ? <Check size={17} /> : <BookOpen size={17} />}{activity.data?.journal ? ui.journalDone : ui.journal}<ArrowRight size={15} /></Link><button type="button" onClick={() => void activity.refetch()} disabled={activity.isFetching}><RotateCcw size={14} />{ui.activityRefresh}</button></div>
      {(activity.isError || activity.data?.unavailable) && <p role="status">{ui.activityError}</p>}
    </div>
    <div className={styles.appearance}><div><h3>{ui.appearance}</h3><p>{ui.appearanceHint}</p></div><div className={styles.paletteOptions}>{([['meadow', 0], ['lavender', 3], ['autumn', 7]] as const).map(([name, required]) => <button type="button" key={name} disabled={totalCare < required} aria-pressed={palette === name} onClick={() => setPreferences(p => ({ ...p, palette: name }))}><i data-palette={name} /><span>{ui[name]}{totalCare < required && <small><LockKeyhole size={11} />{required} {ui.unlock}</small>}</span>{palette === name && <Check size={15} />}</button>)}</div></div>
  </section>;
}
