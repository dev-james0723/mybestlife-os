"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { OSBuddySprite } from "@/components/os-buddy/OSBuddySprite";
import { getOSBuddyAssetSrc } from "@/lib/os-buddy/os-buddy-assets";
import type { AppLocale } from "@/lib/i18n/app-locale";
import type { OSBuddyMood, OSBuddyPetId } from "@/types/os-buddy";

type CleanDeskGameProps = {
  petId: OSBuddyPetId;
  buddyName: string;
  locale: AppLocale;
  onComplete: (score: number) => void;
};

type DeskItem = {
  id: number;
  x: number;
  y: number;
  icon: string;
  label: string;
};

const GAME_SECONDS = 25;
const INITIAL_ITEMS: DeskItem[] = [
  { id: 1, x: 18, y: 24, icon: "note", label: "note" },
  { id: 2, x: 76, y: 18, icon: "file", label: "file" },
  { id: 3, x: 42, y: 32, icon: "ring", label: "coffee ring" },
  { id: 4, x: 64, y: 52, icon: "box", label: "tiny box" },
  { id: 5, x: 26, y: 66, icon: "receipt", label: "receipt" },
  { id: 6, x: 84, y: 72, icon: "spark", label: "idea spark" },
  { id: 7, x: 48, y: 76, icon: "task", label: "loose task" },
  { id: 8, x: 12, y: 48, icon: "dust", label: "pixel dust" },
];

function ItemGlyph({ icon }: { icon: string }) {
  if (icon === "ring") {
    return <span className="block size-4 rounded-full border-2 border-amber-700/50" />;
  }
  if (icon === "spark") {
    return <span className="block size-3 rotate-45 rounded-[2px] bg-primary/65" />;
  }
  if (icon === "dust") {
    return <span className="block size-3 rounded-[2px] bg-muted-foreground/35" />;
  }
  return (
    <span className="block size-4 rounded-[3px] border border-foreground/20 bg-popover shadow-sm">
      <span className="mx-auto mt-1 block h-0.5 w-2 bg-muted-foreground/45" />
    </span>
  );
}

export function CleanDeskGame({
  petId,
  buddyName,
  locale,
  onComplete,
}: CleanDeskGameProps) {
  const zh = locale === "zh-TW";
  const areaRef = useRef<HTMLDivElement | null>(null);
  const dragPointerRef = useRef<number | null>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  const moodTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [position, setPosition] = useState({ x: 50, y: 78 });
  const [items, setItems] = useState<DeskItem[]>(INITIAL_ITEMS);
  const [secondsLeft, setSecondsLeft] = useState(GAME_SECONDS);
  const [score, setScore] = useState(0);
  const [mood, setMood] = useState<OSBuddyMood>("reading");

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const finish = useCallback((finalScore: number) => {
    if (completedRef.current) return;
    completedRef.current = true;
    setMood("success");
    onCompleteRef.current(finalScore);
  }, []);

  const cleanCollisions = useCallback(
    (nextPosition: { x: number; y: number }) => {
      setItems((current) => {
        const remaining = current.filter(
          (item) =>
            Math.abs(item.x - nextPosition.x) > 10 ||
            Math.abs(item.y - nextPosition.y) > 13,
        );
        const cleaned = current.length - remaining.length;
        if (cleaned > 0) {
          setMood("success");
          if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
          moodTimerRef.current = setTimeout(() => setMood("reading"), 220);
          setScore((value) => {
            const nextScore = value + cleaned;
            if (remaining.length === 0) finish(nextScore + 3);
            return remaining.length === 0 ? nextScore + 3 : nextScore;
          });
        }
        return remaining;
      });
    },
    [finish],
  );

  const moveTo = useCallback(
    (next: { x: number; y: number }) => {
      const clamped = {
        x: Math.min(94, Math.max(6, next.x)),
        y: Math.min(84, Math.max(18, next.y)),
      };
      setMood(clamped.x < position.x ? "dragging-left" : clamped.x > position.x ? "dragging-right" : "reading");
      setPosition(clamped);
      cleanCollisions(clamped);
    },
    [cleanCollisions, position.x],
  );

  const moveFromPointer = useCallback(
    (clientX: number, clientY: number) => {
      const area = areaRef.current;
      if (!area) return;
      const rect = area.getBoundingClientRect();
      moveTo({
        x: ((clientX - rect.left) / rect.width) * 100,
        y: ((clientY - rect.top) / rect.height) * 100,
      });
    },
    [moveTo],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecondsLeft((value) => {
        if (completedRef.current) return value;
        if (value <= 1) {
          finish(score);
          return 0;
        }
        return value - 1;
      });
    }, 1_000);

    return () => {
      window.clearInterval(interval);
      if (moodTimerRef.current) clearTimeout(moodTimerRef.current);
    };
  }, [finish, score]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        moveTo({ x: position.x - 6, y: position.y });
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        moveTo({ x: position.x + 6, y: position.y });
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        moveTo({ x: position.x, y: position.y - 7 });
      }
      if (event.key === "ArrowDown") {
        event.preventDefault();
        moveTo({ x: position.x, y: position.y + 7 });
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [moveTo, position]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <p>
          {zh ? "分數" : "Score"}: {score}
        </p>
        <p>
          {zh ? "剩餘" : "Time"}: {secondsLeft}s
        </p>
      </div>

      <div
        ref={areaRef}
        className="relative h-[260px] overflow-hidden rounded-lg border bg-muted/20"
        onPointerDown={(event) => {
          dragPointerRef.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          moveFromPointer(event.clientX, event.clientY);
        }}
        onPointerMove={(event) => {
          if (dragPointerRef.current !== event.pointerId) return;
          moveFromPointer(event.clientX, event.clientY);
        }}
        onPointerUp={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          dragPointerRef.current = null;
        }}
        onPointerCancel={(event) => {
          if (event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.releasePointerCapture(event.pointerId);
          }
          dragPointerRef.current = null;
        }}
        tabIndex={0}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute flex size-8 items-center justify-center rounded-md border border-border/70 bg-background/78 shadow-sm"
            style={{
              left: `${item.x}%`,
              top: `${item.y}%`,
              transform: "translate(-50%, -50%)",
            }}
            aria-label={item.label}
          >
            <ItemGlyph icon={item.icon} />
          </div>
        ))}

        <div
          className="absolute"
          style={{
            left: `${position.x}%`,
            top: `${position.y}%`,
            transform: "translate(-50%, -50%)",
          }}
        >
          <OSBuddySprite
            petId={petId}
            name={buddyName}
            mood={mood}
            animationSrc={animationSrc}
            size="sm"
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {zh ? `剩下 ${items.length} 件` : `${items.length} items left`}
      </p>
    </div>
  );
}
