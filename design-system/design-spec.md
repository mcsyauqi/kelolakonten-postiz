# Kelola Konten design system

## Source of truth

The active marketing source is the live concept page at https://konsep.mcsyauqi.com/kelola-konten/ (verified HTTP 200 on 4 October 2026). The local replicas and screenshots under `D:/Projects/Creativism App/temp/design-concepts/replika/kelola-konten/` are comparison evidence only. `temp/design-concepts/kelolakonten-final.md` and `/konsep-awal/` describe an archived green “Buku Rapor Akun” direction and must not drive the active marketing palette or layout.

The concept is a Buffer-like social workspace with Kelola-specific Indonesian copy and assets. Copy, logo, imagery, and source code from the concept are not to be copied into production. This system records its structural decisions so production pages can be original implementations.

## Brand intent

Kelola Konten should feel clear, capable, and approachable for Indonesian UMKM owners, creators, and SMM agencies. The visual voice is an airy social-workspace: a quiet off-white canvas, deep navy ink, one committed blue action color, and interface tiles that make multi-platform work visible at a glance.

## Active type system

The live concept uses Figtree for body/UI and a local Be Vietnam Pro font file exposed as “KK Display” for display headings. Production should self-host the approved font files, with system fallbacks. Do not activate Besley/Gantari on the marketing surface; those belong to the archived green concept direction and create a different register.

- Display: Be Vietnam Pro, 400, fluid 40–76px, line-height 1.10, letter-spacing -0.02em, balanced wrapping.
- Body/UI: Figtree, 300–900, fluid 16–18px body, 14–16px supporting text, line-height 1.4.
- Labels: Figtree 500–700, short uppercase labels only where a feature category needs a marker. Do not repeat a numbered “01/02/03” scaffold above sections.

## Active color tokens

| Token | Value | Usage |
|---|---|---|
| Canvas | `#FBFCFE` | page background, header, open space |
| Ink | `#172338` | headings, primary text, controls |
| Ink secondary | `#454C5C` | body text on Canvas |
| Muted | `#676E7B` | helper copy, legal notes; verify contrast before use |
| Line | `#E1E5EC` | dividers and quiet borders |
| Brand blue | `#1E5BD8` | mark, platform tiles, links, focus |
| Blue soft | `#B3CCFF` | primary CTA fill on light surfaces |
| Blue pale | `#DCE6FB` | selected states, message bubbles, light data surfaces |
| Dark panel | `#161E2D` | reporting panel and dark CTA surfaces |
| Footer | `#14213B` | footer background |
| Button dark | `#1B2A4A` | dark CTA on Blue soft |
| Surface bar | `#EDF0F5` | platform band and neutral surfaces |

Do not introduce the archived green tokens (`#17392F`, `#0E241D`, `#9FD4FF`) into active marketing pages. Do not use gradients for the brand field, yellow, pink, or invented status colors. Platform logos may retain their official colors inside their own labelled tile.

## Layout and rhythm

- Desktop shell: 36px side gutter at 1440, max content width about 1353px; 12-column logic with 18–24px gutters.
- Header: sticky 73px at desktop, 69px at mobile. Desktop nav has logo, five destination links, log-in outline, and blue-soft waitlist CTA. Mobile keeps logo, waitlist CTA, and a 40px menu control.
- Hero: one centered message over a faint 54px grid; 1440 hero height 660px, 390 hero height 556px. Display heading is about 76px desktop and 40–46px mobile. The form is a 634px pill on desktop and stacked 256px controls on mobile.
- Sections: generous fluid vertical spacing (`--section`), alternating white and dark panels. Core feature cards use two columns at desktop and one at mobile; secondary resources become a horizontal snap carousel below tablet widths.
- Cards: 20px radius is reserved for concept cards and panels; avoid nested card stacks. Buttons are pill-shaped only where the source concept uses a form/CTA; use 8–12px radius for utility controls and content cards.
- Dark reporting panel: two-column desktop, stacked under 1024px. Keep copy at readable sizes; do not scale embedded UI text below 12px.
- Footer: dark navy, multi-column desktop, two-column mobile, visible legal and source links.

## Interaction and states

Waitlist forms must show idle, invalid email, pending, success, and server error states with `aria-live` feedback. Primary buttons must retain a visible focus ring. Menu control exposes its expanded state and reveals links in DOM order. Resource cards are links with hover/focus affordance. Platform/API claims must be labelled by availability and audit status; never imply YouTube/TikTok automatic publishing before audit approval.

Motion should be short and purposeful: tile lift up to 3px, arrow nudge up to 3px, and no scroll-gated content. Respect `prefers-reduced-motion: reduce` by removing transform/animation.

## Content and ownership

Use original Indonesian copy for Kelola Konten. Keep uncertain pricing, support-hour, and roadmap statements labelled as planned or under preparation. Use “dirancang dari kebutuhan tim SMM Creativism” until internal-use status is confirmed. Do not claim active metrics, client logos, testimonials, or platform approval without an evidence link.

## Accessibility gates

- Body and CTA text must meet WCAG AA contrast.
- Keyboard focus must be visible at 3px or stronger with 2px offset.
- Touch controls are at least 40px, and form controls 44px where practical.
- Maintain no horizontal overflow at 1440px and 390px. At 390px, hero heading and form must fit without clipping.
- Use semantic landmarks, one page H1, labelled form controls, and alt text for original imagery.
- Provide reduced-motion behavior and preserve readable text if images fail.

## Reference captures

`source-refs/hero-1440.jpg`, `source-refs/hero-390.jpg`, and `source-refs/header-1440.jpg` are local comparison captures of the approved concept; they are for visual review only and must not be shipped as page assets.

## QA follow-up from local concept

These observations are recorded as implementation follow-ups, not claims that production has fixed them:

- B1: chat illustration text was measured at roughly 6–10px on narrow/tablet views. Production must keep any UI illustration text at readable size or replace it with a larger original illustration.
- B2: report-composer labels and file chip were roughly 6–7px on mobile. Keep production UI labels at 12px minimum.
- B3: four-card row at 768px created uneven title wrapping. Use balanced wrapping or a one-column/snap layout at that width.
- B4: source mockups contained incorrect dates. Production imagery needs a fact pass before release.
- B5: source cards had orphan words at 390 and 1440. Use `text-wrap: pretty` and inspect at both viewports.
- B6: repeated stock-like photos reduced variety. Use a small, licensed original set and avoid repeated hero imagery.
- B7: two source mockups fell below 2x density at DPR3. Export production raster assets at 2x or render responsive SVG/HTML.

## Disallowed patterns

- Copying concept/Buffer text, logo geometry, images, CSS, or code.
- Using the green Buku Rapor palette as the active marketing theme.
- Repeating numbered section markers or tiny all-caps eyebrows as default scaffolding.
- Pill-shaped cards and inputs everywhere; pills are for primary actions and search/waitlist forms.
- Em dashes in user-facing copy.
- Made-up pricing, platform approval, support hours, traffic, client counts, or outcome claims.
- “Active internal tool” claims before pre-flight confirmation.
- Shipping the old Postiz instance or changing `postiz.mcsyauqi.com`.
