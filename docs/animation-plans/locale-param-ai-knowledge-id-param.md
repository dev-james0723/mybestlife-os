# Animation Plan: Ai Knowledge id

## Route
`/[locale]/ai-knowledge/[id]`

## Page purpose
Manages AI prompt folders, prompt creation, prompt detail, and run workflows.

## Current static-feeling issues
- Page changes can feel like hard content swaps because the shared shell has limited route-level transition.
- Dense cards, lists, forms, or panels often appear all at once, which flattens hierarchy.
- State changes such as loading, empty, saving, filtering, and errors can feel abrupt unless handled by the feature component.

## Desired emotional feel
curious, precise, intelligent, and exploratory.

## Proposed entrance animations
- Route wrapper fades and lifts the page content by 12-18px using the central PageTransition component.
- Detail content enters before secondary panels so the primary object is usable first.
- Cards/lists use a batched reveal with small y movement and a 0.04-0.06 stagger.

## Proposed scroll animations
- Use the shared reveal component for below-fold sections, once per element, scoped to the page container.
- Prefer ScrollTrigger.batch for repeated cards; avoid one trigger per row in long lists.
- Avoid pinning on detail pages so reading, editing, and back-navigation remain natural.

## Proposed hover/tap/focus microinteractions
- Buttons: 120-180ms transform/opacity feedback with focus rings preserved.
- Forms: validation and success messages fade in immediately with no layout surprise.
- Lists/cards: later phases can use Flip for selection, filtering, reordering, or completion state changes.

## Proposed page transition behavior
- Use the central route transition wrapper keyed by pathname, with opacity plus small y movement.
- Keep content available immediately; the animation should polish arrival rather than gate access.
- For reduced motion, render instantly or use a 120ms opacity-only change.

## Proposed empty/loading/error state motion
- Loading states keep skeletons visible immediately; optional shimmer must stop under reduced motion.
- Empty states use a single icon/card entrance and a clear CTA reveal.
- Error states appear with opacity only and are not communicated by motion alone.

## Exact components/files likely touched
- `app/src/app/[locale]/(protected)/ai-knowledge/[id]/page.tsx`
- `app/src/components/motion/*`
- `app/src/lib/motion/*`
- `app/src/components/protected-scroll-layout.tsx`
- `app/src/components/ai-knowledge/**`

## GSAP plugins needed
- GSAP core
- @gsap/react useGSAP
- ScrollTrigger for batched section reveal only when content scrolls
- Flip for selected card, tab, or reordered-list transitions in later phases

## Accessibility/reduced-motion fallback
- Respect `prefers-reduced-motion: reduce` through the central motion helper and `gsap.matchMedia()`.
- Disable y/scale/parallax/pin effects; keep opacity-only or static state changes.
- Preserve keyboard focus order and visible focus rings.
- Do not use motion as the only signal for success, warning, or error states.

## Performance risks
- Large lists or charts can create too many simultaneous tweens if reveal selectors are too broad.
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
