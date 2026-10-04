# Component catalog

## Foundations

- **Canvas**: `#FBFCFE`; use for page and header.
- **Display**: `.kk-display`; Be Vietnam Pro at 40–76px, balanced wrapping.
- **Body**: `.kk-body`; Figtree at 16–18px with 1.4 line height.
- **Focus**: `.kk-focus`; 2px Brand blue outline with 2px offset.

## Navigation

`site-nav` is sticky with a 73px desktop / 69px mobile height. Desktop presents logo, five links, log-in outline, and waitlist action. Below 1180px hide the link row and show a 40px menu button. The menu must update `aria-expanded` and keep links keyboard reachable.

## Buttons

- `btn-primary`: Brand blue fill with white text for high emphasis.
- `btn-soft`: Blue soft fill with Ink text for the waitlist CTA.
- `btn-ghost`: transparent surface with Ink border for secondary actions.
- `btn-dark`: Button dark fill with white text on Blue soft panels.

Pills are allowed for these action classes only. Utility controls use 8–12px radius.

## Hero grid

`.hero` centers one display statement, body subline, waitlist form, and helper text over `.grid-bg`. Desktop form is an inline 634px pill. Mobile stacks 256px controls. Floating `.hero-tile` elements must have a label or accessible name and stay inside the viewport at 390px.

## Feature cards

`.card` is a single surface with `.card-art` and `.card-body`. Keep title, description, and one linked action. Use two columns on wide screens and one column below 620px. At 768px, balance title wrapping or switch to a carousel so body rows align.

## Platform strip

`.channel` uses Surface bar with a short statement and labelled platform tiles. Official logos stay inside tiles. The strip changes from inline flex to a six-column tile grid at compact widths and wraps to six columns on mobile.

## Report panel

`.report` uses Dark panel and Blue soft accents. Keep report copy at body size; do not put tiny labels inside artwork. The panel stacks below 1024px.

## Support and resources

Support uses a two-column text and illustration layout, stacking below 1024px. Resources use repeatable linked cards and become a horizontal snap carousel below tablet widths. Use `text-wrap: pretty` for card prose.

## Waitlist feedback

A form has labelled email input, disabled/pending button state, `aria-live="polite"` status text, and explicit invalid/server messages. A successful response must explain what was stored and what happens next. Never echo unsanitized HTML or script-like input.

## Pages

All marketing routes should reuse these foundations: home, pricing, features, resources, article index/article pages, waitlist/tool pages, and 404. Each page carries one H1 and keeps active route labels in the shared navigation.
