"use client";

/**
 * Camera director — coordinates the cinematic camera with the user:
 *
 *   - "spin": idle 自轉 — orbits the camera around the ECEF polar axis.
 *   - "flying": on destination select, an eased ~6s flythrough down to an
 *     oblique aerial vantage (~55° tilt) over the city, then hands to manual.
 *   - "manual": GlobeControls drives; the director keeps hands off.
 *
 * Safety: a pointerdown ALWAYS switches to manual + enables GlobeControls
 * (never a lockout). Leaving the canvas resumes the idle spin only while no
 * destination is set. Also derives live HUD telemetry from the camera.
 *
 * Tunable: range / tilt / FLY_DURATION / SPIN_SPEED.
 */

import { useContext, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { TilesRendererContext } from "3d-tiles-renderer/r3f";
import type { GlobeControls as GlobeControlsImpl } from "3d-tiles-renderer/three";

import { useTravelExplorerStore } from "@/stores/travel-explorer-store";
import type { EnginePhase } from "@/lib/travel-explorer/engine/engine-adapter";

const DEG2RAD = Math.PI / 180;
const POLAR = new Vector3(0, 0, 1);
const ORIGIN = new Vector3(0, 0, 0);
const SPIN_SPEED = 0.02; // rad/s
const FLY_DURATION = 6; // s
const FLY_RANGE = 12000; // m from target — frames the city
const FLY_TILT = 55 * DEG2RAD;

type Target = { lat: number; lng: number } | null;
type Mode = "spin" | "flying" | "manual";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function CameraDirector({
  target,
  controlsRef,
}: {
  target: Target;
  controlsRef: React.RefObject<GlobeControlsImpl | null>;
}) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);
  const tiles = useContext(TilesRendererContext);

  const setTelemetry = useTravelExplorerStore((s) => s.setTelemetry);
  const setPhase = useTravelExplorerStore((s) => s.setPhase);

  const mode = useRef<Mode>("spin");
  const hasTarget = useRef(false);
  const lookAt = useRef(new Vector3());
  const anim = useRef<
    | null
    | { fromPos: Vector3; toPos: Vector3; fromLook: Vector3; toLook: Vector3; t: number }
  >(null);
  const prevPos = useRef(new Vector3());
  const telemetryClock = useRef(0);
  const lastPhase = useRef<EnginePhase>("space");

  const applyPhase = (p: EnginePhase) => {
    if (lastPhase.current !== p) {
      lastPhase.current = p;
      setPhase(p);
    }
  };

  // Pointer handoff — grabbing always gives the user control.
  useEffect(() => {
    const el = gl.domElement;
    const grab = () => {
      mode.current = "manual";
      anim.current = null;
      if (controlsRef.current) controlsRef.current.enabled = true;
    };
    const release = () => {
      if (mode.current === "manual" && !hasTarget.current) mode.current = "spin";
    };
    el.addEventListener("pointerdown", grab);
    el.addEventListener("pointerleave", release);
    return () => {
      el.removeEventListener("pointerdown", grab);
      el.removeEventListener("pointerleave", release);
    };
  }, [gl, controlsRef]);

  useEffect(() => {
    prevPos.current.copy(camera.position);
    lookAt.current.copy(ORIGIN);
  }, [camera]);

  // Flythrough whenever the destination changes.
  useEffect(() => {
    const ell = tiles?.ellipsoid;
    hasTarget.current = Boolean(target);
    if (!target || !ell) return;
    try {
      const targetPos = ell.getCartographicToPosition(
        target.lat * DEG2RAD,
        target.lng * DEG2RAD,
        0,
        new Vector3(),
      );
      const east = new Vector3();
      const north = new Vector3();
      const up = new Vector3();
      ell.getEastNorthUpAxes(target.lat * DEG2RAD, target.lng * DEG2RAD, east, north, up);
      const camPos = targetPos
        .clone()
        .addScaledVector(up, Math.sin(FLY_TILT) * FLY_RANGE)
        .addScaledVector(north, -Math.cos(FLY_TILT) * FLY_RANGE);

      mode.current = "flying";
      if (controlsRef.current) controlsRef.current.enabled = false;
      anim.current = {
        fromPos: camera.position.clone(),
        toPos: camPos,
        fromLook: lookAt.current.clone(),
        toLook: targetPos.clone().addScaledVector(up, 150),
        t: 0,
      };
      applyPhase("entering_atmosphere");
      invalidate();
    } catch {
      /* ellipsoid frame not ready — leave the camera as-is */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, tiles]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    const ell = tiles?.ellipsoid;

    if (mode.current === "flying" && anim.current) {
      const a = anim.current;
      a.t = Math.min(1, a.t + d / FLY_DURATION);
      const k = easeInOutCubic(a.t);
      camera.position.lerpVectors(a.fromPos, a.toPos, k);
      lookAt.current.lerpVectors(a.fromLook, a.toLook, k);
      camera.up.copy(POLAR);
      camera.lookAt(lookAt.current);
      applyPhase(a.t < 0.55 ? "entering_atmosphere" : "approaching");
      if (a.t >= 1) {
        anim.current = null;
        mode.current = "manual";
        if (controlsRef.current) controlsRef.current.enabled = true;
        applyPhase("cruising");
      }
      invalidate();
    } else if (mode.current === "spin") {
      if (controlsRef.current) controlsRef.current.enabled = false;
      camera.position.applyAxisAngle(POLAR, SPIN_SPEED * d);
      camera.up.copy(POLAR);
      camera.lookAt(ORIGIN);
      lookAt.current.copy(ORIGIN);
      applyPhase("space");
      invalidate();
    }

    // Live telemetry, throttled to ~6/s.
    telemetryClock.current += d;
    if (ell && telemetryClock.current >= 0.16) {
      const dt = telemetryClock.current;
      telemetryClock.current = 0;
      const speedKmh = (camera.position.distanceTo(prevPos.current) / dt) * 3.6;
      prevPos.current.copy(camera.position);
      try {
        const c = ell.getPositionToCartographic(camera.position, {
          lat: 0,
          lon: 0,
          height: 0,
        }) as { lat: number; lon: number; height: number };
        setTelemetry({
          phase: lastPhase.current,
          altitudeMeters: Math.max(0, ell.getPositionElevation(camera.position)),
          speedKmh,
          lookAt: { lat: c.lat / DEG2RAD, lng: c.lon / DEG2RAD },
          headingDeg: 0,
          progress01: anim.current ? anim.current.t : 1,
        });
      } catch {
        /* skip a bad frame */
      }
    }
  });

  return null;
}
