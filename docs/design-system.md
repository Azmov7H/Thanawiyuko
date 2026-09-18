# Design system — semantic touch inventory

Last audit: 2026-09-18 (theme work). Lesson: neutral "ink" text stays **static
grav**/adaptive (ink tokens adapt), while **brand** tints ride `base→brand-tint`.
Some brand-600 solids stay static so white labels keep contrast in dark mode.

## Toolchain
- Tailwind v4 (`@theme inline` in `src/app/globals.css`) — tokens generate the
  `bg-*`/`text-*`/`border-*` utilities used across `src`.
- Tokens live in CSS vars; `@theme inline` maps them to utilities. Static solids
  (greens/golds/raw palette) stay static so band CTAs / phase labels keep
  legible contrast in both themes.

## Semantic tokens (adaptive — used for interactive/varying surfaces)
| token | role |
|---|---|
| base | page background |
| surface | card/panel background |
| ink / ink-soft / ink-mute / ink-solid | text hierarchy + solid neutral fills |
| line | borders / dividers |
| brand-tint / brand-soft | brand fills (emphasis, tags, badges) |
| brand-accent | brand text/accents |
| brand-strong / brand-soft | brand emphasis on light+dark |
| brand-onlight / brand-onstrong | brand-context text (e.g. white pill legibility) |
| ok / bad / warn-* / danger-* / success-* / gold-accent | status + alerts |
| gold-tint / gold-accent | rewards/progress (gold) |
| danger-solid / danger-line / danger-bg | destructive surfaces |

## What is NOT a token (static by design)
- `bg-brand-600`/`bg-brand-500` solid CTAs — keep white labels; adapt only via
  theme toggle, not palette swap (band stays readable).
- `bg-gold-600`,`border-gold-600` phase pins on brand bands.
- `bg-red-600`-style raw preference screen accent (light-only, acceptable).
- `indigo/brand gradients` and `bg-black/10` focus overlays.

## Adding a surface
1. Prefer the closest existing token over inventing a hue.
2. Only add a var if a real component needs it; wire it in `@theme inline`.
3. Updating a token should be a one-line change in `globals.css`; no page edits.
