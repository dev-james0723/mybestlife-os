"use client";

import { useCallback, useId, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Hash,
  ImageIcon,
  Info,
  Layers,
  MessageCircle,
  Tags,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { DocOracleSectionRow } from "@/components/document-oracle/docOracleWorkspaceTypes";

type BranchId = "pages" | "sections" | "glossary" | "visuals" | "chat" | "source";
type NodeKey = "pages" | "sections" | "glossary" | "visuals" | "topics" | "chat";

type NodePos = { x: number; y: number };

const VB_W = 1000;
const VB_H = 720;

// Node card centers within the SVG viewBox (used both for branch endpoints and
// for HTML overlay positioning via percentages).
const NODE_POS: Record<NodeKey, NodePos> = {
  pages: { x: 500, y: 110 },
  glossary: { x: 245, y: 240 },
  sections: { x: 755, y: 240 },
  visuals: { x: 215, y: 450 },
  topics: { x: 785, y: 450 },
  chat: { x: 770, y: 600 },
};

const ROOT_POS: NodePos = { x: 500, y: 640 };

/** Mobile “bonsai” canvas — viewBox coords = layout at 390×620 */
const MOB_W = 390;
const MOB_H = 620;
const MOB_ROOT: NodePos = { x: 195, y: 285 };
const MOB_NODE: Record<NodeKey, NodePos> = {
  pages: { x: 195, y: 50 },
  glossary: { x: 70, y: 155 },
  sections: { x: 320, y: 155 },
  visuals: { x: 78, y: 409 },
  topics: { x: 312, y: 409 },
  chat: { x: 195, y: 521 },
};
/** Lower trunk rising into root */
const MOB_TRUNK_D =
  "M 195 605 C 192 535 198 455 195 380 C 193 345 196 310 195 285";
const MOB_BRANCHES: Record<NodeKey, string> = {
  pages: "M 195 285 C 202 210 198 130 195 50",
  glossary: "M 192 282 C 150 255 100 205 70 155",
  sections: "M 198 282 C 240 255 290 205 320 155",
  visuals: "M 188 288 C 145 325 105 365 78 409",
  topics: "M 202 288 C 245 325 285 365 312 409",
  chat: "M 195 290 C 188 365 190 445 195 521",
};

// Organic pebble border-radii per node — gives each card an asymmetric blob
// shape rather than a uniform rounded rectangle.
const PEBBLE: Record<NodeKey, { card: string; ghost: string }> = {
  pages:    { card: "58% 42% 48% 52% / 52% 48% 52% 48%", ghost: "62% 38% 46% 54% / 50% 50% 54% 46%" },
  glossary: { card: "48% 52% 56% 44% / 50% 50% 48% 52%", ghost: "52% 48% 60% 40% / 46% 54% 50% 50%" },
  sections: { card: "52% 48% 44% 56% / 48% 52% 52% 48%", ghost: "46% 54% 48% 52% / 52% 48% 56% 44%" },
  visuals:  { card: "44% 56% 50% 50% / 56% 44% 50% 50%", ghost: "48% 52% 46% 54% / 60% 40% 48% 52%" },
  topics:   { card: "56% 44% 48% 52% / 44% 56% 50% 50%", ghost: "52% 48% 52% 48% / 40% 60% 46% 54%" },
  chat:     { card: "50% 50% 56% 44% / 52% 48% 44% 56%", ghost: "54% 46% 50% 50% / 48% 52% 40% 60%" },
};

// Pre-computed cubic-bezier branch paths from the trunk to each leaf node.
// Tuned so branches never cross and feel organic.
const BRANCHES: Record<NodeKey, string> = {
  pages: "M 500 560 C 500 420 500 280 500 150",
  glossary: "M 495 480 C 460 430 360 340 270 260",
  sections: "M 505 480 C 540 430 640 340 730 260",
  visuals: "M 488 555 C 430 530 320 490 240 460",
  topics: "M 512 555 C 570 530 680 490 760 460",
  chat: "M 520 605 C 600 605 700 605 750 605",
};

export function DocumentTreeMap(props: {
  documentTitle: string;
  pageCount: number;
  sectionCount: number;
  glossaryCount: number;
  visualCount: number;
  topicCount: number;
  topSections: DocOracleSectionRow[];
  onNavigate: (tab: BranchId) => void;
  onFocusSection: (s: DocOracleSectionRow) => void;
  topicsAnchorId: string;
}) {
  const {
    documentTitle,
    pageCount,
    sectionCount,
    glossaryCount,
    visualCount,
    topicCount,
    topSections,
    onNavigate,
    onFocusSection,
    topicsAnchorId,
  } = props;

  const reducedMotion = useReducedMotion();
  const gid = useId().replace(/:/g, "");
  const [hovered, setHovered] = useState<NodeKey | "root" | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  const scrollToTopics = useCallback(() => {
    const el = typeof document !== "undefined" ? document.getElementById(topicsAnchorId) : null;
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [topicsAnchorId]);

  const rootLabel = documentTitle.length > 40 ? `${documentTitle.slice(0, 38)}…` : documentTitle;

  const nodes = useMemo(
    () => [
      {
        key: "pages" as const,
        label: `${pageCount} Pages`,
        sub: "Browse pages",
        icon: <Layers className="h-4 w-4" aria-hidden />,
        onClick: () => onNavigate("pages"),
      },
      {
        key: "glossary" as const,
        label: `${glossaryCount} Glossary`,
        sub: "Terms",
        icon: <Tags className="h-4 w-4" aria-hidden />,
        onClick: () => onNavigate("glossary"),
      },
      {
        key: "sections" as const,
        label: `${sectionCount} Sections`,
        sub: "Outline",
        icon: <BookOpen className="h-4 w-4" aria-hidden />,
        onClick: () => onNavigate("sections"),
      },
      {
        key: "visuals" as const,
        label: `${visualCount} Visuals`,
        sub: "Figures & images",
        icon: <ImageIcon className="h-4 w-4" aria-hidden />,
        onClick: () => onNavigate("visuals"),
      },
      {
        key: "topics" as const,
        label: topicCount > 0 ? `${topicCount} Key topics` : "Key topics",
        sub: "Jump below",
        icon: <Hash className="h-4 w-4" aria-hidden />,
        onClick: scrollToTopics,
      },
      {
        key: "chat" as const,
        label: "Ask Doc Oracle",
        sub: "Chat",
        icon: <MessageCircle className="h-4 w-4" aria-hidden />,
        onClick: () => onNavigate("chat"),
      },
    ],
    [pageCount, glossaryCount, sectionCount, visualCount, topicCount, onNavigate, scrollToTopics],
  );

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-[radial-gradient(120%_80%_at_50%_100%,rgba(200,229,58,0.10),rgba(0,0,0,0)_55%),linear-gradient(180deg,rgba(8,10,8,0.55),rgba(0,0,0,0.55))] p-3 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] sm:p-5 md:p-6">
      {/* Header */}
      <div className="relative z-10 mb-3 flex items-start justify-between gap-3 sm:mb-4">
        <div>
          <h3 className="text-[14px] font-semibold tracking-tight text-foreground sm:text-[15px]">
            Document Tree Map
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            An organic view of how this document is structured.
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setHelpOpen((v) => !v)}
            aria-expanded={helpOpen}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-foreground/85 transition hover:border-[#C8E53A]/35 hover:bg-[#C8E53A]/[0.06]"
          >
            <Info className="h-3.5 w-3.5" aria-hidden />
            How to read this map
          </button>
          {helpOpen ? (
            <div
              role="dialog"
              className="absolute right-0 top-[calc(100%+8px)] z-30 w-72 rounded-xl border border-white/12 bg-black/85 p-3 text-[11.5px] leading-relaxed text-muted-foreground shadow-xl backdrop-blur-md"
            >
              <p className="font-semibold text-foreground">A tree of your document</p>
              <p className="mt-1">
                The glowing core is the document itself. Each leaf card opens a different way to
                explore it — Pages, Sections, Glossary, Visuals, Key topics, or Chat.
              </p>
              <button
                type="button"
                onClick={() => setHelpOpen(false)}
                className="mt-2 text-[11px] font-semibold text-[#d4f06a] hover:underline"
              >
                Got it
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Desktop / tablet tree */}
      <div className="relative hidden md:block">
        <div className="relative mx-auto aspect-[1000/720] w-full max-w-[min(100%,1280px)]">
          <TreeSvg
            gid={gid}
            hovered={hovered}
            reducedMotion={!!reducedMotion}
          />

          {/* Root node */}
          <RootCard
            label={rootLabel}
            onClick={() => onNavigate("source")}
            onHoverChange={(h) => setHovered(h ? "root" : null)}
            reducedMotion={!!reducedMotion}
            dimmed={hovered !== null && hovered !== "root"}
          />

          {/* Leaf cards */}
          {nodes.map((n, idx) => (
            <LeafCard
              key={n.key}
              nodeKey={n.key}
              pos={NODE_POS[n.key]}
              label={n.label}
              sub={n.sub}
              icon={n.icon}
              onClick={n.onClick}
              onHoverChange={(h) => setHovered(h ? n.key : null)}
              dimmed={hovered !== null && hovered !== n.key}
              reducedMotion={!!reducedMotion}
              phase={idx}
            />
          ))}
        </div>
      </div>

      {/* Mobile compact bonsai tree (curved SVG branches + positioned leaf cards) */}
      <div className="md:hidden">
        <DocumentTreeMapMobile
          gid={gid}
          rootLabel={rootLabel}
          nodes={nodes}
          onOpenSource={() => onNavigate("source")}
          reducedMotion={!!reducedMotion}
          hovered={hovered}
          onHoverChange={setHovered}
        />
      </div>

      {/* Section shortcuts band */}
      {topSections.length > 0 ? (
        <div className="relative z-10 mt-4 rounded-2xl border border-white/10 bg-black/30 p-3 sm:mt-6 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-foreground/80">
              <BookOpen className="h-3.5 w-3.5" aria-hidden />
            </span>
            <p className="text-[12px] font-semibold tracking-tight text-foreground">
              Section Shortcuts
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {topSections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onFocusSection(s)}
                className="group inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11.5px] font-medium text-foreground/90 transition hover:border-[#C8E53A]/35 hover:bg-[#C8E53A]/10"
              >
                <span className="truncate">{s.title}</span>
                <LeafGlyph className="h-3 w-3 shrink-0 text-[#C8E53A]/70 transition group-hover:text-[#C8E53A]" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- SVG trunk + branches ---------- */

function TreeSvg(props: { gid: string; hovered: NodeKey | "root" | null; reducedMotion: boolean }) {
  const { gid, hovered, reducedMotion } = props;
  const branchKeys = Object.keys(BRANCHES) as NodeKey[];

  return (
    <svg
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`trunk-${gid}`}
          gradientUnits="userSpaceOnUse"
          x1={ROOT_POS.x}
          y1={ROOT_POS.y}
          x2={ROOT_POS.x}
          y2={0}
        >
          <stop offset="0%" stopColor="#C8E53A" stopOpacity="0.85" />
          <stop offset="35%" stopColor="#9aaf52" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8a9a6a" stopOpacity="0.25" />
        </linearGradient>
        <linearGradient
          id={`branch-${gid}`}
          gradientUnits="userSpaceOnUse"
          x1={ROOT_POS.x}
          y1={ROOT_POS.y}
          x2={ROOT_POS.x}
          y2={0}
        >
          <stop offset="0%" stopColor="#C8E53A" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#a3b07a" stopOpacity="0.25" />
        </linearGradient>
        <radialGradient id={`root-glow-${gid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8E53A" stopOpacity="0.55" />
          <stop offset="60%" stopColor="#C8E53A" stopOpacity="0.10" />
          <stop offset="100%" stopColor="#C8E53A" stopOpacity="0" />
        </radialGradient>
        <filter id={`soft-${gid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>

      {/* Root glow halo */}
      <circle
        cx={ROOT_POS.x}
        cy={ROOT_POS.y}
        r={170}
        fill={`url(#root-glow-${gid})`}
      />

      {/* Subtle ground roots beneath the trunk */}
      <g
        stroke="#C8E53A"
        strokeOpacity="0.35"
        strokeWidth="1"
        fill="none"
        strokeLinecap="round"
      >
        <path d="M 470 685 C 440 695 410 700 380 705" />
        <path d="M 480 690 C 460 700 430 706 400 712" />
        <path d="M 530 685 C 560 695 590 700 620 705" />
        <path d="M 520 690 C 540 700 570 706 600 712" />
        <path d="M 500 690 C 500 705 500 712 500 716" />
      </g>

      {/* Main trunk */}
      <motion.path
        d="M 500 660 C 498 600 502 540 500 470 C 498 420 502 360 500 280"
        fill="none"
        stroke={`url(#trunk-${gid})`}
        strokeWidth="3.5"
        strokeLinecap="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: "easeOut" }}
      />

      {/* Branches */}
      {branchKeys.map((k, i) => {
        const isHovered = hovered === k;
        const isDim = hovered !== null && hovered !== k && hovered !== "root";
        return (
          <motion.path
            key={k}
            d={BRANCHES[k]}
            fill="none"
            stroke={`url(#branch-${gid})`}
            strokeWidth={isHovered ? 2.4 : 1.6}
            strokeLinecap="round"
            strokeDasharray={isHovered ? "0" : "0"}
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: isDim ? 0.35 : isHovered ? 1 : 0.85,
            }}
            transition={{ duration: 0.9, ease: "easeOut", delay: 0.25 + i * 0.08 }}
          />
        );
      })}

      {/* Decorative leaves clustered along each branch */}
      {branchKeys.flatMap((k, i) => {
        const p = NODE_POS[k];
        const ts = [0.35, 0.55, 0.78];
        return ts.map((t, j) => {
          const lx = ROOT_POS.x + (p.x - ROOT_POS.x) * t;
          const ly = ROOT_POS.y + (p.y - ROOT_POS.y) * t;
          const jitter = ((i + j) * 19) % 18 - 9;
          return (
            <SvgLeaf
              key={`leaf-${k}-${j}`}
              x={lx + jitter}
              y={ly - 4}
              rotate={(i * 53 + j * 67) % 360}
              delay={0.5 + i * 0.06 + j * 0.05}
              reducedMotion={reducedMotion}
              scale={j === 1 ? 1 : 0.78}
            />
          );
        });
      })}

      {/* Sparkles around the root */}
      <g fill="#C8E53A">
        {[
          [430, 605, 1.6],
          [565, 600, 1.4],
          [495, 590, 1.2],
          [445, 660, 1.2],
          [555, 665, 1.5],
          [410, 640, 1.1],
          [590, 645, 1.3],
        ].map(([cx, cy, r], i) => (
          <motion.circle
            key={`spark-${i}`}
            cx={cx}
            cy={cy}
            r={r}
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: [0.3, 0.85, 0.3] }}
            transition={{
              duration: 2.6 + (i % 3) * 0.4,
              repeat: Infinity,
              ease: "easeInOut",
              delay: i * 0.25,
            }}
          />
        ))}
      </g>
    </svg>
  );
}

function SvgLeaf(props: {
  x: number;
  y: number;
  rotate: number;
  delay: number;
  reducedMotion: boolean;
  scale?: number;
}) {
  const { x, y, rotate, delay, reducedMotion, scale = 1 } = props;
  return (
    <motion.g
      transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}
      initial={reducedMotion ? false : { opacity: 0, scale: scale * 0.6 }}
      animate={{ opacity: 0.85 }}
      transition={{ duration: 0.5, delay, ease: "easeOut" }}
    >
      <path
        d="M 0 -8 C 6 -4, 6 4, 0 10 C -6 4, -6 -4, 0 -8 Z"
        fill="#C8E53A"
        fillOpacity="0.55"
        stroke="#C8E53A"
        strokeOpacity="0.7"
        strokeWidth="0.6"
      />
      <line x1="0" y1="-6" x2="0" y2="8" stroke="#C8E53A" strokeOpacity="0.6" strokeWidth="0.5" />
    </motion.g>
  );
}

/* ---------- Root card ---------- */

function RootCard(props: {
  label: string;
  onClick: () => void;
  onHoverChange: (h: boolean) => void;
  reducedMotion: boolean;
  dimmed: boolean;
}) {
  const { label, onClick, onHoverChange, reducedMotion, dimmed } = props;
  const style: CSSProperties = {
    left: `${(ROOT_POS.x / VB_W) * 100}%`,
    top: `${(ROOT_POS.y / VB_H) * 100}%`,
  };
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={style}
      animate={
        reducedMotion
          ? { opacity: dimmed ? 0.85 : 1 }
          : { opacity: dimmed ? 0.85 : 1, scale: [1, 1.012, 1] }
      }
      transition={{
        opacity: { duration: 0.25 },
        scale: { duration: 4.5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
      }}
    >
      <div className="relative">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-3 rounded-[26px] border border-dashed border-[#C8E53A]/25"
        />
        <motion.button
          type="button"
          onClick={onClick}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          whileHover={reducedMotion ? undefined : { y: -3, scale: 1.02 }}
          whileTap={{ scale: 0.985 }}
          aria-label={`Open source for ${label}`}
          className={cn(
            "relative flex w-[180px] flex-col items-center gap-1.5 rounded-[20px] border border-[#C8E53A]/55 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(40,52,18,0.92),rgba(10,14,8,0.92))] px-4 py-4 text-center shadow-[0_0_50px_rgba(200,229,58,0.35),inset_0_0_24px_rgba(200,229,58,0.16)] backdrop-blur-md",
          )}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#C8E53A]/40 bg-black/40 text-[#dff58a]">
            <FileText className="h-[18px] w-[18px]" aria-hidden />
          </span>
          <span className="line-clamp-2 text-[12.5px] font-semibold leading-tight tracking-tight text-foreground">
            {label}
          </span>
          <span className="text-[11px] font-medium text-[#d4f06a]">Open source</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ---------- Leaf card ---------- */

function LeafCard(props: {
  nodeKey: NodeKey;
  pos: NodePos;
  label: string;
  sub: string;
  icon: ReactNode;
  onClick: () => void;
  onHoverChange: (h: boolean) => void;
  dimmed: boolean;
  reducedMotion: boolean;
  phase: number;
}) {
  const { nodeKey, pos, label, sub, icon, onClick, onHoverChange, dimmed, reducedMotion, phase } = props;
  const style: CSSProperties = {
    left: `${(pos.x / VB_W) * 100}%`,
    top: `${(pos.y / VB_H) * 100}%`,
  };
  const shape = PEBBLE[nodeKey];
  const duration = 4.5 + (phase % 3) * 0.7;
  const rotateRange = phase % 2 === 0 ? [-1, 1, -1] : [1, -1, 1];
  const yRange = phase % 2 === 0 ? [-2, 2, -2] : [2, -2, 2];

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={style}
      initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={
        reducedMotion
          ? { opacity: dimmed ? 0.85 : 1 }
          : {
              opacity: dimmed ? 0.85 : 1,
              rotate: rotateRange,
              y: yRange,
              scale: 1,
            }
      }
      transition={{
        opacity: { duration: 0.25 },
        rotate: { duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: phase * 0.2 },
        y: { duration: duration + 0.6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: phase * 0.15 },
      }}
    >
      <div className="relative">
        {/* Dashed ghost halo around the pebble */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2.5 border border-dashed border-[#C8E53A]/15"
          style={{ borderRadius: shape.ghost }}
        />
        {/* Decorative side leaves */}
        <LeafGlyph
          aria-hidden
          className="pointer-events-none absolute -left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 -rotate-[35deg] text-[#C8E53A]/70 drop-shadow-[0_0_4px_rgba(200,229,58,0.35)]"
        />
        <LeafGlyph
          aria-hidden
          className="pointer-events-none absolute -right-3 top-[60%] h-3.5 w-3.5 -translate-y-1/2 rotate-[35deg] text-[#C8E53A]/70 drop-shadow-[0_0_4px_rgba(200,229,58,0.35)]"
        />

        <motion.button
          type="button"
          onClick={onClick}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          whileHover={reducedMotion ? undefined : { y: -4, scale: 1.025 }}
          whileTap={{ scale: 0.985 }}
          style={{ borderRadius: shape.card }}
          className={cn(
            "group relative flex w-[172px] flex-col items-center gap-1 border border-white/10 bg-[radial-gradient(120%_120%_at_50%_0%,rgba(36,42,28,0.92),rgba(10,12,9,0.88))] px-4 py-3.5 text-center shadow-[0_10px_36px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition hover:border-[#C8E53A]/35",
          )}
        >
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-foreground/90 transition group-hover:border-[#C8E53A]/40 group-hover:text-[#dff58a]">
            {icon}
          </span>
          <span className="text-[12.5px] font-semibold leading-tight tracking-tight text-foreground">
            {label}
          </span>
          <span className="text-[10.5px] leading-snug text-muted-foreground">{sub}</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ---------- Mobile compact bonsai tree ---------- */

export function DocumentTreeMapMobile(props: {
  gid: string;
  rootLabel: string;
  nodes: Array<{
    key: NodeKey;
    label: string;
    sub: string;
    icon: ReactNode;
    onClick: () => void;
  }>;
  onOpenSource: () => void;
  reducedMotion: boolean;
  hovered: NodeKey | "root" | null;
  onHoverChange: (next: NodeKey | "root" | null) => void;
}) {
  const { gid, rootLabel, nodes, onOpenSource, reducedMotion, hovered, onHoverChange } = props;
  const branchKeys = Object.keys(MOB_BRANCHES) as NodeKey[];

  return (
    <div
      className="relative mx-auto w-full max-w-[min(100%,420px)] min-[401px]:max-w-[min(100%,520px)] min-[600px]:max-w-[min(100%,720px)] overflow-visible max-[359px]:h-[560px] h-[620px] max-[359px]:text-[11px]"
      aria-label="Document structure tree map"
    >
      <MobileTreeSvg
        gid={gid}
        hovered={hovered}
        reducedMotion={reducedMotion}
        branchKeys={branchKeys}
      />

      <MobileRootCard
        label={rootLabel}
        onClick={onOpenSource}
        pos={MOB_ROOT}
        reducedMotion={reducedMotion}
        dimmed={hovered !== null && hovered !== "root"}
        onHoverChange={(h) => onHoverChange(h ? "root" : null)}
      />

      {nodes.map((n, idx) => (
        <MobileLeafCard
          key={n.key}
          nodeKey={n.key}
          pos={MOB_NODE[n.key]}
          label={n.label}
          sub={n.sub}
          icon={n.icon}
          onClick={n.onClick}
          reducedMotion={reducedMotion}
          phase={idx}
          dimmed={hovered !== null && hovered !== n.key}
          onHoverChange={(h) => onHoverChange(h ? n.key : null)}
        />
      ))}
    </div>
  );
}

function MobileTreeSvg(props: {
  gid: string;
  hovered: NodeKey | "root" | null;
  reducedMotion: boolean;
  branchKeys: NodeKey[];
}) {
  const { gid, hovered, reducedMotion, branchKeys } = props;
  const pfx = `mob-${gid}`;

  return (
    <svg
      viewBox={`0 0 ${MOB_W} ${MOB_H}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      <defs>
        <linearGradient
          id={`${pfx}-trunk`}
          gradientUnits="userSpaceOnUse"
          x1={MOB_ROOT.x}
          y1={MOB_ROOT.y}
          x2={MOB_ROOT.x}
          y2={MOB_H}
        >
          <stop offset="0%" stopColor="#C8E53A" stopOpacity="0.75" />
          <stop offset="45%" stopColor="#9aaf52" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#6a7448" stopOpacity="0.2" />
        </linearGradient>
        <linearGradient
          id={`${pfx}-branch`}
          gradientUnits="userSpaceOnUse"
          x1={MOB_ROOT.x}
          y1={MOB_ROOT.y}
          x2={MOB_ROOT.x}
          y2={0}
        >
          <stop offset="0%" stopColor="#C8E53A" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#8a9670" stopOpacity="0.22" />
        </linearGradient>
        <radialGradient id={`${pfx}-root-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#C8E53A" stopOpacity="0.45" />
          <stop offset="55%" stopColor="#C8E53A" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#C8E53A" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle
        cx={MOB_ROOT.x}
        cy={MOB_ROOT.y}
        r={120}
        fill={`url(#${pfx}-root-glow)`}
      />

      <g stroke="#C8E53A" strokeOpacity="0.28" strokeWidth="1" fill="none" strokeLinecap="round">
        <path d="M 175 598 C 155 605 130 610 108 614" />
        <path d="M 185 602 C 170 612 145 618 120 622" />
        <path d="M 215 598 C 235 605 260 610 282 614" />
        <path d="M 205 602 C 220 612 245 618 270 622" />
      </g>

      <motion.path
        d={MOB_TRUNK_D}
        fill="none"
        stroke={`url(#${pfx}-trunk)`}
        strokeWidth="3.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.85, ease: "easeOut" }}
      />

      {branchKeys.map((k, i) => {
        const isHovered = hovered === k;
        const isDim = hovered !== null && hovered !== k && hovered !== "root";
        return (
          <motion.path
            key={k}
            d={MOB_BRANCHES[k]}
            fill="none"
            stroke={`url(#${pfx}-branch)`}
            strokeWidth={isHovered ? 2.2 : 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reducedMotion ? false : { pathLength: 0, opacity: 0 }}
            animate={{
              pathLength: 1,
              opacity: isDim ? 0.32 : isHovered ? 1 : 0.82,
            }}
            transition={{ duration: 0.8, ease: "easeOut", delay: 0.12 + i * 0.07 }}
          />
        );
      })}

      {branchKeys.flatMap((k, i) => {
        const p = MOB_NODE[k];
        const ts = [0.4, 0.72];
        return ts.map((t, j) => {
          const lx = MOB_ROOT.x + (p.x - MOB_ROOT.x) * t;
          const ly = MOB_ROOT.y + (p.y - MOB_ROOT.y) * t;
          const jitter = ((i + j) * 13) % 10 - 5;
          return (
            <SvgLeaf
              key={`mob-leaf-${k}-${j}`}
              x={lx + jitter}
              y={ly - 3}
              rotate={(i * 47 + j * 61) % 360}
              delay={0.35 + i * 0.05 + j * 0.04}
              reducedMotion={reducedMotion}
              scale={j === 0 ? 0.75 : 0.55}
            />
          );
        });
      })}
    </svg>
  );
}

function mobilePosStyle(pos: NodePos): CSSProperties {
  return {
    left: `${(pos.x / MOB_W) * 100}%`,
    top: `${(pos.y / MOB_H) * 100}%`,
  };
}

function MobileRootCard(props: {
  label: string;
  onClick: () => void;
  pos: NodePos;
  reducedMotion: boolean;
  dimmed: boolean;
  onHoverChange: (h: boolean) => void;
}) {
  const { label, onClick, pos, reducedMotion, dimmed, onHoverChange } = props;
  return (
    <motion.div
      className="absolute z-20 -translate-x-1/2 -translate-y-1/2"
      style={mobilePosStyle(pos)}
      initial={reducedMotion ? false : { opacity: 0, y: 10, scale: 0.96 }}
      animate={{
        opacity: dimmed ? 0.88 : 1,
        y: 0,
        scale: reducedMotion ? 1 : [1, 1.008, 1],
      }}
      transition={{
        opacity: { duration: 0.25 },
        y: { duration: 0.45, ease: "easeOut" },
        scale: { duration: 5, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" },
      }}
    >
      <div className="relative">
        <motion.span
          aria-hidden
          className="pointer-events-none absolute -inset-4 rounded-[28px] bg-[#C8E53A]/[0.12] blur-xl max-[359px]:-inset-3"
          animate={
            reducedMotion
              ? undefined
              : { opacity: [0.45, 0.75, 0.45], scale: [1, 1.04, 1] }
          }
          transition={{ duration: 4.2, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.button
          type="button"
          onClick={onClick}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          whileTap={{ scale: 0.985 }}
          whileHover={reducedMotion ? undefined : { y: -2, scale: 1.02 }}
          aria-label={`Open source for ${label}`}
          className={cn(
            "relative flex w-[min(92vw,248px)] max-[359px]:w-[min(92vw,220px)] flex-col items-center gap-1 rounded-2xl border border-[#C8E53A]/55",
            "bg-[radial-gradient(120%_120%_at_50%_0%,rgba(40,52,18,0.92),rgba(10,14,8,0.92))] px-3 py-3 text-center shadow-[0_0_40px_rgba(200,229,58,0.28),inset_0_0_20px_rgba(200,229,58,0.12)] backdrop-blur-md max-[359px]:py-2.5",
          )}
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#C8E53A]/40 bg-black/40 text-[#dff58a] max-[359px]:h-7 max-[359px]:w-7">
            <FileText className="h-4 w-4 max-[359px]:h-3.5 max-[359px]:w-3.5" aria-hidden />
          </span>
          <span className="line-clamp-2 max-w-full text-[12px] font-semibold leading-tight tracking-tight text-foreground max-[359px]:text-[11px]">
            {label}
          </span>
          <span className="text-[10.5px] font-medium text-[#d4f06a]">Open source</span>
        </motion.button>
      </div>
    </motion.div>
  );
}

function MobileLeafCard(props: {
  nodeKey: NodeKey;
  pos: NodePos;
  label: string;
  sub: string;
  icon: ReactNode;
  onClick: () => void;
  reducedMotion: boolean;
  phase: number;
  dimmed: boolean;
  onHoverChange: (h: boolean) => void;
}) {
  const { nodeKey, pos, label, sub, icon, onClick, reducedMotion, phase, dimmed, onHoverChange } = props;
  const shape = PEBBLE[nodeKey];
  const duration = 5 + (phase % 3) * 0.5;
  const rotateRange = phase % 2 === 0 ? [-0.6, 0.6, -0.6] : [0.6, -0.6, 0.6];
  const yRange = phase % 2 === 0 ? [-1, 1, -1] : [1, -1, 1];

  return (
    <motion.div
      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
      style={mobilePosStyle(pos)}
      initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={
        reducedMotion
          ? { opacity: dimmed ? 0.85 : 1, y: 0, scale: 1 }
          : {
              opacity: dimmed ? 0.85 : 1,
              y: yRange,
              rotate: rotateRange,
              scale: 1,
            }
      }
      transition={{
        opacity: { duration: 0.35, delay: 0.08 + phase * 0.06, ease: "easeOut" },
        y: reducedMotion
          ? { duration: 0.45, delay: 0.08 + phase * 0.06 }
          : { duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: phase * 0.12 },
        rotate: reducedMotion
          ? { duration: 0.45 }
          : { duration: duration + 0.8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: phase * 0.1 },
        scale: { duration: 0.45, delay: 0.08 + phase * 0.06, ease: "easeOut" },
      }}
    >
      <div className="relative w-[138px] max-[359px]:w-[130px]">
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-2 border border-dashed border-[#C8E53A]/18"
          style={{ borderRadius: shape.ghost }}
        />
        <LeafGlyph
          aria-hidden
          className="pointer-events-none absolute -left-2 top-1/2 h-3 w-3 -translate-y-1/2 -rotate-[32deg] text-[#C8E53A]/55 max-[359px]:h-2.5 max-[359px]:w-2.5"
        />

        <motion.button
          type="button"
          onClick={onClick}
          onMouseEnter={() => onHoverChange(true)}
          onMouseLeave={() => onHoverChange(false)}
          onFocus={() => onHoverChange(true)}
          onBlur={() => onHoverChange(false)}
          whileTap={{ scale: 0.985 }}
          whileHover={reducedMotion ? undefined : { y: -2, scale: 1.02 }}
          style={{ borderRadius: shape.card }}
          aria-label={label}
          className={cn(
            "group relative flex min-h-[72px] max-[359px]:min-h-[68px] w-full flex-col items-center gap-0.5 border border-white/12",
            "bg-[radial-gradient(120%_120%_at_50%_0%,rgba(36,42,28,0.92),rgba(10,12,9,0.88))] px-2 py-2.5 text-center shadow-[0_8px_28px_rgba(0,0,0,0.5),inset_0_1px_0_rgba(255,255,255,0.05)] backdrop-blur-md transition hover:border-[#C8E53A]/35 max-[359px]:px-1.5 max-[359px]:py-2",
          )}
        >
          <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/10 bg-black/35 text-foreground/90 transition group-hover:border-[#C8E53A]/40 group-hover:text-[#dff58a] max-[359px]:h-6 max-[359px]:w-6">
            {icon}
          </span>
          <span className="line-clamp-2 w-full text-[11px] font-semibold leading-tight tracking-tight text-foreground max-[359px]:text-[10.5px]">
            {label}
          </span>
          <span className="line-clamp-2 w-full text-[9.5px] leading-snug text-muted-foreground max-[359px]:text-[9px]">
            {sub}
          </span>
        </motion.button>
      </div>
    </motion.div>
  );
}

/* ---------- Small leaf glyph ---------- */

function LeafGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="-12 -12 24 24" className={className} aria-hidden>
      <path
        d="M 0 -9 C 7 -4, 7 5, 0 11 C -7 5, -7 -4, 0 -9 Z"
        fill="currentColor"
        fillOpacity="0.55"
        stroke="currentColor"
        strokeWidth="0.8"
      />
      <line x1="0" y1="-7" x2="0" y2="9" stroke="currentColor" strokeWidth="0.6" />
    </svg>
  );
}
