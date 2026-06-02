"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { emitOSBuddyEvent, subscribeToOSBuddyEvents } from "@/lib/os-buddy/os-buddy-events";
import { OS_BUDDY_FREE_ROAM_CONFIG } from "@/lib/os-buddy/os-buddy-free-roam-config";
import type { OSBuddyFreeRoamIntensity } from "@/lib/os-buddy/os-buddy-free-roam";
import {
  useOSBuddyStore,
  type OSBuddyRoamInterruptReason,
} from "@/stores/os-buddy-store";

type DockPoint = { x: number; y: number };

const VIEWPORT_MARGIN_PX = 12;
const MOBILE_BREAKPOINT_PX = 640;
const MAX_SEGMENT_DISTANCE_PX = 300;
const MIN_SEGMENT_PAUSE_MS = 600;
const MAX_SEGMENT_PAUSE_MS = 1_800;
const RETURN_HOME_SPEED_PX_PER_SEC = 64;
const RETURN_HOME_SNAP_PX = 3;
const HOUR_MS = 60 * 60_000;

function randomBetween(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOutSine(t: number) {
  return -(Math.cos(Math.PI * t) - 1) / 2;
}

function distance(a: DockPoint, b: DockPoint) {
  return Math.hypot(b.x - a.x, b.y - a.y);
}

function clampPositionToViewport(params: {
  point: DockPoint;
  buddyWidth: number;
  buddyHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  margin?: number;
}): DockPoint {
  const margin = params.margin ?? VIEWPORT_MARGIN_PX;
  const maxX = Math.max(margin, params.viewportWidth - params.buddyWidth - margin);
  const maxY = Math.max(margin, params.viewportHeight - params.buddyHeight - margin);
  return {
    x: clamp(params.point.x, margin, maxX),
    y: clamp(params.point.y, margin, maxY),
  };
}

function defaultHomePosition(params: {
  buddyWidth: number;
  buddyHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): DockPoint {
  return clampPositionToViewport({
    point: {
      x: 24,
      y: params.viewportHeight - params.buddyHeight - 24,
    },
    buddyWidth: params.buddyWidth,
    buddyHeight: params.buddyHeight,
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
  });
}

function limitSegmentDistance(current: DockPoint, target: DockPoint): DockPoint {
  const segmentDistance = distance(current, target);
  if (segmentDistance <= MAX_SEGMENT_DISTANCE_PX || segmentDistance <= 0) return target;
  const ratio = MAX_SEGMENT_DISTANCE_PX / segmentDistance;
  return {
    x: current.x + (target.x - current.x) * ratio,
    y: current.y + (target.y - current.y) * ratio,
  };
}

function pickNextRoamTarget(params: {
  home: DockPoint;
  current: DockPoint;
  radius: number;
  roamNearHomeOnly: boolean;
  buddyWidth: number;
  buddyHeight: number;
  viewportWidth: number;
  viewportHeight: number;
}): DockPoint {
  const isMobile = params.viewportWidth < MOBILE_BREAKPOINT_PX;
  const rawTarget = params.roamNearHomeOnly
    ? {
        x: params.home.x + randomBetween(-params.radius, params.radius),
        y: params.home.y + randomBetween(-params.radius * 0.7, params.radius * 0.7),
      }
    : {
        x: randomBetween(
          VIEWPORT_MARGIN_PX,
          Math.max(VIEWPORT_MARGIN_PX, params.viewportWidth - params.buddyWidth - VIEWPORT_MARGIN_PX),
        ),
        y: randomBetween(
          isMobile ? params.viewportHeight * 0.45 : VIEWPORT_MARGIN_PX,
          Math.max(VIEWPORT_MARGIN_PX, params.viewportHeight - params.buddyHeight - VIEWPORT_MARGIN_PX),
        ),
      };

  const clamped = clampPositionToViewport({
    point: rawTarget,
    buddyWidth: params.buddyWidth,
    buddyHeight: params.buddyHeight,
    viewportWidth: params.viewportWidth,
    viewportHeight: params.viewportHeight,
  });

  return limitSegmentDistance(params.current, clamped);
}

export function useOSBuddyFreeRoam(params: {
  enabled: boolean;
  intensity: OSBuddyFreeRoamIntensity;
  returnHomeAfterRoam: boolean;
  roamNearHomeOnly: boolean;
  buddyWidth: number;
  buddyHeight: number;
  homePosition: {
    x: number;
    y: number;
  } | null;
  isBlocked: boolean;
}): {
  runtimePosition: { x: number; y: number } | null;
  interruptFreeRoam: (reason: OSBuddyRoamInterruptReason) => void;
} {
  const runtimePosition = useOSBuddyStore((state) => state.freeRoamRuntimePosition);
  const paramsRef = useRef(params);
  const reducedMotion = useReducedMotion() ?? false;
  const reducedMotionRef = useRef(reducedMotion);
  const startFreeRoam = useOSBuddyStore((state) => state.startFreeRoam);
  const updateFreeRoamPosition = useOSBuddyStore((state) => state.updateFreeRoamPosition);
  const stopFreeRoam = useOSBuddyStore((state) => state.stopFreeRoam);
  const controlsRef = useRef({
    startFreeRoam,
    updateFreeRoamPosition,
    stopFreeRoam,
  });
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const segmentPauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastActivityAtRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const finishSessionRef = useRef<(reason: OSBuddyRoamInterruptReason) => void>(() => {});
  const scheduleIdleRef = useRef<() => void>(() => {});

  useEffect(() => {
    paramsRef.current = params;
  }, [params]);

  useEffect(() => {
    reducedMotionRef.current = reducedMotion;
  }, [reducedMotion]);

  useEffect(() => {
    controlsRef.current = {
      startFreeRoam,
      updateFreeRoamPosition,
      stopFreeRoam,
    };
  }, [startFreeRoam, stopFreeRoam, updateFreeRoamPosition]);

  const interruptFreeRoam = useCallback((reason: OSBuddyRoamInterruptReason) => {
    finishSessionRef.current(reason);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    lastActivityAtRef.current = Date.now();

    const clearTimer = (ref: { current: ReturnType<typeof setTimeout> | null }) => {
      if (!ref.current) return;
      clearTimeout(ref.current);
      ref.current = null;
    };

    const cancelAnimation = () => {
      if (animationFrameRef.current == null) return;
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    };

    const clearMovementTimers = () => {
      clearTimer(segmentPauseTimerRef);
      clearTimer(sessionEndTimerRef);
      cancelAnimation();
    };

    const scheduleCooldownThenIdle = () => {
      clearTimer(cooldownTimerRef);
      const delayMs = cooldownUntilRef.current - Date.now();
      if (delayMs <= 0) {
        scheduleIdleRef.current();
        return;
      }
      cooldownTimerRef.current = setTimeout(() => {
        cooldownTimerRef.current = null;
        scheduleIdleRef.current();
      }, delayMs);
    };

    const startCooldown = () => {
      const { intensity } = paramsRef.current;
      const config = OS_BUDDY_FREE_ROAM_CONFIG[intensity];
      cooldownUntilRef.current = Date.now() + randomBetween(config.cooldownMinMs, config.cooldownMaxMs);
      scheduleCooldownThenIdle();
    };

    const getViewport = () => ({
      width: window.innerWidth,
      height: window.innerHeight,
    });

    const getHome = (): DockPoint | null => {
      const currentParams = paramsRef.current;
      const viewport = getViewport();
      if (
        viewport.width <= 0 ||
        viewport.height <= 0 ||
        currentParams.buddyWidth <= 0 ||
        currentParams.buddyHeight <= 0
      ) {
        return null;
      }

      return clampPositionToViewport({
        point:
          currentParams.homePosition ??
          defaultHomePosition({
            buddyWidth: currentParams.buddyWidth,
            buddyHeight: currentParams.buddyHeight,
            viewportWidth: viewport.width,
            viewportHeight: viewport.height,
          }),
        buddyWidth: currentParams.buddyWidth,
        buddyHeight: currentParams.buddyHeight,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      });
    };

    const animateBetween = (options: {
      from: DockPoint;
      to: DockPoint;
      durationMs: number;
      onDone: () => void;
    }) => {
      cancelAnimation();
      const startedAt = performance.now();
      const tick = (now: number) => {
        const progress = clamp((now - startedAt) / Math.max(1, options.durationMs), 0, 1);
        const eased = easeInOutSine(progress);
        const next = {
          x: options.from.x + (options.to.x - options.from.x) * eased,
          y: options.from.y + (options.to.y - options.from.y) * eased,
        };
        controlsRef.current.updateFreeRoamPosition(next);

        if (progress >= 1 || distance(next, options.to) <= RETURN_HOME_SNAP_PX) {
          animationFrameRef.current = null;
          controlsRef.current.updateFreeRoamPosition(options.to);
          options.onDone();
          return;
        }

        animationFrameRef.current = window.requestAnimationFrame(tick);
      };

      animationFrameRef.current = window.requestAnimationFrame(tick);
    };

    const completeSession = (reason: OSBuddyRoamInterruptReason) => {
      controlsRef.current.stopFreeRoam(reason);
      if (reason === "session-ended") {
        emitOSBuddyEvent({ type: "buddy:free-roam:end", reason });
      } else {
        emitOSBuddyEvent({ type: "buddy:free-roam:interrupt", reason });
        emitOSBuddyEvent({ type: "buddy:free-roam:end", reason });
      }
      startCooldown();
    };

    const finishSession = (reason: OSBuddyRoamInterruptReason) => {
      const state = useOSBuddyStore.getState();
      if (!state.isFreeRoaming && !state.freeRoamRuntimePosition) {
        scheduleIdleRef.current();
        return;
      }

      clearMovementTimers();

      const currentParams = paramsRef.current;
      const home = getHome();
      const current = state.freeRoamRuntimePosition;
      const shouldReturnHome =
        reason === "session-ended" &&
        currentParams.returnHomeAfterRoam &&
        !reducedMotionRef.current &&
        home != null &&
        current != null &&
        distance(current, home) > RETURN_HOME_SNAP_PX;

      if (!shouldReturnHome || !home || !current) {
        completeSession(reason);
        return;
      }

      const durationMs = clamp(
        (distance(current, home) / RETURN_HOME_SPEED_PX_PER_SEC) * 1_000,
        450,
        2_600,
      );

      animateBetween({
        from: current,
        to: home,
        durationMs,
        onDone: () => completeSession(reason),
      });
    };

    finishSessionRef.current = finishSession;

    const runNextSegment = () => {
      const state = useOSBuddyStore.getState();
      const currentParams = paramsRef.current;
      if (!state.isFreeRoaming || state.freeRoamUntil == null) return;
      if (Date.now() >= state.freeRoamUntil) {
        finishSession("session-ended");
        return;
      }
      if (currentParams.isBlocked || reducedMotionRef.current) {
        finishSession(reducedMotionRef.current ? "reduced-motion" : "menu-open");
        return;
      }

      const viewport = getViewport();
      const home = getHome();
      const current = state.freeRoamRuntimePosition ?? home;
      if (!home || !current || viewport.width <= 0 || viewport.height <= 0) {
        finishSession("session-ended");
        return;
      }

      const config = OS_BUDDY_FREE_ROAM_CONFIG[currentParams.intensity];
      const radius =
        viewport.width < MOBILE_BREAKPOINT_PX ? config.mobileRadiusPx : config.desktopRadiusPx;
      const target = pickNextRoamTarget({
        home,
        current,
        radius,
        roamNearHomeOnly: currentParams.roamNearHomeOnly,
        buddyWidth: currentParams.buddyWidth,
        buddyHeight: currentParams.buddyHeight,
        viewportWidth: viewport.width,
        viewportHeight: viewport.height,
      });
      const segmentDistance = distance(current, target);
      const speed = randomBetween(config.speedMinPxPerSec, config.speedMaxPxPerSec);
      const durationMs = clamp((segmentDistance / speed) * 1_000, 700, 6_500);

      animateBetween({
        from: current,
        to: target,
        durationMs,
        onDone: () => {
          const remainingMs = (useOSBuddyStore.getState().freeRoamUntil ?? 0) - Date.now();
          if (remainingMs <= 0) {
            finishSession("session-ended");
            return;
          }

          segmentPauseTimerRef.current = setTimeout(
            runNextSegment,
            randomBetween(MIN_SEGMENT_PAUSE_MS, MAX_SEGMENT_PAUSE_MS),
          );
        },
      });
    };

    const tryStartSession = () => {
      const currentParams = paramsRef.current;
      const now = Date.now();
      const config = OS_BUDDY_FREE_ROAM_CONFIG[currentParams.intensity];
      const state = useOSBuddyStore.getState();
      const recentSessions = state.freeRoamSessionTimestamps.filter(
        (timestamp) => now - timestamp < HOUR_MS,
      );

      if (
        !currentParams.enabled ||
        currentParams.isBlocked ||
        reducedMotionRef.current ||
        state.isFreeRoaming ||
        now < cooldownUntilRef.current ||
        now - lastActivityAtRef.current < config.idleDelayMs
      ) {
        scheduleIdleRef.current();
        return;
      }

      if (recentSessions.length >= config.maxSessionsPerHour) {
        const oldestRecentSession = Math.min(...recentSessions);
        cooldownUntilRef.current = Math.max(cooldownUntilRef.current, oldestRecentSession + HOUR_MS);
        scheduleCooldownThenIdle();
        return;
      }

      const home = getHome();
      if (!home) {
        scheduleIdleRef.current();
        return;
      }

      const sessionDurationMs = randomBetween(config.sessionMinMs, config.sessionMaxMs);
      const until = now + sessionDurationMs;
      controlsRef.current.startFreeRoam({ until, initialPosition: home });
      emitOSBuddyEvent({ type: "buddy:free-roam:start" });
      sessionEndTimerRef.current = setTimeout(() => {
        finishSession("session-ended");
      }, sessionDurationMs);
      segmentPauseTimerRef.current = setTimeout(runNextSegment, randomBetween(250, 900));
    };

    const scheduleIdle = () => {
      clearTimer(idleTimerRef);
      clearTimer(cooldownTimerRef);

      const currentParams = paramsRef.current;
      if (!currentParams.enabled || currentParams.isBlocked || reducedMotionRef.current) return;

      const cooldownDelayMs = cooldownUntilRef.current - Date.now();
      if (cooldownDelayMs > 0) {
        cooldownTimerRef.current = setTimeout(() => {
          cooldownTimerRef.current = null;
          scheduleIdle();
        }, cooldownDelayMs);
        return;
      }

      const config = OS_BUDDY_FREE_ROAM_CONFIG[currentParams.intensity];
      const delayMs = Math.max(0, config.idleDelayMs - (Date.now() - lastActivityAtRef.current));
      idleTimerRef.current = setTimeout(tryStartSession, delayMs);
    };

    scheduleIdleRef.current = scheduleIdle;

    const markActivity = (reason: OSBuddyRoamInterruptReason | null) => {
      lastActivityAtRef.current = Date.now();
      if (reason && useOSBuddyStore.getState().isFreeRoaming) {
        finishSession(reason);
        return;
      }
      scheduleIdle();
    };

    const onKeyDown = (event: KeyboardEvent) => {
      markActivity(event.key === "Escape" ? "keyboard" : "keyboard");
    };
    const onScroll = () => markActivity("scroll");
    const onPointerMove = () => markActivity("scroll");
    const onWindowBlur = () => markActivity("visibility-hidden");
    const onVisibilityChange = () => {
      markActivity(document.visibilityState === "hidden" ? "visibility-hidden" : null);
    };

    const unsubscribeEvents = subscribeToOSBuddyEvents((event) => {
      switch (event.type) {
        case "project:generate:start":
        case "asset:extract:start":
        case "asset:visual:start":
        case "knowledge:summarize:start":
        case "task:suggest:start":
          finishSession("smart-action");
          return;
        case "focus:start":
          finishSession("focus-start");
          return;
        case "buddy:drag:start":
          finishSession("user-drag");
          return;
        case "buddy:longpress":
          finishSession("menu-open");
          return;
        case "game:start":
          finishSession("mini-game-open");
          return;
        default:
          return;
      }
    });

    window.addEventListener("keydown", onKeyDown, { passive: true });
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("blur", onWindowBlur, { passive: true });
    document.addEventListener("visibilitychange", onVisibilityChange);

    scheduleIdle();

    return () => {
      clearTimer(idleTimerRef);
      clearTimer(cooldownTimerRef);
      clearMovementTimers();
      unsubscribeEvents();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("blur", onWindowBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  useEffect(() => {
    const state = useOSBuddyStore.getState();
    if (!params.enabled && (state.isFreeRoaming || state.freeRoamRuntimePosition)) {
      interruptFreeRoam("session-ended");
      return;
    }
    if (params.isBlocked && state.isFreeRoaming) {
      interruptFreeRoam("menu-open");
      return;
    }
    if (reducedMotion && state.isFreeRoaming) {
      interruptFreeRoam("reduced-motion");
      return;
    }
    scheduleIdleRef.current();
  }, [interruptFreeRoam, params.enabled, params.isBlocked, reducedMotion]);

  return {
    runtimePosition,
    interruptFreeRoam,
  };
}
