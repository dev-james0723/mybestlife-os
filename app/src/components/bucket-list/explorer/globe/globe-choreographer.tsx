"use client";

/**
 * Globe choreographer — idle 自轉 + a cinematic space→city descent.
 *
 *   - "spin": idle axial rotation of the EARTH group (conflict-free; pauses
 *     while the pointer is pressed).
 *   - "flying": on destination select, the group freezes and the CAMERA flies
 *     from orbit down to a low oblique vantage over the city (~7s, eased so it
 *     accelerates out of orbit then settles). Google 3D Tiles stream in higher
 *     detail automatically as the camera drops. Live HUD telemetry is derived
 *     from the real camera each frame.
 *   - "manual": GlobeControls drives.
 *
 * SAFETY: the camera fly NEVER disables GlobeControls (that was the past
 * lockout). The controls read camera.position fresh each frame, so a gentle
 * external move doesn't fight them; a pointerdown cancels the fly and hands
 * over instantly. The descent stops well above terrain (~700 m) so the
 * controls' height-adjust never fights it.
 */

import { useContext, useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { MathUtils, Quaternion, Vector3 } from "three";
import type { Group } from "three";
import { TilesRendererContext } from "3d-tiles-renderer/r3f";

import { useTravelExplorerStore } from "@/stores/travel-explorer-store";
import type { EnginePhase } from "@/lib/travel-explorer/engine/engine-adapter";

const DEG2RAD = Math.PI / 180;
const ORIGIN = new Vector3(0, 0, 0);
const IDENTITY = new Quaternion();
const SPIN_SPEED = 0.015; // rad/s
const FLY_DURATION = 7; // s — space → city
const END_ALT = 700; // m above the city (oblique aerial / drone height)
const END_BACK = 1100; // m "behind" the city — sets the oblique tilt

type Target = { lat: number; lng: number } | null;
type Mode = "spin" | "flying" | "manual";

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

type FlyAnim = {
  startDir: Vector3;
  startLen: number;
  qDir: Quaternion;
  endLen: number;
  startUp: Vector3;
  endUp: Vector3;
  startLook: Vector3;
  endLook: Vector3;
  t: number;
};

export function GlobeChoreographer({
  target,
  groupRef,
}: {
  target: Target;
  groupRef: React.RefObject<Group | null>;
}) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const tiles = useContext(TilesRendererContext);

  const setPhase = useTravelExplorerStore((s) => s.setPhase);
  const setTelemetry = useTravelExplorerStore((s) => s.setTelemetry);

  const pressed = useRef(false);
  const mode = useRef<Mode>("spin");
  const fly = useRef<FlyAnim | null>(null);
  const lastPhase = useRef<EnginePhase>("space");
  const prevPos = useRef(new Vector3());
  const telClock = useRef(0);
  const elapsed = useRef(0);

  const applyPhase = (p: EnginePhase) => {
    if (lastPhase.current !== p) {
      lastPhase.current = p;
      setPhase(p);
    }
  };

  // Pause the spin / cancel the fly while the user is interacting.
  useEffect(() => {
    const el = gl.domElement;
    const down = () => {
      pressed.current = true;
      if (mode.current === "flying") {
        fly.current = null;
        mode.current = "manual";
      }
    };
    const up = () => {
      pressed.current = false;
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerleave", up);
    window.addEventListener("pointerup", up);
    return () => {
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointerleave", up);
      window.removeEventListener("pointerup", up);
    };
  }, [gl]);

  // Begin the descent when a destination is chosen.
  useEffect(() => {
    const ell = tiles?.ellipsoid;
    if (!target || !ell) {
      if (!target) mode.current = "spin";
      return;
    }
    try {
      const g = groupRef.current;
      // Freeze the (possibly spun) Earth group; resolve the city in WORLD space.
      const gq = g ? g.quaternion : IDENTITY;
      const cityLocal = ell.getCartographicToPosition(
        target.lat * DEG2RAD,
        target.lng * DEG2RAD,
        0,
        new Vector3(),
      );
      const east = new Vector3();
      const north = new Vector3();
      const up = new Vector3();
      ell.getEastNorthUpAxes(target.lat * DEG2RAD, target.lng * DEG2RAD, east, north, up);

      const cityWorld = cityLocal.clone().applyQuaternion(gq);
      const upW = up.clone().applyQuaternion(gq).normalize();
      const northW = north.clone().applyQuaternion(gq).normalize();
      const endPos = cityWorld
        .clone()
        .addScaledVector(upW, END_ALT)
        .addScaledVector(northW, -END_BACK);
      const startPos = camera.position.clone();

      fly.current = {
        startDir: startPos.clone().normalize(),
        startLen: startPos.length(),
        qDir: new Quaternion().setFromUnitVectors(
          startPos.clone().normalize(),
          endPos.clone().normalize(),
        ),
        endLen: endPos.length(),
        startUp: camera.up.clone(),
        endUp: upW,
        startLook: ORIGIN.clone(),
        endLook: cityWorld.clone().addScaledVector(upW, END_ALT * 0.25),
        t: 0,
      };
      mode.current = "flying";
      applyPhase("entering_atmosphere");
      invalidate();
    } catch {
      /* ellipsoid frame not ready — leave the camera as-is */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.lat, target?.lng, tiles]);

  useFrame((_, delta) => {
    const d = Math.min(delta, 0.1);
    elapsed.current += d;
    const g = groupRef.current;
    const ell = tiles?.ellipsoid;

    if (mode.current === "flying" && fly.current) {
      const f = fly.current;
      f.t = Math.min(1, f.t + d / FLY_DURATION);
      const k = easeInOutCubic(f.t);
      // Position = slerp(direction) * eased(altitude) — a smooth arc that
      // stays outside the Earth and lands at the oblique vantage.
      const q = new Quaternion().slerpQuaternions(IDENTITY, f.qDir, k);
      const dir = f.startDir.clone().applyQuaternion(q);
      camera.position.copy(dir).multiplyScalar(MathUtils.lerp(f.startLen, f.endLen, k));
      camera.up.copy(f.startUp).lerp(f.endUp, k).normalize();
      camera.lookAt(f.startLook.clone().lerp(f.endLook, k));
      applyPhase(f.t < 0.4 ? "entering_atmosphere" : f.t < 0.85 ? "approaching" : "cruising");
      if (f.t >= 1) {
        fly.current = null;
        mode.current = "manual";
        applyPhase("cruising");
      }
      invalidate();
    } else if (mode.current === "spin") {
      // Hold still for the first ~3s on load so the initial tiles + the Google
      // session settle before rotation starts churning new tile requests.
      if (!pressed.current && g && elapsed.current > 3) {
        g.rotation.z += SPIN_SPEED * d;
        invalidate();
      }
    }

    // Live telemetry (throttled ~6/s). Altitude/speed are rotation-agnostic;
    // coords transform the camera back into the group's local frame.
    telClock.current += d;
    if (ell && telClock.current >= 0.16) {
      const dt = telClock.current;
      telClock.current = 0;
      const speedKmh = (camera.position.distanceTo(prevPos.current) / dt) * 3.6;
      prevPos.current.copy(camera.position);
      try {
        const gqInv = (g ? g.quaternion : IDENTITY).clone().invert();
        const localPos = camera.position.clone().applyQuaternion(gqInv);
        const c = ell.getPositionToCartographic(localPos, {
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
          progress01: fly.current ? fly.current.t : 1,
        });
      } catch {
        /* skip a bad frame */
      }
    }
  });

  return null;
}
