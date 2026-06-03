# Global Motion System

## Purpose
Create a reusable, premium GSAP motion layer for the My Best Life OS app without changing product behavior, data flows, auth, routing, or responsive layout. The system should make the app feel alive, calm, precise, and emotionally warm.

## Motion personality
- Calm, premium, precise, emotionally warm.
- Fast enough to preserve productivity.
- Clear enough to explain hierarchy and state changes.
- Restrained enough that the product feels useful, not theatrical.

## Non-goals
- No scroll-jacking.
- No heavy WebGL or 3D added for decoration.
- No endless decorative loops beside core content.
- No page-specific GSAP snippets buried in business logic.
- No animation that delays reading, navigation, form input, auth, or data mutation.

## Timing tokens
| Token | Duration | Use |
| --- | ---: | --- |
| instant feedback | 0.12s-0.2s | press, focus, small confirmation |
| hover/tap feedback | 0.18s-0.28s | cards, buttons, nav rows |
| small reveal | 0.35s-0.5s | cards, empty states, utility panels |
| page/section entrance | 0.45s-0.7s | page shell, headers, primary sections |
| hero/story sequence | 0.7s-1.1s | login/share/dashboard feature moments only |
| scroll scrub | page-specific | only when it helps comprehension |

## Easing tokens
- `power2.out`: default card/section reveal.
- `power3.out`: premium header/hero arrival.
- `power2.inOut`: state transitions and route continuity.
- `none`: scrubbed scroll progress only.

## Transform distances
- Small reveal: `y: 12-24`.
- Section reveal: `y: 24-40`.
- Card cascade: `y: 16-28`, `stagger: 0.04-0.08`.
- Avoid large panning unless the page has a dedicated reduced-motion fallback.

## Architecture
- `app/src/lib/motion/register-gsap.ts`: client-safe plugin registration.
- `app/src/lib/motion/config.ts`: feature flag and runtime defaults.
- `app/src/lib/motion/easings.ts`: named GSAP easing strings.
- `app/src/lib/motion/presets.ts`: reusable durations, reveal defaults, and selectors.
- `app/src/lib/motion/reduced-motion.ts`: browser reduced-motion helpers.
- `app/src/hooks/useReducedMotion.ts`: React hook for motion preference.
- `app/src/components/motion/*`: scoped GSAP React components.

## React and Next.js rules
- Use `@gsap/react` and `useGSAP()` for React components.
- Register plugins once through the shared registration module.
- Scope all selector text to a local ref.
- Use `contextSafe` for event-created animations.
- Keep GSAP execution inside client components and hooks.
- Use `revertOnUpdate` for route transitions keyed by pathname.

## Reduced-motion strategy
- Respect `prefers-reduced-motion: reduce`.
- If reduced motion is active, remove y/scale/pin/scrub/parallax effects.
- Use static rendering or short opacity-only feedback.
- Disable custom cursor, magnetic, and decorative ambient effects on touch and reduced motion.
- Keep focus, errors, success messages, loading states, and route changes visible without relying on motion.

## Feature flag and rollback
Set `NEXT_PUBLIC_ENABLE_PREMIUM_MOTION=false` to disable the GSAP layer. Shared motion components should render children statically when disabled. Page-specific animation should be isolated so individual pages can opt out without changing product logic.

## ScrollTrigger guidance
- Use trigger-based reveal for below-fold sections.
- Use `ScrollTrigger.batch()` for repeated cards when needed.
- Avoid one trigger per small row in long lists.
- Avoid pinning in editing, detail, auth, settings, and form flows.
- Remove markers in production; default config must not include `markers: true`.

## Plugin guidance
- Core + timelines: page, section, and state sequencing.
- ScrollTrigger: below-fold reveal and rare storytelling sections.
- Flip: active nav indicators, tabs, selected cards, reordered lists, dashboard widgets.
- SplitText: only for premium hero/title moments where semantics remain accessible.
- Observer, Draggable, MotionPath, ScrambleText: not part of the initial foundation unless a later page plan justifies them.

## Reference Motion Examples
Use these as inspiration, not as clones.
- GSAP Showcase: scroll rhythm, text reveal polish, UI restraint, and sequencing.
- GSAP Demo Hub: magnetic buttons, batched reveals, card stacks, and scrubbed gallery mechanics as isolated patterns.
- Awwwards GSAP examples: landing-page pacing and section transitions, filtered through product usability.
- Apple-style product storytelling: one idea per section, high contrast between quiet and dramatic moments, no unnecessary interface friction.

## Success criteria
- Every route has an independent plan in this directory.
- GSAP registration is centralized.
- Shared utilities/components prevent duplicated animation code.
- Animations are scoped, cleaned up, responsive, and reduced-motion aware.
- Core flows continue to work.
- No production ScrollTrigger markers.
- No console errors or hydration warnings from motion code.
