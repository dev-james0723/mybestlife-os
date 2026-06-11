"use client";

import { useEffect, useMemo } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { lensRegistry, MAX_LENSES } from "./liquid-glass-store";

/**
 * Liquid Glass v2 — WebGL wallpaper + lens refraction (L0 + L1).
 *
 * A fixed, fullscreen, pointer-transparent canvas behind the app shell.
 * The fragment shader draws a procedural gradient wallpaper and bends it
 * through SDF rounded-rect "lenses" — the viewport rects of the registered
 * [data-lg-lens] elements (sidebar island, dialogs, cards…), synced each
 * frame from the lens registry. This is what makes the refraction real on
 * every engine: the glass elements' CSS backdrop-blur (L2) then frosts
 * this refracted wallpaper plus the actual DOM content above it.
 *
 * frameloop="demand": the registry keeps an `activityUntil` deadline that
 * the controller extends on scroll/press/transition. Idle ⇒ zero GPU work.
 */

const VERTEX = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT = /* glsl */ `
  precision highp float;

  uniform vec2 uResolution;   // drawing-buffer px
  uniform float uDpr;
  uniform float uTime;
  uniform vec3 uPrimary;      // sRGB 0..1
  uniform float uLight;       // 1 = light mode, 0 = dark
  uniform int uLensCount;
  uniform vec4 uLensRect[${MAX_LENSES}];   // center.xy, halfsize.zw (CSS px, y-down)
  uniform float uLensRadius[${MAX_LENSES}];
  uniform float uLensStrength[${MAX_LENSES}];

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  vec3 wallpaper(vec2 cssPx) {
    vec2 view = uResolution / uDpr;
    vec2 uv = cssPx / view;
    vec3 base = uLight > 0.5 ? vec3(0.962, 0.963, 0.972) : vec3(0.065, 0.07, 0.095);

    float aspect = view.x / max(view.y, 1.0);
    vec2 auv = vec2(uv.x * aspect, uv.y);

    vec2 b1 = vec2((0.18 + 0.04 * sin(uTime * 0.11)) * aspect, 0.28 + 0.03 * cos(uTime * 0.09));
    vec2 b2 = vec2((0.84 + 0.05 * cos(uTime * 0.07)) * aspect, 0.16 + 0.05 * sin(uTime * 0.10));
    vec2 b3 = vec2((0.55 + 0.06 * sin(uTime * 0.05)) * aspect, 0.88 + 0.04 * cos(uTime * 0.08));
    vec2 b4 = vec2((0.62 + 0.05 * cos(uTime * 0.06)) * aspect, 0.45 + 0.05 * sin(uTime * 0.07));

    float g1 = exp(-pow(length(auv - b1) / 0.50, 2.0));
    float g2 = exp(-pow(length(auv - b2) / 0.42, 2.0));
    float g3 = exp(-pow(length(auv - b3) / 0.55, 2.0));
    float g4 = exp(-pow(length(auv - b4) / 0.60, 2.0));

    // Dark mode dims the blob tints themselves ("shop window at night")
    // instead of only lowering mix strength, so blobs never wash the UI.
    vec3 dim = uLight > 0.5 ? vec3(1.0) : vec3(0.42);
    vec3 tintA = uPrimary * dim;
    vec3 tintB = mix(uPrimary, vec3(0.56, 0.36, 0.78), 0.55) * dim; // violet companion
    vec3 tintC = mix(uPrimary, vec3(0.22, 0.62, 0.66), 0.55) * dim; // teal companion

    float strength = uLight > 0.5 ? 0.26 : 0.30;
    vec3 col = base;
    col = mix(col, tintA, g1 * strength);
    col = mix(col, tintB, g2 * strength * 0.85);
    col = mix(col, tintC, g3 * strength * 0.7);
    // Centre-field wash so content-area glass usually overlaps a gradient
    // (refraction is invisible over a flat field).
    col = mix(col, tintB, g4 * strength * (uLight > 0.5 ? 0.45 : 0.3));

    // Micro-grain gives the lens band fine detail to bend.
    float n = vnoise(cssPx * 0.018) * 0.5 + vnoise(cssPx * 0.004);
    col += (n - 0.75) * (uLight > 0.5 ? 0.012 : 0.022);
    return col;
  }

  void main() {
    vec2 cssPx = vec2(gl_FragCoord.x, uResolution.y - gl_FragCoord.y) / uDpr;
    vec2 samplePos = cssPx;
    float highlight = 0.0;

    for (int i = 0; i < ${MAX_LENSES}; i++) {
      if (i >= uLensCount) break;
      vec2 center = uLensRect[i].xy;
      vec2 hsz = uLensRect[i].zw;
      float r = uLensRadius[i];
      vec2 p = cssPx - center;
      float d = sdRoundedBox(p, hsz, r);
      if (d < 0.0) {
        // Edge band: refraction strongest at the rim, near-flat centre —
        // the Apple lens look.
        float band = max(min(hsz.x, hsz.y) * 0.45, 12.0);
        float t = clamp(1.0 + d / band, 0.0, 1.0);
        float ease = t * t;

        float e = 1.0;
        float gx = sdRoundedBox(p + vec2(e, 0.0), hsz, r) - sdRoundedBox(p - vec2(e, 0.0), hsz, r);
        float gy = sdRoundedBox(p + vec2(0.0, e), hsz, r) - sdRoundedBox(p - vec2(0.0, e), hsz, r);
        vec2 nrm = normalize(vec2(gx, gy) + 1e-5);

        samplePos = cssPx + nrm * ease * 26.0 * uLensStrength[i];
        // Gentle centre magnification.
        samplePos = mix(samplePos, center + p * 0.985, (1.0 - ease) * 0.6);
        // Specular lift along the top rim.
        highlight = ease * max(-nrm.y, 0.0) * 0.055 * uLensStrength[i];
        break; // snapshot is priority-sorted: the top lens wins
      }
    }

    // Chromatic dispersion along the displacement direction.
    vec2 delta = samplePos - cssPx;
    vec3 col;
    col.r = wallpaper(cssPx + delta * 1.07).r;
    col.g = wallpaper(cssPx + delta).g;
    col.b = wallpaper(cssPx + delta * 0.93).b;
    col += highlight;

    gl_FragColor = vec4(col, 1.0);
  }
`;

