# Motion Plan: `/[locale]/knowledge-base/[itemId]/oracle`

## Route Purpose
Doc Oracle is a document-grounded workspace. Motion should clarify hierarchy and state changes without delaying reading, chat input, source navigation, or modals.

## GSAP Architecture
- Import `gsap`, `Flip`, and `ScrollTrigger` from `app/src/lib/motion/register-gsap.ts`; import `useGSAP` from `@gsap/react`.
- Call `registerGSAP()` once in the client component using motion so plugins are registered centrally.
- Scope all selectors to the workspace root ref.
- Use `gsap.matchMedia()` with:
  - `isMobile: (max-width: 767px)`
  - `isDesktop: (min-width: 768px)`
  - `reduceMotion: (prefers-reduced-motion: reduce)`
- Use `contextSafe` for event-created tweens if active tab/menu animations need callbacks.

## Allowed Motion
- Initial shell reveal: header + nav + active panel, `autoAlpha` and `y` only, 0.35-0.5s.
- Tab panel transition: active content fades/slides by 6-10px, 0.22-0.3s, no delay.
- Optional active nav indicator continuity using GSAP Flip if replacing the tab implementation.
- Below-fold overview card reveal may use batched opacity/y reveal, but only once and without pinning.
- Button press/hover remains CSS or tiny GSAP transform only if a shared primitive requires it.

## Disallowed Motion
- Scroll-jacking.
- Production ScrollTrigger markers.
- Infinite decorative tree-map loops near reading content.
- Animations that delay chat input, source jumps, generated image actions, or data mutation.
- Layout-affecting animation properties such as width, height, top, left, margin.

## Reduced Motion
- Set visible state immediately.
- Do not translate or scale content.
- Preserve focus outlines and loading indicators.
- Keep tab/content changes instant or opacity-only.

## QA
- Check `prefers-reduced-motion` in browser emulation.
- Switch every tab and confirm no stale inline transform blocks layout.
- Open page, visual, and glossary modals after tab transitions.
- Verify mobile composer input receives focus without animated offset.
- Confirm no console warnings from GSAP registration or hydration.
