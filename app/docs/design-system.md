# Design System Canon

The single source of truth for visual consistency. The app drifted into a
"not unified" feel because components bypassed the shared tokens and primitives
(hardcoded colors, ad-hoc shadows, competing surfaces). This doc records the
canonical choices so new work stays coherent. When in doubt, match this — not a
nearby file that may itself be an outlier.

## Surfaces

Decision: **glass is the canonical surface language** (it suits the animated
wallpaper that sits behind the protected layout).

- **Floating overlays** (Dialog, AlertDialog, Sheet, Popover) use the
  `.glass-modal-surface` class (defined in `globals.css`). It is
  theme-independent and ships a solid fallback for browsers without
  `backdrop-filter`. All four primitives in `src/components/ui/` already use it.
  Do not give an overlay a solid `bg-popover`/`bg-card` surface.
- **In-content surfaces** use `<GlassPanel>` (`src/components/ui/glass-panel.tsx`),
  which is driven by the `--surface-glass*` / `--border-glass*` / `--shadow-glass`
  tokens and falls back to transparent under non-`default` UI themes.
- **Plain content cards** use the shared `<Card>` (`src/components/ui/card.tsx`):
  `rounded-xl bg-card ring-1 ring-foreground/10`. Build feature cards on top of
  `<Card>` / `<EntityCard>` rather than hand-rolling `rounded-* border bg-*`
  divs.

Dark-mode note: `.glass-modal-surface` is intentionally translucent in dark mode
(relies on blur). If a large surface reads too see-through over the wallpaper,
raise the dark `background` alpha in the `.dark .glass-modal-surface` rule — do
not swap in a solid color per-component.

## Accent color — keep both, by role

The app has two accents. Keep both, but apply them by role so the split is
intentional, not random:

- **`--primary` (blue)** — standard interactive controls: `<Button>`, links,
  form focus rings, checkboxes/toggles, and anything built on the shadcn
  primitives. This is the "action" color per `globals.css`.
- **Lime (`lime-300/700`)** — the "OS" flavor: OS segmented controls / tabs
  (`os-primitives.tsx`), `OSEmptyState`, and OS-styled chrome. Use lime only on
  these OS-flavored surfaces.

Rules of thumb:
- A `<Button>` or link is **never** lime.
- An OS tab/segmented control or `OSEmptyState` keeps **lime**.
- The brand green `#00a85f` (`--life-os-brand`) is reserved for the logo/wordmark
  only — not for UI accents.
- Do not introduce a third interactive accent.

## Tokens, not hardcodes

Prefer tokens so theme variants (astronaut / academia / forest) and dark mode
keep working:

- Colors: `bg-card`, `bg-background`, `bg-muted`, `text-foreground`,
  `text-muted-foreground`, `border-border`, `ring-foreground/10`, `bg-primary`,
  `text-destructive`. Avoid raw `slate-*`, `bg-white/NN`, and arbitrary hex
  (`bg-[#0c2344]`) in shared/reused components.
- Radius: `rounded-lg` / `rounded-xl` / `rounded-2xl` (or the `--radius-*`
  tokens). Avoid arbitrary `rounded-[1.15rem]`-style values.
- Elevation: prefer `shadow-sm` / `shadow-md` over bespoke
  `shadow-[0_10px_30px_rgba(...)]` strings.

## Overlays & popups

- Always use the shared `Dialog` / `Sheet` / `AlertDialog` / `Popover`
  primitives. They provide Escape-to-close, focus trap, scroll lock, and the
  glass surface for free.
- **Never** use `window.confirm` / `window.alert` for user-facing flows — use
  `<AlertDialog>` for confirms and a `toast` (sonner) for transient notices.
- Footer button order: trailing/primary action on the right on desktop
  (`AlertDialog` uses `flex-col-reverse … sm:flex-row sm:justify-end`, which is
  the intended responsive pattern — keep it).
- Hand-rolled portals (lightboxes, fullscreen viewers) must add their own
  Escape handler + `document.body.style.overflow = "hidden"` scroll lock.

## Z-index ladder

De-facto scale; stay within it:

- content / sticky chrome: `z-10`–`z-30`
- FABs: `z-40`
- modals / sheets / popovers: `z-50`
- toasts (sonner): renders at `999999999` (above modals by design)
- OS Buddy dock + its active overlays: very high (`~2.1e9`). This intentionally
  floats above everything; revisit only if it visibly obstructs a modal.

## Loading & empty states

The app uses **graceful progressive loading**: pages render their structure with
`data ?? null|[]` fallbacks and each section self-manages its own query/loading.
Reuse `LoadingCards` / `LoadingPage` (`src/components/shared/loading-state.tsx`)
and `Skeleton` when a full-page guard is appropriate; don't replace a
progressively-loading page with one big skeleton gated on a single query.

There are two empty-state components — `EmptyState`
(`src/components/shared/empty-state.tsx`) and `OSEmptyState`
(`src/components/ui/os-primitives.tsx`, lime/OS-flavored). Pick `OSEmptyState`
for OS-styled surfaces, `EmptyState` elsewhere; don't hand-roll a third.

## i18n

User-facing strings come from the `getXyzUiCopy(language)` packs in
`src/lib/i18n/`. Reuse existing keys (e.g. a shared `cancel` / `buttonCancel`)
rather than hardcoding English — the app ships nine languages.
