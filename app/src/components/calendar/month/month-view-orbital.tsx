"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import Image from "next/image";
import { addDays, format, parseISO } from "date-fns";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { getCalendarUiCopy } from "@/lib/i18n/calendar-ui";
import { getDateFnsLocale } from "@/lib/i18n/date-locale";
import { useAppStore } from "@/stores/app-store";
import { useOrbitalAnimation } from "@/hooks/use-orbital-animation";
import { useParallax } from "@/hooks/use-parallax";
import {
  computeOrbitalLayout,
  orbitalPosition,
} from "@/lib/calendar/orbital";
import { itemsForDate } from "@/lib/calendar/projection";
import type { CalendarItem, OrbitalDay } from "@/lib/calendar/types";
import { UpcomingPrioritiesPanel } from "./upcoming-priorities-panel";

type Props = {
  items: readonly CalendarItem[];
  /** When true, the outer container is loading — we still render the layout skeleton. */
  isLoading: boolean;
};

const VIEWBOX = 1000;
const CENTER = 500;
const CENTER_RADIUS = 120;
const ORBITAL_DAYS_AROUND = 5; // 5 past + 5 future = 10 orbiting bubbles

/**
 * Orbital Month variant — radial "today at the center" canvas with
 * surrounding days on per-bubble elliptical orbits, plus an Upcoming
 * Priorities list below.
 *
 * Physics:
 *   - Each bubble has its own seeded ellipse (radius_x, radius_y),
 *     initial angle, period (80–120s), and rotation direction.
 *   - Angles advance per frame in `useOrbitalAnimation`.
 *   - Hover / selection freezes a bubble while others keep rotating.
 *   - `prefers-reduced-motion` freezes all bubbles at initial positions.
 *
 * Accessibility:
 *   - All bubbles are `<g role="button" tabIndex={0}>` with ARIA
 *     labels ("Oct 25, 1 event").
 *   - Enter / Space select the bubble.
 *   - Arrow keys cycle through adjacent days.
 */
