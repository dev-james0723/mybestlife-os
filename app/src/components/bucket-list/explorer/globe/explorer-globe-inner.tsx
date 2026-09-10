"use client";

import { Suspense, useCallback, useContext, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { SRGBColorSpace } from "three";
import { TilesRenderer, TilesRendererContext, TilesPlugin, TilesAttributionOverlay, GlobeControls } from "3d-tiles-renderer/r3f";
import { GoogleCloudAuthPlugin } from "3d-tiles-renderer/plugins";
import { WGS84_ELLIPSOID, type GlobeControls as ControlsImpl } from "3d-tiles-renderer/three";
import { ORBIT_POSITION } from "@/lib/travel-explorer/engine/flight-path";
import { CameraDirector } from "./camera-director";
import { PoiLayer } from "./poi-layer";
import { Starfield } from "./starfield";
import type { ExplorerGlobeProps } from "./explorer-globe";

const EMPTY_IDS = new Set<string>();

function EarthMaterial() {
  const texture = useTexture("/travel/earth.jpg");
  return <meshBasicMaterial map={texture} map-colorSpace={SRGBColorSpace} />;
}

function RenderHealth({ onFailure, mobile }: { onFailure: () => void; mobile: boolean }) {
  const { gl, setDpr } = useThree();
  const timing = useRef({ frames: 0, seconds: 0, lowered: false });
  useEffect(() => {
    const lost = (event: Event) => { event.preventDefault(); onFailure(); };
    gl.domElement.addEventListener("webglcontextlost", lost);
    // Cap mobile fill rate: a 3x iPhone should not shade nine times as many pixels.
    setDpr(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75));
    return () => gl.domElement.removeEventListener("webglcontextlost", lost);
  }, [gl, setDpr, mobile, onFailure]);
  useFrame((_, delta) => {
    const sample = timing.current;
    if (sample.lowered) return;
    sample.frames += 1;
    if (sample.frames <= 30) return; // Ignore initial shader compilation.
    sample.seconds += Math.min(delta, 0.1);
    if (sample.frames >= 120) {
      if (sample.seconds / 90 > 0.025) {
        setDpr(Math.min(window.devicePixelRatio, mobile ? 1 : 1.25));
        sample.lowered = true;
      }
      sample.frames = 30; sample.seconds = 0;
    }
  });
  return null;
}

function TileBudget({ mobile }: { mobile: boolean }) {
  const tiles = useContext(TilesRendererContext);
  useEffect(() => {
    if (!tiles) return;
    // This context holds the imperative renderer, not immutable React state.
    // eslint-disable-next-line react-hooks/immutability
    tiles.downloadQueue.maxJobs = mobile ? 4 : 8;
    tiles.parseQueue.maxJobs = 2;
    tiles.lruCache.minBytesSize = (mobile ? 96 : 192) * 1024 ** 2;
    tiles.lruCache.maxBytesSize = (mobile ? 192 : 384) * 1024 ** 2;
  }, [tiles, mobile]);
  return null;
}

export default function ExplorerGlobeInner({ apiToken, active, reducedMotion, target = null, pois, savedIds, onSelectPoi, onStatus }: ExplorerGlobeProps & {
  apiToken?: string; active: boolean; reducedMotion: boolean;
}) {
  const controls = useRef<ControlsImpl>(null);
  const [tileState, setTileState] = useState<"loading" | "ready" | "error">("loading");
  const [failed, setFailed] = useState(false);
  const [mobile] = useState(() => window.matchMedia("(max-width: 767px), (pointer: coarse)").matches);
  const fail = useCallback(() => { setFailed(true); onStatus("unavailable"); }, [onStatus]);
  const detailed = Boolean(apiToken) && tileState === "ready";
  useEffect(() => {
    if (failed) return;
    onStatus(!apiToken ? "world" : tileState === "ready" ? "detailed" : tileState === "error" ? "tiles-error" : "world");
    if (!apiToken || tileState !== "loading" || !active) return;
    const timeout = window.setTimeout(() => setTileState("error"), 20000);
    return () => window.clearTimeout(timeout);
  }, [apiToken, tileState, onStatus, active, failed]);
  if (failed) return null;

  return (
    <Canvas
      style={{ position: "absolute", inset: 0 }}
      frameloop={active ? "demand" : "never"}
      gl={{ logarithmicDepthBuffer: true, antialias: true, powerPreference: "high-performance" }}
      camera={{ position: ORBIT_POSITION.toArray(), up: [0, 0, 1], near: 100, far: 2e8, fov: 45 }}
      dpr={1}
      onCreated={({ camera, gl }) => { camera.lookAt(0, 0, 0); gl.domElement.setAttribute("aria-label", "Interactive travel globe"); }}
    >
      <color attach="background" args={["#050b16"]} />
      <Starfield count={mobile ? 900 : 2200} />
      <ambientLight intensity={1.7} />
      <directionalLight position={[-2e7, -3e7, 3e7]} intensity={2} />
      <group scale={[6378137, 6378137, 6356752.314245]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <sphereGeometry args={[0.9999, 64, 48]} />
          <Suspense fallback={<meshStandardMaterial color="#174c70" />}><EarthMaterial /></Suspense>
        </mesh>
      </group>
      {/* Altitude here means camera ANGLE in radians; distance is in metres. */}
      <GlobeControls ref={controls} ellipsoid={WGS84_ELLIPSOID} enableDamping dampingFactor={0.12} minAltitude={0} maxAltitude={Math.PI * 0.47} minDistance={detailed ? 2000 : 5e5} maxDistance={3e7} cameraRadius={detailed ? 500 : 50000} enableFlight={false} />
      <CameraDirector target={target} controlsRef={controls} detailed={detailed} reducedMotion={reducedMotion} />
      <RenderHealth onFailure={fail} mobile={mobile} />
      {apiToken && tileState !== "error" && <TilesRenderer
        url="https://tile.googleapis.com/v1/3dtiles/root.json"
        errorTarget={mobile ? 18 : 12}
        onLoadModel={() => setTileState("ready")}
        onLoadError={({ tile }) => { if (!tile?.parent) setTileState("error"); }}
      >
        <TilesPlugin plugin={GoogleCloudAuthPlugin} args={[{ apiToken, autoRefreshToken: true }]} />
        <TileBudget mobile={mobile} />
        <TilesAttributionOverlay style={{ zIndex: 25, maxWidth: "100%", background: "#050b16cc", borderRadius: 8 }} />
        {detailed && pois && onSelectPoi && <PoiLayer pois={pois.slice(0, mobile ? 4 : 8)} savedIds={savedIds ?? EMPTY_IDS} onSelect={onSelectPoi} />}
      </TilesRenderer>}
    </Canvas>
  );
}
