# Phone tilt control — research and local implementation

Requested 2026-09-08 (America/Indiana/Indianapolis). Execution: local source implementation. Joystick remains the default; phone tilt is an optional, initially off switch in Garden settings. Turning tilt on never removes the joystick. User follow-up additionally requested three-axis, continuous movement in arbitrary directions; pitch, roll and relative yaw are all processed. No deployment or live database changes are included.

## Research and design

The web Device Orientation API exposes high-level orientation derived from available sensors (commonly accelerometers and gyroscopes). Holding a fixed angle should hold a speed, so this implementation uses orientation, not an integral of raw gyroscope rotation rates. No geographic-north alignment is required. Relative readings are converted into gravity in device coordinates, then into the current screen coordinates; this handles portrait, either landscape direction, and inverted portrait without assuming that browser Euler axes change with the screen. [W3C Device Orientation and Motion](https://www.w3.org/TR/orientation-event/)

Access is opt-in through a switch click and requires a secure context (HTTPS for a real phone; localhost qualifies for local validation). Feature detection supports browsers with or without the static permission method. Both orientation and optional motion permission requests are invoked synchronously during the click. A cancellation generation prevents a late permission response from re-enabling controls. [MDN requestPermission](https://developer.mozilla.org/en-US/docs/Web/API/DeviceOrientationEvent/requestPermission_static)

Device orientation coordinates and signs are defined relative to the device's natural axes; screen rotation must be applied separately. Lowering the top edge relative to the neutral grip produces negative camera-relative z (forward); raising it moves back. A full three-axis quaternion supplies relative fused yaw. Horizontal phone rotation rotates the analogue movement vector continuously through 360 degrees, then the existing simulation applies camera yaw. Pure yaw at the neutral tilt does not start walking. Undefined heading (for example a fully face-down device) holds the last heading while two-axis tilt remains available. [MDN orientation coordinates](https://developer.mozilla.org/en-US/docs/Web/API/Device_orientation_events/Orientation_and_motion_data_explained)

Fused yaw uses `wrap(2 * atan2(q.z, q.w))`, screen-angle correction and shortest-arc smoothing. This keeps heading continuous through an upright grip, avoiding the 180-degree direction flip that top-edge projection can produce near vertical. [Allgeuer and Behnke, IROS 2015, equation 36](https://www.ais.uni-bonn.de/papers/IROS_2015_Allgeuer.pdf)

The specification limits angle precision to 0.1 degrees and recommends an event-change threshold no larger than 1 degree. These are not a hardware guarantee. The implementation responds to sub-degree values when delivered, but the minimum reliable movement on a particular phone still requires a physical-device test. Browsers may emit orientation only on change, so valid motion events are used as a freshness heartbeat while the orientation is held steady. [W3C orientation event algorithm](https://www.w3.org/TR/orientation-event/#deviceorientation)

## Implemented behavior

- Joystick and keyboard behavior remain available. Tilt starts off each visit/reload; only sensitivity is saved locally.
- Enable from Garden settings, resume, then hold a comfortable position for 450 ms. A bounded stable window establishes neutral. Recenter after changing grip.
- Balanced: 0.6° radial dead zone, full ordinary run speed at 18° relative tilt. Sensitive: 0.3° / 12°. Gentle: 0.9° / 26°.
- Continuous response: `speed = min(1, (angle - deadZone) / (fullTilt - deadZone)) ^ 0.85`. Direction and analogue magnitude are preserved. Diagonals do not exceed the normal speed cap; existing dash stays separate.
- A 35–65 ms frame-time-based filter suppresses tremor; returning within the neutral dead zone zeroes sensor input immediately. Existing character acceleration provides the final braking/acceleration response.
- Joystick touch (even centered) or movement keys take priority over tilt. Precise input cancels tap-to-walk/approach paths even below the former joystick cancellation threshold.
- Pause, backgrounding, observation mode and pond interaction suspend tilt. Resume, rotation and sensor reconnection require a new neutral calibration. A 1.2-second loss of sensor freshness zeroes input. Invalid/null readings cannot move the character.
- Permission denial, unavailable sensors, insecure origins and timeouts explain the fallback. Orientation/motion listeners are removed on disable, leave and unmount. Sensor readings remain in memory on the device.

## Source scope

- `app/src/lib/garden/tilt.ts`: pure coordinate mapping, calibration, smoothing, continuous speed, freshness.
- `app/src/hooks/use-garden-tilt.ts`: browser permissions and sensor lifecycle.
- `app/src/components/garden/GardenTiltControls.tsx`: settings switch, sensitivity, recenter/status.
- `app/src/components/garden/GardenAdventure.tsx`: optional input integration and joystick priority.
- `app/src/components/garden/garden-adventure.module.css`: compact enabled-only controls and settings layout.
- `app/src/lib/garden/adventure.ts`: precise sensor movement can override auto-navigation below joystick dead-zone threshold.
- `app/src/lib/garden/tilt.test.ts`, `app/scripts/verify-garden-tilt.mjs`, `app/scripts/build-garden-tilt-verify.mjs`: verification.
- `app/.gitignore`: excludes the isolated `.next-tilt-verify` fixture build. Next's additions for this fixture were removed from the shared `tsconfig.json` after validation, preserving the other existing entries.
- `artifacts/garden-tilt/verify-final-layout.mjs`: final English/Traditional Chinese settings smoke check. Source hashes and the integration diff are in `source-manifest.json` and `integration.diff` in the same artifact folder.

Existing unrelated dirty files were preserved. `artifacts/garden-tilt/before/` records the touched pre-existing files before this task's edits.

## Validation receipt

- **32/32 focused tests passed**: calibration, tremor, 1° balanced and 0.5° sensitive inputs, monotonic speed, all screen rotations, stale/invalid data, pause/recenter, motion heartbeats, precise auto-navigation cancellation, 360° yaw in 5° increments, combined diagonal tilt/yaw, 359° → 0° wrap, upright heading, three complete turns, and existing Garden/collision regressions. Log: `artifacts/garden-tilt/tests.log`.
- **Scoped TypeScript and ESLint passed.** The optimized Garden build independently runs the complete transitive Garden typecheck before compilation. Logs: `artifacts/garden-tilt/typecheck.log`, `lint.log`, `build.log`.
- **Optimized Next Garden build passed**, with Garden, dashboard, settings and pets route output, isolated loopback account endpoints and no production credentials used for fixture requests. This is not a full-site release build or deployed artifact.
- **16 browser check groups passed** against that optimized build, including joystick as default, settings opt-in, permission user activation, real character movement/speed, joystick override, pause/recalibration, sensitivity, sensor interruption, portrait/landscape, right-handed layout, setting persistence, denied/unsupported/insecure/no-data cases, cancellation of late permission, native CDP sensor dispatch, and Traditional Chinese settings. `artifacts/garden-tilt/browser/results.json` and `browser.log` contain the measurements.
- Native Chrome orientation emulation generated trusted events. A commanded **60° horizontal turn produced a 59.998° character path turn**, relative to the camera. Synthetic balanced 1°/5°/18° tilt produced approximately **0.170 / 1.300 / 4.194 world units/second**. These verify the input path and response curve, not physical sensor accuracy.
- Screenshots: `artifacts/garden-tilt/browser/phone-default-joystick.png`, `phone-tilt-running.png`, `phone-tilt-settings.png`, `landscape-tilt-running.png`, `landscape-right-joystick.png`, `phone-settings-zh.png`.
- Earlier development failures are retained under `artifacts/garden-tilt/browser/earlier-development-attempts/`; they are superseded by the passing final browser result. Explicit accessible names were added to the switch and sensitivity selector, with browser tests that locate those names. The fixture navigation timeout accommodates a cold Next development compile.

Commands (run from `/Users/ouxianxing/My_life_os/app`; the `GARDEN_NODE` variable is the existing Node 22 binary):

```sh
GARDEN_NODE=/Users/ouxianxing/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node
"$GARDEN_NODE" scripts/vitest-run-compatible.mjs src/lib/garden/tilt.test.ts src/lib/garden/adventure.test.ts src/lib/garden/adventure-collision.test.ts src/lib/garden/sky-garden.test.ts
"$GARDEN_NODE" node_modules/typescript/bin/tsc --project tsconfig.garden-verify.json --noEmit --pretty false
"$GARDEN_NODE" node_modules/eslint/bin/eslint.js src/hooks/use-garden-tilt.ts src/lib/garden/tilt.ts src/lib/garden/tilt.test.ts src/components/garden/GardenTiltControls.tsx src/components/garden/GardenAdventure.tsx src/lib/garden/adventure.ts
"$GARDEN_NODE" scripts/build-garden-tilt-verify.mjs
"$GARDEN_NODE" scripts/build-garden-tilt-verify.mjs serve
GARDEN_VERIFY_URL=http://127.0.0.1:3146 GARDEN_VERIFY_PGLITE=/private/tmp/garden-db-verify/node_modules/@electric-sql/pglite/dist/index.js "$GARDEN_NODE" scripts/verify-garden-tilt.mjs
```

The final UI copy additionally explains all three controls directly in settings, so phone users do not need a hover tooltip. Final layout verification passed in both English (390px) and Traditional Chinese (375px), recorded in `artifacts/garden-tilt/browser/final-layout.json`. Screenshots were inspected. The owned fixture server was stopped after validation. No pending approval remains for this local task.

## Physical-phone follow-up

Open the built application on a real HTTPS origin in Safari on iPhone and Chrome on Android. Enable in settings, resume and calibrate in a comfortable grip. Verify 1–2° movements, sensitive mode, steady-angle speed, neutral braking, both landscape directions, permission denial/retry, background/foreground, and joystick override. Physical sensor noise, OS permission UI and browser event frequency cannot be certified by desktop emulation.

Environment doctor detected Node 25 as the shell default; initial validation used Node 22.23.2 at `/private/tmp/garden-node22/node_modules/node/bin/node`. After a session refresh removed that temporary runtime, final validation used the existing same-version binary at `/Users/ouxianxing/.npm/_npx/52027bd8fc0022aa/node_modules/node/bin/node`. Vercel CLI is 54.18.3; upgrading with `npm i -g vercel@latest` is strongly recommended before future Vercel work. No global upgrade was performed.
