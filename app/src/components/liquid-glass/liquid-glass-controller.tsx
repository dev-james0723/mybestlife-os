"use client";

import { useEffect } from "react";
import gsap from "gsap";
import {
  lensRegistry,
  useLiquidGlassStore,
  type LiquidGlassQuality,
} from "./liquid-glass-store";

/**
 * Liquid Glass v2 — DOM-side controller (default theme only; the parent
 * LiquidGlassRoot renders this exclusively under uiTheme === "default").
 *
 * Owns:
 *  - device quality detection → html[data-lg-quality]
 *  - Chromium detection → html[data-lg-displacement] (SVG backdrop displacement)
 *  - lens discovery ([data-lg-lens]) via MutationObserver + IntersectionObserver
 *  - activity-driven rAF measurement loop feeding the WebGL lens uniforms
 *  - delegated pointer specular (--lg-px / --lg-py + data-lg-hover)
 *  - press wobble: data-lg-wobble class hook + GSAP lens-strength spike
 */

const SPECULAR_SELECTOR = [
  "[data-lg-lens]",
  '[data-slot="button"]',
  '[data-slot="card"]',
  '[data-slot="glass-panel"]',
  '[data-slot="tabs-trigger"]',
  ".lg-surface",
  ".lg-control",
  ".os-glass-surface",
  ".os-glass-control",
].join(", ");

const WOBBLE_SELECTOR = [
  '[data-slot="button"]',
  '[data-slot="tabs-trigger"]',
  ".lg-control",
  ".os-glass-control",
].join(", ");

function detectQuality(): LiquidGlassQuality {
  try {
    // Manual override / kill switch: localStorage["mylifeos-lg-quality"].
    const override = localStorage.getItem("mylifeos-lg-quality");
    if (override === "high" || override === "mid" || override === "low") {
      return override;
    }
    if (window.matchMedia("(prefers-reduced-transparency: reduce)").matches) {
      return "low";
    }
    const cores = navigator.hardwareConcurrency ?? 4;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
    const probe = document.createElement("canvas");
    const gl = probe.getContext("webgl2");
    if (!gl || cores <= 2 || (mem !== undefined && mem <= 2)) return "low";
    // Software rasterisers (VMs, remote desktops, missing drivers) make
    // backdrop-filter + WebGL crawl — treat them as low-end.
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = dbg
      ? String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
      : "";
    if (/swiftshader|llvmpipe|software/i.test(renderer)) return "low";
    if (cores >= 8 && (mem === undefined || mem >= 8)) return "high";
    return "mid";
  } catch {
    return "low";
  }
}

/**
 * Engine check for `backdrop-filter: url(#…)` support. CSS.supports() is a
 * false positive in Safari/Firefox (the value parses; the filter reference
 * silently no-ops), so capability detection is impossible — gate on Blink.
 */
function isChromium(): boolean {
  const uaData = (
    navigator as Navigator & {
      userAgentData?: { brands?: Array<{ brand: string }> };
    }
  ).userAgentData;
  if (uaData?.brands) {
    return uaData.brands.some((b) => /Chromium/i.test(b.brand));
  }
  // Older Chromium fallback: Firefox never ships "Chrome/", Safari only
  // ships it inside WebViews that also lack url() backdrop support — but
  // those report no userAgentData AND no "Chrome/" on iOS (CriOS).
  return /Chrome\//.test(navigator.userAgent);
}

