"use client";

/**
 * Brain Page — 3D Sphere Mode (public wrapper).
 *
 * Mirrors the architecture of the Knowledge Constellation's sphere
 * wrapper:
 *
 *   1. Lazy-load the inner Three.js renderer with `next/dynamic`
 *      (`ssr: false`) so three never runs during SSR or build.
 *   2. Sniff WebGL availability and render a clean fallback when it's
 *      missing (older browsers, headless CI, certain VMs).
 *   3. Forward an imperative ref so the parent toolbar can drive the
 *      sphere (focus a node, reset view, fit to frame) with the same
 *      handle interface as the 2D canvas.
 *
 * The actual scene graph + gesture wiring lives in
 * `BrainSphere3DInner.tsx`.
 */

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";

import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type { BrainSphere3DHandle } from "./BrainSphere3DInner";
import type {
  ConstellationClusterBy,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";

export type { BrainSphere3DHandle };

interface BrainSphere3DProps {
  data: ConstellationGraphData;
  clusterBy: ConstellationClusterBy;
  onNodeClick: (node: ConstellationNode) => void;
  onBackgroundClick: () => void;
  onNodeHover?: (node: ConstellationNode | null) => void;
  /** Core focus: live zoom % for HUD (wheel / pinch / +/-). */
  onFocusZoomPercentChange?: (percent: number) => void;
}

const InnerSphere = dynamic(() => import("./BrainSphere3DInner"), {
  ssr: false,
  loading: () => <SphereLoading />,
}) as unknown as React.ForwardRefExoticComponent<
  BrainSphere3DProps & React.RefAttributes<BrainSphere3DHandle>
>;

function detectWebGL(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const canvas = document.createElement("canvas");
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext("webgl2") || canvas.getContext("webgl"))
    );
  } catch {
    return false;
  }
}

function SphereLoading() {
  const { t } = useGraphSurface();
  return (
    <div
      className="flex h-full w-full items-center justify-center"
      style={{ background: t.shell.sphere3dBackdropCss }}
    >
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <div
          aria-hidden
          className="h-10 w-10 animate-pulse rounded-full bg-fuchsia-300/15 ring-2 ring-fuchsia-300/40 [box-shadow:0_0_24px_rgba(232,121,249,0.4)]"
        />
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Spinning up your Brain sphere…
        </p>
      </div>
    </div>
  );
}

function SphereUnsupported() {
  const { t } = useGraphSurface();
  return (
    <div
      className="flex h-full w-full items-center justify-center p-8 text-center"
      style={{ background: t.shell.sphere3dBackdropCss }}
    >
      <p className="max-w-sm text-sm text-muted-foreground">
        Your browser doesn&apos;t support WebGL, so the Brain&apos;s 3D Sphere
        view can&apos;t render here. Try a recent Chrome, Edge, Firefox, or
        Safari.
      </p>
    </div>
  );
}

// WebGL availability via useSyncExternalStore — same SSR-safe pattern
// the Knowledge Constellation sphere uses (null on server, resolves on
// the first client paint).
const webGLStore = {
  subscribe: () => () => {
    /* WebGL availability never changes — no listener needed. */
  },
  getSnapshot: () => detectWebGL(),
  getServerSnapshot: () => null as boolean | null,
};

const BrainSphere3D = forwardRef<BrainSphere3DHandle, BrainSphere3DProps>(
  function BrainSphere3D(props, ref) {
    const innerRef = useRef<BrainSphere3DHandle | null>(null);
    const webGLOk = useSyncExternalStore(
      webGLStore.subscribe,
      webGLStore.getSnapshot,
      webGLStore.getServerSnapshot,
    );

    useImperativeHandle(
      ref,
      () => ({
        resetView: () => innerRef.current?.resetView(),
        fitGraph: () => innerRef.current?.fitGraph(),
        focusNode: (id) => innerRef.current?.focusNode(id),
        getFocusZoomPercent: () =>
          innerRef.current?.getFocusZoomPercent() ?? 0,
        adjustFocusZoomByPercent: (d) =>
          innerRef.current?.adjustFocusZoomByPercent(d),
      }),
      [],
    );

    if (webGLOk === null) return <SphereLoading />;
    if (!webGLOk) return <SphereUnsupported />;

    return (
      <InnerSphere
        ref={(instance) => {
          innerRef.current = instance ?? null;
        }}
        {...props}
      />
    );
  },
);

export default BrainSphere3D;
