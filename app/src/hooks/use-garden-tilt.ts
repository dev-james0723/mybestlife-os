"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { GardenTiltController, type TiltSensitivity, type TiltStatus } from "@/lib/garden/tilt";

type Access = "off" | "requesting" | "listening" | "denied" | "unavailable" | "insecure";
type PermissionConstructor = { requestPermission?: () => Promise<string> };
const ZERO = Object.freeze({ x: 0, z: 0 });

export function useGardenTilt() {
  const controller = useRef(new GardenTiltController());
  const accessRef = useRef<Access>("off");
  const cleanup = useRef<(() => void) | null>(null);
  const generation = useRef(0);
  const [access, setAccess] = useState<Access>("off");
  const [sensitivity, setSensitivity] = useState<TiltSensitivity>("balanced");
  const [reading, setReading] = useState<{ status: TiltStatus; speed: number; headingAvailable: boolean }>({ status: "calibrating", speed: 0, headingAvailable: false });
  const changeAccess = useCallback((next: Access) => {
    accessRef.current = next;
    setAccess(next);
  }, []);
  const disable = useCallback(() => {
    generation.current++;
    cleanup.current?.();
    cleanup.current = null;
    controller.current.recalibrate();
    changeAccess("off");
  }, [changeAccess]);

  const enable = useCallback(async () => {
    if (accessRef.current === "requesting" || accessRef.current === "listening") return;
    cleanup.current?.();
    const run = ++generation.current;
    if (!window.isSecureContext) { changeAccess("insecure"); return; }
    if (!window.DeviceOrientationEvent) { changeAccess("unavailable"); return; }
    changeAccess("requesting");
    // Call both synchronously in the click's activation window. Motion is only
    // a freshness heartbeat; orientation alone still works if motion is denied.
    const orientation = window.DeviceOrientationEvent as unknown as PermissionConstructor;
    const motion = window.DeviceMotionEvent as unknown as PermissionConstructor | undefined;
    const deadline = window.setTimeout(() => {
      if (generation.current !== run) return;
      generation.current++;
      changeAccess("unavailable");
    }, 15_000);
    try {
      const permission = orientation.requestPermission?.() ?? Promise.resolve("granted");
      try { void motion?.requestPermission?.().catch(() => {}); }
      catch { /* Orientation remains usable if optional motion access fails. */ }
      const result = await permission;
      if (generation.current !== run) return;
      if (result !== "granted") { changeAccess("denied"); return; }
      controller.current.recalibrate();
      let received = false;
      const screenAngle = () => window.screen.orientation?.angle ?? (window as unknown as { orientation?: number }).orientation ?? 0;
      const onOrientation = (event: DeviceOrientationEvent) => {
        if (document.hidden) return;
        if (event.beta !== null && event.gamma !== null && Number.isFinite(event.beta) && Number.isFinite(event.gamma)) received = true;
        controller.current.sample(event.beta, event.gamma, screenAngle(), performance.now(), event.alpha);
      };
      const onMotion = (event: DeviceMotionEvent) => {
        if (document.hidden) return;
        const values = [event.rotationRate?.alpha, event.rotationRate?.beta, event.rotationRate?.gamma,
          event.accelerationIncludingGravity?.x, event.accelerationIncludingGravity?.y, event.accelerationIncludingGravity?.z];
        if (values.some(value => typeof value === "number" && Number.isFinite(value))) controller.current.heartbeat(performance.now());
      };
      const reset = () => controller.current.recalibrate();
      window.addEventListener("deviceorientation", onOrientation);
      window.addEventListener("devicemotion", onMotion);
      window.addEventListener("orientationchange", reset);
      window.screen.orientation?.addEventListener("change", reset);
      window.addEventListener("blur", reset);
      document.addEventListener("visibilitychange", reset);
      const noSensor = window.setTimeout(() => {
        if (received || generation.current !== run) return;
        cleanup.current?.();
        cleanup.current = null;
        controller.current.recalibrate();
        changeAccess("unavailable");
      }, 6000);
      const monitor = window.setInterval(() => setReading({
        status: controller.current.status,
        headingAvailable: controller.current.headingAvailable,
        speed: Math.round(Math.hypot(controller.current.output.x, controller.current.output.z) * 100),
      }), 100);
      cleanup.current = () => {
        window.clearTimeout(noSensor);
        window.clearInterval(monitor);
        window.removeEventListener("deviceorientation", onOrientation);
        window.removeEventListener("devicemotion", onMotion);
        window.removeEventListener("orientationchange", reset);
        window.screen.orientation?.removeEventListener("change", reset);
        window.removeEventListener("blur", reset);
        document.removeEventListener("visibilitychange", reset);
      };
      changeAccess("listening");
    } catch { if (generation.current === run) changeAccess("denied"); }
    finally { window.clearTimeout(deadline); }
  }, [changeAccess]);

  useEffect(() => () => {
    generation.current++;
    cleanup.current?.();
  }, []);

  const read = useCallback((now: number, suspended: boolean) => accessRef.current === "listening"
    ? controller.current.read(now, suspended) : ZERO, []);
  const recalibrate = useCallback(() => controller.current.recalibrate(), []);
  const changeSensitivity = useCallback((value: TiltSensitivity) => {
    controller.current.sensitivity = value;
    setSensitivity(value);
    try { localStorage.setItem("mblos:garden-tilt:sensitivity", value); } catch { /* Optional. */ }
  }, []);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("mblos:garden-tilt:sensitivity");
      if (saved === "gentle" || saved === "balanced" || saved === "sensitive") {
        controller.current.sensitivity = saved;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Optional device preference after hydration.
        setSensitivity(saved);
      }
    } catch { /* Optional storage. Permission/enabled state is never persisted. */ }
  }, []);
  return { access, enabled: access === "listening", reading, sensitivity, enable, disable, read, recalibrate, changeSensitivity };
}
