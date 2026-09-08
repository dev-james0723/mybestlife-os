"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  ADVENTURE,
  ADVENTURE_POND,
  TRAIL_START,
  type AdventureState,
} from "@/lib/garden/adventure";
import type { Point } from "@/lib/garden/game";
import {
  createAdventureWorld,
  type GardenWorldOptions,
} from "./adventure-world";

export type AdventureCamera = {
  yaw: number;
  pitch: number;
  distance: number;
  overview: boolean;
};
export type AdventureDraw = (state: AdventureState, time: number) => void;
export type GardenQuality = "auto" | "high" | "battery";
type Props = GardenWorldOptions & {
  stateRef: RefObject<AdventureState>;
  drawRef: RefObject<AdventureDraw | null>;
  cameraRef: RefObject<AdventureCamera>;
  reducedMotion: boolean;
  quality: GardenQuality;
  active: boolean;
  onTarget: (p: Point) => void;
  onReady: () => void;
  onUnavailable: () => void;
};

export default function AdventureScene({
  stateRef,
  drawRef,
  cameraRef,
  reducedMotion,
  quality,
  active,
  onTarget,
  onReady,
  onUnavailable,
  ...options
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  // UI changes do not recreate the renderer or reset the camera transition.
  const live = useRef({ active, reducedMotion });
  useEffect(() => {
    live.current = { active, reducedMotion };
  }, [active, reducedMotion]);
  const collectionKey = options.collection.join(",");
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: quality !== "battery",
        alpha: false,
        powerPreference:
          quality === "battery" ? "low-power" : "high-performance",
      });
    } catch {
      onUnavailable();
      return;
    }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = options.dark ? 1.05 : 1;
    const mobile = window.matchMedia("(pointer: coarse)").matches;
    renderer.shadowMap.enabled = quality !== "battery";
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    element.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(options.dark ? "#233e43" : "#c4d9ce");
    scene.fog = new THREE.Fog(options.dark ? "#233e43" : "#c4d9ce", 28, 65);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 90);
    camera.position.set(18, 23, 28);
    camera.lookAt(0, 0, 0);
    scene.add(
      new THREE.HemisphereLight(
        options.dark ? "#c5e3ee" : "#fff7db",
        "#4b6654",
        1.05,
      ),
    );
    const sun = new THREE.DirectionalLight(
      options.dark ? "#cee6ff" : "#fff0c5",
      options.dark ? 2 : 2.5,
    );
    sun.position.set(-11, 20, 7);
    sun.castShadow = true;
    sun.shadow.mapSize.setScalar(mobile ? 1024 : 2048);
    Object.assign(sun.shadow.camera, {
      left: -19,
      right: 19,
      top: 19,
      bottom: -19,
      near: 1,
      far: 55,
    });
    sun.shadow.camera.updateProjectionMatrix();
    sun.shadow.bias = -0.0006;
    sun.shadow.normalBias = 0.045;
    scene.add(sun, sun.target);
    const rim = new THREE.DirectionalLight("#d5f3df", 0.55);
    rim.position.set(6, 9, -12);
    scene.add(rim);
    const pmrem = new THREE.PMREMGenerator(renderer),
      room = new RoomEnvironment();
    const environment = pmrem.fromScene(room, 0.06);
    scene.environment = environment.texture;
    scene.environmentIntensity = 0.3;
    room.dispose();
    pmrem.dispose();
    const world = createAdventureWorld(stateRef.current, {
      ...options,
      collection: collectionKey
        ? (collectionKey.split(",") as GardenWorldOptions["collection"])
        : [],
    });
    scene.add(world.root);
    const look = new THREE.Vector3(0, 0, 0),
      desiredLook = new THREE.Vector3(),
      desiredCamera = new THREE.Vector3(),
      forward = new THREE.Vector3();
    const pointer = new THREE.Vector2(),
      ray = new THREE.Raycaster(),
      hit = new THREE.Vector3(),
      ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let lastTime = 0,
      lastDraw = 0,
      sampleStart = 0,
      frames = 0,
      lowSamples = 0,
      highSamples = 0,
      measuredFps = 0,
      adaptiveScale = 1;
    let visible = true,
      lastEvent = 0,
      burstAt = -100,
      lastFeedback = "";
    const burstPosition = new THREE.Vector3();
    let lastBuddyX = stateRef.current.buddy.x,
      lastBuddyZ = stateRef.current.buddy.z;
    const baseDpr = () =>
      Math.min(
        window.devicePixelRatio || 1,
        quality === "battery" ? 1.25 : 2,
        Math.sqrt(
          (quality === "high" ? 7_000_000 : 4_500_000) /
            Math.max(1, element.clientWidth * element.clientHeight),
        ),
      );
    function setResolution() {
      renderer.setPixelRatio(Math.max(0.8, baseDpr() * adaptiveScale));
      renderer.setSize(element!.clientWidth, element!.clientHeight);
    }
    function draw(state: AdventureState, time: number) {
      const dt = Math.min(0.05, Math.max(0, (time - lastTime) / 1000));
      lastTime = time;
      if (!visible || document.hidden || !element!.clientWidth) return;
      if (quality === "battery" && time - lastDraw < 1000 / 31) return;
      lastDraw = time;
      const motion = live.current.reducedMotion ? 0 : state.elapsed;
      const speed = Math.hypot(state.player.vx, state.player.vz),
        walking = speed > 0.15;
      const step = motion * 11;
      world.hero.position.set(
        state.player.x,
        walking && !live.current.reducedMotion
          ? Math.abs(Math.sin(step)) * 0.035
          : 0.015,
        state.player.z,
      );
      // Interpolate across +/- PI without rotating through a full turn.
      const turn = Math.atan2(
        Math.sin(state.player.facing - world.hero.rotation.y),
        Math.cos(state.player.facing - world.hero.rotation.y),
      );
      world.hero.rotation.y +=
        turn * (live.current.reducedMotion ? 1 : 1 - Math.exp(-18 * dt));
      world.hero.rotation.x =
        state.player.dash > 0 && !live.current.reducedMotion ? 0.08 : 0;
      world.legs.forEach((leg, i) => {
        leg.rotation.x = walking ? Math.sin(step + i * Math.PI) * 0.48 : 0;
      });
      world.arms.forEach((arm, i) => {
        arm.rotation.x = walking ? -Math.sin(step + i * Math.PI) * 0.25 : 0;
      });
      if (state.action) {
        const p = state.action.elapsed / state.action.duration;
        const target = state.action.target;
        world.hero.rotation.y = Math.atan2(
          target.point.x - state.player.x,
          target.point.z - state.player.z,
        );
        world.arms[1].rotation.x = -1 + Math.sin(p * Math.PI) * -0.3;
        world.arms[0].rotation.x = -0.45;
        world.can.rotation.z = -0.45 * Math.sin(p * Math.PI);
        world.stream.visible =
          target.kind === "bed" &&
          state.beds[Number(target.id)].stage === "planted";
        world.stream.position.set(target.point.x, 0.94, target.point.z);
        world.stream.scale.y = 0.65 + Math.sin(motion * 15) * 0.12;
      } else {
        world.can.rotation.z = 0;
        world.stream.visible = false;
      }
      world.buddy.position.set(state.buddy.x, 0.015, state.buddy.z);
      world.buddy.rotation.y = state.buddy.facing;
      const buddyMoving =
        Math.hypot(state.buddy.x - lastBuddyX, state.buddy.z - lastBuddyZ) >
        0.003;
      lastBuddyX = state.buddy.x;
      lastBuddyZ = state.buddy.z;
      world.buddyBody.position.y =
        0.5 +
        (buddyMoving
          ? Math.abs(Math.sin(step)) * 0.065
          : Math.sin(motion * 2) * 0.012);
      world.buddyFeet.forEach((foot, i) => {
        foot.position.z =
          0.035 + (buddyMoving ? Math.sin(step + i * Math.PI) * 0.09 : 0);
      });
      state.beds.forEach((bed, i) => {
        const display = world.beds[i];
        display.sprouts.visible =
          bed.stage === "planted" || bed.stage === "growing";
        display.sprouts.scale.setScalar(
          bed.stage === "growing"
            ? 0.5 + 0.5 * Math.min(1, bed.growth / ADVENTURE.growthSeconds)
            : 0.45,
        );
        display.blooms.visible = bed.stage === "ripe";
        display.blooms.rotation.z = Math.sin(motion * 1.5 + i) * 0.025;
      });
      state.forage.forEach((item, i) => {
        world.forage[i].visible = !item.collected;
      });
      const butterflyTarget =
        state.trail.phase === "following"
          ? state.trail.stops[state.trail.index]
          : TRAIL_START;
      world.butterfly.position.lerp(
        new THREE.Vector3(
          butterflyTarget.x,
          1.5 + Math.sin(motion * 3) * 0.17,
          butterflyTarget.z,
        ),
        1 - Math.exp(-4 * dt),
      );
      world.wings.forEach((wing, i) => {
        wing.rotation.z = Math.sin(motion * 11) * 0.65 * (i === 0 ? -1 : 1);
      });
      world.trailMarkers.forEach((marker, i) => {
        marker.visible =
          state.trail.phase === "following" && i >= state.trail.index;
        marker.scale.setScalar(
          i === state.trail.index ? 0.6 + Math.sin(motion * 2) * 0.06 : 0.3,
        );
      });
      world.pumpHandle.rotation.z =
        state.action?.target.kind === "well" ? Math.sin(motion * 8) * 0.35 : 0;
      world.ripples.forEach((ripple, i) => {
        const phase = (motion * 0.12 + i / 3) % 1;
        ripple.scale.set(phase * 1.5 + 0.2, phase * 1.5 + 0.2, 0.12);
      });
      world.targetRing.visible = !!state.target;
      if (state.target)
        world.targetRing.position.set(state.target.x, 0.09, state.target.z);
      world.interactRing.visible = !!state.nearby && live.current.active;
      if (state.nearby)
        world.interactRing.position.set(
          state.nearby.point.x,
          0.1,
          state.nearby.point.z,
        );
      for (const event of state.events)
        if (event.seq > lastEvent) {
          lastEvent = event.seq;
          if (
            [
              "plant",
              "water",
              "harvest",
              "forage",
              "discover",
              "deliver",
              "trail-won",
              "refill",
            ].includes(event.kind)
          ) {
            burstAt = state.elapsed;
            burstPosition.set(event.at.x, 0.6, event.at.z);
            lastFeedback = event.kind;
          }
        }
      const age = state.elapsed - burstAt;
      world.burst.visible = !live.current.reducedMotion && age < 0.85;
      if (world.burst.visible) {
        for (let i = 0; i < 32; i++) {
          const a = i * 2.399,
            strength = lastFeedback === "deliver" ? 2 : 1;
          world.transform.position.set(
            burstPosition.x + Math.cos(a) * age * strength,
            burstPosition.y + Math.sin(i * 3) * 0.2 + age * 2 - age * age * 2,
            burstPosition.z + Math.sin(a) * age * strength,
          );
          world.transform.scale.setScalar(Math.max(0.01, 1 - age));
          world.transform.rotation.set(i, age * 4, 0);
          world.transform.updateMatrix();
          world.burst.setMatrixAt(i, world.transform.matrix);
        }
        world.burst.instanceMatrix.needsUpdate = true;
        world.burst.computeBoundingSphere();
      }
      const view = cameraRef.current;
      if (!live.current.active || view.overview) {
        desiredLook.set(0, 0.2, 0);
        desiredCamera.set(18, 24, 27);
      } else {
        forward.set(-Math.sin(view.yaw) * 1.4, 0, -Math.cos(view.yaw) * 1.4);
        desiredLook.set(
          state.player.x + forward.x,
          0.6,
          state.player.z + forward.z,
        );
        const range = view.distance + (camera.aspect < 0.8 ? 1.8 : 0);
        desiredCamera.set(
          desiredLook.x + Math.sin(view.yaw) * range * Math.cos(view.pitch),
          desiredLook.y + range * Math.sin(view.pitch),
          desiredLook.z + Math.cos(view.yaw) * range * Math.cos(view.pitch),
        );
      }
      const follow = live.current.reducedMotion ? 1 : 1 - Math.exp(-7 * dt);
      look.lerp(desiredLook, follow);
      camera.position.lerp(desiredCamera, follow);
      camera.lookAt(look);
      renderer.render(scene, camera);
      if (!sampleStart) sampleStart = time;
      frames++;
      if (time - sampleStart >= 1500) {
        measuredFps = Math.round((frames * 1000) / (time - sampleStart));
        frames = 0;
        sampleStart = time;
        if (quality === "auto" && state.phase === "playing") {
          lowSamples = measuredFps < 38 ? lowSamples + 1 : 0;
          highSamples = measuredFps > 56 ? highSamples + 1 : 0;
          if (lowSamples >= 3 && adaptiveScale > 0.65) {
            adaptiveScale = Math.max(0.65, adaptiveScale - 0.12);
            lowSamples = 0;
            setResolution();
          }
          if (highSamples >= 8 && adaptiveScale < 1) {
            adaptiveScale = Math.min(1, adaptiveScale + 0.06);
            highSamples = 0;
            setResolution();
          }
        }
      }
      renderer.domElement.dataset.gardenDiagnostics = JSON.stringify({
        version: 2,
        calls: renderer.info.render.calls,
        triangles: renderer.info.render.triangles,
        geometries: renderer.info.memory.geometries,
        textures: renderer.info.memory.textures,
        dpr: renderer.getPixelRatio(),
        fps: measuredFps || null,
        sampleMs: 1500,
        quality,
        adaptiveScale,
        player: { x: state.player.x, z: state.player.z },
        phase: state.phase,
        camera: { yaw: view.yaw, distance: view.distance },
        buffer: {
          width: renderer.domElement.width,
          height: renderer.domElement.height,
        },
        pond: ADVENTURE_POND,
        shadows: renderer.shadowMap.enabled,
        shadowSize: mobile ? 1024 : 2048,
      });
    }
    function resize() {
      const width = element!.clientWidth,
        height = element!.clientHeight;
      if (!width || !height) return;
      setResolution();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      draw(stateRef.current, performance.now());
    }
    let press: {
      id: number;
      x: number;
      y: number;
      lastX: number;
      lastY: number;
      dragged: boolean;
    } | null = null;
    function down(e: PointerEvent) {
      if (!live.current.active || e.button !== 0 || press) return;
      press = {
        id: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        lastX: e.clientX,
        lastY: e.clientY,
        dragged: false,
      };
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    function move(e: PointerEvent) {
      if (!press || press.id !== e.pointerId) return;
      if (Math.hypot(e.clientX - press.x, e.clientY - press.y) > 7)
        press.dragged = true;
      if (press.dragged) {
        cameraRef.current.overview = false;
        cameraRef.current.yaw -= (e.clientX - press.lastX) * 0.006;
        cameraRef.current.pitch = THREE.MathUtils.clamp(
          cameraRef.current.pitch + (e.clientY - press.lastY) * 0.004,
          0.4,
          1.15,
        );
      }
      press.lastX = e.clientX;
      press.lastY = e.clientY;
    }
    function up(e: PointerEvent) {
      const start = press;
      if (!start || start.id !== e.pointerId) return;
      press = null;
      if (!start.dragged) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        ray.setFromCamera(pointer, camera);
        if (ray.ray.intersectPlane(ground, hit))
          onTarget({ x: hit.x, z: hit.z });
      }
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
      element!
        .closest<HTMLElement>("[data-garden-controls]")
        ?.focus({ preventScroll: true });
    }
    function cancel() {
      press = null;
    }
    function zoom(e: WheelEvent) {
      if (!live.current.active) return;
      e.preventDefault();
      cameraRef.current.distance = THREE.MathUtils.clamp(
        cameraRef.current.distance + e.deltaY * 0.012,
        7,
        18,
      );
    }
    function lost(e: Event) {
      e.preventDefault();
      onUnavailable();
    }
    const canvas = renderer.domElement;
    canvas.addEventListener("pointerdown", down);
    canvas.addEventListener("pointermove", move);
    canvas.addEventListener("pointerup", up);
    canvas.addEventListener("pointercancel", cancel);
    canvas.addEventListener("lostpointercapture", cancel);
    canvas.addEventListener("wheel", zoom, { passive: false });
    canvas.addEventListener("webglcontextlost", lost);
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    const intersection = new IntersectionObserver((entries) => {
      visible = entries[0]?.isIntersecting ?? false;
      if (visible) {
        lastTime = performance.now();
        sampleStart = 0;
        frames = 0;
      }
    });
    intersection.observe(element);
    drawRef.current = draw;
    resize();
    onReady();
    return () => {
      if (drawRef.current === draw) drawRef.current = null;
      observer.disconnect();
      intersection.disconnect();
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      canvas.removeEventListener("wheel", zoom);
      canvas.removeEventListener("webglcontextlost", lost);
      world.dispose();
      environment.dispose();
      sun.shadow.map?.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
    };
    // options are scalar semantic dependencies; callback/ref identities are stable in the owner.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    stateRef,
    drawRef,
    cameraRef,
    quality,
    options.dark,
    options.pet,
    options.buddyEnabled,
    options.plant,
    options.stage,
    options.decoration,
    options.journal,
    options.habit,
    collectionKey,
    onTarget,
    onReady,
    onUnavailable,
  ]);
  return (
    <div ref={host} className="absolute inset-0" data-testid="garden-canvas" />
  );
}
