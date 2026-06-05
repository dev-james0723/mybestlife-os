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

type TreePoint = {
  x: number;
  y: number;
  desktopWidth: number;
  mobileWidth: number;
};

const REAL_TREE_IMAGE_SRC = "/images/document-tree-real-tree-20260604.png";

const REAL_TREE_POINTS: Record<NodeKey | "root", TreePoint> = {
  pages: { x: 47.9, y: 27.2, desktopWidth: 10.8, mobileWidth: 14 },
  glossary: { x: 21.2, y: 43.1, desktopWidth: 10.4, mobileWidth: 14 },
  sections: { x: 76.0, y: 43.4, desktopWidth: 10.8, mobileWidth: 14 },
  visuals: { x: 32.0, y: 66.7, desktopWidth: 9.8, mobileWidth: 14 },
  topics: { x: 65.1, y: 63.7, desktopWidth: 8.8, mobileWidth: 12 },
  chat: { x: 76.3, y: 70.6, desktopWidth: 8.8, mobileWidth: 12 },
  root: { x: 49.9, y: 88.3, desktopWidth: 22.5, mobileWidth: 28 },
};

const MOBILE_LABELS: Record<NodeKey, string> = {
  pages: "Pages",
  glossary: "Glossary",
  sections: "Sections",
  visuals: "Visuals",
  topics: "Topics",
  chat: "Oracle",
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
    <section className="relative overflow-hidden rounded-3xl border border-border bg-[radial-gradient(120%_80%_at_50%_100%,hsl(var(--primary)/0.10),rgba(0,0,0,0)_55%),linear-gradient(180deg,rgba(8,10,8,0.55),rgba(0,0,0,0.55))] p-3 backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] sm:p-5 md:p-6">
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
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background/45 px-3 py-1.5 text-[11.5px] font-medium text-foreground/85 transition hover:border-primary/35 hover:bg-primary/[0.06]"
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
                className="mt-2 text-[11px] font-semibold text-primary hover:underline"
              >
                Got it
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <RealTreeStage
        gid={gid}
        rootLabel={rootLabel}
        nodes={nodes}
        onOpenSource={() => onNavigate("source")}
        reducedMotion={!!reducedMotion}
        hovered={hovered}
        onHoverChange={setHovered}
      />

      {/* Section shortcuts band */}
      {topSections.length > 0 ? (
        <div className="relative z-10 mt-4 rounded-2xl border border-border bg-background/35 p-3 sm:mt-6 sm:p-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-border bg-background/45 text-foreground/80">
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
                className="group inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-border bg-background/45 px-3 py-1.5 text-[11.5px] font-medium text-foreground/90 transition hover:border-primary/35 hover:bg-primary/10"
              >
                <span className="truncate">{s.title}</span>
                <LeafGlyph className="h-3 w-3 shrink-0 text-primary/70 transition group-hover:text-primary" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/* ---------- Real tree stage ---------- */

type TreeNode = {
  key: NodeKey;
  label: string;
  sub: string;
  icon: ReactNode;
  onClick: () => void;
};

function RealTreeStage(props: {
  gid: string;
  rootLabel: string;
  nodes: TreeNode[];
  onOpenSource: () => void;
  reducedMotion: boolean;
  hovered: NodeKey | "root" | null;
  onHoverChange: (next: NodeKey | "root" | null) => void;
}) {
  const { gid, rootLabel, nodes, onOpenSource, reducedMotion, hovered, onHoverChange } = props;

  return (
    <div className="relative z-0 -mx-1 mt-1 overflow-visible sm:mx-0" aria-label="Document structure tree map">
      <div className="relative mx-auto aspect-[1672/941] w-full max-w-[min(94vw,380px)] overflow-visible md:max-w-[min(100%,1280px)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={REAL_TREE_IMAGE_SRC}
          alt=""
          aria-hidden
          draggable={false}
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain"
        />
        <RealTreeMotionOverlay gid={gid} hovered={hovered} reducedMotion={reducedMotion} />

        <TreePlaqueButton
          point={REAL_TREE_POINTS.root}
          label={rootLabel}
          mobileLabel="Source"
          sub="Open source"
          icon={<FileText className="h-3.5 w-3.5" aria-hidden />}
          onClick={onOpenSource}
          onHoverChange={(h) => onHoverChange(h ? "root" : null)}
          dimmed={hovered !== null && hovered !== "root"}
          reducedMotion={reducedMotion}
          phase={nodes.length}
          variant="root"
          ariaLabel={`Open source for ${rootLabel}`}
        />

        {nodes.map((n, idx) => (
          <TreePlaqueButton
            key={n.key}
            point={REAL_TREE_POINTS[n.key]}
            nodeKey={n.key}
            label={n.label}
            mobileLabel={MOBILE_LABELS[n.key]}
            sub={n.sub}
            icon={n.icon}
            onClick={n.onClick}
            onHoverChange={(h) => onHoverChange(h ? n.key : null)}
            dimmed={hovered !== null && hovered !== n.key}
            reducedMotion={reducedMotion}
            phase={idx}
            variant="leaf"
            ariaLabel={`${n.label}: ${n.sub}`}
          />
        ))}
      </div>
    </div>
  );
}

function TreePlaqueButton(props: {
  point: TreePoint;
  nodeKey?: NodeKey;
  label: string;
  mobileLabel: string;
  sub: string;
  icon: ReactNode;
  onClick: () => void;
  onHoverChange: (h: boolean) => void;
  dimmed: boolean;
  reducedMotion: boolean;
  phase: number;
  variant: "root" | "leaf";
  ariaLabel: string;
}) {
  const {
    point,
    nodeKey,
    label,
    mobileLabel,
    sub,
    icon,
    onClick,
    onHoverChange,
    dimmed,
    reducedMotion,
    phase,
    variant,
    ariaLabel,
  } = props;
  const isRoot = variant === "root";
  const shape = nodeKey ? PEBBLE[nodeKey] : null;
  const duration = isRoot ? 4.8 : 4.5 + (phase % 3) * 0.7;
  const rotateRange = phase % 2 === 0 ? [-0.8, 0.8, -0.8] : [0.8, -0.8, 0.8];
  const yRange = phase % 2 === 0 ? [-1.5, 1.5, -1.5] : [1.5, -1.5, 1.5];
  const wrapperStyle = {
    left: `${point.x}%`,
    top: `${point.y}%`,
    "--tree-plaque-w": `${point.desktopWidth}%`,
    "--tree-plaque-mobile-w": `${point.mobileWidth}%`,
  } as CSSProperties;
  const buttonStyle: CSSProperties = {
    borderRadius: isRoot ? "26% 24% 22% 24% / 34% 34% 28% 28%" : shape?.card,
  };

  return (
    <motion.div
      className="absolute z-20 w-[var(--tree-plaque-mobile-w)] -translate-x-1/2 -translate-y-1/2 md:w-[var(--tree-plaque-w)]"
      style={wrapperStyle}
      initial={reducedMotion ? false : { opacity: 0, y: 8, scale: 0.96 }}
      animate={
        reducedMotion
          ? { opacity: dimmed ? 0.52 : 1, y: 0, scale: 1 }
          : isRoot
            ? { opacity: dimmed ? 0.62 : 1, y: 0, scale: [1, 1.012, 1] }
            : {
                opacity: dimmed ? 0.52 : 1,
                rotate: rotateRange,
                y: yRange,
                scale: 1,
              }
      }
      transition={{
        opacity: { duration: 0.25 },
        y: reducedMotion
          ? { duration: 0.35, ease: "easeOut" }
          : { duration: duration + 0.6, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: phase * 0.12 },
        rotate: isRoot || reducedMotion
          ? { duration: 0.35 }
          : { duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut", delay: phase * 0.16 },
        scale: isRoot && !reducedMotion
          ? { duration, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }
          : { duration: 0.35, ease: "easeOut" },
      }}
    >
      <motion.button
        type="button"
        onClick={onClick}
        onMouseEnter={() => onHoverChange(true)}
        onMouseLeave={() => onHoverChange(false)}
        onFocus={() => onHoverChange(true)}
        onBlur={() => onHoverChange(false)}
        whileHover={reducedMotion ? undefined : { y: isRoot ? -2 : -3, scale: isRoot ? 1.015 : 1.025 }}
        whileTap={{ scale: 0.985 }}
        aria-label={ariaLabel}
        style={buttonStyle}
        className={cn(
          "group relative flex min-h-11 w-full min-w-11 items-center justify-center overflow-visible border border-transparent bg-transparent text-center outline-none",
          "text-[#2a2316] drop-shadow-[0_1px_1px_rgba(255,255,255,0.45)] transition-colors hover:text-[#151106]",
          isRoot ? "px-1.5 py-1 md:px-3 md:py-2" : "px-1 py-1 md:px-2 md:py-1.5",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute left-1/2 top-1/2 -z-10 h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/0 blur-md transition group-hover:bg-primary/20",
            isRoot && "md:h-16 md:w-32",
          )}
        />
        <span className="hidden min-w-0 flex-col items-center justify-center gap-0.5 md:flex">
          <span className="inline-flex items-center justify-center text-[#4a3a1c]/90">{icon}</span>
          <span
            className={cn(
              "line-clamp-2 w-full break-words text-center font-semibold leading-[1.05] tracking-normal [overflow-wrap:anywhere]",
              isRoot ? "text-[12px] lg:text-[13px]" : "text-[10.5px] lg:text-[11.5px]",
            )}
          >
            {label}
          </span>
          <span
            className={cn(
              "line-clamp-1 w-full text-center font-medium leading-none text-[#5f4a24]/75",
              isRoot ? "text-[9px] lg:text-[10px]" : "text-[8px] lg:text-[8.5px]",
            )}
          >
            {sub}
          </span>
        </span>
        <span
          className={cn(
            "block w-full text-center font-semibold leading-none tracking-normal md:hidden",
            isRoot ? "text-[8.5px]" : "text-[7.5px] max-[359px]:text-[7px]",
          )}
        >
          {mobileLabel}
        </span>
      </motion.button>
    </motion.div>
  );
}

function RealTreeMotionOverlay(props: {
  gid: string;
  hovered: NodeKey | "root" | null;
  reducedMotion: boolean;
}) {
  const { gid, hovered, reducedMotion } = props;
  const hoverPoint = hovered ? REAL_TREE_POINTS[hovered] : null;
  const hoverIsRoot = hovered === "root";

  return (
    <svg viewBox="0 0 100 56.28" preserveAspectRatio="none" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
      <defs>
        <radialGradient id={`real-tree-hover-${gid}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.34" />
          <stop offset="62%" stopColor="hsl(var(--primary))" stopOpacity="0.10" />
          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
        </radialGradient>
      </defs>

      {hoverPoint ? (
        <motion.ellipse
          cx={hoverPoint.x}
          cy={hoverPoint.y * 0.5628}
          rx={hoverIsRoot ? 14 : 6}
          ry={hoverIsRoot ? 3.8 : 3}
          fill={`url(#real-tree-hover-${gid})`}
          initial={false}
          animate={{ opacity: reducedMotion ? 0.35 : [0.28, 0.55, 0.28] }}
          transition={{ duration: 2.2, repeat: reducedMotion ? 0 : Infinity, ease: "easeInOut" }}
        />
      ) : null}

      {[
        { x: 36, y: 21, rotate: -24, scale: 0.58 },
        { x: 43, y: 31, rotate: 16, scale: 0.5 },
        { x: 57, y: 22, rotate: 31, scale: 0.54 },
        { x: 69, y: 30, rotate: -18, scale: 0.46 },
        { x: 29, y: 39, rotate: 38, scale: 0.46 },
        { x: 72, y: 39, rotate: -42, scale: 0.42 },
        { x: 47, y: 47, rotate: 10, scale: 0.44 },
      ].map((leaf, i) => (
        <FloatingSvgLeaf
          key={`real-tree-leaf-${i}`}
          x={leaf.x}
          y={leaf.y}
          rotate={leaf.rotate}
          scale={leaf.scale}
          delay={0.35 + i * 0.18}
          reducedMotion={reducedMotion}
        />
      ))}

      {[
        [43, 49, 0.12],
        [49, 50, 0.16],
        [55, 49, 0.13],
        [50, 43, 0.1],
      ].map(([cx, cy, r], i) => (
        <motion.circle
          key={`real-tree-spark-${i}`}
          cx={cx}
          cy={cy}
          r={r}
          fill="hsl(var(--primary))"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: reducedMotion ? 0.3 : [0.22, 0.8, 0.22] }}
          transition={{ duration: 2.4 + i * 0.25, repeat: reducedMotion ? 0 : Infinity, ease: "easeInOut", delay: i * 0.2 }}
        />
      ))}
    </svg>
  );
}

function FloatingSvgLeaf(props: {
  x: number;
  y: number;
  rotate: number;
  delay: number;
  reducedMotion: boolean;
  scale: number;
}) {
  const { x, y, rotate, delay, reducedMotion, scale } = props;

  return (
    <g transform={`translate(${x} ${y}) rotate(${rotate}) scale(${scale})`}>
      <motion.g
        initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
        animate={
          reducedMotion
            ? { opacity: 0.36, scale: 1 }
            : { opacity: [0.28, 0.62, 0.28], y: [-0.15, 0.18, -0.15], rotate: [-2, 2, -2], scale: 1 }
        }
        transition={{
          opacity: { duration: 3.8, repeat: reducedMotion ? 0 : Infinity, ease: "easeInOut", delay },
          y: { duration: 4.6, repeat: reducedMotion ? 0 : Infinity, repeatType: "mirror", ease: "easeInOut", delay },
          rotate: { duration: 5.2, repeat: reducedMotion ? 0 : Infinity, repeatType: "mirror", ease: "easeInOut", delay },
          scale: { duration: 0.5, ease: "easeOut", delay },
        }}
      >
        <path
          d="M 0 -1.3 C 1 -0.7, 1 0.7, 0 1.5 C -1 0.7, -1 -0.7, 0 -1.3 Z"
          fill="hsl(var(--primary))"
          fillOpacity="0.46"
          stroke="hsl(var(--primary))"
          strokeOpacity="0.56"
          strokeWidth="0.12"
        />
        <line x1="0" y1="-0.9" x2="0" y2="1.1" stroke="hsl(var(--primary))" strokeOpacity="0.45" strokeWidth="0.08" />
      </motion.g>
    </g>
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
