import * as THREE from "three";
import { seededRandom } from "@/lib/garden/game";
import type { GardenAtmosphere } from "@/lib/garden/presentation";

/** One low-cost sky owner. No network textures, extra render loop or postprocessing. */
export function createGardenSky(scene: THREE.Scene) {
  const uniforms = {
    top: { value: new THREE.Color("#76b9df") },
    horizon: { value: new THREE.Color("#e2ece9") },
    bottom: { value: new THREE.Color("#c2dadd") },
    sunDirection: { value: new THREE.Vector3(0, 1, 0) },
    daylight: { value: 1 },
    twilight: { value: 0 },
    rain: { value: 0 },
  };
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms,
    vertexShader: `varying vec3 direction; void main() { direction = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`,
    fragmentShader: `varying vec3 direction;
      uniform vec3 top, horizon, bottom, sunDirection;
      uniform float daylight, twilight, rain;
      void main() {
        vec3 d = normalize(direction);
        vec3 c = mix(horizon, top, pow(clamp(d.y * .8 + .12, 0., 1.), .65));
        c = mix(c, bottom, (1. - smoothstep(-.85, -.05, d.y)));
        float sun = max(0., dot(d, sunDirection));
        c += vec3(1., .73, .4) * (pow(sun, 1400.) * .8 + pow(sun, 22.) * .12) * daylight * (1. - rain);
        float moon = max(0., dot(d, -sunDirection));
        c += vec3(.62,.76,1.) * (smoothstep(.9992,.9995,moon) * .7 + pow(moon,60.) * .035) * (1. - daylight);
        gl_FragColor = vec4(c, 1.);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const geometry = new THREE.SphereGeometry(180, 32, 16);
  const dome = new THREE.Mesh(geometry, material);
  dome.name = "Open sky · sun and moon";
  dome.frustumCulled = false;
  dome.renderOrder = -10;
  scene.add(dome);

  const rng = seededRandom(9152026),
    cloudGeo = new THREE.SphereGeometry(1, 16, 10);
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: "#f5f5ee",
    roughness: 1,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  const clouds = new THREE.InstancedMesh(cloudGeo, cloudMaterial, 42);
  clouds.name = "Seven drifting cloud banks";
  clouds.frustumCulled = false;
  const cloudSeeds = Array.from({ length: 7 }, (_, i) => ({
    angle: (i / 7) * Math.PI * 2 + 0.15,
    radius: 39 + rng() * 27,
    height: -5 + rng() * 12,
    size: 1.8 + rng() * 1.9,
    phase: rng() * 6,
  }));
  const transform = new THREE.Object3D();
  scene.add(clouds);

  const starGeo = new THREE.BufferGeometry(),
    starPositions: number[] = [];
  for (let i = 0; i < 420; i++) {
    const a = rng() * Math.PI * 2,
      h = -0.09 + rng() * 1.08,
      r = Math.sqrt(1 - h * h);
    starPositions.push(Math.cos(a) * r * 140, h * 140, Math.sin(a) * r * 140);
  }
  starGeo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(starPositions, 3),
  );
  const starMaterial = new THREE.PointsMaterial({
    color: "#dce8ff",
    size: 0.3,
    fog: false,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    toneMapped: false,
  });
  const stars = new THREE.Points(starGeo, starMaterial);
  stars.name = "Night stars";
  scene.add(stars);

  const rainGeo = new THREE.BufferGeometry(),
    rainPositions = new Float32Array(180 * 6);
  const rainSeeds = Array.from({ length: 180 }, () => ({
    x: (rng() - 0.5) * 29,
    z: (rng() - 0.5) * 24,
    y: rng() * 9,
  }));
  rainGeo.setAttribute("position", new THREE.BufferAttribute(rainPositions, 3));
  const rainMaterial = new THREE.LineBasicMaterial({
    color: "#d4e5ec",
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const rain = new THREE.LineSegments(rainGeo, rainMaterial);
  rain.name = "Gentle island rain";
  rain.frustumCulled = false;
  scene.add(rain);
  const top = new THREE.Color(),
    horizon = new THREE.Color(),
    bottom = new THREE.Color(),
    neutral = new THREE.Color("#778eaa");
  const nightTop = new THREE.Color("#091329"),
    dayTop = new THREE.Color("#65aee1"),
    nightHorizon = new THREE.Color("#1d3459"),
    dayHorizon = new THREE.Color("#bad9ec"),
    sunset = new THREE.Color("#e5b8a0");
  let daylight = 1,
    rainAmount = 0;
  return {
    update(
      atmosphere: GardenAtmosphere,
      time: number,
      dt: number,
      reduced: boolean,
      camera: THREE.Camera,
    ) {
      const blend = dt === 0 ? 1 : 1 - Math.exp(-dt * 0.8);
      daylight = THREE.MathUtils.lerp(daylight, atmosphere.daylight, blend);
      rainAmount = THREE.MathUtils.lerp(
        rainAmount,
        atmosphere.weather === "rain" ? 1 : 0,
        blend,
      );
      top.copy(nightTop).lerp(dayTop, atmosphere.daylight);
      horizon
        .copy(nightHorizon)
        .lerp(dayHorizon, atmosphere.daylight)
        .lerp(sunset, atmosphere.twilight * 0.55);
      const overcast =
        atmosphere.weather === "rain"
          ? 0.65
          : atmosphere.weather === "cloudy"
            ? 0.32
            : atmosphere.weather === "mist"
              ? 0.2
              : 0;
      top.lerp(neutral, overcast);
      horizon.lerp(neutral, overcast * 0.4);
      bottom.copy(horizon).lerp(top, 0.23);
      uniforms.top.value.lerp(top, blend);
      uniforms.horizon.value.lerp(horizon, blend);
      uniforms.bottom.value.lerp(bottom, blend);
      uniforms.daylight.value = daylight;
      uniforms.rain.value = rainAmount;
      const angle = ((atmosphere.hour - 6) / 24) * Math.PI * 2;
      uniforms.sunDirection.value
        .set(Math.cos(angle) * 0.7, Math.sin(angle), -0.45)
        .normalize();
      // Keep the illustrated moon above the horizon in the garden framing.
      if (atmosphere.night)
        uniforms.sunDirection.value.set(0.26, -0.025, 0.96).normalize();
      dome.position.copy(camera.position);
      starMaterial.opacity = (1 - daylight) * 0.75 * (1 - overcast);
      stars.visible = starMaterial.opacity > 0.01;
      stars.position.copy(camera.position);
      cloudMaterial.color
        .set("#8b9bab")
        .lerp(new THREE.Color("#fbf7ec"), daylight);
      for (let i = 0; i < 7; i++) {
        const c = cloudSeeds[i],
          drift = reduced ? 0 : time * 0.0018;
        for (let j = 0; j < 6; j++) {
          const a = c.angle + drift;
          transform.position.set(
            Math.cos(a) * c.radius + (j - 2.5) * c.size * 1.2,
            c.height + Math.sin(j * 1.9 + c.phase) * c.size * 0.25,
            Math.sin(a) * c.radius + Math.cos(j) * c.size * 0.35,
          );
          transform.scale.set(
            c.size * (1 + Math.sin(j + 1) * 0.2),
            c.size * (0.35 + Math.abs(Math.sin(j * 2)) * 0.26),
            c.size * 0.82,
          );
          transform.updateMatrix();
          clouds.setMatrixAt(i * 6 + j, transform.matrix);
        }
      }
      clouds.instanceMatrix.needsUpdate = true;
      rainMaterial.opacity = rainAmount * 0.4;
      rain.visible = rainAmount > 0.015 && !reduced;
      if (rain.visible) {
        for (let i = 0; i < rainSeeds.length; i++) {
          const seed = rainSeeds[i],
            y = (((seed.y - time * 6) % 9) + 9) % 9;
          rainPositions.set(
            [
              seed.x + y * 0.12,
              y + 0.2,
              seed.z,
              seed.x + y * 0.12 - 0.07,
              y + 0.72,
              seed.z,
            ],
            i * 6,
          );
        }
        rainGeo.attributes.position.needsUpdate = true;
      }
      return { daylight, rain: rainAmount, horizon: uniforms.horizon.value };
    },
    dispose() {
      [dome, clouds, stars, rain].forEach((o) => scene.remove(o));
      [geometry, cloudGeo, starGeo, rainGeo].forEach((g) => g.dispose());
      [material, cloudMaterial, starMaterial, rainMaterial].forEach((m) =>
        m.dispose(),
      );
    },
  };
}