/** Resolve a CSS custom property to sRGB via the 2D-canvas fillStyle parser. */
function resolveCssColor(varName: string): THREE.Color {
  const probe = document.createElement("div");
  probe.style.color = `var(${varName})`;
  probe.style.display = "none";
  document.body.appendChild(probe);
  const computed = getComputedStyle(probe).color;
  document.body.removeChild(probe);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d");
  if (!ctx) return new THREE.Color(0.45, 0.4, 0.85);
  ctx.fillStyle = computed;
  ctx.fillRect(0, 0, 1, 1);
  const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
  return new THREE.Color(r / 255, g / 255, b / 255);
}

type LensUniforms = {
  uResolution: { value: THREE.Vector2 };
  uDpr: { value: number };
  uTime: { value: number };
  uPrimary: { value: THREE.Color };
  uLight: { value: number };
  uLensCount: { value: number };
  uLensRect: { value: THREE.Vector4[] };
  uLensRadius: { value: Float32Array };
  uLensStrength: { value: Float32Array };
};

/* Module-level singleton: exactly one backdrop mounts per app (protected
   layout), the module only loads client-side (dynamic ssr:false), and the
   uniform objects are mutated imperatively per frame — keeping them out
   of React state entirely is the cleanest fit for that access pattern. */
let sharedUniforms: LensUniforms | null = null;
let sharedMaterial: THREE.ShaderMaterial | null = null;

function getUniforms(): LensUniforms {
  sharedUniforms ??= {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    uTime: { value: 0 },
    uPrimary: { value: new THREE.Color(0.45, 0.4, 0.85) },
    uLight: { value: 1 },
    uLensCount: { value: 0 },
    uLensRect: {
      value: Array.from({ length: MAX_LENSES }, () => new THREE.Vector4()),
    },
    uLensRadius: { value: new Float32Array(MAX_LENSES) },
    uLensStrength: { value: new Float32Array(MAX_LENSES).fill(1) },
  };
  return sharedUniforms;
}

/* The material is built imperatively and attached via <primitive> so that
   material.uniforms is GUARANTEED to be the singleton above. Passing a
   uniforms prop through R3F can leave the renderer bound to a different
   uniforms object, silently ignoring all later mutations. */
function getMaterial(): THREE.ShaderMaterial {
  sharedMaterial ??= new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: getUniforms(),
    depthTest: false,
    depthWrite: false,
  });
  return sharedMaterial;
}

function WallpaperLensPass({ colorMode }: { colorMode: "light" | "dark" }) {
  const { invalidate, gl, size } = useThree();
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  /* Theme-derived uniforms (primary hue + light/dark). */
  useEffect(() => {
    const uniforms = getUniforms();
    uniforms.uPrimary.value = resolveCssColor("--primary");
    uniforms.uLight.value = colorMode === "light" ? 1 : 0;
    invalidate();
  }, [colorMode, invalidate]);

  /* Wake the demand frameloop whenever the registry changes. */
  useEffect(() => lensRegistry.subscribe(() => invalidate()), [invalidate]);

  useFrame((state) => {
    const uniforms = getUniforms();
    uniforms.uResolution.value.set(
      size.width * gl.getPixelRatio(),
      size.height * gl.getPixelRatio()
    );
    uniforms.uDpr.value = gl.getPixelRatio();
    if (!reducedMotion) {
      uniforms.uTime.value = state.clock.getElapsedTime();
    }

    const count = lensRegistry.snapshotCount;
    uniforms.uLensCount.value = count;
    for (let i = 0; i < count; i++) {
      const lens = lensRegistry.snapshot[i];
      uniforms.uLensRect.value[i].set(
        lens.x + lens.w / 2,
        lens.y + lens.h / 2,
        lens.w / 2,
        lens.h / 2
      );
      uniforms.uLensRadius.value[i] = lens.r;
      uniforms.uLensStrength.value[i] = lens.strength;
    }

    // Keep rendering while the controller reports activity (scroll, press
    // tweens, transitions) so drift + rect sync stay live, then idle.
    if (performance.now() < lensRegistry.activityUntil) invalidate();
  });

  return (
    <mesh frustumCulled={false} material={getMaterial()}>
      <planeGeometry args={[2, 2]} />
    </mesh>
  );
}

export default function LiquidGlassBackdrop({
  colorMode,
}: {
  colorMode: "light" | "dark";
}) {
  /* Flag the canvas to CSS: hides the static [data-atmosphere] gradient
     fallback and clears the scroll region's bg-muted wash. */
  useEffect(() => {
    document.documentElement.setAttribute("data-lg-canvas", "");
    return () => {
      document.documentElement.removeAttribute("data-lg-canvas");
    };
  }, []);

  return (
    <div className="lg-backdrop-canvas" aria-hidden="true">
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        gl={{
          alpha: false,
          antialias: false,
          powerPreference: "low-power",
          depth: false,
          stencil: false,
        }}
        style={{ width: "100%", height: "100%" }}
      >
        <WallpaperLensPass colorMode={colorMode} />
      </Canvas>
    </div>
  );
}
