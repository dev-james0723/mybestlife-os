"use client";

/**
 * 3D Sphere Mode — public wrapper.
 *
 * This file is the only entry point that *other* React components
 * should import. It does three things:
 *
 *   1. Loads the heavy WebGL renderer (`ConstellationSphere3DInner`)
 *      lazily and client-side only — three.js + 3d-force-graph add
 *      ~1 MB to the bundle and must never hit the SSR pass.
 *   2. Sniffs WebGL availability and renders a clean fallback message
 *      when it's missing (older browsers, headless, certain VMs).
 *   3. Forwards an imperative ref (`fitGraph` / `resetLayout` /
 *      `focusNode`) to the inner renderer so the existing toolbar can
 *      drive the 3D camera with the same handle interface as the 2D
 *      canvas.
 */

import {
  forwardRef,
  useImperativeHandle,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/stores/app-store";
import { getKnowledgeUiCopy } from "@/lib/i18n/knowledge-ui";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type {
  ConstellationClusterBy,
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";
import type { ConstellationSphere3DHandle } from "./ConstellationSphere3DInner";

export type { ConstellationSphere3DHandle };

interface ConstellationSphere3DProps {
  data: ConstellationGraphData;
  selectedNodeId: string | null;
  spotlightDirect: Set<string> | null;
  spotlightDirectEdges: Set<string> | null;
  matchedNodeIds: Set<string>;
  showLabels: boolean;
  clusterBy: ConstellationClusterBy;
  onNodeClick: (node: ConstellationNode) => void;
  onNodeDoubleClick: (node: ConstellationNode) => void;
  onBackgroundClick: () => void;
}

// Lazy-loaded WebGL renderer. We allow forwardRef on the dynamic import
// by re-exporting the inner forwardRef component as default.
const InnerSphere = dynamic(
  () => import("./ConstellationSphere3DInner"),
  {
    ssr: false,
    loading: () => <SphereLoading />,
  },
) as unknown as React.ForwardRefExoticComponent<
  ConstellationSphere3DProps &
    React.RefAttributes<ConstellationSphere3DHandle>
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
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
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
          {ui.constellation.sphere3DLoading}
        </p>
      </div>
    </div>
  );
}

function SphereUnsupported() {
  const language = useAppStore((s) => s.language);
  const ui = getKnowledgeUiCopy(language);
  const { t } = useGraphSurface();
  return (
    <div
      className="flex h-full w-full items-center justify-center p-8 text-center"
      style={{ background: t.shell.sphere3dBackdropCss }}
    >
      <p className="max-w-sm text-sm text-muted-foreground">
        {ui.constellation.sphere3DUnsupported}
      </p>
    </div>
  );
}

// Subscribing to "WebGL availability" through useSyncExternalStore lets us
// avoid an effect+setState cycle: the value is null on the server and on
// the first client paint (when document is unavailable), then resolves
// to true/false in the same render once we're on the client. This keeps
// hydration safe (server returns the same `null` snapshot) and avoids
// the cascading-render warning.
const webGLStore = {
  subscribe: () => () => {
    /* WebGL availability never changes — no listener needed. */
  },
  getSnapshot: () => detectWebGL(),
  getServerSnapshot: () => null as boolean | null,
};

const ConstellationSphere3D = forwardRef<
  ConstellationSphere3DHandle,
  ConstellationSphere3DProps
>(function ConstellationSphere3D(props, ref) {
  const innerRef = useRef<ConstellationSphere3DHandle | null>(null);
  const webGLOk = useSyncExternalStore(
    webGLStore.subscribe,
    webGLStore.getSnapshot,
    webGLStore.getServerSnapshot,
  );

  useImperativeHandle(
    ref,
    () => ({
      fitGraph: () => innerRef.current?.fitGraph(),
      resetLayout: () => innerRef.current?.resetLayout(),
      focusNode: (nodeId: string) => innerRef.current?.focusNode(nodeId),
    }),
    [],
  );

  // Render the loader during the first client tick so we don't flash
  // the unsupported message before WebGL detection has had a chance to
  // run.
  if (webGLOk === null) {
    return <SphereLoading />;
  }
  if (!webGLOk) {
    return <SphereUnsupported />;
  }

  // We forward `ref` indirectly: the dynamic component receives our
  // local ref so its imperative handle bubbles up to the parent.
  return <InnerSphereWithRef innerRef={innerRef} {...props} />;
});

export default ConstellationSphere3D;

/**
 * Tiny adapter: passing `ref` through next/dynamic with TS strictness
 * fights the type system. Wrapping it here keeps the public component
 * clean. We use `useMemo` to ensure the dynamic component identity is
 * stable across re-renders.
 */
function InnerSphereWithRef({
  innerRef,
  ...props
}: ConstellationSphere3DProps & {
  innerRef: React.MutableRefObject<ConstellationSphere3DHandle | null>;
}) {
  const Component = useMemo(() => InnerSphere, []);
  return (
    <Component
      ref={(instance) => {
        innerRef.current = instance ?? null;
      }}
      {...props}
    />
  );
}
