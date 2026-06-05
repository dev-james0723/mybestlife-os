"use client";

/**
 * Brain Canvas — brain-shaped neural graph renderer.
 *
 * Adds three layers on top of ConstellationCanvas:
 *
 *   1.  Brain-shaped initial layout (generateBrainShapedLayout).
 *       Hub nodes receive fx/fy so Frame 1 already looks like a brain.
 *
 *   2.  Brain Attractor Force — a custom D3 force that continuously
 *       pulls every node toward its brain-region target. Hub attractors
 *       are strong (≈0.88×alpha) so they survive resetLayout(). Child
 *       attractors are gentle (≈0.10×alpha) so children float naturally
 *       around hubs under link + charge forces.
 *       The default center force is disabled — it fights the attractor.
 *
 *   3.  Brain Silhouette Background (onRenderFramePre).
 *       Soft hemisphere glows, superellipse outline, corpus-callosum
 *       divider — all in world coordinates so they zoom with the graph.
 *
 * brainLayoutEnabled=false (Local Orbit mode): none of the above.
 */

import { forwardRef, useCallback, useMemo } from "react";

import {
  ConstellationCanvas,
  type ConstellationCanvasHandle,
  type ConstellationRenderQuality,
  type ForceGraphInstance,
  type LocalSubgraphCanvasMeta,
} from "@/components/knowledge/constellation/ConstellationCanvas";
import {
  BRAIN_HH,
  BRAIN_HW,
  classifyNode,
  generateBrainShapedLayout,
  norm2world,
} from "@/lib/brain/layout/brainLayout";
import { useGraphSurface } from "@/lib/knowledge/constellation/useGraphSurface";
import type {
  ConstellationGraphData,
  ConstellationNode,
} from "@/types/constellation";

export type { ConstellationCanvasHandle as BrainCanvasHandle };

interface BrainCanvasProps {
  data: ConstellationGraphData;
  selectedNodeId: string | null;
  spotlightDirect: Set<string> | null;
  spotlightSecondary: Set<string> | null;
  spotlightDirectEdges: Set<string> | null;
  localSubgraphMeta?: LocalSubgraphCanvasMeta | null;
  isExplodedFocusLayout: boolean;
  matchedNodeIds: Set<string>;
  showLabels: boolean;
  onNodeHover: (node: ConstellationNode | null) => void;
  onNodeClick: (node: ConstellationNode) => void;
  onNodeDoubleClick: (node: ConstellationNode) => void;
  onBackgroundClick: () => void;
  onZoomChange?: (zoom: number) => void;
  /** True in Global mode — applies brain shape. False in Local mode. */
  brainLayoutEnabled?: boolean;
}

// ── Brain background ─────────────────────────────────────────────────────────

function drawSuperellipse(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  W: number,
  H: number,
  n = 2.3,
  m = 2.1,
  steps = 120,
): void {
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    const ct = Math.cos(t);
    const st = Math.sin(t);
    const x = cx + W * Math.sign(ct) * Math.pow(Math.abs(ct), 2 / n);
    const y = cy + H * Math.sign(st) * Math.pow(Math.abs(st), 2 / m);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function drawCorticalContours(ctx: CanvasRenderingContext2D, isLight: boolean): void {
  const W = BRAIN_HW;
  const H = BRAIN_HH;
  const contour = isLight
    ? "rgba(15, 23, 42, 0.075)"
    : "rgba(226, 232, 240, 0.045)";
  const contourAccent = isLight
    ? "rgba(14, 116, 144, 0.12)"
    : "rgba(125, 211, 252, 0.075)";

  ctx.save();
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.1, H * 1.1, 2.3, 2.1);
  ctx.clip();
  ctx.lineCap = "round";

  for (const side of [-1, 1] as const) {
    for (let i = 0; i < 7; i++) {
      const y = -H * 0.56 + i * H * 0.17;
      const x0 = side * (W * (0.14 + i * 0.018));
      const x1 = side * (W * (0.74 - i * 0.026));
      const sag = Math.sin(i * 1.7) * H * 0.07;
      ctx.beginPath();
      ctx.moveTo(x0, y);
      ctx.bezierCurveTo(
        side * W * 0.32,
        y - H * 0.12 + sag,
        side * W * 0.56,
        y + H * 0.12 - sag,
        x1,
        y + H * 0.04,
      );
      ctx.strokeStyle = i % 3 === 0 ? contourAccent : contour;
      ctx.lineWidth = i % 3 === 0 ? 1.05 : 0.72;
      ctx.stroke();
    }

    for (let i = 0; i < 5; i++) {
      const x = side * (W * (0.24 + i * 0.105));
      ctx.beginPath();
      ctx.moveTo(x, -H * 0.60);
      ctx.bezierCurveTo(
        x + side * W * 0.08,
        -H * 0.34,
        x - side * W * 0.10,
        H * 0.18,
        x + side * W * 0.03,
        H * 0.58,
      );
      ctx.strokeStyle = contour;
      ctx.lineWidth = 0.64;
      ctx.stroke();
    }
  }

  ctx.restore();
}

