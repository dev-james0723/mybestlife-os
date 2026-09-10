"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { attachPersonalPet } from "./personal-pet-model";
export function GardenPetPreview({
  url,
  name,
  zh,
}: {
  url: string;
  name: string;
  zh: boolean;
}) {
  const host = useRef<HTMLDivElement>(null),
    [status, setStatus] = useState("loading");
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      queueMicrotask(() => setStatus("error"));
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    el.appendChild(renderer.domElement);
    renderer.domElement.setAttribute("aria-hidden", "true");
    const scene = new THREE.Scene(),
      root = new THREE.Group(),
      camera = new THREE.PerspectiveCamera(38, 1, 0.01, 20);
    camera.position.set(1.6, 1.3, 2.4);
    camera.lookAt(0, 0.45, 0);
    scene.add(root, new THREE.HemisphereLight("#eaf6ff", "#696a50", 2));
    const light = new THREE.DirectionalLight("#ffe4be", 3);
    light.position.set(3, 4, 2);
    scene.add(light);
    const asset = attachPersonalPet(root, url, setStatus);
    let frame = 0,
      last = 0;
    const render = (time: number) => {
      if (!document.hidden && time - last > 32) {
        asset.update(0, false);
        renderer.render(scene, camera);
        last = time;
      }
      frame = requestAnimationFrame(render);
    };
    frame = requestAnimationFrame(render);
    const resize = () => {
      const width = el.clientWidth,
        height = 240;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(el);
    resize();
    let pointer: number | null = null,
      x = 0;
    const down = (e: PointerEvent) => {
      pointer = e.pointerId;
      x = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (pointer !== e.pointerId) return;
      root.rotation.y += (e.clientX - x) * 0.015;
      x = e.clientX;
    };
    const up = () => {
      pointer = null;
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        root.rotation.y += e.key === "ArrowLeft" ? -0.2 : 0.2;
      }
    };
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);
    el.addEventListener("keydown", key);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      asset.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      el.removeEventListener("keydown", key);
    };
  }, [url]);
  return (
    <div>
      <div
        ref={host}
        tabIndex={0}
        role="img"
        aria-label={`${name} · ${zh ? "3D 預覽；拖曳或按左右鍵旋轉" : "3D preview; drag or use arrow keys to rotate"}`}
        style={{
          width: "100%",
          height: 240,
          touchAction: "none",
          borderRadius: 16,
          background: "rgba(186,208,193,.2)",
        }}
      />
      {status !== "ready" && (
        <p role="status">
          {status === "error"
            ? zh
              ? "模型未能讀取，請稍後再試。"
              : "This model could not load. Please try again."
            : zh
              ? "正在讀取模型⋯"
              : "Loading model…"}
        </p>
      )}
    </div>
  );
}
