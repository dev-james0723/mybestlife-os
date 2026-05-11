"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useReducedMotion, useMotionValue } from "framer-motion";
import { useAppStore } from "@/stores/app-store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { getRitualCopy, type SceneId } from "./ritual/i18n";
import { useRitualSound } from "./ritual/useRitualSound";
import { PaperBall } from "./ritual/PaperBall";
import { SceneCard, SCENES } from "./ritual/SceneCard";
import { ThoughtFragments, type SceneTint } from "./ritual/ThoughtFragments";
import { OceanScene } from "./ritual/scenes/OceanScene";
import { ForestScene } from "./ritual/scenes/ForestScene";
import { SpaceScene } from "./ritual/scenes/SpaceScene";
import { TrashScene } from "./ritual/scenes/TrashScene";

export type MindSweepReleaseRitualProps = {
  entryCount: number;
  /** Raw text of each entry the user just submitted, used to power the
   *  thought-fragments animation (absorb on crumple, scatter on impact). */
  entryTexts: string[];
  onComplete: () => void;
  onSkip?: () => void;
};

type Phase = "crumple" | "choose" | "stage" | "impact" | "cleared";

/** Brief grace period after both the paper crumple animation AND the
 *  thought-fragments absorb have finished, before revealing the scene picker. */
const CRUMPLE_GRACE_MS = 200;
const CLEARED_HOLD_MS = 850;

/** Impact phase budget — must accommodate ThoughtFragments timing:
 *    word burst (~450ms) + words readable hold (~250ms)
 *    + char scatter (1.1–1.6s) + small grace before the cleared overlay
 *  We aim for the cleared overlay to start fading in while the very last
 *  char shards are still in their final 100–300ms (covers them gracefully). */
const IMPACT_HOLD_MS = 2300;

/** Single source-of-truth for the four scene backdrop assets. Used both for
 *  prewarming during the choose phase and as a sanity reference for the
 *  individual scene components (which still own the actual <Image>). */
const SCENE_ASSETS: Record<SceneId, string> = {
  trash: "/ritual/office-trash.png",
  ocean: "/ritual/ocean-deep.png",
  forest: "/ritual/forest-mystical.png",
  space: "/ritual/space-nebula.png",
};

/** Per-scene color tokens applied to the impact-phase word/char burst so the
 *  scattering letters feel like they belong to the chosen scene. */
const SCENE_TINTS: Record<SceneId, SceneTint> = {
  trash: { word: "text-amber-100", char: "text-amber-200/90" },
  ocean: { word: "text-cyan-100", char: "text-cyan-200/90" },
  forest: { word: "text-lime-100", char: "text-lime-200/90" },
  space: { word: "text-fuchsia-100", char: "text-fuchsia-200/90" },
};

