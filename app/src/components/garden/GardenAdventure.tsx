"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { createPortal } from "react-dom";
import {
  Component,
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Compass,
  Droplets,
  Flower2,
  Home,
  Leaf,
  Loader2,
  Map,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Settings2,
  Sparkles,
  Sprout,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  useActiveGarden,
  useGardenCollection,
  useGardenCareHistory,
  useGardenLifeActivity,
  useWaterPlant,
  useHarvestPlant,
  useUseFertilizer,
  useGardenInventory,
} from "@/hooks/use-garden";
import { useGardenAdventure } from "@/hooks/use-garden-adventure";
import { useTheme } from "@/lib/theme-context";
import { useAppStore } from "@/stores/app-store";
import { useOSBuddyStore } from "@/stores/os-buddy-store";
import { withAppLocalePrefix } from "@/lib/i18n/locale-path";
import { gardenDay, type Point } from "@/lib/garden/game";
import {
  ADVENTURE,
  adventureDestinations,
  adventureSnapshot,
  canDeliver,
  createAdventure,
  navigateAdventure,
  nearestAdventureTarget,
  restoreAdventureFacts,
  stepAdventure,
  type AdventureEvent,
  type AdventureTarget,
} from "@/lib/garden/adventure";
import {
  defaultAdventureSettings,
  decorationMilestones,
} from "@/lib/garden/persistence";
import { gardenAdventureRepository } from "@/lib/repositories/garden-adventure";
import { emitOSBuddyEvent } from "@/lib/os-buddy/os-buddy-events";
import {
  GardenAudio,
  defaultGardenMix,
  normalizeGardenMix,
  type GardenCue,
  type GardenMix,
} from "@/lib/garden/audio";
import { SeedSelector } from "./SeedSelector";
import type {
  AdventureCamera,
  AdventureDraw,
  GardenQuality,
} from "./AdventureScene";
import styles from "./garden-adventure.module.css";

const Scene = dynamic(() => import("./AdventureScene"), { ssr: false });
class SceneBoundary extends Component<
  { children: ReactNode; fallback: ReactNode; onError: () => void },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
type DevicePreferences = GardenMix & {
  gentle: boolean;
  quality: GardenQuality;
};

export function GardenAdventure() {
  const { user, isLoading } = useAuth();
  const language = useAppStore((s) => s.language);
  const [day, setDay] = useState(gardenDay);
  useEffect(() => {
    const id = setInterval(() => setDay(gardenDay()), 10_000);
    return () => clearInterval(id);
  }, []);
  if (isLoading)
    return (
      <div className={styles.loading}>
        <Loader2 className="animate-spin" />
        {language.startsWith("zh")
          ? "正在打開你的花園…"
          : "Opening your garden…"}
      </div>
    );
  if (!user)
    return (
      <p>
        {language.startsWith("zh")
          ? "登入以探索並儲存你的花園。"
          : "Sign in to explore and save your garden."}
      </p>
    );
  return <AccountGarden key={`${user.id}:${day}`} userId={user.id} day={day} />;
}

