"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import { attachPersonalPet } from "./personal-pet-model";
import { createGardenSky } from "./sky-atmosphere";
import { createPetMotion } from "./pet-motion";
import { createGardenerMotion } from "./gardener-motion";
import type { GardenAtmosphere } from "@/lib/garden/presentation";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import {
  ADVENTURE,
  ADVENTURE_POND,
  TRAIL_START,
  type AdventureState,
} from "@/lib/garden/adventure";
import type { Point } from "@/lib/garden/game";
import { createPondFrame, createPondWorld, pondSlotAt, type PondFrame } from "./pond-world";
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
  pondRef?: RefObject<PondFrame>;
  reducedMotion: boolean;
  quality: GardenQuality;
  active: boolean;
  atmosphere: GardenAtmosphere;
  personalPetUrl?: string;
  personalPetSelected?: boolean;
  onPetModelState: (state: "loading" | "ready" | "error") => void;
  onTarget: (p: Point) => void;
  onReady: () => void;
  onUnavailable: () => void;
};

export default function AdventureScene({
  stateRef,
  drawRef,
  cameraRef,
  pondRef: suppliedPondRef,
  reducedMotion,
  quality,
  active,
  atmosphere,
  personalPetUrl,
  personalPetSelected,
  onPetModelState,
  onTarget,
  onReady,
  onUnavailable,
  ...options
}: Props) {
  const host = useRef<HTMLDivElement>(null);
  const fallbackPondRef = useRef(createPondFrame());
  const pondRef = suppliedPondRef ?? fallbackPondRef;
  // UI changes do not recreate the renderer or reset the camera transition.
  const live = useRef({
    active,
    reducedMotion,
    atmosphere,
    buddyEnabled: options.buddyEnabled,
  });
  useEffect(() => {
    live.current = {
      active,
      reducedMotion,
      atmosphere,
      buddyEnabled: options.buddyEnabled,
    };
  }, [active, reducedMotion, atmosphere, options.buddyEnabled]);
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
    scene.background = new THREE.Color("#c4dce7");
    scene.fog = new THREE.Fog("#c4dce7", 45, 150);
    const sky = createGardenSky(scene);
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 400);
    camera.position.set(18, 23, 28);
    camera.lookAt(0, 0, 0);
    const hemisphere = new THREE.HemisphereLight("#fff7e4", "#687967", 1.3);
    scene.add(hemisphere);
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
    const environment = pmrem.fromScene(room, 0.02);
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
    if (personalPetSelected) {
      world.buddyBody.visible = false;
      world.buddyFeet.forEach((f) => {
        f.visible = false;
      });
    }
    const personalPet = personalPetUrl
      ? attachPersonalPet(world.buddy, personalPetUrl, onPetModelState)
      : null;
    const gardenerMotion = createGardenerMotion(world);
    const petMotion = createPetMotion(world);
    const livingPond = createPondWorld();
    scene.add(livingPond.root);
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
      livingPond.update(pondRef.current, dt, state.phase === "playing" && live.current.active, live.current.reducedMotion);
      world.pondLegacy.visible = !pondRef.current.world;
      const pose = gardenerMotion.update(state, dt, live.current.reducedMotion);
      world.buddy.visible = live.current.buddyEnabled;
      // Paw sole: (-0.028 + (0.09 - 0.08) * 0.8) equals the ground at -0.02.
      world.buddy.position.set(state.buddy.x, -0.028, state.buddy.z);
      const buddyTurn = Math.atan2(
        Math.sin(state.buddy.facing - world.buddy.rotation.y),
        Math.cos(state.buddy.facing - world.buddy.rotation.y),
      );
      world.buddy.rotation.y += buddyTurn * (1 - Math.exp(-dt * 10));
      const buddyDistance = Math.hypot(state.buddy.x - lastBuddyX, state.buddy.z - lastBuddyZ);
      const petPose = petMotion.update(buddyDistance, dt, live.current.reducedMotion);
      personalPet?.update(dt, petPose.moving);
      lastBuddyX = state.buddy.x;
      lastBuddyZ = state.buddy.z;
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
          (Math.hypot(state.player.x - butterflyTarget.x, state.player.z - butterflyTarget.z) < 1.6 ? 2.65 : 2) + Math.sin(motion * 3) * 0.12,
          butterflyTarget.z + 0.25,
        ),
        1 - Math.exp(-4 * dt),
      );
      const butterflyResting =
        (live.current.atmosphere.night ||
          live.current.atmosphere.weather === "rain") &&
        state.trail.phase !== "following";
      world.wings.forEach((wing, i) => {
        wing.rotation.z =
          (butterflyResting
            ? 0.2 + Math.sin(motion * 1.5) * 0.06
            : 0.15 + Math.sin(motion * 13) * 0.95) * (i === 0 ? -1 : 1);
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
        ripple.visible = !pondRef.current.world;
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
      if (
        !live.current.reducedMotion &&
        ["harvest", "deliver", "trail-won"].includes(lastFeedback) &&
        age < 0.8
      )
        world.buddy.position.y += Math.sin((age / 0.8) * Math.PI) * 0.18;
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
      if (pondRef.current.open && live.current.active) {
        const width = element!.clientWidth, height = element!.clientHeight;
        // Reserve actual screen space for the controls while keeping the raycast projection aligned.
        camera.setViewOffset(width, height, width <= 700 ? 0 : -175, width <= 700 ? height * 0.23 : 0, width, height);
        desiredLook.set(ADVENTURE_POND.x, 0.25, ADVENTURE_POND.z);
        const range = Math.max(5.4, view.distance * 0.65) * Math.max(1, 0.95 / camera.aspect);
        desiredCamera.set(desiredLook.x + Math.sin(view.yaw) * range * Math.cos(view.pitch), desiredLook.y + range * Math.sin(view.pitch), desiredLook.z + Math.cos(view.yaw) * range * Math.cos(view.pitch));
      } else if (!live.current.active || view.overview) {
        camera.clearViewOffset();
        desiredLook.set(0, 0.2, 0);
        desiredCamera.set(28, 18, 44);
      } else {
        camera.clearViewOffset();
        forward.set(-Math.sin(view.yaw) * 1.4, 0, -Math.cos(view.yaw) * 1.4);
        desiredLook.set(
          state.player.x + forward.x,
          2.0,
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
      const climate = sky.update(
        live.current.atmosphere,
        motion,
        dt,
        live.current.reducedMotion,
        camera,
      );
      sun.intensity = 0.35 + climate.daylight * 2.2 - climate.rain * 0.25;
      world.canopy.scale.z = THREE.MathUtils.lerp(
        world.canopy.scale.z,
        state.shelterOpen ? 1 : 0.06,
        1 - Math.exp(-dt * 5),
      );
      world.collectedRain.visible = state.rainReserve > 0.01;
      world.collectedRain.position.y = 0.17 + state.rainReserve * 0.56;
      for (const light of world.nightLights)
        light.intensity = (1 - climate.daylight) * 7;
      sun.color.set(
        climate.daylight < 0.3
          ? "#bbd3ef"
          : live.current.atmosphere.twilight > 0.4
            ? "#ffd1a0"
            : "#fff1d9",
      );
      hemisphere.intensity = 0.38 + climate.daylight * 1.05;
      rim.intensity = 0.35 + (1 - climate.daylight) * 0.2;
      renderer.toneMappingExposure = 0.85 + climate.daylight * 0.2;
      scene.environmentIntensity = 0.12 + climate.daylight * 0.28;
      (scene.fog as THREE.Fog).color.copy(climate.horizon);
      (scene.fog as THREE.Fog).far =
        live.current.atmosphere.weather === "mist" ? 75 : 150;
      world.glowMaterial.emissiveIntensity =
        0.18 + (1 - climate.daylight) * 1.7;
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
        version: 3,
        atmosphere: live.current.atmosphere,
        motion: pose,
        companion: {
          visible: world.buddy.visible,
          personal: !!personalPetSelected,
          gait: petPose,
          loaded: world.buddy.children.some(
            (o) =>
              o.type === "Group" &&
              o !== world.buddyBody &&
              !world.buddyFeet.includes(o as THREE.Group),
          ),
        },
        physicality: { swing: state.swing, wings: world.wings.map(w => w.rotation.z), stones: world.pathStones.length },
        weatherCare: {
          shelterOpen: state.shelterOpen,
          rainReserve: state.rainReserve,
        },
        pondInteraction: { activity: pondRef.current.activity, anchors: pondRef.current.anchors, ...livingPond.diagnostics() },
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
    type Touch = {
      x: number;
      y: number;
      startX: number;
      startY: number;
      dragged: boolean;
    };
    const pointers = new Map<number, Touch>();
    let multiGesture = false,
      pinchDistance = 0;
    function pinchGap() {
      const [a, b] = [...pointers.values()];
      return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
    }
    function down(e: PointerEvent) {
      if (!live.current.active || e.button !== 0) return;
      pointers.set(e.pointerId, {
        x: e.clientX,
        y: e.clientY,
        startX: e.clientX,
        startY: e.clientY,
        dragged: false,
      });
      if (pointers.size > 1) {
        multiGesture = true;
        pinchDistance = pinchGap();
      }
      renderer.domElement.setPointerCapture(e.pointerId);
    }
    function move(e: PointerEvent) {
      const p = pointers.get(e.pointerId);
      if (!p || !live.current.active) return;
      const dx = e.clientX - p.x,
        dy = e.clientY - p.y;
      p.x = e.clientX;
      p.y = e.clientY;
      if (pointers.size > 1) {
        const gap = pinchGap();
        if (pinchDistance > 3 && gap > 3)
          cameraRef.current.distance = THREE.MathUtils.clamp(
            (cameraRef.current.distance * pinchDistance) / gap,
            7,
            30,
          );
        cameraRef.current.overview = false;
        pinchDistance = gap;
        return;
      }
      if (multiGesture) return;
      if (Math.hypot(p.x - p.startX, p.y - p.startY) > 7) p.dragged = true;
      if (p.dragged) {
        cameraRef.current.overview = false;
        cameraRef.current.yaw -= dx * 0.006;
        cameraRef.current.pitch = THREE.MathUtils.clamp(
          cameraRef.current.pitch + dy * 0.004,
          0.23,
          1.15,
        );
      }
    }
    function end(e: PointerEvent, cancelled = false) {
      const p = pointers.get(e.pointerId);
      if (!p) return;
      const tap =
        !cancelled && !multiGesture && !p.dragged && pointers.size === 1;
      pointers.delete(e.pointerId);
      if (!pointers.size) {
        multiGesture = false;
        pinchDistance = 0;
      } else pinchDistance = pinchGap();
      if (tap) {
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.set(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          (-(e.clientY - rect.top) / rect.height) * 2 + 1,
        );
        ray.setFromCamera(pointer, camera);
        if (
          ray.ray.intersectPlane(ground, hit) &&
          Math.hypot(hit.x / ADVENTURE.radiusX, hit.z / ADVENTURE.radiusZ) < 1.03
        ) {
          if (pondRef.current.open) {
            const slot = pondSlotAt(hit.x, hit.z);
            if (slot !== null) pondRef.current.onSlot?.(slot);
          } else onTarget({ x: hit.x, z: hit.z });
        }
      }
      if (renderer.domElement.hasPointerCapture(e.pointerId))
        renderer.domElement.releasePointerCapture(e.pointerId);
      element!
        .closest<HTMLElement>("[data-garden-controls]")
        ?.focus({ preventScroll: true });
    }
    function up(e: PointerEvent) {
      end(e);
    }
    function cancel(e: PointerEvent) {
      multiGesture = true;
      end(e, true);
    }
    function clearPointers() {
      pointers.clear();
      multiGesture = false;
      pinchDistance = 0;
    }
    function zoom(e: WheelEvent) {
      if (!live.current.active) return;
      e.preventDefault();
      cameraRef.current.distance = THREE.MathUtils.clamp(
        cameraRef.current.distance + e.deltaY * 0.012,
        7,
        30,
      );
    }
    function lost(e: Event) {
      e.preventDefault();
      onUnavailable();
    }
    const canvas = renderer.domElement;
    window.addEventListener("blur", clearPointers);
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
      window.removeEventListener("blur", clearPointers);
      canvas.removeEventListener("pointerdown", down);
      canvas.removeEventListener("pointermove", move);
      canvas.removeEventListener("pointerup", up);
      canvas.removeEventListener("pointercancel", cancel);
      canvas.removeEventListener("lostpointercapture", cancel);
      canvas.removeEventListener("wheel", zoom);
      canvas.removeEventListener("webglcontextlost", lost);
      sky.dispose();
      personalPet?.dispose();
      world.dispose();
      livingPond.dispose();
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
    pondRef,
    quality,
    options.dark,
    options.pet,
    personalPetUrl,
    personalPetSelected,
    onPetModelState,
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