export function MindSweepReleaseRitual({
  entryCount,
  entryTexts,
  onComplete,
  onSkip,
}: MindSweepReleaseRitualProps) {
  const language = useAppStore((s) => s.language);
  const copy = getRitualCopy(language);
  const reduceMotion = useReducedMotion() ?? false;
  const sound = useRitualSound();

  const [phase, setPhase] = useState<Phase>("crumple");
  const [chosen, setChosen] = useState<SceneId | null>(null);
  const [showHint, setShowHint] = useState(true);

  /** Twin completion flags that gate the crumple→choose transition. The
   *  scene picker only appears once BOTH the paper has finished its crumple
   *  morph AND every thought fragment has been visually absorbed. */
  const [paperCrumpled, setPaperCrumpled] = useState(false);
  const [textAbsorbed, setTextAbsorbed] = useState(false);

  /** Tracks which scene's backdrop photo has actually decoded. Used to gate
   *  the entire immersive-bg fade-in so particles + photo always reveal
   *  together — no more "particles first, photo pops in late". Storing the
   *  scene id (rather than a boolean) lets us derive `backdropReady` purely
   *  during render: it auto-resets the moment `chosen` changes, even on a
   *  defensive re-pick, with no synchronous setState inside an effect. */
  const [readyScene, setReadyScene] = useState<SceneId | null>(null);
  const backdropReady = readyScene !== null && readyScene === chosen;

  const handleBackdropReady = useCallback(() => {
    if (chosen) setReadyScene(chosen);
  }, [chosen]);

  const stageRef = useRef<HTMLDivElement | null>(null);

  const parallaxX = useMotionValue(0);
  const parallaxY = useMotionValue(0);

  const handleCrumpleDone = useCallback(() => setPaperCrumpled(true), []);
  const handleAbsorbed = useCallback(() => setTextAbsorbed(true), []);

  useEffect(() => {
    if (phase !== "crumple") return;
    if (!paperCrumpled || !textAbsorbed) return;
    const t = window.setTimeout(() => setPhase("choose"), CRUMPLE_GRACE_MS);
    return () => window.clearTimeout(t);
  }, [phase, paperCrumpled, textAbsorbed]);

  const handlePickScene = useCallback(
    (id: SceneId) => {
      setChosen(id);
      setPhase("stage");
      // Add a delayed hint if they don't drag soon
      setTimeout(() => setShowHint(false), 4000);
    },
    [],
  );

  const handleFling = useCallback(() => {
    setShowHint(false);
    if (!chosen) return;
    sound.whoosh();
    setPhase("impact");
    sound.impact(chosen);

    // See IMPACT_HOLD_MS doc — long enough for words burst → readable hold →
    // chars peel-off + drift, with a tiny tail covered by the cleared overlay.
    setTimeout(() => {
      setPhase("cleared");
    }, IMPACT_HOLD_MS);
  }, [chosen, sound]);

  useEffect(() => {
    if (phase !== "cleared") return;
    const t = window.setTimeout(onComplete, CLEARED_HOLD_MS);
    return () => window.clearTimeout(t);
  }, [phase, onComplete]);

  useEffect(() => {
    sound.prime();
  }, [sound]);

  const skip = useCallback(() => {
    onSkip?.();
    onComplete();
  }, [onSkip, onComplete]);

  return (
    <div
      className={cn(
        "relative isolate overflow-hidden rounded-2xl border border-border/60",
        "min-h-[420px] sm:min-h-[460px] touch-none",
        "bg-gradient-to-b from-background via-background to-muted/40",
      )}
      role="dialog"
      aria-live="polite"
      aria-label={copy.chooseLead}
    >
      {/* Top-right skip / cancel */}
      <div className="absolute right-2 top-2 z-40">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs text-white/70 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-sm"
          onClick={skip}
        >
          {phase === "choose" || phase === "crumple" ? copy.cancel : copy.skip}
        </Button>
      </div>

      {/* Hidden backdrop prewarm — once the user is on the choose phase we
          start fetching all four scene photos in parallel so that whichever
          one they pick is (likely) already cached and decoded by the time we
          mount the real BackdropLayer. Identical sizes/priority means the
          optimized variant is shared with the eventual visible image. */}
      {phase === "choose" && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-0"
        >
          {(Object.keys(SCENE_ASSETS) as SceneId[]).map((id) => (
            <Image
              key={id}
              src={SCENE_ASSETS[id]}
              alt=""
              fill
              sizes="100vw"
              priority
              className="object-cover"
            />
          ))}
        </div>
      )}

      {/* Immersive Scene Background — mounts the moment a scene is picked,
          but stays at opacity 0 until the backdrop photo has actually decoded,
          so particles/vignette/photo all reveal together. */}
      <AnimatePresence>
        {(phase === "stage" || phase === "impact" || phase === "cleared") && chosen && (
          <motion.div
            key="immersive-bg"
            initial={{ opacity: 0 }}
            animate={{ opacity: backdropReady ? 1 : 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.55, ease: [0.2, 0.8, 0.2, 1] }}
            className="absolute inset-0 z-0"
          >
            {chosen === "ocean" && (
              <OceanScene
                parallaxX={parallaxX}
                parallaxY={parallaxY}
                phase={phase}
                reduceMotion={reduceMotion}
                onBackdropReady={handleBackdropReady}
              />
            )}
            {chosen === "forest" && (
              <ForestScene
                parallaxX={parallaxX}
                parallaxY={parallaxY}
                phase={phase}
                reduceMotion={reduceMotion}
                onBackdropReady={handleBackdropReady}
              />
            )}
            {chosen === "space" && (
              <SpaceScene
                parallaxX={parallaxX}
                parallaxY={parallaxY}
                phase={phase}
                reduceMotion={reduceMotion}
                onBackdropReady={handleBackdropReady}
              />
            )}
            {chosen === "trash" && (
              <TrashScene
                parallaxX={parallaxX}
                parallaxY={parallaxY}
                phase={phase}
                reduceMotion={reduceMotion}
                onBackdropReady={handleBackdropReady}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ball Stage Area */}
      {phase !== "cleared" && (
        <motion.div 
          ref={stageRef}
          className="absolute inset-0 z-20"
          onPointerMove={(e) => {
            if (phase === "stage" && stageRef.current) {
              const rect = stageRef.current.getBoundingClientRect();
              if (rect.width === 0 || rect.height === 0) return;
              const nx = (e.clientX - rect.left) / rect.width - 0.5;
              const ny = (e.clientY - rect.top) / rect.height - 0.5;
              parallaxX.set(nx * 300);
              parallaxY.set(ny * 300);
            }
          }}
        >
          <div className="relative flex h-56 sm:h-60 w-full items-center justify-center pt-8">
            <PaperBall
              phase={phase}
              reduceMotion={reduceMotion}
              onCrumpleDone={handleCrumpleDone}
              onFling={handleFling}
              stageConstraintsRef={stageRef}
              // Pass texts through every phase — PaperBall keeps the surface
              // overlay mounted and toggles opacity by phase so the reveal
              // reads as a smooth fade rather than a pop-in.
              surfaceText={entryTexts}
            />

            {/* Thought-fragments — spirals into the ball during crumple,
                bursts out as words → chars during impact. Sibling of
                PaperBall so its (0,0) coincides with the ball's center. */}
            <ThoughtFragments
              texts={entryTexts}
              phase={phase}
              reduceMotion={reduceMotion}
              sceneTint={chosen ? SCENE_TINTS[chosen] : undefined}
              onAbsorbed={handleAbsorbed}
            />

            {/* Crumple Hint */}
            <AnimatePresence>
              {phase === "crumple" && (
                <motion.p
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 0.85, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.35 }}
                  className="pointer-events-none absolute bottom-0 text-xs text-muted-foreground"
                >
                  {copy.crumpleHint}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Swipe Hint */}
      <AnimatePresence>
        {phase === "stage" && showHint && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none z-30"
          >
            <div className="bg-black/40 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/90 text-sm font-medium flex items-center gap-2">
              <span className="animate-bounce">↓</span>
              {copy.swipeHint}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Choose phase */}
      <AnimatePresence mode="wait">
        {phase === "choose" ? (
          <motion.div
            key="choose"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.3, ease: [0.2, 0.8, 0.2, 1] }}
            className="relative mt-56 sm:mt-60 px-4 pb-4 z-30"
          >
            <div className="mb-2 text-center">
              <p className="text-sm font-medium text-foreground">{copy.chooseTitle(entryCount)}</p>
              <p className="text-xs text-muted-foreground">{copy.chooseLead}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:gap-3">
              {SCENES.map((scene, i) => (
                <SceneCard
                  key={scene.id}
                  scene={scene}
                  copy={copy.scenes[scene.id]}
                  onSelect={handlePickScene}
                  reduceMotion={reduceMotion}
                  index={i}
                />
              ))}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* "Mind cleared" overlay */}
      <AnimatePresence>
        {phase === "cleared" ? (
          <motion.div
            key="cleared"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className={cn(
              "pointer-events-none absolute inset-0 z-50 flex items-center justify-center",
              "bg-gradient-to-b from-background/0 via-background/40 to-background/80 backdrop-blur-[2px]",
            )}
          >
            <p className="text-center text-base font-medium text-foreground sm:text-lg text-white drop-shadow-md">
              {copy.cleared}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
