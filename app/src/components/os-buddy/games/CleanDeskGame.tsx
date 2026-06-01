"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

type Item = { id: number; x: number; icon: string };

const CLUTTER_ICONS = ["📄", "☕", "🎧", "🔋", "🧩", "🖊️", "📎"];

export function CleanDeskGame({
  petId,
  buddyName,
  locale,
  onComplete,
}: CleanDeskGameProps) {
  const zh = locale === "zh-TW";
  const [playerX, setPlayerX] = useState(50);
  const [items, setItems] = useState<Item[]>(() =>
    Array.from({ length: 6 }).map((_, index) => ({
      id: index + 1,
      x: 10 + Math.random() * 80,
      icon: CLUTTER_ICONS[index % CLUTTER_ICONS.length] ?? "📦",
    })),
  );
  const [mood, setMood] = useState<OSBuddyMood>("reading");

  const animationSrc = useMemo(
    () => getOSBuddyAssetSrc({ petId, mood }),
    [mood, petId],
  );

  const move = useCallback((delta: number) => {
    setPlayerX((prev) => Math.min(95, Math.max(5, prev + delta)));
    setMood(delta < 0 ? "dragging-left" : "dragging-right");
    window.setTimeout(() => setMood("reading"), 150);
  }, []);

  useEffect(() => {
    setItems((prev) => {
      const remaining = prev.filter((item) => Math.abs(item.x - playerX) > 9);
      if (remaining.length !== prev.length) {
        setMood("reading");
      }
      return remaining;
    });
  }, [playerX]);

  useEffect(() => {
    if (items.length > 0) return;
    setMood("success");
    onComplete(6);
  }, [items.length, onComplete]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        move(-8);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        move(8);
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [move]);

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {zh ? "清理物品" : "Items left"}: {items.length}
      </p>

      <div className="relative h-52 overflow-hidden rounded-xl border bg-muted/20">
        {items.map((item) => (
          <div
            key={item.id}
            className="absolute top-[22%] text-xl"
            style={{ left: `${item.x}%`, transform: "translateX(-50%)" }}
            aria-hidden
          >
            {item.icon}
          </div>
        ))}

        <div
          className="absolute bottom-2"
          style={{ left: `${playerX}%`, transform: "translateX(-50%)" }}
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

      <div className="flex items-center justify-between">
        <Button type="button" variant="outline" onClick={() => move(-10)}>
          {zh ? "向左" : "Left"}
        </Button>
        <Button type="button" variant="outline" onClick={() => move(10)}>
          {zh ? "向右" : "Right"}
        </Button>
      </div>
    </div>
  );
}
