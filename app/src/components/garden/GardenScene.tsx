"use client";

import { useEffect, useRef, type RefObject } from "react";
import * as THREE from "three";
import type { GardenRound, Point } from "@/lib/garden/game";
import type { PlantType } from "@/types/database";
import { createGardenWorld, type GardenPalette } from "./garden-world";

export type GardenRenderer = (round: GardenRound, time: number) => void;
export type GardenSceneProps = {
  roundRef: RefObject<GardenRound>;
  renderRef: RefObject<GardenRenderer | null>;
  dark: boolean;
  palette: GardenPalette;
  plant: PlantType;
  stage: number;
  collectionCount: number;
  reducedMotion: boolean;
  lowPower: boolean;
  onTarget: (p: Point) => void;
  onReady: () => void;
  onUnavailable: () => void;
};

export default function GardenScene({ roundRef, renderRef, dark, palette, plant, stage, collectionCount, reducedMotion, lowPower, onTarget, onReady, onUnavailable }: GardenSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    let renderer: THREE.WebGLRenderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: !lowPower, powerPreference: "low-power" }); }
    catch { onUnavailable(); return; }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = dark ? 1.12 : 1.0;
    renderer.shadowMap.enabled = !lowPower;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute("aria-hidden", "true");
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-7, 7, 5, -5, 0.1, 70);
    camera.position.set(0, 10, 10); camera.lookAt(0, 0, 0);
    scene.add(new THREE.HemisphereLight(dark ? "#d2dfed" : "#fff6df", "#819177", dark ? 1.8 : 1.8));
    const sun = new THREE.DirectionalLight(dark ? "#cfdfed" : "#fff1cf", dark ? 1.8 : 2.1);
    sun.castShadow = !lowPower; sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 0.5, far: 25 });
    sun.shadow.bias = -0.0015; sun.shadow.normalBias = 0.03;
    sun.position.set(-4, 8, 5); scene.add(sun);
    const world = createGardenWorld(roundRef.current, dark, palette, plant, stage, collectionCount);
    scene.add(world.root);
    const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2(), hit = new THREE.Vector3();
    const ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    let visible = true, force = true, lastRender = -Infinity, lastRevision = -1, lastPhase = "", previousX = 0, previousZ = 2.1;
    let frames = 0, sampleStart = 0;
    function draw(round: GardenRound, time: number) {
      if (!visible || document.hidden) return;
      const changed = round.revision !== lastRevision || lastPhase !== round.phase;
      const animated = round.phase === "playing";
      if (!force && !changed && (!animated || time - lastRender < (lowPower ? 1000 / 30 : 1000 / 60))) return;
      force = false; lastRender = time; lastRevision = round.revision; lastPhase = round.phase;
      const motionTime = reducedMotion ? 0 : round.elapsed;
      const moving = Math.hypot(round.player.x - previousX, round.player.z - previousZ) > 0.002;
      if (moving) world.hero.rotation.y = Math.atan2(round.player.x - previousX, round.player.z - previousZ);
      previousX = round.player.x; previousZ = round.player.z;
      world.hero.position.set(round.player.x, moving && !reducedMotion ? Math.abs(Math.sin(motionTime * 12)) * 0.06 : 0.02, round.player.z);
      world.feet.forEach((foot, i) => { foot.position.z = 0.06 + (moving && !reducedMotion ? Math.sin(motionTime * 12 + i * Math.PI) * 0.08 : 0); });
      world.shadow.position.set(round.player.x, 0.029, round.player.z);
      world.drops.forEach((drop, i) => {
        drop.visible = !round.drops[i].collected;
        drop.position.set(round.drops[i].x, 0.52 + Math.sin(motionTime * 2 + i) * 0.07, round.drops[i].z);
        drop.rotation.y = motionTime;
      });
      world.beds.forEach((bed, i) => {
        bed.bloom.visible = round.beds[i].bloomed; bed.buds.visible = !round.beds[i].bloomed;
        bed.marker.visible = !round.beds[i].bloomed;
        bed.marker.position.y = 1.18 + Math.sin(motionTime * 2 + i) * 0.04;
      });
      world.targetMarker.visible = round.target !== null && round.phase === "playing";
      if (round.target) world.targetMarker.position.set(round.target.x, 0.13, round.target.z);
      renderer.render(scene, camera);
      frames++;
      if (!sampleStart) sampleStart = time;
      // Aggregate, non-sensitive renderer metrics live on this canvas, not a global test API.
      if (time - sampleStart > 1000 || frames === 1) {
        renderer.domElement.dataset.gardenDiagnostics = JSON.stringify({
          calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
          geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
          dpr: renderer.getPixelRatio(), fps: Math.round(frames * 1000 / Math.max(1, time - sampleStart)),
          player: round.player, phase: round.phase,
        });
        frames = 0; sampleStart = time;
      }
    }
    function resize() {
      const width = element!.clientWidth, height = element!.clientHeight;
      if (!width || !height) return;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1 : 1.5));
      renderer.setSize(width, height);
      const aspect = width / height;
      const viewHeight = Math.max(7.4, 11.5 / aspect);
      camera.left = -viewHeight * aspect / 2; camera.right = viewHeight * aspect / 2;
      camera.top = viewHeight / 2; camera.bottom = -viewHeight / 2;
      camera.updateProjectionMatrix(); force = true; draw(roundRef.current, performance.now());
    }
    let press: { x: number; y: number; id: number } | null = null;
    function beginPress(event: PointerEvent) { if (event.button === 0) press = { x: event.clientX, y: event.clientY, id: event.pointerId }; }
    function cancelPress() { press = null; }
    function target(event: PointerEvent) {
      const start = press; press = null;
      if (!start || event.pointerId !== start.id || Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) return;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -(event.clientY - bounds.top) / bounds.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      if (raycaster.ray.intersectPlane(ground, hit)) onTarget({ x: hit.x, z: hit.z });
      element!.closest<HTMLElement>("[data-garden-controls]")?.focus({ preventScroll: true });
    }
    function lost(event: Event) { event.preventDefault(); onUnavailable(); }
    renderer.domElement.addEventListener("pointerdown", beginPress);
    renderer.domElement.addEventListener("pointerup", target);
    renderer.domElement.addEventListener("pointercancel", cancelPress);
    renderer.domElement.addEventListener("lostpointercapture", cancelPress);
    renderer.domElement.addEventListener("webglcontextlost", lost);
    const observer = new ResizeObserver(resize); observer.observe(element);
    const intersection = new IntersectionObserver(entries => { visible = entries[0]?.isIntersecting ?? false; if (visible) { force = true; draw(roundRef.current, performance.now()); } });
    intersection.observe(element);
    renderRef.current = draw; resize(); onReady();
    return () => {
      if (renderRef.current === draw) renderRef.current = null;
      observer.disconnect(); intersection.disconnect();
      renderer.domElement.removeEventListener("pointerdown", beginPress); renderer.domElement.removeEventListener("pointerup", target);
      renderer.domElement.removeEventListener("pointercancel", cancelPress); renderer.domElement.removeEventListener("lostpointercapture", cancelPress);
      renderer.domElement.removeEventListener("webglcontextlost", lost);
      world.dispose(); sun.shadow.map?.dispose(); renderer.dispose(); renderer.forceContextLoss(); renderer.domElement.remove();
    };
  }, [roundRef, renderRef, dark, palette, plant, stage, collectionCount, reducedMotion, lowPower, onTarget, onReady, onUnavailable]);
  return <div ref={host} className="absolute inset-0" data-testid="garden-canvas" />;
}
