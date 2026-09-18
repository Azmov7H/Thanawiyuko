# Design system — component & token inventory

Last audit: 2026-09-18 (theme work + adaptive solids).
Source of truth: `src/app/globals.css` (`:root` / `.dark` vars + `@theme inline`).

## Toolchain
- Tailwind v4 with `@theme inline`. Tokens are CSS vars mapped to utilities, so
  one var change updates every `bg-*` / `text-*` / `border-*` consumer.
- Dark mode: `@custom-variant dark (&:where(.dark, .dark *))`; root
  `class="dark"` + `color-scheme` set by the FOUC script in `app/layout.tsx` and
  kept in sync by `components/theme/ThemeProvider.tsx`.
- Theme persisted in `localStorage["thanawico.theme"]`; absent value follows
  `prefers-color-scheme`. `ThemeToggle` lives in all headers (landing + app shell).

## Adaptive tokens (light → dark)
| token | role | light | dark |
|---|---|---|---|
| base | page background | `#f7f8fa` | `#0e1216` |
| surface | card / panel | `#ffffff` | `#161c22` |
| ink / ink-soft / ink-mute | text hierarchy | `#0b1b2b` / `#3c4f63` / `#5b6b7f` | `#eaf2f2` / `#c3d0da` / `#94a3b8` |
| line | borders / dividers | `#e2e8f0` | `#26313b` |
| ink-solid | dark solid button surface | `#14222e` | `#223141` |
| brand-tint / brand-soft | brand fills (tags, badges, hover) | `#effaf9` / `#aee5e2` | `#0d2322` / `#1d423f` |
| brand-accent / brand-strong | brand text / accents | `#0a7a75` / `#0a6b68` | `#2dd4bf` / `#5eead4` |
| brand-600 (`--brand-solid`) | solid CTA / band / badge | `#0a7a75` | `#0f766e` |
| brand-700 (`--brand-solid-hover`) | solid hover | `#0a6b68` | `#115e59` |
| brand-500 (`--brand-progress`) | progress fills / focus ring | `#0ea5a0` | `#2dd4bf` |
| brand-50 (`--brand-onband`) | light text on brand band | `#effaf9` | `#ccfbf1` |
| gold-accent | reward text/accents | `#b45309` | `#fbbf24` |
| gold-600 (`--gold-solid`) | gold solid pill / progress | `#b45309` | `#c2410c` |
| ok / bad | status text | `#15803d` / `#b91c1c` | `#22c55e` / `#f87171` |
| danger-bg / danger-line / danger-solid | destructive surfaces | `#fef2f2` / `#fecaca` / `#dc2626` | `#2a1215` / `#4a252b` / `#dc2626` |
| success-bg / success-line | success surfaces | `#f0fdf4` / `#bbf7d0` | `#0f1f15` / `#1f3d2b` |
| warn-bg / warn-line | warning surfaces | `#fffbeb` / `#fde68a` | `#241d0d` / `#4a3a14` |

Contrast: solid brand (`brand-600`/`700`) and gold (`gold-600`) keep ≥4.5:1
against their white labels in both themes (verified by the values above).

## Elevation / surfaces (`--shadow-*`)
| token | light | dark | use |
|---|---|---|---|
| `--shadow-card` | `0 1px 2px rgb(15 23 42 / 0.05), 0 1px 3px rgb(15 23 42 / 0.08)` | `0 1px 2px rgb(0 0 0 / 0.3), 0 1px 3px rgb(0 0 0 / 0.4)` | resting card |
| `--shadow-pop` | `0 6px 16px rgb(15 23 42 / 0.12)` | `0 6px 16px rgb(0 0 0 / 0.45)` | hover lift on rows/tiles |
| `--shadow-overlay` | `0 12px 32px rgb(15 23 42 / 0.18)` | `0 12px 32px rgb(0 0 0 / 0.55)` | dropdowns / dialogs / toasts |

(All shadows subtle, never glowing. Mapped via `@theme inline` → `shadow-card`, `shadow-pop`, `shadow-overlay`.)

## Motion
- Ease: `--ease-std` (cubic-bezier(0.22, 1, 0.36, 1)); duration kept short (150ms hover, ≤600ms fill/in).
- Entrance: `animate-rise` (+`animate-fade`) used sparingly on first paint; the global
  `prefers-reduced-motion` block disables all `tw-*` animations for reduced-motion users.

## Typography additions
- `.prose-rtl` — RTL article/explanation typography block (h2/h3/p/ul/ol/a/strong) used by
  lesson/explanation readers; respects `dir` so lists/margins stay logical.
- `.tnum` — tabular numerals for scores/counts (mono digits, no width jitter).

## Intentionally static (theme-independent)
- `bg-white` + `bg-brand-700/10` hover — the white pill CTA on the landing brand
  band (keeps a bright, high-contrast pill in both themes).
- `text-white` on solid brand/gold/danger surfaces (paired with adaptive vars).
- Raw `bg-black/10` style overlays and text-selection tints.
- No raw Tailwind color scales (`gray-*`, `red-*`, …) remain in `src`; use a token.

## Rules
1. Prefer the closest existing token; don't invent a hue per component.
2. Add a var only when a real component needs a new role; wire it in both
   `:root` and `.dark`, then map it in `@theme inline`.
3. Changing a color is a one-line edit in `globals.css`; no page/component edits.
4. `text-*` on `surface`/`base` must use adaptive tokens so it flips with theme.
