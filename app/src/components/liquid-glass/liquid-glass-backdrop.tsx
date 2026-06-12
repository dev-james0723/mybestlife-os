"use client";

import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import gsap from "gsap";
import {
  lensRegistry,
  useLiquidGlassStore,
  LG_SCENE_INDEX,
  MAX_LENSES,
} from "./liquid-glass-store";

/**
 * Liquid Glass v3 — animated wallpaper scenes + lens refraction.
 *
 * A fixed, fullscreen, pointer-transparent canvas behind the app shell.
 * The fragment shader draws one of five procedural animated wallpapers
 * (aurora / ocean / nebula / bokeh / butterflies — selected in Settings or
 * the topbar quick switcher) and bends it through SDF rounded-rect
 * "lenses" — the viewport rects of the registered [data-lg-lens] elements,
 * synced each frame from the lens registry. The glass elements' CSS
 * backdrop-blur then frosts this refracted, *moving* wallpaper — which is
 * what makes the material read as liquid glass on every engine: the
 * panels visibly bend and blur living light instead of a flat fill.
 *
 * Wallpapers stay vivid in BOTH color modes (deeper bases in dark, same
 * saturated accents) so the refraction is always visible.
 *
 * frameloop="demand" + a 30fps self-ticker while the tab is visible;
 * prefers-reduced-motion renders a single still frame.
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
  uniform float uLight;       // 1 = light mode, 0 = dark
  uniform int uSceneA;        // active scene
  uniform int uSceneB;        // crossfade target
  uniform float uSceneMix;    // 0 = A, 1 = B
  uniform int uLensCount;
  uniform vec4 uLensRect[${MAX_LENSES}];   // center.xy, halfsize.zw (CSS px, y-down)
  uniform float uLensRadius[${MAX_LENSES}];
  uniform float uLensStrength[${MAX_LENSES}];

  /* ---------- common helpers ---------- */

  float sdRoundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - r;
  }

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  vec2 hash2(vec2 p) {
    return fract(sin(vec2(
      dot(p, vec2(127.1, 311.7)),
      dot(p, vec2(269.5, 183.3))
    )) * 43758.5453123);
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
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    for (int i = 0; i < 3; i++) {
      v += a * vnoise(p);
      p = p * 2.03 + vec2(7.3, 1.7);
      a *= 0.5;
    }
    return v;
  }
  vec3 pal(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318 * (c * t + d));
  }
  mat2 rot2(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }
  /* Twinkling starfield on a px-space grid. */
  float stars(vec2 px, float density, float t) {
    vec2 id = floor(px);
    float h = hash(id);
    if (h < 1.0 - density) return 0.0;
    vec2 f = fract(px) - 0.5;
    float tw = 0.55 + 0.45 * sin(t * (1.0 + 3.0 * fract(h * 91.7)) + h * 40.0);
    return smoothstep(0.5, 0.05, length(f)) * tw;
  }
  /* Soft drifting bokeh discs, one per grid cell (cell-confined). */
  vec3 bokehLayer(vec2 p, float t, float seed, float soft, vec3 paC, vec3 paD) {
    vec2 id = floor(p);
    vec2 gv = fract(p) - 0.5;
    vec2 rnd = hash2(id + seed);
    vec2 c = (rnd - 0.5) * 0.42
           + 0.08 * vec2(sin(t * 0.4 + rnd.x * 6.28), cos(t * 0.31 + rnd.y * 6.28));
    float r = 0.10 + 0.16 * rnd.y;
    float d = length(gv - c);
    float disc = smoothstep(r, r * soft, d);
    // brighter ring just inside the rim — out-of-focus highlight look
    disc += 0.35 * smoothstep(0.06, 0.0, abs(d - r * 0.82)) * step(d, r);
    vec3 col = pal(rnd.x, vec3(0.5), vec3(0.5), paC, paD);
    return col * disc * (0.35 + 0.65 * rnd.x);
  }

  /* ---------- scene 0: Aurora Flow ---------- */
  vec3 sceneAurora(vec2 uv, vec2 auv, vec2 cssPx, float t) {
    vec3 top = mix(vec3(0.020, 0.038, 0.110), vec3(0.555, 0.690, 0.930), uLight);
    vec3 bot = mix(vec3(0.105, 0.060, 0.230), vec3(0.870, 0.800, 0.960), uLight);
    vec3 col = mix(top, bot, uv.y);

    col += vec3(0.9, 0.95, 1.0) * stars(cssPx / 7.0, 0.018, t) * (1.0 - uLight) * 0.8;

    for (int i = 0; i < 3; i++) {
      float fi = float(i);
      float yc = 0.24 + 0.18 * fi
        + 0.105 * sin(auv.x * 1.9 + t * (0.26 + 0.07 * fi) + fi * 2.1)
        + 0.05 * vnoise(vec2(auv.x * 2.6 + t * 0.18, fi * 7.0));
      float w = 0.05 + 0.022 * sin(t * 0.21 + fi * 1.7);
      float band = exp(-pow((uv.y - yc) / w, 2.0));
      // vertical curtain striations drifting sideways
      float curt = 0.55 + 0.45 * vnoise(vec2(auv.x * 13.0 - t * (0.5 + 0.15 * fi), uv.y * 2.0 + fi * 3.0));
      vec3 ac = pal(
        auv.x * 0.33 + t * 0.045 + fi * 0.34,
        vec3(0.30, 0.62, 0.55), vec3(0.45, 0.38, 0.50),
        vec3(1.0), vec3(0.33, 0.60, 0.83)
      );
      col += ac * band * curt * mix(0.72, 0.52, uLight);
    }
    return col;
  }

  /* ---------- scene 1: Ocean Caustics ---------- */
  vec3 sceneOcean(vec2 uv, vec2 auv, vec2 cssPx, float t) {
    vec3 shal = mix(vec3(0.020, 0.360, 0.480), vec3(0.600, 0.905, 0.960), uLight);
    vec3 deep = mix(vec3(0.008, 0.085, 0.200), vec3(0.255, 0.605, 0.835), uLight);
    vec3 col = mix(shal, deep, smoothstep(0.0, 1.05, uv.y));

    // caustic filaments: two counter-drifting warped noise fields; the
    // bright web lives where their sum crosses 1.
    vec2 p = auv * 10.0;
    float n1 = vnoise(p + vec2(t * 0.42, t * 0.30) + 0.6 * vnoise(p * 0.45 + t * 0.05));
    float n2 = vnoise(p * 1.63 - vec2(t * 0.35, t * 0.44));
    float ca = pow(clamp(1.0 - abs(n1 + n2 - 1.0) * 3.0, 0.0, 1.0), 5.0);
    // patchy distribution so the web breathes instead of tiling evenly
    ca *= 0.35 + 0.65 * vnoise(p * 0.16 + vec2(t * 0.06, -t * 0.04));
    col += vec3(0.42, 0.88, 0.95) * ca * (0.62 - 0.28 * uv.y) * mix(1.0, 0.72, uLight);

    // god rays slanting from the surface
    float ray = max(0.0, sin(auv.x * 5.2 - uv.y * 1.4 + sin(t * 0.28) * 1.6));
    ray = pow(ray, 6.0) * (1.0 - uv.y) * (1.0 - uv.y);
    col += vec3(0.55, 0.88, 0.92) * ray * 0.22;

    // rising micro-bubbles
    float bub = stars(vec2(cssPx.x, cssPx.y + t * 26.0) / 9.0, 0.01, t);
    col += vec3(0.7, 0.95, 1.0) * bub * 0.35;
    return col;
  }

  /* ---------- scene 2: Cosmic Nebula ---------- */
  vec3 sceneNebula(vec2 uv, vec2 auv, vec2 cssPx, float t) {
    vec3 col = mix(vec3(0.016, 0.010, 0.055), vec3(0.840, 0.825, 0.945), uLight);

    vec2 q = auv * 2.1 + vec2(t * 0.012, -t * 0.008);
    float warp = fbm(q * 1.4 + t * 0.02);
    float f1 = fbm(q + warp * 0.9);
    float f2 = fbm(q * 1.62 + vec2(5.2, 1.3) - warp * 0.7);

    vec3 mag = mix(vec3(0.62, 0.16, 0.58), vec3(0.88, 0.45, 0.80), uLight);
    vec3 cya = mix(vec3(0.10, 0.34, 0.66), vec3(0.45, 0.66, 0.95), uLight);
    vec3 amb = mix(vec3(0.55, 0.30, 0.12), vec3(0.95, 0.70, 0.45), uLight);
    float c1 = pow(f1, 2.0);
    float c2 = pow(f2, 2.2);
    col = mix(col, mag, c1 * 1.0);
    col = mix(col, cya, c2 * 0.9);
    col += amb * pow(max(f1 * f2 - 0.18, 0.0), 1.5) * 0.9;

    float s = stars(cssPx / 6.0, 0.010, t) + stars(cssPx / 14.0 + 31.0, 0.02, t * 0.7) * 1.3;
    col += vec3(0.92, 0.95, 1.0) * s * mix(0.8, 0.3, uLight);
    return col;
  }

  /* ---------- scene 3: Bokeh Garden ---------- */
  vec3 sceneBokeh(vec2 uv, vec2 auv, vec2 cssPx, float t) {
    // sunset-garden gradient base — rose → amber → teal
    vec3 a0 = mix(vec3(0.165, 0.045, 0.130), vec3(0.985, 0.760, 0.690), uLight);
    vec3 a1 = mix(vec3(0.235, 0.075, 0.060), vec3(0.990, 0.870, 0.640), uLight);
    vec3 a2 = mix(vec3(0.030, 0.110, 0.130), vec3(0.660, 0.905, 0.860), uLight);
    float g = clamp(uv.y + 0.28 * sin(auv.x * 1.3 + t * 0.07), 0.0, 1.0);
    vec3 col = mix(a1, a0, smoothstep(0.0, 0.55, g));
    col = mix(col, a2, smoothstep(0.55, 1.0, g));

    // warm/cool palette wheels for the discs
    vec3 paC = vec3(0.85, 0.65, 0.50);
    vec3 paD = vec3(0.05, 0.25, 0.55);
    float k = mix(1.0, 0.62, uLight); // additive light reads stronger on dark
    col += bokehLayer(auv * 2.3 + vec2(t * 0.020, -t * 0.012), t, 11.0, 0.25, paC, paD) * 0.85 * k;
    col += bokehLayer(auv * 3.9 + vec2(-t * 0.030, t * 0.016) + 4.7, t, 23.0, 0.45, paC, paD) * 0.60 * k;
    col += bokehLayer(auv * 6.4 + vec2(t * 0.042, t * 0.024) + 9.2, t, 37.0, 0.62, paC, paD) * 0.38 * k;
    return col;
  }

  /* ---------- scene 4: Butterflies ---------- */
  vec3 butterflyWing(vec2 p, float fl, float hue, out float mask) {
    // fold wings across the body axis
    vec2 w = vec2(abs(p.x) / max(fl, 0.18), p.y);
    // upper + lower wing as scaled ellipses
    float dU = length((w - vec2(0.40, -0.16)) / vec2(0.40, 0.30)) - 1.0;
    float dL = length((w - vec2(0.26, 0.22)) / vec2(0.26, 0.24)) - 1.0;
    float d = min(dU, dL);
    mask = smoothstep(0.06, -0.10, d);
    // iridescent gradient from body to wingtip + darker rim
    vec3 c = pal(hue + w.x * 0.45 + w.y * 0.2,
      vec3(0.58, 0.45, 0.50), vec3(0.42, 0.45, 0.42),
      vec3(1.0), vec3(0.00, 0.33, 0.66));
    c *= 0.72 + 0.5 * (1.0 - smoothstep(0.0, 0.9, w.x));   // glow near body
    c *= 1.0 - 0.5 * smoothstep(-0.18, 0.02, d);            // rim darkening
    return c;
  }

  vec3 sceneButterflies(vec2 uv, vec2 auv, vec2 cssPx, float t, float aspect) {
    // dreamy meadow backdrop + soft bokeh undergrowth
    vec3 b0 = mix(vec3(0.135, 0.040, 0.110), vec3(0.980, 0.800, 0.760), uLight);
    vec3 b1 = mix(vec3(0.040, 0.105, 0.085), vec3(0.760, 0.930, 0.820), uLight);
    vec3 col = mix(b0, b1, smoothstep(0.05, 0.95, uv.y + 0.18 * sin(auv.x * 1.1 + t * 0.05)));
    vec3 paC = vec3(0.80, 0.62, 0.48);
    vec3 paD = vec3(0.02, 0.28, 0.58);
    float k = mix(1.0, 0.6, uLight);
    col += bokehLayer(auv * 3.1 + vec2(t * 0.018, -t * 0.010) + 2.4, t, 53.0, 0.35, paC, paD) * 0.68 * k;
    col += bokehLayer(auv * 5.3 + vec2(-t * 0.026, t * 0.013) + 7.9, t, 67.0, 0.55, paC, paD) * 0.42 * k;

    for (int i = 0; i < 7; i++) {
      float fi = float(i);
      vec2 rnd = hash2(vec2(fi * 13.7 + 3.1, fi * 7.3 + 1.7));
      // slow lissajous wander, each with its own tempo + phase
      float s1 = 0.11 + 0.07 * rnd.x;
      float s2 = 0.09 + 0.06 * rnd.y;
      float ph1 = rnd.x * 6.28;
      float ph2 = rnd.y * 6.28;
      vec2 c = vec2(
        (0.5 + 0.40 * sin(t * s1 + ph1)) * aspect,
        0.5 + 0.36 * sin(t * s2 + ph2)
      );
      float size = 0.042 + 0.030 * fract(rnd.x * 7.7);
      vec2 p = (auv - c) / size;
      if (dot(p, p) > 2.6) continue;     // cheap reject outside bounding circle
      // bank into horizontal motion + idle sway
      float lean = clamp(cos(t * s1 + ph1) * 0.9, -0.65, 0.65) + 0.15 * sin(t * 1.7 + ph2);
      p = rot2(lean) * p;
      // wing flap (each its own rhythm), slight bob with the beat
      float beat = t * (5.0 + 3.0 * rnd.y) + ph1;
      float fl = 0.30 + 0.70 * abs(cos(beat));
      p.y += 0.10 * sin(beat * 2.0);

      float wingMask;
      vec3 wing = butterflyWing(p, fl, rnd.x * 1.7, wingMask);
      // body: slim vertical capsule + head dot
      float body = smoothstep(0.10, 0.02, length(vec2(p.x * 3.2, p.y * 0.78)) - 0.18);
      vec3 bodyCol = mix(vec3(0.13, 0.10, 0.14), vec3(0.30, 0.24, 0.28), uLight);

      col = mix(col, wing, wingMask * 0.92);
      col += wing * wingMask * 0.18;                 // gentle luminance lift
      col = mix(col, bodyCol, body);
    }
    return col;
  }

  /* ---------- scene 5: Stardust (default) ---------- */
  /* One glowing mote per grid cell: gaussian halo + hot core + twinkle. */
  vec3 dustLayer(
    vec2 p, float t, float seed,
    float sizeMin, float sizeMax, float glowK,
    vec3 tintA, vec3 tintB
  ) {
    vec2 id = floor(p);
    vec2 gv = fract(p) - 0.5;
    vec2 rnd = hash2(id + seed);
    vec2 c = (rnd - 0.5) * 0.5
           + 0.10 * vec2(sin(t * (0.25 + 0.35 * rnd.x) + rnd.x * 6.28),
                         cos(t * (0.21 + 0.30 * rnd.y) + rnd.y * 6.28));
    float d = length(gv - c);
    float r = mix(sizeMin, sizeMax, fract(rnd.x * 5.17));
    float glow = exp(-pow(d / r, 2.0) * 4.0);
    float core = smoothstep(r * 0.32, 0.0, d);
    float tw = 0.62 + 0.38 * sin(t * (0.7 + 2.2 * rnd.y) + rnd.x * 40.0);
    // a slice of motes stays dormant so the field never feels gridded
    float alive = step(0.25, fract(rnd.y * 9.73));
    vec3 tint = mix(tintA, tintB, fract(rnd.y * 7.31));
    return tint * (glow * glowK + core * 0.9) * tw * alive;
  }

  vec3 sceneStardust(vec2 uv, vec2 auv, float t) {
    // quiet, deep base so the motes carry the scene
    vec3 top = mix(vec3(0.040, 0.046, 0.105), vec3(0.890, 0.905, 0.955), uLight);
    vec3 bot = mix(vec3(0.090, 0.066, 0.165), vec3(0.960, 0.930, 0.910), uLight);
    vec3 col = mix(top, bot, uv.y);

    // two vast, slow ambient glows for depth (warm low-left, cool top-right)
    float gA = exp(-pow(length(auv - vec2(0.25 + 0.05 * sin(t * 0.05), 0.78)) / 0.55, 2.0));
    float gB = exp(-pow(length(auv - vec2(1.05 + 0.06 * cos(t * 0.04), 0.18)) / 0.60, 2.0));
    col += mix(vec3(0.16, 0.09, 0.06), vec3(0.10, 0.05, 0.02), uLight) * gA;
    col += mix(vec3(0.05, 0.08, 0.16), vec3(0.03, 0.05, 0.10), uLight) * gB;

    // palette: champagne gold / ice blue / soft rose
    vec3 gold = vec3(1.00, 0.84, 0.58);
    vec3 ice  = vec3(0.60, 0.78, 1.00);
    vec3 rose = vec3(1.00, 0.62, 0.76);
    float k = mix(1.0, 0.62, uLight);

    // four parallax layers, nearer = larger + faster rise
    col += dustLayer(auv * 2.6 + vec2(t * 0.010, t * 0.026), t, 11.0, 0.16, 0.26, 0.32, gold, ice) * 0.40 * k;
    col += dustLayer(auv * 4.6 + vec2(-t * 0.014, t * 0.040) + 3.7, t, 29.0, 0.09, 0.15, 0.45, gold, rose) * 0.50 * k;
    col += dustLayer(auv * 8.5 + vec2(t * 0.020, t * 0.060) + 8.1, t, 47.0, 0.045, 0.075, 0.62, ice, gold) * 0.62 * k;
    col += dustLayer(auv * 15.0 + vec2(-t * 0.026, t * 0.090) + 13.4, t, 71.0, 0.025, 0.042, 0.55, gold, ice) * 0.55 * k;

    // gentle cinematic vignette (dark mode only)
    col *= 1.0 - (1.0 - uLight) * 0.22 * pow(length(uv - 0.5) * 1.35, 2.0);
    return col;
  }

  /* ---------- dispatch + lens refraction ---------- */

  vec3 sceneColor(int id, vec2 cssPx) {
    vec2 view = uResolution / uDpr;
    vec2 uv = cssPx / view;
    float aspect = view.x / max(view.y, 1.0);
    vec2 auv = vec2(uv.x * aspect, uv.y);
    float t = uTime;

    vec3 col;
    if (id == 0)      col = sceneAurora(uv, auv, cssPx, t);
    else if (id == 1) col = sceneOcean(uv, auv, cssPx, t);
    else if (id == 2) col = sceneNebula(uv, auv, cssPx, t);
    else if (id == 3) col = sceneBokeh(uv, auv, cssPx, t);
    else if (id == 4) col = sceneButterflies(uv, auv, cssPx, t, aspect);
    else              col = sceneStardust(uv, auv, t);

    // micro-grain so the lens band always has fine detail to bend
    float n = vnoise(cssPx * 0.018) * 0.5 + vnoise(cssPx * 0.004);
    col += (n - 0.75) * mix(0.022, 0.012, uLight);
    return col;
  }

  vec3 wallpaper(vec2 cssPx) {
    vec3 col = sceneColor(uSceneA, cssPx);
    if (uSceneMix > 0.001) {
      col = mix(col, sceneColor(uSceneB, cssPx), uSceneMix);
    }
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

    // Chromatic dispersion along the displacement direction — only pay the
    // triple scene evaluation where the lens actually bends the image.
    vec2 delta = samplePos - cssPx;
    vec3 col;
    if (dot(delta, delta) > 0.2) {
      col.r = wallpaper(cssPx + delta * 1.07).r;
      col.g = wallpaper(cssPx + delta).g;
      col.b = wallpaper(cssPx + delta * 0.93).b;
    } else {
      col = wallpaper(samplePos);
    }
    col += highlight;

    gl_FragColor = vec4(col, 1.0);
  }