export function MonthViewOrbital({ items, isLoading }: Props) {
  const language = useAppStore((s) => s.language);
  const copy = useMemo(() => getCalendarUiCopy(language), [language]);
  const dateLocale = useMemo(() => getDateFnsLocale(language), [language]);
  const prefersReduced = useReducedMotion() ?? false;

  const today = useMemo(() => new Date(), []);
  const todayIso = useMemo(() => format(today, "yyyy-MM-dd"), [today]);

  const layoutDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = -ORBITAL_DAYS_AROUND; i <= ORBITAL_DAYS_AROUND; i++) {
      dates.push(format(addDays(today, i), "yyyy-MM-dd"));
    }
    return dates;
  }, [today]);

  const layoutInput = useMemo(
    () =>
      layoutDates.map((date) => ({
        date,
        items: itemsForDate([...items], date),
      })),
    [layoutDates, items]
  );

  const layout = useMemo(
    () => computeOrbitalLayout(today, layoutInput),
    [today, layoutInput]
  );

  // Hover / selection state
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const pausedDates = useMemo(() => {
    const s = new Set<string>();
    if (hoveredDate) s.add(hoveredDate);
    if (selectedDate) s.add(selectedDate);
    return s;
  }, [hoveredDate, selectedDate]);

  const angles = useOrbitalAnimation(layout.days, pausedDates, {
    reducedMotion: prefersReduced,
  });

  // Keyboard nav — arrow left / right cycles through days
  const focusableDates = useMemo(() => layout.days.map((d) => d.date), [layout.days]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<SVGGElement>, date: string) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        setSelectedDate(date);
        return;
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const idx = focusableDates.indexOf(date);
        if (idx < 0) return;
        const next =
          e.key === "ArrowRight"
            ? focusableDates[(idx + 1) % focusableDates.length]
            : focusableDates[(idx - 1 + focusableDates.length) % focusableDates.length];
        const el = document.querySelector<SVGGElement>(
          `[data-orbital-date="${next}"]`
        );
        el?.focus();
      }
    },
    [focusableDates]
  );

  // The "upcoming" panel is next 7 days (chronological)
  const upcomingItems = useMemo(() => {
    const horizon = format(addDays(today, 7), "yyyy-MM-dd");
    return [...items]
      .filter((i) => i.date >= todayIso && i.date <= horizon)
      .sort((a, b) =>
        a.date === b.date
          ? (a.start_time ?? "99").localeCompare(b.start_time ?? "99")
          : a.date.localeCompare(b.date)
      )
      .slice(0, 10);
  }, [items, today, todayIso]);

  // Slow counter-rotation for the decorative concentric rings
  const [ringsOffset, setRingsOffset] = useState(0);
  useEffect(() => {
    if (prefersReduced) return;
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = now - last;
      last = now;
      // 0.2x bubble speed, opposite direction → ~600s/revolution
      setRingsOffset((prev) => prev - (dt / 600_000) * 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [prefersReduced]);

  const centerEvents = layout.center.items;

  // Parallax tracking — mouse / touch within the canvas shifts the
  // galaxy image, rings, and bubbles at progressively smaller speeds
  // for a sense of depth. Guarded by prefers-reduced-motion inside
  // the hook.
  const canvasRef = useRef<HTMLDivElement>(null);
  const parallax = useParallax(canvasRef, {
    // Kept deliberately subtle — the effect should read as "the galaxy
    // breathes with you", not "the page rocks".
    maxOffset: 10,
    smoothing: 0.06,
    disabled: prefersReduced,
  });
  const parallaxStyle = {
    "--pan-x": `${parallax.x}px`,
    "--pan-y": `${parallax.y}px`,
  } as CSSProperties;

  return (
    <div data-calendar-surface className="grid gap-4" data-orbital-view>
      {/* Top: orbital canvas */}
      <motion.div
        ref={canvasRef}
        key="orbital-canvas"
        initial={prefersReduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={parallaxStyle}
        className="calendar-orbital-canvas calendar-specular-highlight relative aspect-[16/10] w-full max-h-[620px] min-h-[380px]"
      >
        {/* Layer 1 — galaxy photograph (slowest parallax). */}
        <Image
          data-orbital-galaxy
          src="/calendar/orbital-galaxy-bg.png"
          alt=""
          fill
          priority
          sizes="(min-width: 1280px) 1200px, 100vw"
        />

        {/* Layer 2 — decorative rings + SVG bubbles (foreground parallax). */}
        <svg
          viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label="Orbital calendar around today"
          className="relative z-[2] h-full w-full"
        >
          {/* Decorative concentric dashed rings — counter-rotating. */}
          <g
            data-orbital-rings
            transform={`rotate(${ringsOffset} ${CENTER} ${CENTER})`}
            aria-hidden
          >
            {[240, 355, 470].map((r) => (
              <circle
                key={r}
                cx={CENTER}
                cy={CENTER}
                r={r}
                fill="none"
                stroke="rgba(255,255,255,0.12)"
                strokeWidth={1}
                strokeDasharray="4 12"
              />
            ))}
          </g>

          <g data-orbital-bubbles>
            {/* TODAY center circle */}
            <g>
              <circle
                cx={CENTER}
                cy={CENTER}
                r={CENTER_RADIUS + 26}
                fill="url(#today-glow)"
                opacity={0.55}
                pointerEvents="none"
              />
              <motion.circle
                cx={CENTER}
                cy={CENTER}
                r={CENTER_RADIUS}
                fill="rgba(6, 18, 14, 0.72)"
                stroke="var(--calendar-lime)"
                strokeWidth={2.5}
                className={prefersReduced ? undefined : "orbital-today-pulse"}
              />
              <text
                x={CENTER}
                y={CENTER - 30}
                textAnchor="middle"
                fontSize="14"
                fontWeight="600"
                letterSpacing="3"
                fill="rgba(255,255,255,0.75)"
              >
                {copy.orbitalTodayLabel}
              </text>
              <text
                x={CENTER}
                y={CENTER + 8}
                textAnchor="middle"
                fontSize="36"
                fontWeight="700"
                fill="var(--calendar-lime)"
              >
                {format(today, "MMM d", { locale: dateLocale })}
              </text>
              <text
                x={CENTER}
                y={CENTER + 42}
                textAnchor="middle"
                fontSize="13"
                fontWeight="500"
                fill="rgba(255,255,255,0.70)"
              >
                {copy.orbitalEventsCount(centerEvents.length)}
              </text>
            </g>

            {/* Orbiting bubbles */}
            {layout.days.map((day) => (
              <OrbitalBubble
                key={day.date}
                day={day}
                angle={angles[day.date] ?? day.angle}
                isHovered={hoveredDate === day.date}
                isSelected={selectedDate === day.date}
                todayIso={todayIso}
                onHoverStart={() => setHoveredDate(day.date)}
                onHoverEnd={() => setHoveredDate(null)}
                onClick={() => setSelectedDate(day.date)}
                onKeyDown={handleKeyDown}
                ariaLabel={copy.orbitalBubbleAria(
                  format(parseISO(day.date), "MMM d", { locale: dateLocale }),
                  day.items.length
                )}
              />
            ))}
          </g>

          <defs>
            <radialGradient id="today-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="var(--calendar-lime)" stopOpacity="0.35" />
              <stop offset="60%" stopColor="var(--calendar-lime)" stopOpacity="0.06" />
              <stop offset="100%" stopColor="var(--calendar-lime)" stopOpacity="0" />
            </radialGradient>
          </defs>
        </svg>

        {/* Hover tooltip — HTML overlay positioned from SVG state. */}
        {hoveredDate &&
          hoveredDate !== selectedDate &&
          (() => {
            const day = layout.days.find((d) => d.date === hoveredDate);
            if (!day) return null;
            const pos = orbitalPosition(
              day,
              angles[day.date] ?? day.angle,
              CENTER,
              CENTER
            );
            return (
              <div
                className="pointer-events-none absolute z-[3] -translate-x-1/2 -translate-y-full rounded-md bg-black/85 px-2.5 py-1 text-[11px] font-medium text-white shadow-lg"
                style={{
                  left: `${(pos.x / VIEWBOX) * 100}%`,
                  top: `${(pos.y / VIEWBOX) * 100}%`,
                  marginTop: -((day.size / VIEWBOX) * 100) - 8,
                }}
              >
                {format(parseISO(day.date), "MMM d", { locale: dateLocale })} ·{" "}
                {copy.orbitalEventsCount(day.items.length)}
              </div>
            );
          })()}
      </motion.div>

      {/* Bottom: upcoming priorities */}
      <div className="min-h-[220px]">
        {isLoading ? (
          <div className="calendar-glass-dark h-56 animate-pulse rounded-2xl" />
        ) : (
          <UpcomingPrioritiesPanel
            items={upcomingItems}
            viewAllHref="?tab=agenda"
          />
        )}
      </div>
    </div>
  );
}

type BubbleProps = {
  day: OrbitalDay;
  angle: number;
  isHovered: boolean;
  isSelected: boolean;
  todayIso: string;
  onHoverStart: () => void;
  onHoverEnd: () => void;
  onClick: () => void;
  onKeyDown: (e: KeyboardEvent<SVGGElement>, date: string) => void;
  ariaLabel: string;
};

function OrbitalBubble({
  day,
  angle,
  isHovered,
  isSelected,
  todayIso,
  onHoverStart,
  onHoverEnd,
  onClick,
  onKeyDown,
  ariaLabel,
}: BubbleProps) {
  const pos = orbitalPosition(day, angle, CENTER, CENTER);
  const scale = isSelected ? 1.05 : 1;
  const hasItems = day.items.length > 0;
  const past = parseISO(day.date) < parseISO(todayIso);

  // Entrance stagger: further from today = longer delay
  const stagger = Math.abs(day.distance_from_today) * 0.06;

  return (
    <motion.g
      data-orbital-date={day.date}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale, opacity: 1 }}
      transition={{
        duration: 0.4,
        delay: stagger,
        ease: "easeOut",
      }}
      onHoverStart={onHoverStart}
      onHoverEnd={onHoverEnd}
      onMouseDown={(e: MouseEvent) => {
        // avoid losing focus before click
        e.preventDefault();
      }}
      onClick={onClick}
      onKeyDown={(e: unknown) =>
        onKeyDown(e as KeyboardEvent<SVGGElement>, day.date)
      }
      className={cn(
        "cursor-pointer outline-none",
        "[&:focus-visible>circle]:stroke-[var(--calendar-lime)]",
        "[&:focus-visible>circle]:stroke-[3px]"
      )}
      style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}
    >
      {/* Subtle backplate so bubble stays readable over bright stars */}
      <circle
        cx={pos.x}
        cy={pos.y}
        r={day.size / 2 + 3}
        fill="rgba(0, 0, 0, 0.45)"
        pointerEvents="none"
      />
      <circle
        cx={pos.x}
        cy={pos.y}
        r={day.size / 2}
        fill={
          isSelected
            ? "rgba(212, 255, 58, 0.22)"
            : past
              ? "rgba(12, 18, 22, 0.55)"
              : "rgba(12, 22, 28, 0.55)"
        }
        stroke={
          isSelected
            ? "var(--calendar-lime)"
            : isHovered
              ? "rgba(255,255,255,0.55)"
              : "rgba(255,255,255,0.35)"
        }
        strokeWidth={isSelected || isHovered ? 2.25 : 1.5}
        style={{
          filter: isSelected
            ? "drop-shadow(0 0 10px var(--calendar-lime-glow))"
            : "drop-shadow(0 2px 6px rgba(0,0,0,0.45))",
        }}
      />
      <text
        x={pos.x}
        y={pos.y - 4}
        textAnchor="middle"
        fontSize={Math.max(11, day.size * 0.16)}
        fontWeight="600"
        fill={isSelected ? "var(--calendar-lime)" : "rgba(255,255,255,0.9)"}
        pointerEvents="none"
      >
        {format(parseISO(day.date), "MMM d")}
      </text>
      <text
        x={pos.x}
        y={pos.y + 14}
        textAnchor="middle"
        fontSize={Math.max(10, day.size * 0.12)}
        fill="rgba(255,255,255,0.55)"
        pointerEvents="none"
      >
        {day.distance_from_today > 0
          ? `+${day.distance_from_today}d`
          : `${day.distance_from_today}d`}
      </text>
      {hasItems && (
        <circle
          cx={pos.x + day.size / 2 - 6}
          cy={pos.y - day.size / 2 + 6}
          r={4}
          fill="var(--calendar-lime)"
          stroke="rgba(0,0,0,0.45)"
          strokeWidth={1}
          pointerEvents="none"
        />
      )}
    </motion.g>
  );
}