function drawBrainBackgroundLite(ctx: CanvasRenderingContext2D, isLight: boolean): void {
  const W = BRAIN_HW;
  const H = BRAIN_HH;
  ctx.save();
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.04, H * 1.04, 2.3, 2.1, 72);
  ctx.fillStyle = isLight ? "rgba(14,116,144,0.055)" : "rgba(125,211,252,0.034)";
  ctx.fill();

  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W, H, 2.3, 2.1, 72);
  ctx.strokeStyle = isLight ? "rgba(14,116,144,0.18)" : "rgba(125,211,252,0.08)";
  ctx.lineWidth = 1.4;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(0, -H * 0.62);
  ctx.bezierCurveTo(9, -H * 0.22, -9, H * 0.20, 0, H * 0.62);
  ctx.strokeStyle = isLight ? "rgba(15,23,42,0.10)" : "rgba(255,255,255,0.045)";
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 14]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

function drawBrainBackground(
  ctx: CanvasRenderingContext2D,
  isLight: boolean,
  quality: ConstellationRenderQuality = "full",
): void {
  if (quality === "interaction") {
    drawBrainBackgroundLite(ctx, isLight);
    return;
  }

  const W = BRAIN_HW;
  const H = BRAIN_HH;
  ctx.save();

  const cyanA = isLight ? 0.07 : 0.038;
  const violetA = isLight ? 0.045 : 0.02;
  const warmA = isLight ? 0.055 : 0.032;
  const pinkA = isLight ? 0.035 : 0.02;
  const blueA = isLight ? 0.05 : 0.032;
  const greenA = isLight ? 0.04 : 0.02;
  const goldA = isLight ? 0.045 : 0.024;
  const outlineCyan = isLight ? "rgba(14,116,144,0.22)" : "rgba(125,211,252,0.09)";
  const outlineViolet = isLight ? "rgba(99,102,241,0.12)" : "rgba(167,139,250,0.05)";
  const divider = isLight ? "rgba(15,23,42,0.12)" : "rgba(255,255,255,0.05)";

  // Overall brain area fill.
  const bgGrad = ctx.createRadialGradient(0, -H * 0.08, W * 0.04, 0, -H * 0.08, Math.max(W, H) * 1.4);
  bgGrad.addColorStop(0, `rgba(56,189,248,${cyanA})`);
  bgGrad.addColorStop(0.45, `rgba(167,139,250,${violetA})`);
  bgGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.12, H * 1.12, 2.3, 2.1);
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Left hemisphere warm tint.
  ctx.save();
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.12, H * 1.12, 2.3, 2.1);
  ctx.clip();
  const leftGrad = ctx.createRadialGradient(-W * 0.40, H * 0.04, 0, -W * 0.40, H * 0.04, W * 0.80);
  leftGrad.addColorStop(0, `rgba(251,146,60,${warmA})`);
  leftGrad.addColorStop(0.5, `rgba(244,114,182,${pinkA})`);
  leftGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.rect(-W * 1.3, -H * 1.3, W * 1.3, H * 2.6);
  ctx.fillStyle = leftGrad;
  ctx.fill();
  ctx.restore();

  // Right hemisphere cool tint.
  ctx.save();
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.12, H * 1.12, 2.3, 2.1);
  ctx.clip();
  const rightGrad = ctx.createRadialGradient(W * 0.40, -H * 0.04, 0, W * 0.40, -H * 0.04, W * 0.80);
  rightGrad.addColorStop(0, `rgba(96,165,250,${blueA})`);
  rightGrad.addColorStop(0.5, `rgba(52,211,153,${greenA})`);
  rightGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.beginPath();
  ctx.rect(0, -H * 1.3, W * 1.3, H * 2.6);
  ctx.fillStyle = rightGrad;
  ctx.fill();
  ctx.restore();

  // Lower limbic glow.
  const limbicGrad = ctx.createRadialGradient(0, H * 0.50, 0, 0, H * 0.50, W * 0.52);
  limbicGrad.addColorStop(0, `rgba(250,204,21,${goldA})`);
  limbicGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = limbicGrad;
  ctx.beginPath();
  ctx.arc(0, H * 0.50, W * 0.52, 0, Math.PI * 2);
  ctx.fill();

  // Faint cortical contour lines: enough anatomical signal without
  // becoming decorative animation or competing with labels.
  drawCorticalContours(ctx, isLight);

  // Soft corpus-callosum bridge glow through the middle.
  const bridgeGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, W * 0.34);
  bridgeGrad.addColorStop(
    0,
    isLight ? "rgba(14,116,144,0.12)" : "rgba(125,211,252,0.07)",
  );
  bridgeGrad.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bridgeGrad;
  ctx.beginPath();
  ctx.ellipse(0, H * 0.03, W * 0.32, H * 0.16, -0.03, 0, Math.PI * 2);
  ctx.fill();

  // Brain outline.
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W, H, 2.3, 2.1);
  ctx.strokeStyle = outlineCyan;
  ctx.lineWidth = 1.8;
  ctx.stroke();

  // Outer corona.
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.04, H * 1.04, 2.3, 2.1);
  ctx.strokeStyle = outlineViolet;
  ctx.lineWidth = 5;
  ctx.stroke();

  // Hemisphere divider (corpus callosum metaphor).
  ctx.save();
  ctx.beginPath();
  drawSuperellipse(ctx, 0, 0, W * 1.12, H * 1.12, 2.3, 2.1);
  ctx.clip();
  ctx.beginPath();
  ctx.moveTo(0, -H * 0.65);
  ctx.bezierCurveTo(10, -H * 0.22, -10, H * 0.22, 0, H * 0.68);
  ctx.strokeStyle = divider;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([4, 14]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  ctx.ellipse(0, H * 0.05, W * 0.20, H * 0.08, -0.05, 0, Math.PI * 2);
  ctx.strokeStyle = isLight ? "rgba(14,116,144,0.16)" : "rgba(165,243,252,0.10)";
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.restore();

  ctx.restore();
}