export function LiquidGlassController() {
  const setStore = useLiquidGlassStore((s) => s.set);
  const scene = useLiquidGlassStore((s) => s.scene);

  /* Active wallpaper scene → html[data-lg-scene] (drives the static CSS
     gradient fallback when the WebGL canvas is not mounted). */
  useEffect(() => {
    document.documentElement.setAttribute("data-lg-scene", scene);
    return () => {
      document.documentElement.removeAttribute("data-lg-scene");
    };
  }, [scene]);

  /* Quality tier + displacement flag + canvas flag */
  useEffect(() => {
    const root = document.documentElement;
    const quality = detectQuality();
    root.setAttribute("data-lg-quality", quality);
    const displacement = quality !== "low" && isChromium();
    if (displacement) root.setAttribute("data-lg-displacement", "");
    setStore({
      quality,
      displacementEnabled: displacement,
      canvasEnabled: quality !== "low",
    });
    return () => {
      root.removeAttribute("data-lg-quality");
      root.removeAttribute("data-lg-displacement");
      setStore({ canvasEnabled: false, displacementEnabled: false });
    };
  }, [setStore]);

  /* Lens discovery + measurement loop */
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        lensRegistry.setVisible(entry.target, entry.isIntersecting);
      }
      lensRegistry.keepAlive();
    });

    const registerTree = (node: ParentNode & Element) => {
      if (node.matches?.("[data-lg-lens]")) {
        lensRegistry.register(node);
        io.observe(node);
      }
      for (const el of node.querySelectorAll?.("[data-lg-lens]") ?? []) {
        lensRegistry.register(el);
        io.observe(el);
      }
    };
    const unregisterTree = (node: ParentNode & Element) => {
      if (node.matches?.("[data-lg-lens]")) {
        lensRegistry.unregister(node);
        io.unobserve(node);
      }
      for (const el of node.querySelectorAll?.("[data-lg-lens]") ?? []) {
        lensRegistry.unregister(el);
        io.unobserve(el);
      }
    };

    registerTree(document.body);
    const mo = new MutationObserver((mutations) => {
      for (const m of mutations) {
        for (const node of m.addedNodes) {
          if (node instanceof Element) registerTree(node);
        }
        for (const node of m.removedNodes) {
          if (node instanceof Element) unregisterTree(node);
        }
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });

    /* Activity-driven measurement: re-measure every frame while scrolling /
       resizing / transitioning, idle to zero work ~600ms after the last
       event. Measuring ≤MAX_LENSES rects per frame costs well under 1ms. */
    let rafId = 0;
    let activeUntil = 0;
    const tick = () => {
      lensRegistry.measure();
      lensRegistry.bump();
      if (performance.now() < activeUntil) {
        rafId = requestAnimationFrame(tick);
      } else {
        rafId = 0;
      }
    };
    const wake = (ms = 600) => {
      activeUntil = Math.max(activeUntil, performance.now() + ms);
      lensRegistry.keepAlive(ms);
      if (!rafId) rafId = requestAnimationFrame(tick);
    };
    const onScroll = () => wake(400);
    const onResize = () => wake(400);
    // Framer Motion page transitions & sidebar collapse move lenses without
    // scroll events — transitionrun/animationstart bubble from those.
    const onMotion = () => wake(800);

    window.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("transitionrun", onMotion, true);
    document.addEventListener("animationstart", onMotion, true);
    const onVisibility = () => {
      if (!document.hidden) wake();
    };
    document.addEventListener("visibilitychange", onVisibility);
    wake(1200);

    return () => {
      mo.disconnect();
      io.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      document.removeEventListener("transitionrun", onMotion, true);
      document.removeEventListener("animationstart", onMotion, true);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  /* Pointer specular + press wobble */
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let hovered: HTMLElement | null = null;
    let rafId = 0;
    let lastEvent: PointerEvent | null = null;

    const applySpecular = () => {
      rafId = 0;
      const e = lastEvent;
      if (!e) return;
      const target = (e.target as Element | null)?.closest?.(SPECULAR_SELECTOR);
      const el = target instanceof HTMLElement ? target : null;
      if (hovered && hovered !== el) {
        hovered.removeAttribute("data-lg-hover");
        hovered.style.removeProperty("--lg-px");
        hovered.style.removeProperty("--lg-py");
      }
      hovered = el;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--lg-px", `${(((e.clientX - rect.left) / rect.width) * 100).toFixed(2)}%`);
      el.style.setProperty("--lg-py", `${(((e.clientY - rect.top) / rect.height) * 100).toFixed(2)}%`);
      el.setAttribute("data-lg-hover", "");
    };
    const onPointerMove = (e: PointerEvent) => {
      lastEvent = e;
      if (!rafId) rafId = requestAnimationFrame(applySpecular);
    };
    const onPointerLeave = () => {
      if (hovered) {
        hovered.removeAttribute("data-lg-hover");
        hovered = null;
      }
    };

    /* Press: spike the WebGL lens refraction (jelly scale is pure CSS). */
    const onPointerDown = (e: PointerEvent) => {
      const lensEl = (e.target as Element | null)?.closest?.("[data-lg-lens]");
      if (lensEl) {
        const entry = lensRegistry.get(lensEl);
        if (entry) {
          gsap.killTweensOf(entry);
          gsap.to(entry, {
            strength: 1.6,
            duration: 0.12,
            ease: "power2.out",
            onUpdate: () => lensRegistry.keepAlive(120),
          });
        }
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      const lensEl = (e.target as Element | null)?.closest?.("[data-lg-lens]");
      if (lensEl) {
        const entry = lensRegistry.get(lensEl);
        if (entry) {
          gsap.killTweensOf(entry);
          gsap.to(entry, {
            strength: 1,
            duration: 0.55,
            ease: "elastic.out(1, 0.45)",
            onUpdate: () => lensRegistry.keepAlive(120),
          });
        }
      }
      const wobbleEl = (e.target as Element | null)?.closest?.(WOBBLE_SELECTOR);
      if (wobbleEl instanceof HTMLElement) {
        wobbleEl.removeAttribute("data-lg-wobble");
        // Force a restart if the previous wobble is still running.
        void wobbleEl.offsetWidth;
        wobbleEl.setAttribute("data-lg-wobble", "");
        wobbleEl.addEventListener(
          "animationend",
          () => wobbleEl.removeAttribute("data-lg-wobble"),
          { once: true }
        );
      }
    };

    document.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("pointerdown", onPointerDown, { passive: true });
    document.addEventListener("pointerup", onPointerUp, { passive: true });
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("pointerup", onPointerUp);
      if (hovered) hovered.removeAttribute("data-lg-hover");
    };
  }, []);

  return null;
}
