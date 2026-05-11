import { useCallback, useEffect, useRef } from "react";
import type { SceneId } from "./i18n";

export type RitualSound = {
  whoosh: () => void;
  impact: (scene: SceneId) => void;
  prime: () => void;
};

export function useRitualSound(): RitualSound {
  const ctxRef = useRef<AudioContext | null>(null);

  const getCtx = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    if (!ctxRef.current) {
      try {
        ctxRef.current = new Ctor();
      } catch {
        return null;
      }
    }
    if (ctxRef.current.state === "suspended") {
      void ctxRef.current.resume().catch(() => undefined);
    }
    return ctxRef.current;
  }, []);

  const prime = useCallback(() => {
    // Touch the context so the first whoosh isn't blocked by autoplay policy.
    getCtx();
  }, [getCtx]);

  const whoosh = useCallback(() => {
    const ctx = getCtx();
    if (!ctx) return;
    const now = ctx.currentTime;
    const dur = 0.65;
    const noise = ctx.createBufferSource();
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.4;
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.2;
    filter.frequency.setValueAtTime(800, now);
    filter.frequency.exponentialRampToValueAtTime(120, now + dur);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.32, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
    noise.stop(now + dur);
  }, [getCtx]);

  const impact = useCallback(
    (scene: SceneId) => {
      const ctx = getCtx();
      if (!ctx) return;
      const now = ctx.currentTime;

      switch (scene) {
        case "trash": {
          // Low-frequency thud
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(140, now);
          osc.frequency.exponentialRampToValueAtTime(60, now + 0.25);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.45, now + 0.02);
          g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
          osc.connect(g).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + 0.4);
          break;
        }
        case "ocean": {
          // White noise through a low-pass — water splash + ripple
          const dur = 0.55;
          const src = ctx.createBufferSource();
          const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
          src.buffer = buf;
          const lp = ctx.createBiquadFilter();
          lp.type = "lowpass";
          lp.frequency.setValueAtTime(900, now);
          lp.frequency.exponentialRampToValueAtTime(180, now + dur);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.35, now + 0.04);
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          src.connect(lp).connect(g).connect(ctx.destination);
          src.start(now);
          src.stop(now + dur);
          break;
        }
        case "forest": {
          // Mid-frequency rustle
          const dur = 0.4;
          const src = ctx.createBufferSource();
          const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.45;
          src.buffer = buf;
          const bp = ctx.createBiquadFilter();
          bp.type = "bandpass";
          bp.Q.value = 0.8;
          bp.frequency.setValueAtTime(1800, now);
          bp.frequency.exponentialRampToValueAtTime(700, now + dur);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.28, now + 0.03);
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          src.connect(bp).connect(g).connect(ctx.destination);
          src.start(now);
          src.stop(now + dur);
          break;
        }
        case "space": {
          // Sub-bass with a long tail
          const dur = 0.85;
          const osc = ctx.createOscillator();
          osc.type = "sine";
          osc.frequency.setValueAtTime(80, now);
          osc.frequency.exponentialRampToValueAtTime(35, now + dur);
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.0001, now);
          g.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
          g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          // Subtle shimmer
          const osc2 = ctx.createOscillator();
          osc2.type = "triangle";
          osc2.frequency.setValueAtTime(660, now);
          osc2.frequency.exponentialRampToValueAtTime(220, now + dur);
          const g2 = ctx.createGain();
          g2.gain.setValueAtTime(0.0001, now);
          g2.gain.exponentialRampToValueAtTime(0.06, now + 0.04);
          g2.gain.exponentialRampToValueAtTime(0.0001, now + dur);
          osc.connect(g).connect(ctx.destination);
          osc2.connect(g2).connect(ctx.destination);
          osc.start(now);
          osc.stop(now + dur);
          osc2.start(now);
          osc2.stop(now + dur);
          break;
        }
      }
    },
    [getCtx],
  );

  useEffect(() => {
    return () => {
      if (ctxRef.current) {
        void ctxRef.current.close().catch(() => undefined);
        ctxRef.current = null;
      }
    };
  }, []);

  return { whoosh, impact, prime };
}