// ── Brain Attractor Force ─────────────────────────────────────────────────────

type AttractorTarget = {
  tx: number;
  ty: number;
  tier: "hub_pinned" | "hub_domain" | "child";
};

type SimNodeLike = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
};

function createBrainAttractorForce(targetMap: Map<string, AttractorTarget>) {
  let simNodes: SimNodeLike[] = [];

  function force(alpha: number) {
    for (const node of simNodes) {
      const target = targetMap.get(node.id);
      if (!target) continue;
      const strength =
        target.tier === "hub_pinned"
          ? 0.88
          : target.tier === "hub_domain"
            ? 0.78
            : 0.10;
      node.vx += (target.tx - node.x) * strength * alpha;
      node.vy += (target.ty - node.y) * strength * alpha;
    }
  }

  // D3 force protocol: simulation calls `.initialize(nodes)` once.
  (force as unknown as { initialize(n: SimNodeLike[]): void }).initialize = (
    nodes: SimNodeLike[],
  ) => {
    simNodes = nodes;
  };

  return force;
}

// ── Component ─────────────────────────────────────────────────────────────────

export const BrainCanvas = forwardRef<ConstellationCanvasHandle, BrainCanvasProps>(
  function BrainCanvas({
    data,
    brainLayoutEnabled = true,
    localSubgraphMeta = null,
    ...props
  }, ref) {
    const { isLight } = useGraphSurface();

    // ── 1. Pre-positioned data (initial brain layout) ──────────────────
    const positionedData: ConstellationGraphData = useMemo(() => {
      if (!brainLayoutEnabled || data.nodes.length === 0) return data;
      return generateBrainShapedLayout(data);
    }, [data, brainLayoutEnabled]);

    // ── 2. Attractor target map ────────────────────────────────────────
    const attractorTargetMap = useMemo((): Map<string, AttractorTarget> => {
      const map = new Map<string, AttractorTarget>();
      if (!brainLayoutEnabled) return map;
      for (const node of data.nodes) {
        const cls = classifyNode(node);
        const [tx, ty] = norm2world(cls.anchorPos[0], cls.anchorPos[1]);
        map.set(node.id, { tx, ty, tier: cls.tier });
      }
      return map;
    }, [data.nodes, brainLayoutEnabled]);

    // ── 3. Extra D3 forces setup ───────────────────────────────────────
    const extraForcesSetup = useCallback(
      (fg: ForceGraphInstance) => {
        if (!brainLayoutEnabled) {
          // Remove attractor when entering local mode.
          fg.d3Force("brainAttractor", undefined);
          return;
        }
        fg.d3Force("brainAttractor", createBrainAttractorForce(attractorTargetMap));
        // Disable center force — it would drag children away from their hubs.
        const center = fg.d3Force("center");
        if (center && typeof center.strength === "function") {
          center.strength(0);
        }
      },
      [brainLayoutEnabled, attractorTargetMap],
    );

    // ── 4. Brain background pre-render ────────────────────────────────
    const onRenderFramePre = useCallback(
      (
        ctx: CanvasRenderingContext2D,
        _scale: number,
        quality: ConstellationRenderQuality,
      ) => {
        if (brainLayoutEnabled) drawBrainBackground(ctx, isLight, quality);
      },
      [brainLayoutEnabled, isLight],
    );

    return (
      <ConstellationCanvas
        {...props}
        ref={ref}
        data={positionedData}
        localSubgraphMeta={localSubgraphMeta}
        // No warmup: first frame uses our pre-positioned brain coordinates.
        warmupTicks={brainLayoutEnabled ? 0 : 30}
        // Shorter cooldown: attractor handles long-term stability.
        cooldownTicks={brainLayoutEnabled ? 100 : 140}
        // Faster alpha decay: settle quickly from brain positions.
        d3AlphaDecay={brainLayoutEnabled ? 0.038 : 0.022}
        // More friction: children don't overshoot their hubs.
        d3VelocityDecay={brainLayoutEnabled ? 0.40 : 0.32}
        extraForcesSetup={extraForcesSetup}
        onRenderFramePre={onRenderFramePre}
      />
    );
  },
);
