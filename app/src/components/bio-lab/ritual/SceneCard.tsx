"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { SceneId, RitualCopy } from "./i18n";

export type SceneDef = {
  id: SceneId;
  gradient: string;
  particleClass: string;
  glyph: string;
  impactShape: "dust" | "ring" | "leaf" | "star";
};

export const SCENES: SceneDef[] = [
  {
    id: "trash",
    gradient: "from-stone-700 via-stone-800 to-zinc-900",
    particleClass: "bg-stone-300/70",
    glyph: "🗑",
    impactShape: "dust",
  },
  {
    id: "ocean",
    gradient: "from-sky-700 via-blue-800 to-indigo-950",
    particleClass: "bg-sky-200/70",
    glyph: "🌊",
    impactShape: "ring",
  },
  {
    id: "forest",
    gradient: "from-emerald-700 via-emerald-800 to-green-950",
    particleClass: "bg-lime-200/70",
    glyph: "🌲",
    impactShape: "leaf",
  },
  {
    id: "space",
    gradient: "from-violet-900 via-indigo-950 to-black",
    particleClass: "bg-fuchsia-200/80",
    glyph: "🌌",
    impactShape: "star",
  },
];

type SceneTileProps = {
  scene: SceneDef;
  copy: RitualCopy["scenes"][SceneId];
  onSelect: (id: SceneId) => void;
  reduceMotion: boolean;
  index: number;
};

export function SceneCard({ scene, copy, onSelect, reduceMotion, index }: SceneTileProps) {
  const ambientCount = 6;

  return (
    <motion.button
      type="button"
      onClick={() => onSelect(scene.id)}
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, delay: reduceMotion ? 0 : index * 0.06, ease: [0.2, 0.8, 0.2, 1] }}
      whileHover={reduceMotion ? undefined : { scale: 1.04, y: -3 }}
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      aria-label={copy.name}
      className={cn(
        "group relative h-28 w-full overflow-hidden rounded-2xl border border-white/10",
        "bg-gradient-to-br text-left shadow-lg shadow-black/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/70",
        scene.gradient,
      )}
    >
      {/* Ambient particles */}
      {Array.from({ length: ambientCount }).map((_, i) => {
        const left = ((i * 53 + 11) % 100);
        const top = ((i * 37 + 23) % 100);
        const delay = (i * 0.4) % 2.5;
        const duration = 3.2 + ((i * 0.7) % 2.4);
        return (
          <span
            key={i}
            aria-hidden
            className={cn(
              "absolute h-1 w-1 rounded-full opacity-70",
              scene.particleClass,
              !reduceMotion && "ritual-float",
            )}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              ["--d" as never]: `${duration}s`,
              animationDelay: `${delay}s`,
            }}
          />
        );
      })}

      <div className="relative z-10 flex h-full flex-col justify-between p-3">
        <span className="text-2xl leading-none drop-shadow-md" aria-hidden>
          {scene.glyph}
        </span>
        <div>
          <p className="text-sm font-semibold text-white drop-shadow">{copy.name}</p>
          <p className="mt-0.5 line-clamp-2 text-[0.7rem] leading-snug text-white/75">
            {copy.tagline}
          </p>
        </div>
      </div>

      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/0 via-white/0 to-white/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />
    </motion.button>
  );
}
