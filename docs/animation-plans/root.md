# Animation Plan: Root Redirect

## Route
`/`

## Page purpose
Routes visitors into the localized dashboard experience; animation should stay effectively invisible because the page redirects.

## Current static-feeling issues
- Page changes can feel like hard content swaps because the shared shell has limited route-level transition.
- Dense cards, lists, forms, or panels often appear all at once, which flattens hierarchy.
- State changes such as loading, empty, saving, filtering, and errors can feel abrupt unless handled by the feature component.

## Desired emotional feel
calm, premium, legible, and purposeful.

## Proposed entrance animations
- No visible animation; redirect immediately to the localized dashboard.
- If a fallback ever renders, use a simple static state with no delayed transition.

## Proposed scroll animations
- No ScrollTrigger needed.

## Proposed hover/tap/focus microinteractions
- Buttons: 120-180ms transform/opacity feedback with focus rings preserved.
- Cards: hover lift is subtle, disabled on touch and reduced motion.
- Links and secondary controls should use quiet opacity/color changes rather than decorative movement.

## Proposed page transition behavior
- Use the central route transition wrapper keyed by pathname, with opacity plus small y movement.
- Keep content available immediately; the animation should polish arrival rather than gate access.
- For reduced motion, render instantly or use a 120ms opacity-only change.

## Proposed empty/loading/error state motion
- Loading states keep skeletons visible immediately; optional shimmer must stop under reduced motion.
- Empty states use a single icon/card entrance and a clear CTA reveal.
- Error states appear with opacity only and are not communicated by motion alone.

## Exact components/files likely touched
- `app/src/app/page.tsx`
- `app/src/components/motion/*`
- `app/src/lib/motion/*`

## GSAP plugins needed
- GSAP core
- @gsap/react useGSAP

## Accessibility/reduced-motion fallback
- Respect `prefers-reduced-motion: reduce` through the central motion helper and `gsap.matchMedia()`.
- Disable y/scale/parallax/pin effects; keep opacity-only or static state changes.
- Preserve keyboard focus order and visible focus rings.
- Do not use motion as the only signal for success, warning, or error states.

## Performance risks
- Small page, low risk if animation stays at the wrapper/section level.
- Route entrance must not delay interactive controls or cause hydration differences.
- Avoid animating layout properties such as height, width, top, left, margin, or padding.

## Implementation checklist
- [ ] Confirm page-specific selectors are scoped to a local ref.
- [ ] Use shared motion presets instead of one-off timing.
- [ ] Add reduced-motion branch and central kill-switch behavior.
- [ ] Test desktop route navigation.
- [ ] Test mobile route navigation.
- [ ] Test with reduced motion enabled.
- [ ] Check console for hydration, GSAP, or ScrollTrigger warnings.
- [ ] Confirm no production ScrollTrigger markers.

## Page-specific success criteria
- The primary content is readable and interactive immediately.
- Motion clarifies page hierarchy without making the workflow feel slower.
- Layout does not jump during entrance or reveal animations.
- Reduced-motion users receive the same content and state clarity.

## Rollback/exit notes
- Disable page animation via `NEXT_PUBLIC_ENABLE_PREMIUM_MOTION=false` or remove this route from the shared motion wrapper.
- Revert page-specific imports first; shared motion utilities can remain unused without affecting product behavior.
- Avoid embedding GSAP calls in business logic so this page can return to static rendering cleanly.
