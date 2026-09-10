"use client";

/* eslint-disable react-hooks/immutability -- R3F camera and controls are mutable engine objects, updated only in effects and frame callbacks. */

import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Vector3 } from "three";
import { WGS84_ELLIPSOID, type GlobeControls } from "3d-tiles-renderer/three";
import { useTravelExplorerStore } from "@/stores/travel-explorer-store";
import { createFlightPath, sampleFlightPath, type FlightPath } from "@/lib/travel-explorer/engine/flight-path";
import type { EnginePhase } from "@/lib/travel-explorer/engine/engine-adapter";

const POLAR = new Vector3(0, 0, 1);
const ORIGIN = new Vector3();

export function CameraDirector({ target, controlsRef, detailed, reducedMotion }: {
  target: { lat: number; lng: number } | null;
  controlsRef: React.RefObject<GlobeControls | null>;
  detailed: boolean;
  reducedMotion: boolean;
}) {
  const { camera, gl, invalidate } = useThree();
  const replay = useTravelExplorerStore((s) => s.replayNonce);
  const skip = useTravelExplorerStore((s) => s.skipNonce);
  const paused = useTravelExplorerStore((s) => s.cruisePaused);
  const flight = useRef<{ path: FlightPath; time: number } | null>(null);
  const manual = useRef(false);
  const lastPosition = useRef(new Vector3());
  const telemetryTime = useRef(0);
  const phase = useRef<EnginePhase>("space");
  const progress = useRef(0);
  const firstMount = useRef(true);
  const previousFlight = useRef({ lat: target?.lat, lng: target?.lng, replay });
  const previousSkip = useRef(skip);
  const cartographic = useRef({ lat: 0, lon: 0, height: 0 });
  const targetLat = target?.lat;
  const targetLng = target?.lng;

  useEffect(() => {
    const controls = controlsRef.current;
    manual.current = false;
    // Manual globe controls tighten the clipping planes at the surface.
    // Restore the full flight volume before taking the camera into orbit.
    camera.near = 100;
    camera.far = 2e8;
    camera.updateProjectionMatrix();
    const destination = targetLat != null && targetLng != null ? { lat: targetLat, lng: targetLng } : null;
    const path = createFlightPath(camera.position, camera.quaternion, destination, detailed);
    if (destination && !firstMount.current && previousFlight.current.lat === targetLat && previousFlight.current.lng === targetLng && previousFlight.current.replay !== replay) {
      path.arcHeight = Math.max(path.arcHeight, 9e6);
    }
    previousFlight.current = { lat: targetLat, lng: targetLng, replay };
    const instant = reducedMotion || (firstMount.current && !destination);
    firstMount.current = false;
    progress.current = destination && instant ? 1 : 0;
    phase.current = destination ? (instant ? "settled" : "entering_atmosphere") : "space";
    flight.current = instant ? null : { path, time: 0 };
    if (instant) sampleFlightPath(path, 1, camera.position, camera.quaternion);
    if (controls) {
      controls.resetState();
      controls.getCameraUpDirection(controls.up);
      controls.enabled = instant;
    }
    lastPosition.current.copy(camera.position);
    telemetryTime.current = 0;
    useTravelExplorerStore.setState({ phase: phase.current, viewState: instant ? "idle" : "flying" });
    invalidate();
    return () => { if (controls) controls.enabled = true; };
  }, [targetLat, targetLng, detailed, replay, reducedMotion, camera, controlsRef, invalidate]);

  useEffect(() => {
    if (previousSkip.current !== skip && flight.current) flight.current.time = 7;
    previousSkip.current = skip;
    invalidate();
  }, [skip, invalidate]);

  useEffect(() => { invalidate(); }, [paused, invalidate]);

  useEffect(() => {
    const canvas = gl.domElement;
    // Capture runs before the controls' pointer handlers: the same gesture
    // both cancels autopilot and starts dragging, even midway through a flight.
    const takeControl = () => {
      flight.current = null;
      manual.current = true;
      phase.current = "manual";
      if (controlsRef.current) {
        controlsRef.current.getCameraUpDirection(controlsRef.current.up);
        controlsRef.current.enabled = true;
      }
      useTravelExplorerStore.setState({ phase: "manual", viewState: "manual" });
      invalidate();
    };
    canvas.addEventListener("pointerdown", takeControl, true);
    canvas.addEventListener("wheel", takeControl, { capture: true, passive: true });
    return () => {
      canvas.removeEventListener("pointerdown", takeControl, true);
      canvas.removeEventListener("wheel", takeControl, true);
    };
  }, [gl, controlsRef, invalidate]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05); // Returning from a hidden tab never jumps.
    const controls = controlsRef.current;
    const animation = flight.current;
    if (animation) {
      if (controls) controls.enabled = false;
      if (!paused || animation.time >= 7) animation.time = Math.min(7, animation.time + dt);
      progress.current = animation.time / 7;
      sampleFlightPath(animation.path, progress.current, camera.position, camera.quaternion);
      // GlobeControls transports its previous local-up frame on update.
      // Sync it after an external flight so handoff cannot rotate the view
      // toward empty space or throw the destination off screen.
      if (controls) controls.getCameraUpDirection(controls.up);
      phase.current = progress.current < 0.65 ? "entering_atmosphere" : "approaching";
      if (animation.time >= 7) {
        flight.current = null;
        phase.current = targetLat == null ? "space" : "settled";
        if (controls) { controls.resetState(); controls.enabled = true; }
        useTravelExplorerStore.setState({ viewState: "idle" });
      }
      if (!paused) invalidate();
    } else if (!manual.current && targetLat == null && !reducedMotion && !paused) {
      if (controls) controls.enabled = false;
      camera.position.applyAxisAngle(POLAR, dt * 0.025);
      camera.up.copy(POLAR);
      camera.lookAt(ORIGIN);
      invalidate();
    } else if (controls) controls.enabled = true;

    camera.updateMatrixWorld();
    telemetryTime.current += dt;
    const store = useTravelExplorerStore.getState();
    // Only the small HUD subscribes to telemetry; the globe and search do not.
    if (telemetryTime.current >= 0.2 || store.phase !== phase.current || (progress.current === 1 && store.telemetry.progress01 !== 1)) {
      const seconds = Math.max(dt, telemetryTime.current);
      WGS84_ELLIPSOID.getPositionToCartographic(camera.position, cartographic.current);
      store.setTelemetry({
        phase: phase.current,
        altitudeMeters: Math.max(0, cartographic.current.height),
        speedKmh: flight.current ? camera.position.distanceTo(lastPosition.current) / seconds * 3.6 : 0,
        lookAt: { lat: targetLat ?? cartographic.current.lat * 180 / Math.PI, lng: targetLng ?? cartographic.current.lon * 180 / Math.PI },
        headingDeg: 0,
        progress01: progress.current,
      });
      if (store.phase !== phase.current) store.setPhase(phase.current);
      lastPosition.current.copy(camera.position);
      telemetryTime.current = 0;
    }
  }, -2); // Camera first, controls -1, tile selection 0, then render.
  return null;
}
