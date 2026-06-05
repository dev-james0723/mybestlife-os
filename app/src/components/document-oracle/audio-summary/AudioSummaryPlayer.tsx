"use client";

import { useEffect, useRef, useState } from "react";

export function AudioSummaryPlayer(props: { src: string }) {
  const ref = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.playbackRate = rate;
  }, [rate]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration || 0);
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
    };
  }, [props.src]);

  const fmt = (s: number) => {
    if (!Number.isFinite(s)) return "0:00";
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;

  return (
    <div className="space-y-2 rounded-2xl border border-border bg-muted/35 p-4">
      <audio ref={ref} src={props.src} preload="metadata" className="hidden" />
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => {
            const el = ref.current;
            if (!el) return;
            if (playing) void el.pause();
            else void el.play();
          }}
          className="inline-flex min-h-[44px] min-w-[88px] items-center justify-center rounded-xl bg-primary px-4 text-[13px] font-semibold text-primary-foreground"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <span className="text-[12px] tabular-nums text-muted-foreground">
          {fmt(current)} / {fmt(duration)}
        </span>
        <label className="ml-auto flex items-center gap-2 text-[11px] text-muted-foreground">
          Speed
          <select
            value={String(rate)}
            onChange={(e) => setRate(Number(e.target.value))}
            className="rounded-lg border border-border bg-muted/60 px-2 py-1 text-[12px] text-foreground"
          >
            <option value="0.75">0.75×</option>
            <option value="1">1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
          </select>
        </label>
      </div>
      <div
        role="slider"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pct)}
        tabIndex={0}
        className="h-2 w-full cursor-pointer rounded-full bg-muted"
        onKeyDown={(e) => {
          const el = ref.current;
          if (!el || !duration) return;
          if (e.key === "ArrowRight") el.currentTime = Math.min(duration, el.currentTime + 5);
          if (e.key === "ArrowLeft") el.currentTime = Math.max(0, el.currentTime - 5);
        }}
        onClick={(ev) => {
          const el = ref.current;
          if (!el || !duration) return;
          const rect = (ev.currentTarget as HTMLDivElement).getBoundingClientRect();
          const x = ev.clientX - rect.left;
          el.currentTime = (x / rect.width) * duration;
        }}
      >
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex flex-wrap gap-2">
        <a
          href={props.src}
          download
          className="rounded-lg border border-border bg-muted/50 px-3 py-1.5 text-[12px] text-foreground no-underline hover:bg-muted"
        >
          Download / open
        </a>
      </div>
    </div>
  );
}