function AccountGarden({ userId, day }: { userId: string; day: string }) {
  const language = useAppStore((s) => s.language),
    zh = language.startsWith("zh");
  const t = (en: string, chinese: string) => (zh ? chinese : en);
  const { colorMode } = useTheme(),
    osReduced = useReducedMotion();
  const plant = useActiveGarden(),
    collection = useGardenCollection(),
    history = useGardenCareHistory(day),
    activity = useGardenLifeActivity(day),
    inventory = useGardenInventory();
  const waterPlant = useWaterPlant(),
    harvestPlant = useHarvestPlant(),
    fertilizer = useUseFertilizer();
  const identity = useQuery({
    queryKey: ["garden", userId, "buddy-identity"],
    queryFn: () => gardenAdventureRepository.identity(userId),
    staleTime: 20_000,
  });
  const account = useGardenAdventure(userId, day);
  const accountRef = useRef(account);
  useEffect(() => {
    accountRef.current = account;
  }, [account]);
  const stateRef = useRef(createAdventure(day)),
    waterBonusApplied = useRef(false),
    drawRef = useRef<AdventureDraw | null>(null),
    cameraRef = useRef<AdventureCamera>({
      yaw: 0.2,
      pitch: 0.65,
      distance: 12,
      overview: false,
    });
  const keys = useRef(new Set<string>()),
    stick = useRef({ x: 0, z: 0 }),
    intent = useRef({ interact: false, dash: false }),
    capturePaused = useRef(false);
  const panel = useRef<HTMLDivElement>(null),
    enterButton = useRef<HTMLButtonElement>(null),
    audioRef = useRef<GardenAudio | null>(null);
  const [snapshot, setSnapshot] = useState(() => createAdventure(day));
  const [entered, setEntered] = useState(false),
    [nativeFullscreen, setNativeFullscreen] = useState(false),
    [fullscreenFallback, setFullscreenFallback] = useState(false);
  const [menu, setMenu] = useState<"settings" | "map" | null>(null),
    [seeds, setSeeds] = useState(false),
    [settingsError, setSettingsError] = useState(false);
  const [preferences, setPreferences] = useState<DevicePreferences>({
      ...defaultGardenMix,
      gentle: false,
      quality: "auto",
    }),
    preferencesRef = useRef(preferences);
  const [ready, setReady] = useState(false),
    [unavailable, setUnavailable] = useState(false),
    [sceneKey, setSceneKey] = useState(0);
  const [feedback, setFeedback] = useState<AdventureEvent | null>(null),
    [buddyLine, setBuddyLine] = useState("");
  const [stickVisual, setStickVisual] = useState({ x: 0, y: 0 });
  const stickPress = useRef<{ id: number; x: number; y: number } | null>(null);
  const buddy = identity.data;
  const buddyEnabledOverride = useOSBuddyStore((s) => s.osBuddyEnabledOverride);
  const buddyEnabled = !!buddy?.enabled && buddyEnabledOverride !== false;
  const settings = account.data?.settings ?? defaultAdventureSettings;
  const reduced = !!osReduced || preferences.gentle;
  const sync = useCallback(
    () => setSnapshot(adventureSnapshot(stateRef.current)),
    [],
  );
  const clearInput = useCallback(() => {
    keys.current.clear();
    stick.current = { x: 0, z: 0 };
    intent.current = { interact: false, dash: false };
    stickPress.current = null;
    setStickVisual({ x: 0, y: 0 });
  }, []);
  const pause = useCallback(() => {
    audioRef.current?.play("open");
    audioRef.current?.setPlaying(false);
    clearInput();
    if (stateRef.current.phase === "playing") {
      stateRef.current.phase = "paused";
      stateRef.current.action = null;
      stateRef.current.target = null;
      sync();
    }
  }, [clearInput, sync]);
  const sound = useCallback((kind: GardenCue) => {
    audioRef.current?.play(kind);
  }, []);
  function unlockSound(cue?: GardenCue) {
    if (!preferencesRef.current.sound) return;
    audioRef.current ??= new GardenAudio();
    audioRef.current.configure(preferencesRef.current, colorMode === "dark");
    audioRef.current.setPlaying(
      stateRef.current.phase === "playing" && !document.hidden,
    );
    audioRef.current.unlock(cue);
  }
  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem("mblos:garden-adventure:device") ?? "{}",
      );
      const next: DevicePreferences = {
        ...normalizeGardenMix(saved),
        gentle: saved.gentle === true,
        quality: ["auto", "high", "battery"].includes(saved.quality)
          ? saved.quality
          : "auto",
      };
      preferencesRef.current = next;
      // Hydrate optional device preferences after the identical server/client first render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPreferences(next);
    } catch {
      /* Optional storage; gameplay remains usable. */
    }
  }, []);
  function changePreferences(next: DevicePreferences) {
    preferencesRef.current = next;
    setPreferences(next);
    audioRef.current?.configure(next, colorMode === "dark");
    try {
      localStorage.setItem(
        "mblos:garden-adventure:device",
        JSON.stringify(next),
      );
    } catch {
      /* Optional. */
    }
  }
  useEffect(() => {
    const facts = [
      ...(account.data?.actions ?? []),
      ...account.pending.current
        .filter((p) => p.day === day)
        .map((p) => p.action),
    ];
    restoreAdventureFacts(
      stateRef.current,
      facts,
      account.data?.watered_at,
      Date.now(),
    );
    sync();
  }, [account.data, account.pending, day, sync]);
  useEffect(() => {
    if (activity.data?.task && !waterBonusApplied.current) {
      // Slow account loading must not lose the once-per-visit task bonus.
      waterBonusApplied.current = true;
      stateRef.current.water = Math.min(3, stateRef.current.water + 1);
      sync();
    }
  }, [activity.data, sync]);
  useEffect(() => {
    let frame = 0,
      previous = 0,
      accumulator = 0,
      lastUi = 0,
      lastEvent = 0;
    function tick(time: number) {
      const state = stateRef.current,
        down = keys.current;
      const delta = previous ? Math.min((time - previous) / 1000, 0.1) : 0;
      accumulator += delta;
      previous = time;
      const input = {
        x:
          stick.current.x +
          Number(down.has("d") || down.has("arrowright")) -
          Number(down.has("a") || down.has("arrowleft")),
        z:
          stick.current.z +
          Number(down.has("s") || down.has("arrowdown")) -
          Number(down.has("w") || down.has("arrowup")),
        yaw: cameraRef.current.overview ? 0 : cameraRef.current.yaw,
        interact: intent.current.interact,
        dash: intent.current.dash,
      };
      if (down.has("q")) cameraRef.current.yaw += delta * 1.2;
      if (down.has("r")) cameraRef.current.yaw -= delta * 1.2;
      while (accumulator >= 1 / 60) {
        if (!document.hidden && !capturePaused.current)
          stepAdventure(state, 1 / 60, input);
        input.interact = false;
        input.dash = false;
        intent.current = { interact: false, dash: false };
        accumulator -= 1 / 60;
      }
      drawRef.current?.(state, time);
      audioRef.current?.setBlooming(
        state.beds.some((bed) => bed.stage === "harvested"),
      );
      for (const event of state.events)
        if (event.seq > lastEvent) {
          lastEvent = event.seq;
          sound(event.kind);
          setFeedback(event);
          if (event.action) accountRef.current.enqueue(event.action, state.day);
          if (
            event.kind === "harvest" ||
            event.kind === "discover" ||
            event.kind === "trail-won" ||
            event.kind === "deliver"
          )
            emitOSBuddyEvent({
              type: "garden:achievement",
              achievement: event.kind,
            });
        }
      if (time - lastUi > 100) {
        sync();
        lastUi = time;
      }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    const visibility = () => {
      if (document.hidden) pause();
    };
    window.addEventListener("blur", pause);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("blur", pause);
      document.removeEventListener("visibilitychange", visibility);
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, [pause, sound, sync]);
  useEffect(() => {
    // Verification shortcuts are compiled out of normal builds and restricted to loopback.
    if (
      process.env.NEXT_PUBLIC_DEV_LOGIN_BYPASS !== "true" ||
      !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname)
    )
      return;
    let testDay = day;
    const hooks = {
      seed(seed: number) {
        const value = String(seed);
        if (!/^\d{8}$/.test(value))
          throw new Error("Use a YYYYMMDD garden seed");
        testDay = `${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`;
        const next = createAdventure(testDay);
        next.eventSeq = stateRef.current.eventSeq;
        stateRef.current = next;
        sync();
        return { seed };
      },
      async setState(name: string) {
        if (
          ![
            "active-play",
            "paused",
            "fail-or-retry",
            "hero-asset",
            "garden-complete",
          ].includes(name)
        )
          throw new Error(`Unknown garden capture state: ${name}`);
        const state = createAdventure(testDay);
        state.eventSeq = stateRef.current.eventSeq;
        state.phase = name === "paused" ? "paused" : "playing";
        if (name === "fail-or-retry") {
          state.trail.phase = "failed";
          state.trail.timed = true;
          state.player.x = -1.7;
          state.player.z = -6.4;
        }
        if (name === "hero-asset") {
          state.player.x = -3.8;
          state.player.z = 2.8;
        }
        if (name === "garden-complete")
          restoreAdventureFacts(state, [
            "plant:0",
            "water:0",
            "harvest:0",
            "plant:1",
            "water:1",
            "harvest:1",
            "plant:2",
            "water:2",
            "harvest:2",
            "forage:0",
            "forage:1",
            "forage:2",
            "deliver",
          ]);
        state.buddy.x = state.player.x + 1.1;
        state.buddy.z = state.player.z + 0.4;
        state.nearby = nearestAdventureTarget(state);
        stateRef.current = state;
        cameraRef.current = {
          yaw: 0.2,
          pitch: 0.65,
          distance: name === "hero-asset" ? 7 : 12,
          overview: false,
        };
        clearInput();
        setEntered(true);
        setMenu(null);
        setFeedback(
          name === "fail-or-retry"
            ? { seq: state.eventSeq, kind: "trail-failed", at: state.player }
            : null,
        );
        sync();
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
        return { state: name };
      },
      setPausedForScreenshot(value: boolean) {
        capturePaused.current = value;
        if (value) clearInput();
      },
      snapshot() {
        return adventureSnapshot(stateRef.current);
      },
    };
    const targetWindow = window as unknown as {
      __THREE_GAME_TEST_HOOKS__?: typeof hooks;
    };
    targetWindow.__THREE_GAME_TEST_HOOKS__ = hooks;
    return () => {
      if (targetWindow.__THREE_GAME_TEST_HOOKS__ === hooks)
        delete targetWindow.__THREE_GAME_TEST_HOOKS__;
    };
  }, [clearInput, day, sync]);
  useEffect(() => {
    if (!entered) return;
    const app = document.querySelector<HTMLElement>(
        '[data-app-design="projects"]',
      ),
      wasInert = app?.inert ?? false,
      previousOverflow = document.body.style.overflow;
    if (app && !app.contains(panel.current)) app.inert = true;
    document.body.style.overflow = "hidden";
    panel.current?.focus({ preventScroll: true });
    emitOSBuddyEvent({ type: "garden:enter" });
    return () => {
      if (app) app.inert = wasInert;
      document.body.style.overflow = previousOverflow;
      emitOSBuddyEvent({ type: "garden:exit" });
      requestAnimationFrame(() =>
        document
          .querySelector<HTMLButtonElement>("[data-garden-enter]")
          ?.focus({ preventScroll: true }),
      );
    };
  }, [entered]);
  useEffect(() => {
    const changed = () =>
      setNativeFullscreen(document.fullscreenElement === panel.current);
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);
  const onReady = useCallback(() => setReady(true), []);
  const onUnavailable = useCallback(() => {
    setUnavailable(true);
    setReady(true);
  }, []);
  const target = useCallback(
    (p: Point) => {
      navigateAdventure(stateRef.current, p);
      sync();
      panel.current?.focus({ preventScroll: true });
    },
    [sync],
  );
  function enter() {
    stateRef.current.phase = "playing";
    setEntered(true);
    setMenu(null);
    sync();
    unlockSound(buddyEnabled ? "buddy" : "confirm");
    setBuddyLine(
      t(
        `Come in! Let’s plant a little, then see what’s beyond the pond.`,
        "進來吧！先種一點花，再一起探索池塘那邊。",
      ),
    );
  }
  function resume() {
    clearInput();
    stateRef.current.phase = "playing";
    setMenu(null);
    sync();
    panel.current?.focus({ preventScroll: true });
    unlockSound("confirm");
  }
  function leave() {
    audioRef.current?.play("cancel");
    pause();
    if (document.fullscreenElement === panel.current)
      void document.exitFullscreen().catch(() => {});
    setEntered(false);
    setMenu(null);
  }
  async function fullscreen() {
    if (document.fullscreenElement === panel.current) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    try {
      if (!panel.current?.requestFullscreen) throw new Error("Unavailable");
      await panel.current.requestFullscreen();
    } catch {
      setFullscreenFallback(true);
    }
  }
  function keyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === "Tab" && entered) {
      const controls = Array.from(
        e.currentTarget.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), select:not(:disabled), a[href], [tabindex="0"]',
        ),
      ).filter((el) => el.getClientRects().length > 0);
      const first = controls[0],
        last = controls.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panel.current)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      if (menu) {
        setMenu(null);
      } else pause();
      return;
    }
    if (e.target !== e.currentTarget || stateRef.current.phase !== "playing")
      return;
    const key = e.key.toLowerCase();
    if (
      [
        "w",
        "a",
        "s",
        "d",
        "arrowup",
        "arrowdown",
        "arrowleft",
        "arrowright",
        "q",
        "r",
        "e",
        "shift",
        " ",
      ].includes(key)
    ) {
      e.preventDefault();
      if (e.repeat && ["e", "shift", " "].includes(key)) return;
      if (key === "e" || key === " ") intent.current.interact = true;
      else if (key === "shift") intent.current.dash = true;
      else keys.current.add(key);
    }
  }
  function stickMove(e: PointerEvent<HTMLButtonElement>) {
    const origin = stickPress.current;
    if (!origin || origin.id !== e.pointerId) return;
    const dx = e.clientX - origin.x,
      dy = e.clientY - origin.y,
      length = Math.max(32, Math.hypot(dx, dy));
    stick.current = { x: dx / length, z: dy / length };
    setStickVisual({ x: (dx / length) * 28, y: (dy / length) * 28 });
  }
  function endStick() {
    stick.current = { x: 0, z: 0 };
    stickPress.current = null;
    setStickVisual({ x: 0, y: 0 });
  }
  function labelFor(destination: AdventureTarget, verb = false): string {
    if (destination.kind === "bed") {
      const bed = snapshot.beds[Number(destination.id)],
        names = [
          t("Sunflower bed", "向日葵花圃"),
          t("Lily bed", "百合花圃"),
          t("Orchid bed", "蘭花花圃"),
        ];
      const action =
        bed.stage === "empty"
          ? t("Plant", "播種")
          : bed.stage === "planted"
            ? t("Water", "澆水")
            : bed.stage === "growing"
              ? t("Growing", "生長中")
              : bed.stage === "ripe"
                ? t("Harvest", "採收")
                : t("Harvested", "已採收");
      return verb ? action : `${names[bed.id]} · ${action}`;
    }
    if (destination.kind === "well")
      return t("Refill watering can", "補滿水壺");
    if (destination.kind === "home")
      return canDeliver(snapshot)
        ? t("Deliver your basket", "送回收穫籃")
        : t("Home glasshouse", "回家到溫室");
    if (destination.kind === "butterfly")
      return snapshot.trail.phase === "following"
        ? t("Greet butterfly", "向蝴蝶打招呼")
        : t("Follow the butterfly", "跟隨蝴蝶");
    if (destination.kind === "landmark")
      return (
        {
          pond: t("Reflection pond", "靜思池塘"),
          orchard: t("Orchard nook", "果園角落"),
          lookout: t("Sunrise lookout", "日出觀景處"),
        }[destination.id as "pond"] ?? destination.id
      );
    const kind = snapshot.forage[Number(destination.id)].kind;
    return {
      apple: t("Gather apples", "採集蘋果"),
      mushroom: t("Gather mushrooms", "採集蘑菇"),
      berry: t("Gather berries", "採集莓果"),
    }[kind];
  }
  const harvested = snapshot.beds.filter((b) => b.stage === "harvested").length,
    finds = snapshot.forage.filter((f) => f.collected).length;
  const objective = snapshot.delivered
    ? t("Your garden has a little more life.", "你的花園，又多了一點生機。")
    : harvested === 3 && finds >= 3
      ? t("Bring your basket home", "把收穫帶回家")
      : t("Grow a basket of good things", "種出一籃美好");
  const feedbackCopy = feedback
    ? {
        plant: t(
          "Seed tucked in. A little water next.",
          "種子入土了，接著澆一點水。",
        ),
        water: t(
          "Growing! Explore while the flowers open.",
          "正在生長！等花開時去探索吧。",
        ),
        harvest: t("A bloom for your basket!", "收穫一朵花！"),
        forage: t("A lovely find for the journey.", "旅途中的小發現。"),
        refill: t("Watering can full.", "水壺補滿了。"),
        discover: t(
          "A new place in your field notes.",
          "探索筆記多了一個新地方。",
        ),
        deliver: t(
          "Expedition complete. A new stamp for your garden!",
          "小探險完成了，去看看新裝飾！",
        ),
        dash: "",
        "trail-start": t(
          "Follow the glowing stops. Slow down before greeting.",
          "跟著發光標記走，打招呼前慢下來。",
        ),
        "trail-stop": t(
          "A little trust. Follow the next glow.",
          "信任多了一點，跟著下一個光點。",
        ),
        "trail-won": t("You made a butterfly friend!", "你交到蝴蝶朋友了！"),
        "trail-failed": t(
          "The butterfly fluttered away. Try again at the arch.",
          "蝴蝶飛走了，回到拱門再試一次。",
        ),
        "need-water": t(
          "Your can is empty. Refill by the pond.",
          "水壺空了，到池塘旁補水。",
        ),
        growing: t(
          "Still growing. There’s time to explore.",
          "還在生長，先去探索一下吧。",
        ),
        "need-basket": t(
          "Harvest 3 flower beds and gather 3 finds, then bring them home.",
          "採收三個花圃、找到三份野生收穫，再帶回家。",
        ),
        cancelled: "",
      }[feedback.kind]
    : "";
  const accountSettings = (
    <>
      <h3>{t("Make it yours", "佈置你的花園")}</h3>
      <p>
        {t(
          `${account.data?.stamps ?? 0} expedition stamps · saved to your account`,
          `${account.data?.stamps ?? 0} 枚探險印章 · 儲存於帳戶`,
        )}
      </p>
      <div className={styles.decors}>
        {decorationMilestones.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={settings.decoration === item.id}
            disabled={!account.data || account.data.stamps < item.stamps}
            onClick={() => {
              setSettingsError(false);
              void account
                .updateSettings({ decoration: item.id })
                .catch(() => setSettingsError(true));
            }}
          >
            {
              {
                none: t("Natural", "自然"),
                lantern: t("Lantern", "提燈"),
                bench: t("Garden bench", "長椅"),
                "flower-cart": t("Flower cart", "花車"),
              }[item.id]
            }
            <small>
              {item.stamps
                ? t(`${item.stamps} stamps`, `${item.stamps} 枚印章`)
                : t("Always yours", "隨時可用")}
            </small>
          </button>
        ))}
      </div>
      <label className={styles.settingRow}>
        <span>
          {t("Buddy garden invitations", "夥伴邀你逛花園")}
          <small>
            {t(
              "In-app, at most once a day. Also follows daily-summary preferences.",
              "僅於應用程式內，每天最多一次，並遵循每日摘要通知設定。",
            )}
          </small>
        </span>
        <input
          type="checkbox"
          checked={settings.reminders_enabled}
          disabled={!account.data}
          onChange={(e) => {
            setSettingsError(false);
            void account
              .updateSettings({ reminders_enabled: e.target.checked })
              .catch(() => setSettingsError(true));
          }}
        />
      </label>
      <div className={styles.quiet}>
        <span>{t("Quiet hours", "安靜時段")}</span>
        {(["quiet_start", "quiet_end"] as const).map((key, i) => (
          <label key={key}>
            {i ? t("Until", "至") : t("From", "從")}
            <select
              value={settings[key]}
              disabled={!account.data}
              onChange={(e) => {
                setSettingsError(false);
                void account
                  .updateSettings({ [key]: Number(e.target.value) })
                  .catch(() => setSettingsError(true));
              }}
            >
              {Array.from({ length: 24 }, (_, n) => (
                <option key={n} value={n}>
                  {String(n).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
      <p>
        {t(
          `Quiet hours use ${buddy?.timezone ?? "UTC"}.`,
          `安靜時段以 ${buddy?.timezone ?? "UTC"} 為準。`,
        )}
      </p>
      {settingsError && (
        <p role="alert">
          {t(
            "Couldn’t save that preference. Please try again.",
            "未能儲存設定，請重試。",
          )}
        </p>
      )}
    </>
  );
  const sceneFallback = (
    <div className={styles.fallback}>
      <Sprout size={36} />
      <h3>{t("Your garden is still here", "你的花園依然在這裡")}</h3>
      <p>
        {t(
          "Use the map and action button to explore, plant, water and harvest. The same progress is saved.",
          "使用地圖與動作按鈕探索、播種、澆水和採收，進度同樣會儲存。",
        )}
      </p>
      <button
        type="button"
        onClick={() => {
          pause();
          setMenu("map");
        }}
      >
        {t("Open garden map", "打開花園地圖")}
      </button>
      <button
        type="button"
        onClick={() => {
          setUnavailable(false);
          setReady(false);
          setSceneKey((k) => k + 1);
        }}
      >
        {t("Retry 3D", "重試 3D")}
      </button>
    </div>
  );
  const playing = snapshot.phase === "playing";
  const viewport = (
    <div
      ref={panel}
      className={`${styles.viewport} ${entered ? styles.immersive : ""}`}
      role={entered ? "dialog" : "region"}
      aria-modal={entered || undefined}
      aria-label={t("Your garden world", "你的花園世界")}
      tabIndex={0}
      data-garden-controls
      data-phase={snapshot.phase}
      data-entered={entered}
      data-harvested={harvested}
      data-finds={finds}
      onKeyDown={keyDown}
      onKeyUp={(e) => keys.current.delete(e.key.toLowerCase())}
      onBlur={() => keys.current.clear()}
    >
      <SceneBoundary
        key={sceneKey}
        fallback={sceneFallback}
        onError={onUnavailable}
      >
        {unavailable ? (
          sceneFallback
        ) : (
          <Scene
            stateRef={stateRef}
            drawRef={drawRef}
            cameraRef={cameraRef}
            active={entered}
            dark={colorMode === "dark"}
            pet={buddy?.pet ?? "xiaoba"}
            buddyEnabled={buddyEnabled}
            plant={plant.data?.plant_type ?? "sunflower"}
            stage={plant.data?.growth_stage ?? 1}
            collection={(collection.data ?? []).map((p) => p.plant_type)}
            decoration={settings.decoration}
            journal={activity.data?.journal ?? false}
            habit={activity.data?.habit ?? false}
            reducedMotion={reduced}
            quality={preferences.quality}
            onTarget={target}
            onReady={onReady}
            onUnavailable={onUnavailable}
          />
        )}
      </SceneBoundary>
      {!ready && (
        <div className={styles.loadingOverlay}>
          <Loader2 className="animate-spin" />
          <span>{t("Growing your world…", "正在展開你的世界…")}</span>
        </div>
      )}
      {!entered && (
        <div
          className={styles.cover}
          onClick={() => {
            if (ready) enter();
          }}
        >
          <span className={styles.kicker}>
            {t("A little world, all yours", "專屬於你的小世界")}
          </span>
          <h2>{t("Step into your garden.", "走進你的花園。")}</h2>
          <p>
            {t(
              "Plant something. Follow a butterfly. Bring a little good back home.",
              "種一點花，跟隨蝴蝶，把小小的美好帶回家。",
            )}
          </p>
          <button
            ref={enterButton}
            data-garden-enter
            type="button"
            className={styles.primary}
            onClick={(e) => {
              e.stopPropagation();
              enter();
            }}
            disabled={!ready}
          >
            <Play size={18} fill="currentColor" />
            {t("Enter Garden", "進入花園")}
            <ArrowRight size={18} />
          </button>
          <small>{t("Walk · explore · grow", "漫步 · 探索 · 生長")}</small>
        </div>
      )}
      {entered && (
        <>
          {fullscreenFallback && playing && (
            <div className={styles.fullscreenNotice} role="status">
              {t(
                "Using the full-window view. This browser does not offer native fullscreen.",
                "正使用佔滿視窗模式，此瀏覽器未提供原生全螢幕。",
              )}
              <button
                type="button"
                onClick={() => setFullscreenFallback(false)}
                aria-label={t("Dismiss notice", "關閉提示")}
              >
                <X size={15} />
              </button>
            </div>
          )}
          <header className={styles.hudTop}>
            <div className={styles.objective}>
              <span className={styles.kicker}>
                {t("Today’s little expedition", "今天的小探險")}
              </span>
              <h2>{objective}</h2>
              <p>
                <Flower2 size={15} />
                {harvested}/3 <span>{t("blooms", "花朵")}</span>
                <Leaf size={15} />
                {Math.min(3, finds)}/3 <span>{t("finds", "發現")}</span>
                {snapshot.delivered && <Check size={17} />}
              </p>
              <span className={styles.saveState} role="status">
                {account.saving
                  ? t("Saving…", "儲存中…")
                  : account.saveError || account.isError
                    ? t(
                        "Sync unavailable · progress waiting",
                        "暫未同步 · 進度待儲存",
                      )
                    : account.pendingCount
                      ? t("Waiting to sync", "等待同步")
                      : account.data
                        ? t("Saved to your account", "已儲存於帳戶")
                        : t("Connecting to your account…", "正在連接帳戶…")}
              </span>
              {(account.saveError || account.isError) && (
                <button
                  type="button"
                  className={styles.retry}
                  onClick={() => {
                    void account.refetch();
                    void account.flush();
                  }}
                >
                  {t("Retry sync", "重試同步")}
                </button>
              )}
            </div>
            <div className={styles.hudRight}>
              <div
                className={styles.canMeter}
                aria-label={t(
                  `${snapshot.water} of 3 water`,
                  `${snapshot.water}/3 份水`,
                )}
              >
                <Droplets size={17} />
                {[0, 1, 2].map((i) => (
                  <span key={i} data-filled={snapshot.water > i} />
                ))}
              </div>
              <div className={styles.tools}>
                <button
                  type="button"
                  title={t("Map & field notes", "地圖與探索筆記")}
                  aria-label={t("Map & field notes", "地圖與探索筆記")}
                  onClick={() => {
                    pause();
                    setMenu("map");
                  }}
                >
                  <Map size={18} />
                </button>
                <button
                  type="button"
                  title={t("Garden settings", "花園設定")}
                  aria-label={t("Garden settings", "花園設定")}
                  onClick={() => {
                    pause();
                    setMenu("settings");
                  }}
                >
                  <Settings2 size={18} />
                </button>
                <button
                  type="button"
                  title={t("Fullscreen", "全螢幕")}
                  aria-label={
                    nativeFullscreen
                      ? t("Exit fullscreen", "離開全螢幕")
                      : t("Fullscreen", "全螢幕")
                  }
                  onClick={() => void fullscreen()}
                >
                  {nativeFullscreen ? (
                    <Minimize2 size={18} />
                  ) : (
                    <Maximize2 size={18} />
                  )}
                </button>
                <button
                  type="button"
                  title={playing ? t("Pause", "暫停") : t("Resume", "繼續")}
                  aria-label={
                    playing ? t("Pause", "暫停") : t("Resume", "繼續")
                  }
                  onClick={playing ? pause : resume}
                >
                  {playing ? <Pause size={18} /> : <Play size={18} />}
                </button>
                <button
                  type="button"
                  title={t("Leave garden", "離開花園")}
                  aria-label={t("Leave garden", "離開花園")}
                  onClick={leave}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          </header>
          {snapshot.trail.phase === "following" && (
            <div className={styles.trailStatus}>
              <Sparkles size={16} />
              {t("Butterfly trail", "蝴蝶小徑")} {snapshot.trail.index + 1}/3{" "}
              {snapshot.trail.timed && (
                <b>
                  {Math.max(
                    0,
                    Math.ceil(ADVENTURE.trailSeconds - snapshot.trail.elapsed),
                  )}
                  s
                </b>
              )}
            </div>
          )}
          {playing && (
            <div className={styles.hudBottom}>
              <div className={styles.movement}>
                <button
                  type="button"
                  className={styles.joystick}
                  aria-label={t("Move joystick", "移動搖桿")}
                  onPointerDown={(e) => {
                    e.currentTarget.setPointerCapture(e.pointerId);
                    const rect = e.currentTarget.getBoundingClientRect();
                    stickPress.current = {
                      id: e.pointerId,
                      x: rect.left + rect.width / 2,
                      y: rect.top + rect.height / 2,
                    };
                    stickMove(e);
                  }}
                  onPointerMove={stickMove}
                  onPointerUp={endStick}
                  onPointerCancel={endStick}
                  onLostPointerCapture={endStick}
                >
                  <span
                    style={{
                      transform: `translate(${stickVisual.x}px, ${stickVisual.y}px)`,
                    }}
                  />
                  <Compass size={20} />
                </button>
                <p className={styles.keyboardHint}>
                  {t("WASD / arrows · E to interact", "WASD / 方向鍵 · E 互動")}
                </p>
              </div>
              <div className={styles.buddyMessage} aria-live="polite">
                {buddy && buddyEnabled && !reduced && (
                  <Image
                    width={44}
                    height={44}
                    unoptimized
                    src={`/os-buddy/pets/${buddy.pet}/${feedback?.kind === "deliver" ? "jumping" : "idle"}.gif`}
                    alt={buddy.name}
                  />
                )}
                <div>
                  {buddy && buddyEnabled && <strong>{buddy.name}</strong>}
                  <p>
                    {feedbackCopy ||
                      buddyLine ||
                      t(
                        "The garden is yours to explore.",
                        "慢慢探索你的花園吧。",
                      )}
                  </p>
                </div>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.dash}
                  disabled={snapshot.player.cooldown > 0.05}
                  onClick={() => {
                    intent.current.dash = true;
                    panel.current?.focus({ preventScroll: true });
                  }}
                >
                  {t("Dash", "快步")}
                  <small>{t("Shift", "Shift")}</small>
                </button>
                <button
                  type="button"
                  data-testid="garden-action"
                  className={styles.action}
                  disabled={!snapshot.nearby || !!snapshot.action}
                  onClick={() => {
                    intent.current.interact = true;
                    panel.current?.focus({ preventScroll: true });
                  }}
                >
                  <Sprout size={22} />
                  <span>
                    {snapshot.action
                      ? t("Tending…", "照料中…")
                      : snapshot.nearby
                        ? labelFor(snapshot.nearby, true)
                        : t("Explore", "探索")}
                  </span>
                  {snapshot.action && (
                    <i
                      style={{
                        width: `${(snapshot.action.elapsed / snapshot.action.duration) * 100}%`,
                      }}
                    />
                  )}
                </button>
              </div>
            </div>
          )}
          <div className={styles.cameraTools}>
            <button
              type="button"
              aria-label={t("Reset camera", "重設視角")}
              onClick={() => {
                cameraRef.current = {
                  yaw: 0.2,
                  pitch: 0.65,
                  distance: 12,
                  overview: false,
                };
              }}
            >
              <RotateCcw size={16} />
            </button>
            <button
              type="button"
              aria-label={t("Zoom in", "拉近")}
              onClick={() => {
                cameraRef.current.distance = Math.max(
                  7,
                  cameraRef.current.distance - 2,
                );
              }}
            >
              <ZoomIn size={16} />
            </button>
            <button
              type="button"
              aria-label={t("Zoom out", "拉遠")}
              onClick={() => {
                cameraRef.current.distance = Math.min(
                  18,
                  cameraRef.current.distance + 2,
                );
              }}
            >
              <ZoomOut size={16} />
            </button>
            <button
              type="button"
              aria-label={
                preferences.sound
                  ? t("Mute sound", "關閉音效")
                  : t("Enable sound", "開啟音效")
              }
              onClick={() => {
                changePreferences({
                  ...preferences,
                  sound: !preferences.sound,
                });
                unlockSound(buddyEnabled ? "buddy" : "confirm");
              }}
            >
              {preferences.sound ? (
                <Volume2 size={16} />
              ) : (
                <VolumeX size={16} />
              )}
            </button>
          </div>
          {(!playing || menu) && (
            <div className={styles.scrim}>
              <div
                className={styles.menu}
                role="region"
                aria-label={
                  menu === "map"
                    ? t("Garden map", "花園地圖")
                    : menu === "settings"
                      ? t("Garden settings", "花園設定")
                      : t("Garden paused", "花園已暫停")
                }
              >
                <div className={styles.menuHeading}>
                  <span className={styles.kicker}>
                    {t("Your garden, your pace", "你的花園，你的步調")}
                  </span>
                  <button
                    type="button"
                    aria-label={t("Close menu and resume", "關閉選單並繼續")}
                    onClick={resume}
                  >
                    <X size={20} />
                  </button>
                </div>
                <h2>
                  {menu === "map"
                    ? t("Where shall we wander?", "今天想去哪裡？")
                    : menu === "settings"
                      ? t("Settle in.", "自在地待著。")
                      : t("Take a little breather.", "歇一小會兒。")}
                </h2>
                {menu === "map" ? (
                  <>
                    <p>
                      {t(
                        "Choose a place to walk there, then use the action button. You can also tap the ground or move freely.",
                        "選擇目的地，自動步行前往，再按動作按鈕；也可以點地面或自由移動。",
                      )}
                    </p>
                    <div className={styles.mapChoices}>
                      {adventureDestinations(snapshot).map((destination) => (
                        <button
                          type="button"
                          key={`${destination.kind}:${destination.id}`}
                          data-testid={`garden-destination-${destination.kind}-${destination.id}`}
                          onClick={() => {
                            resume();
                            target(destination.point);
                          }}
                        >
                          <Compass size={15} />
                          {labelFor(destination)}
                        </button>
                      ))}
                    </div>
                    <h3>{t("Field notes", "探索筆記")}</h3>
                    <p>
                      {snapshot.discoveries.length}/3{" "}
                      {t("places discovered", "處地點已發現")} ·{" "}
                      {snapshot.earned.includes("butterfly")
                        ? t("Butterfly friend found", "已交到蝴蝶朋友")
                        : t(
                            "A butterfly is waiting by the arch",
                            "拱門旁有一隻蝴蝶",
                          )}
                    </p>
                    <label className={styles.settingRow}>
                      {t(
                        "Timed butterfly challenge (38 seconds)",
                        "蝴蝶計時挑戰（38 秒）",
                      )}
                      <input
                        type="checkbox"
                        checked={snapshot.trail.timed}
                        onChange={(e) => {
                          stateRef.current.trail.timed = e.target.checked;
                          stateRef.current.trail.phase = "idle";
                          stateRef.current.trail.elapsed = 0;
                          stateRef.current.trail.index = 0;
                          sync();
                        }}
                      />
                    </label>
                    {snapshot.trail.best !== null && (
                      <p>
                        {t("Best trail this visit", "本次最佳成績")}:{" "}
                        {snapshot.trail.best.toFixed(1)}s
                      </p>
                    )}
                  </>
                ) : menu === "settings" ? (
                  <>
                    <label className={styles.settingRow}>
                      {t("Rendering quality", "畫面品質")}
                      <select
                        value={preferences.quality}
                        onChange={(e) =>
                          changePreferences({
                            ...preferences,
                            quality: e.target.value as GardenQuality,
                          })
                        }
                      >
                        <option value="auto">
                          {t("Adaptive · recommended", "自動調整 · 建議")}
                        </option>
                        <option value="high">
                          {t("High clarity", "高解析度")}
                        </option>
                        <option value="battery">
                          {t("Save battery", "省電")}
                        </option>
                      </select>
                    </label>
                    <label className={styles.settingRow}>
                      {t("Gentle motion", "減少動態效果")}
                      <input
                        type="checkbox"
                        checked={reduced}
                        disabled={!!osReduced}
                        onChange={(e) =>
                          changePreferences({
                            ...preferences,
                            gentle: e.target.checked,
                          })
                        }
                      />
                    </label>
                    <p>
                      {t(
                        "Drag the world to look around. Scroll to zoom. Q / R rotate the camera. Touch controls work in both orientations.",
                        "拖曳畫面環顧四周，滾動縮放，Q / R 旋轉視角；觸控支援直向與橫向。",
                      )}
                    </p>
                    <div className={styles.audioSettings}>
                      <h3>{t("The sound of your garden", "花園的聲音")}</h3>
                      <p>
                        {t(
                          "A Little More Green · an original, gently changing theme. Softer in dark mode.",
                          "《多一點綠意》· 原創、緩緩變化的旋律，深色模式更輕柔。",
                        )}
                      </p>
                      <label className={styles.settingRow}>
                        <span>{t("Garden audio", "花園音訊")}</span>
                        <input
                          type="checkbox"
                          checked={preferences.sound}
                          onChange={(e) =>
                            changePreferences({
                              ...preferences,
                              sound: e.target.checked,
                            })
                          }
                        />
                      </label>
                      {(
                        [
                          ["music", t("Music volume", "音樂音量")],
                          ["effects", t("Sound effects volume", "音效音量")],
                          [
                            "ambience",
                            t("Nature ambience volume", "自然環境音量"),
                          ],
                        ] as const
                      ).map(([group, label]) => (
                        <label key={group} className={styles.audioSlider}>
                          <span>
                            {label}
                            <output>
                              {Math.round(preferences[group] * 100)}%
                            </output>
                          </span>
                          <input
                            type="range"
                            min="0"
                            max="100"
                            step="5"
                            aria-label={label}
                            value={Math.round(preferences[group] * 100)}
                            onChange={(e) =>
                              changePreferences({
                                ...preferences,
                                [group]: Number(e.target.value) / 100,
                              })
                            }
                          />
                        </label>
                      ))}
                      <p>
                        {t(
                          "Zero mutes a layer. Audio resumes with your game. Saved on this device.",
                          "設為零可靜音該聲部。繼續遊戲時恢復音訊，設定儲存在此裝置。",
                        )}
                      </p>
                    </div>
                    {accountSettings}
                  </>
                ) : (
                  <>
                    <p>
                      {t(
                        "Your earned progress stays. Come back whenever you feel like it.",
                        "已獲得的進度會保留，想回來時再回來吧。",
                      )}
                    </p>
                    <button
                      type="button"
                      className={styles.primary}
                      onClick={resume}
                    >
                      <Play size={17} />
                      {t("Keep exploring", "繼續探索")}
                    </button>
                    <button
                      type="button"
                      className={styles.secondary}
                      onClick={() => setMenu("map")}
                    >
                      <Map size={17} />
                      {t("Map & field notes", "地圖與探索筆記")}
                    </button>
                  </>
                )}
                {fullscreenFallback && (
                  <p>
                    {t(
                      "Your browser uses the full-window garden view. Browser fullscreen is unavailable here.",
                      "此瀏覽器使用佔滿視窗的花園模式，未提供原生全螢幕。",
                    )}
                  </p>
                )}
                {account.storageUnavailable && account.pendingCount > 0 && (
                  <p role="alert">
                    {t(
                      "Device storage is unavailable. Keep this tab open until your progress syncs.",
                      "裝置無法暫存，請保持分頁開啟直到同步完成。",
                    )}
                  </p>
                )}
                <button type="button" className={styles.leave} onClick={leave}>
                  <Home size={16} />
                  {t("Return to My Best Life OS", "返回 My Best Life OS")}
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
  const caredToday =
    plant.data?.last_watered_at === day || history.data?.dates.includes(day);
  return (
    <section className={styles.garden} data-testid="garden-adventure">
      {entered
        ? createPortal(
            <div className={styles.garden}>{viewport}</div>,
            document.body,
          )
        : viewport}
      <div className={styles.accountSummary}>
        <div>
          <span className={styles.kicker}>
            {t("Your life grows here", "生活，在這裡生長")}
          </span>
          <h3>
            {t(
              "Small things become a living place.",
              "小小的行動，成為有生命的地方。",
            )}
          </h3>
          <p>
            {t(
              "Your real plant and collected flowers live in this world. Today's completed task adds a starting refill; a habit flowers the trail; a journal entry brings lilies to the pond.",
              "你的真實植物與收藏花朵生活在這裡。完成任務增加一份起始水量；完成習慣讓小徑開花；寫日記讓池塘長出百合。",
            )}
          </p>
          <div className={styles.connections}>
            <Link
              href={withAppLocalePrefix(language, "/tasks")}
              data-active={activity.data?.task}
            >
              {activity.data?.task ? (
                <Check size={14} />
              ) : (
                <Droplets size={14} />
              )}
              {t("Task → extra water", "任務 → 額外水量")}
            </Link>
            <Link
              href={withAppLocalePrefix(language, "/habits")}
              data-active={activity.data?.habit}
            >
              {activity.data?.habit ? (
                <Check size={14} />
              ) : (
                <Flower2 size={14} />
              )}
              {t("Habit → trail blooms", "習慣 → 小徑開花")}
            </Link>
            <Link
              href={withAppLocalePrefix(language, "/journal")}
              data-active={activity.data?.journal}
            >
              {activity.data?.journal ? (
                <Check size={14} />
              ) : (
                <Leaf size={14} />
              )}
              {t("Journal → pond lilies", "日記 → 池塘百合")}
            </Link>
          </div>
          {activity.data?.unavailable && (
            <p>
              {t(
                "Some activity connections are temporarily unavailable. You can still finish the adventure.",
                "部分活動資料暫時無法載入，你仍然可以完成探險。",
              )}
            </p>
          )}
        </div>
        <div className={styles.care}>
          <span className={styles.kicker}>
            {t("Your living collection", "你的植物收藏")}
          </span>
          {plant.isPending ? (
            <Loader2 className="animate-spin" />
          ) : plant.isError ? (
            <button type="button" onClick={() => void plant.refetch()}>
              {t("Retry plant data", "重試植物資料")}
            </button>
          ) : plant.data ? (
            <>
              <h3>
                {
                  {
                    grass: t("Grass", "青草"),
                    sunflower: t("Sunflower", "向日葵"),
                    lily: t("Lily", "百合"),
                    orchid: t("Orchid", "蘭花"),
                    apple_tree: t("Apple tree", "蘋果樹"),
                  }[plant.data.plant_type]
                }{" "}
                <small>
                  {t(
                    `Stage ${plant.data.growth_stage}/5`,
                    `階段 ${plant.data.growth_stage}/5`,
                  )}
                </small>
              </h3>
              {plant.data.growth_stage < 5 ? (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={!!caredToday || waterPlant.isPending}
                  onClick={() => waterPlant.mutate()}
                >
                  <Droplets size={16} />
                  {caredToday
                    ? t("Cared for today", "今天已照料")
                    : waterPlant.isPending
                      ? t("Saving care…", "儲存照料中…")
                      : t("Water your plant", "澆灌你的植物")}
                </button>
              ) : (
                <button
                  type="button"
                  className={styles.primary}
                  disabled={harvestPlant.isPending}
                  onClick={() => harvestPlant.mutate()}
                >
                  <Flower2 size={16} />
                  {t("Add bloom to collection", "加入開花收藏")}
                </button>
              )}
              {(inventory.data?.find((i) => i.item_type === "fertilizer")
                ?.quantity ?? 0) > 0 &&
                plant.data.growth_stage < 5 && (
                  <button
                    type="button"
                    className={styles.secondary}
                    disabled={fertilizer.isPending}
                    onClick={() => fertilizer.mutate()}
                  >
                    {t("Use fertilizer", "使用肥料")}
                  </button>
                )}
              {waterPlant.isError && (
                <p role="alert">
                  {t(
                    "Care was not saved. Please try again.",
                    "照料尚未儲存，請重試。",
                  )}
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                {t("Your first plant is waiting.", "你的第一株植物在等你。")}
              </p>
              <button
                type="button"
                className={styles.primary}
                onClick={() => setSeeds(true)}
              >
                <Sprout size={16} />
                {t("Choose a seed", "選擇種子")}
              </button>
            </>
          )}
          <small>
            {t(
              "Daily expeditions refresh at midnight UTC. Your stamps and collection stay with you.",
              "每日探險於 UTC 午夜更新，印章和收藏會一直保留。",
            )}
          </small>
        </div>
      </div>
      {seeds && !plant.data && (
        <div className={styles.seedArea}>
          <button type="button" onClick={() => setSeeds(false)}>
            <X size={16} />
            {t("Close seed selection", "關閉種子選擇")}
          </button>
          <SeedSelector />
        </div>
      )}
    </section>
  );
}
