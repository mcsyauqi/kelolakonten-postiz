# Design

## Visual Theme

Active marketing direction follows the approved live Kelola Konten concept: an airy near-white canvas, navy ink, and blue identity, with a faint grid behind the centered hero and dark reporting/footer panels for rhythm.

## Color Palette

- Canvas #FBFCFE
- Ink #172338
- Ink secondary #454C5C
- Muted #676E7B
- Line #E1E5EC
- Brand blue #1E5BD8
- Blue soft #B3CCFF
- Blue pale #DCE6FB
- Dark panel #161E2D
- Footer #14213B
- Button dark #1B2A4A
- Surface bar #EDF0F5

## Typography

Figtree is the body/UI face. Be Vietnam Pro is the display face and is self-hosted as the local `bvp-400-latin.woff2` asset. Display text uses balanced wrapping, 40–76px fluid scale, 1.1 line-height, and -0.02em tracking. Body uses 16–18px with 1.4 line-height. Besley/Gantari are archived direction assets and are not active on marketing routes.

## Components

Use the reusable definitions in `website/design-system/component-catalog.md`, CSS variables in `website/design-system/tokens.css`, and machine-readable values in `website/design-system/tokens.json`. The original mark is under `website/design-system/brand-assets/` and mirrored in `marketing/public/brand/`.

## Responsive Behavior

The header is 73px desktop and 69px mobile. Hero is 660px at 1440 and 556px at 390. Feature cards use two columns on desktop, one on mobile. Resources become a snap carousel below 1024. Test at 1440 and 390 for overflow, focus, menu, forms, and readable illustration copy.

## Motion

Use short tile lift and arrow nudge transitions; no content should depend on scroll or animation. Disable transforms and animations for reduced motion.