`;

type LensUniforms = {
  uResolution: { value: THREE.Vector2 };
  uDpr: { value: number };
  uTime: { value: number };
  uLight: { value: number };
  uSceneA: { value: number };
  uSceneB: { value: number };
  uSceneMix: { value: number };
  uLensCount: { value: number };
  uLensRect: { value: THREE.Vector4[] };
  uLensRadius: { value: Float32Array };
  uLensStrength: { value: Float32Array };
};

/* Module-level singleton: exactly one backdrop mounts per app, the module
   only loads client-side (dynamic ssr:false), and the uniform objects are
   mutated imperatively per frame — keeping them out of React state
   entirely is the cleanest fit for that access pattern. */
let sharedUniforms: LensUniforms | null = null;
let sharedMaterial: THREE.ShaderMaterial | null = null;

function getUniforms(): LensUniforms {
  sharedUniforms ??= {
    uResolution: { value: new THREE.Vector2(1, 1) },
    uDpr: { value: 1 },
    /* A pleasant composed moment for the reduced-motion still frame. */
    uTime: { value: 12 },
    uLight: { value: 1 },
    uSceneA: { value: 0 },
    uSceneB: { value: 0 },
    uSceneMix: { value: 0 },
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
  const scene = useLiquidGlassStore((s) => s.scene);
  const reducedMotion = useMemo(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const mountedScene = useRef(false);

  /* Theme-derived uniforms (light/dark). */
  useEffect(() => {
    const uniforms = getUniforms();
    uniforms.uLight.value = colorMode === "light" ? 1 : 0;
    invalidate();
  }, [colorMode, invalidate]);

  /* Scene selection — crossfade on change, hard-set on first mount. */
  useEffect(() => {
    const uniforms = getUniforms();
    const target = LG_SCENE_INDEX[scene];
    if (!mountedScene.current) {
      mountedScene.current = true;
      uniforms.uSceneA.value = target;
      uniforms.uSceneMix.value = 0;
      invalidate();
      return;
    }
    if (uniforms.uSceneA.value === target && uniforms.uSceneMix.value === 0) {
      return;
    }
    // If a fade is mid-flight, land it first so we always fade A → target.
    gsap.killTweensOf(uniforms.uSceneMix);
    if (uniforms.uSceneMix.value > 0) {
      uniforms.uSceneA.value = uniforms.uSceneB.value;
      uniforms.uSceneMix.value = 0;
    }
    if (uniforms.uSceneA.value === target) {
      invalidate();
      return;
    }
    uniforms.uSceneB.value = target;
    gsap.to(uniforms.uSceneMix, {
      value: 1,
      duration: 0.9,
      ease: "power2.inOut",
      onUpdate: invalidate,
      onComplete: () => {
        uniforms.uSceneA.value = target;
        uniforms.uSceneMix.value = 0;
        invalidate();
      },
    });
  }, [scene, invalidate]);

  /* Wake the demand frameloop whenever the registry changes. */
  useEffect(() => lensRegistry.subscribe(() => invalidate()), [invalidate]);

  /* Living wallpaper: self-ticking invalidation capped at ~30fps while the
     tab is visible. Reduced motion renders exactly one still frame. */
  useEffect(() => {
    if (reducedMotion) {
      invalidate();
      return;
    }
    let raf = 0;
    let last = 0;
    const loop = (ts: number) => {
      raf = requestAnimationFrame(loop);
      if (ts - last < 33) return;
      last = ts;
      invalidate();
    };
    const start = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      if (raf) {
        cancelAnimationFrame(raf);
        raf = 0;
      }
    };
    const onVisibility = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", onVisibility);
    start();
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [invalidate, reducedMotion]);

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
