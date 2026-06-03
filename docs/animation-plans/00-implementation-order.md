# Implementation Order

## Phase 1: Motion foundation
- Install `gsap` and `@gsap/react`.
- Add central config, registration, reduced-motion helpers, and shared components.
- Wire one protected route transition wrapper behind `NEXT_PUBLIC_ENABLE_PREMIUM_MOTION`.

## Phase 2: Shared components
- Page transition wrapper.
- Reveal and stagger wrappers.
- Magnetic button for selective primary CTAs.
- Animated counter for dashboards and analytics.

## Phase 3: Highest-impact pages
- Dashboard.
- Login.
- Habits.
- Journal.
- Analytics.

## Phase 4: Remaining pages by domain
- Command Center pages.
- Self/reflection pages.
- Career pages.
- Knowledge pages.
- Resources/vault pages.
- Relationship pages.

## Phase 5: QA and cleanup
- Run lint and build.
- Smoke test desktop and mobile route transitions.
- Verify reduced motion.
- Check console for GSAP, ScrollTrigger, and hydration warnings.
- Confirm no `markers: true` remains.

## Safe partial exit
If full page animation becomes risky, stop with documentation, foundation, shared route transition, and one or two high-impact pages. The remaining page files already contain checklists for later implementation.
