# Thanawiko — UX/UI Design System (edition 1)

> **A digital learning space, not a website.**
> Less interface. More guidance.

This document is the single source of truth for Thanawiko's experience and visual
language. It defines *why* we build screens the way we do, *what* the system is, and
*how* to apply it. It governs every page, component, and token.

Token source of truth: `src/app/globals.css` (see also `docs/design-system.md`).
Component inventory: `docs/UX_UI.md` §Components + `docs/CURRENT_STATE.md`.
Last reviewed: 2026-09-18 (edition 1 — student dashboard; system foundations).

---

## 1. Product truth

Thanaiko students are 15–18, under real exam pressure, studying in Arabic on phones
and laptops, in Egypt. They are not "users of an app". They are people trying to build
a study habit and understand their own progress.

Every screen must answer at least one of:

- **Where am I?** — orientation and context.
- **What have I accomplished?** — progress and identity ("I am improving").
- **What needs my attention?** — the next correction, not a wall of alarms.
- **What should I do next?** — one clear dominant action.
- **Why should I continue?** — motivation, lightly and honestly.

If a screen answers none of these, it does not earn its place.

---

## 2. Design principles

| # | Principle | Meaning in practice |
|---|---|---|
| 1 | **Guidance over chrome** | One dominant next action per page. Lists, dividers and whitespace beat boxes-on-boxes. |
| 2 | **Progress is felt, not counted** | Show trajectory and proximity to the next milestone, not dozens of equal-look numbers. |
| 3 | **Correction, never punishment** | Mistakes are "needs review", not red failures. Error = "let's fix", not "you failed". |
| 4 | **Education first, gamification second** | XP/streak/levels support the study habit; they never replace academic credibility. |
| 5 | **Arabic is the design** | Typography, line-height, RTL structure and numbers are designed natively, not transliterated. |
| 6 | **Premum restraint** | No random gradients, no glassmorphism, no decorative animation, no emoji-as-icons. |
| 7 | **One visual ecosystem** | Every screen is built from the same tokens, primitives and voice — indistinguishable authorship. |
| 8 | **High accessibility as base** | WCAG contrast, keyboard/AT compatibility and reduced motion are default, not an add-on. |

---

## 3. Visual personality

Thanawiko should feel **intelligent, calm, energetic, trustworthy and youthful**
— for students, teachers, parents and admins alike, without ever looking childish.

The identity is anchored by:

- **A deep teal brand** ("حبر المعرفة") for trust + action.
- **A warm gold accent** ("ذهب التفوق") used sparingly for rewards/streaks.
- **Quiet, near-white bases** with layered surfaces — bright and spacious in light,
  deep and soft in dark. Never pure black.
- **Editorial Arabic typography** (IBM Plex Sans Arabic) doing the hierarchy work
  before any card border does.
- **A single coherent stroke-icon family**, geometric and RTL-aware.

---

## 4. Design tokens

All tokens live in `src/app/globals.css` and are exposed to Tailwind v4 through
`@theme inline`. Rule: **never hardcode a color/radius/shadow/motion value in a
component** — add a token, wire it in both `:root` and `.dark`, map it, then use it.

### 4.1 Color — semantic roles

See the full light/dark value table in `docs/design-system.md`. Roles:

| Role | Token(s) | Psychological job |
|---|---|---|
| Page base | `--base` | calm space; near-white in light, deep navy-black in dark |
| Surface | `--surface` | panels, cards, headers; one level above base |
| Text | `--ink` / `--ink-soft` / `--ink-mute` | readability, then hierarchy of quieting |
| Border | `--line` | separation without noise |
| Brand (primary) | `--brand-*` (tint/soft/accent/strong/solid) | trust + action; the "correct answer" color |
| Success | `--ok` + `--success-bg/line` | achievement, mastery, correct |
| Warning | `--gold-accent` + `--warn-bg/line` | attention without anxiety (streaks, reviews) |
| Error | `--bad` + `--danger-bg/line/solid` | correction, not punishment; destructive actions |
| Solid buttons | `--ink-solid`, `brand-600/700`, `danger-solid` | legible filled controls in both themes |

Rules:
- Color must carry meaning. Success is green, attention is gold, correction is red.
- Never communicate with color alone — pair with text/icon (a11y).
- No raw Tailwind color scales in `src`; everything through a token.
- Use the *soft* surface variants (`brand-tint`, `danger-bg`, `warn-bg`) for fills;
  save *solid* variants for primary CTAs and bands.

### 4.2 Radius

System values (Tailwind defaults, used *consistently*):

| Token | Utility | Used for |
|---|---|---|
| xs (2px) | `rounded-xs` | tiny chips, inner dots |
| md (6px) | `rounded-md` | small controls, nav links |
| lg (8px) | `rounded-lg` | **default** buttons, rows, inputs, feature tiles |
| 2xl (16px) | `rounded-2xl` | cards, panels (or 3xl for hero bands) |
| full | `rounded-full` | pills, badges, avatars, progress bars |

Do not inflate radius randomly. Large rounded cards everywhere read as toys;
`rounded-2xl` is the ceiling for ordinary panels.

### 4.3 Elevation / shadows

Light-touch elevation. Flat surfaces + hairline borders (`border-line`) are the
default. Shadows only where a layer lifts off the page:

- `shadow-sm` — hover lift on rows/tiles.
- Floating elements (toasts, dropdowns, modals) use the existing `shadow-lg`/`modal`
  pattern; keep the shadow subtle, never glow.

*(Motion/elevation tokens are being centralized in `globals.css` — see §9.)*

### 4.4 Spacing

Rhythm is 4-based (Tailwind scale). Page-level rhythm:

- **Page padding:** `px-4` on mobile, container edges.
- **Section gutters:** 4 (16px) inside cards; 6 (24px) between page sections.
- **Section block spacing on long pages:** `py-16` (landing), `py-12/16` between hero blocks.
- **Row stacking:** 2 (8px) for tight lists, 3 (12px) dented, 4 (16px) default cards.

Whitespace is a design instrument: cluster related items tightly, separate
sections generously, and leave the primary action surrounded by quiet.

### 4.5 Typography

**Fonts** (via `next/font` in `app/layout.tsx`):

- Arabic + Latin body: **IBM Plex Sans Arabic** (400/500/700), `--font-ar`.
- Numerals/metrics/timers: **IBM Plex Mono** via the `.tnum` utility, `--font-num`.

**Scale & roles:**

| Role | Size / weight | Notes |
|---|---|---|
| Display (hero, rarely in-app) | 3xl–5xl, 700, `leading-snug` | home/landing only |
| H1 (page title) | `text-xl`–`2xl`, 700, `text-ink` | student pages: xl; subpage/config: 2xl |
| H2 (section) | `font-bold text-ink` (base/lg as needed) | section headers on surfaces |
| H3 | `font-bold` | card titles |
| Body | base, 400, `text-ink` / `text-ink-soft` | leading `1.6` |
| Muted/support | `text-sm`/`xs`, `text-ink-mute` | reasons, timestamps, descriptions |
| Numeric/metrics | `.tnum`, bold, sized by importance | scores, XP, counts |

Typography first: set hierarchy with size/weight/color/space *before* adding boxes.

### 4.6 Iconography

One icon family: **geometric, stroke-based, 24×24 viewBox, `strokeWidth 1.5–2`,
round caps**, hand-authored inline SVGs (no external icon lib; no mixed emoji as
primary icons). All icons use `currentColor` so they inherit `text-*`.

Where a new shared "Icon" primitive lands (see §Components), it becomes the only way
icons are rendered. Directional glyphs (arrows, chevrons) must respect RTL: use
logical pairs (prev/next) that flip with the `dir` context — never hardcode LTR
arrows in Arabic flows.

### 4.7 Motion

- Motion communicates state, never decorates.
- Durations: fast (100–150ms) for hovers/focus; medium (200–350ms) for the default
  transitions; slow (400–700ms) only for major state changes (XP bar, completion).
- Keep it cheap: transform/opacity only.
- `prefers-reduced-motion: reduce` is globally enforced (globals.css) — animate
  nothing visible for those users.

---

## 5. Light / dark mode

Light = bright, clean, educational. Dark = deep, calm, comfortable for long sessions.

- **Dark is a real system** (layered surfaces), not "same UI + black background":
  base `#0e1216` → surface `#161c22` → ink `#eaf2f2`; hairlines `#26313b`.
- Drive by the class variant: `@custom-variant dark (&:where(.dark, .dark *))`.
- Every color token has a dark value; toggling is `ThemeProvider` + header
  `ThemeToggle`, persisted under `thanawico.theme` with a FOUC guard in the root layout.
- Verify contrast in BOTH themes before merging (Playwright contrast test in
  `tests/a11y/public-pages.spec.ts`).

---

## 6. RTL / LTR architecture

The app is Arabic-first: root `<html dir="rtl" lang="ar">`.

- Use **logical utilities** everywhere: `ms-* / me-* / start-* / end-* / ps-* / pe-*`,
  never `ml-* / mr-* / left / right` for layout.
- Text alignment: use `text-start`/`text-end`.
- Icons: direction-agnostic icons must not imply handedness; directional icons come
  in logical pairs.
- Numbers: use `.tnum` + `dir="ltr"` only where a raw number needs LTR order
  (rare); the whole UI stays RTL.
- Future L10N: the i18n dictionary (`src/lib/i18n`, only `ar` enabled today) is the
  home for all strings, with `t()` keys — no hardcoded Arabic scattered in components.

---

## 7. Navigation

### 7.1 Student (AppShell)

Primary destinations (5, both side + bottom nav): **الرئيسية / تدرب / خطتي / التقدم /
حسابي**. Active = `text-brand-strong font-bold` (+ `bg-brand-tint` in side nav).

- Desktop: side nav (w-56) inside the `max-w-5xl` shell.
- Mobile: fixed bottom nav, `grid-cols-5`, `min-h-16`, thumb-friendly.
- Contextual destinations (`exams`, `mistakes`, `subscription`, `notes`) are reached
  from the surface that needs them (dashboard recommendations, subject rows, etc.)
  rather than crammed into the 5-slot nav. Revisit IF usage data says otherwise.

Headers: max-w-5xl, `h-14`, brand mark, theme toggle, notification bell, right-aligned
in RTL. Material verb: brand → `/dashboard`.

### 7.2 Teacher / Admin

Teacher: mainism (overview, profile). Admin: 5-slot top nav (overview, content, exams,
users, audit). Both `max-w-6xl`; denser info architecture than students, but the same
token system, typography and states.

---

## 8. Component architecture & inventory

### 8.1 Keep (ship now, restyle later)

| Component | Verdict |
|---|---|
| `ThemeProvider` / `ThemeToggle` | Keep — complete FOUC + persistence |
| `Providers` (RQ stack) | Keep |
| `AppShell` side/bottom nav model | Keep (add icons — §8.3) |
| `AiPanel` (tutor) | Keep — working flow; restyle to tokens |
| `NotificationBell` | Keep — revisit icon (presently a bell glyph) |
| `.tnum` numerals | Keep — core to metrics |
| Exam session/take flows | Keep — minimal distraction is correct already |
| `SkipLink`, focus-visible, reduced-motion | Keep — a11y base |

### 8.2 Improve

| Component | Gap | Change |
|---|---|---|
| Dashboard | box-of-boxes; no dominant action; no greeting/objective | full redesign (§11) |
| `XpProgress` | plain bar; "سقف اليومي 600" is noise on the bar | metric card w/ goal proximity |
| `StreakWidget` | distraction (big flame + fright copy) | calm metric w/ at-risk wording |
| `AchievementGallery` | emoji icons; 5-col tumble | icon set; locked/unlocked clarity |
| Landing | mobile header loses anchors; hero lacks journey visual | add mobile nav; narrative hero |
| Practice picker | button soup; no "mix" clarity | grouped steps + sticky CTA |
| Subscription pages | functional but flat | apply the plan-card + trust patterns |
| Empty/loading/error microcopy | mixed quality | standard component set (§14) |

### 8.3 Replace / Introduce (high value first)

1. **Icon primitive** — single `Icon` component, stroke family; replace emoji
   (achievements, bell) and hand-SVG repetition.
2. **PageHeader / SectionHeader** — consistent page title + eyebrow + leading action.
3. **Action card / Metric** — hierarchy: *one* dominant call-to-action card; support
   metrics sized by importance (never 10 equal boxes).
4. **EmptyState / ErrorState / Skeleton** — standard, comfortable, explain-the-next-step.
5. **Button (variant) / Badge / ProgressBar** — tokens-driven.

### 8.4 Missing (later, when the surface exists)

- Teacher content studio, analytics charts, admin tables (work started for teacher/
  admin) — apply the same tokens, states and motion when their screens are built.

---

## 9. Design tokens — implementation checklist

When adding a token:

1. Define it in `:root` and `.dark` (both themes, both required).
2. Map it in `@theme inline` so Tailwind utilities exist.
3. Use the utility; delete any inline value it replaces.
4. Update `docs/design-system.md` value table.
5. Add/verify a contrast check if it carries text.

---

## 10. States

Every page declares its states up front:

| State | Pattern |
|---|---|
| **Loading** | Skeleton that mirrors final layout (preferred) or quiet `جارٍ التحميل…` text. Never a bare frozen page. |
| **Empty** | Why it's empty + one clear next step + a CTA. Never blank. |
| **Error** | Human-readable (`تعذر تحميل المحتوى.`), retry button, no stack traces / raw API. |
| **Success** | Confirm the result, explain meaning, offer next step (e.g., exam result → weak points → practice). |

---

## 11. Page specifications

### 11.1 Student dashboard — *highest priority, redesigned first*

**Purpose:** orient the student ("where am I, what have I done, what's next").
**Primary action:** one dominant "next step" CTA.
**Hierarchy:** greeting+objective → next action → today's plan → subject mastery →
focus areas → (secondary) gamification metrics.

1. **Greeting + objective.** Time-aware greeting + the single most truthful sentence
   about progress: *"أنت قطعت 42% من طريقك في الرياضيات."* (from subject mastery).
2. **Dominant next action.** One emphasized card: type (review/practice/lesson/mock),
   human reason, action button. Everything else is secondary.
3. **Today's plan.** Compact list of prepared actions (action, minutes, reason) +
   Plus upgrade hint when applicable.
4. **Mastery by subject.** Progress bars sized by importance; the bars themselves
   carry the data (no bar + boxed number grid).
5. **Focus areas.** Weak topics framed calmly (*تحتاج تركيز*), never "failing".
6. **Gamification (secondary row).** XP, streak, achievements as a quiet metrics row —
   education first.

Desktop: left-aligned hero + action; plan (2 cols). Mobile: single column, dominant
CTA above the fold. States: skeleton row (loading); error with retry; empty state
that routes to onboarding/practice.

### 11.2 Landing page

Narrative: hero → trust → features → how-it-works → plans → FAQ → final CTA.
**Keep** the existing copy & structure; **improve** mobile header nav (hamburger) and
a subtle journey visualization in the hero (path from *غريب → تدرب → أتقن*). Primary
CTA *ابدأ رحلتك*.

### 11.3 Exam / practice result

Never show only a score. Score → accuracy → strong vs weak topics → misconception
chips → **next action** button ("راجع هذه النقاط" / practice weakest topic). Present
already; polish hierarchy and copy.

### 11.4 Mistakes

Rephrase red-as-failure into "needs review". Keep filter (need/all), PDF export,
per-question explanations, "practice this topic". Add **قبل/بعد التصحيح** framing.

### 11.5 Registration / onboarding

Progressive disclosure; one question at a time; progress indicator
`1 الشخصية → 2 الدراسة → 3 الاهتمامات → 4 جاهز`; "بنظبط مساحتك التعليمية…" microcopy.

---

## 12. Microcopy

Natural, modern, concise Arabic. No robotic phrases, no excess `!`, no baby talk.

| Instead of | Use |
|---|---|
| خطأ! | تحتاج هذه النقطة إلى مراجعة. |
| فشل استخدام | النتيجة جاهزة — دعنا نعرف أين يمكنك التحسن. |
| مفيش بيانات | لا توجد أخطاء مستحقة — راجع كل الأخطاء بالفلتر. |
| جارٍ التحميل | جارٍ تحميل لوحتك… |

Tone: coach, not boss. Short sentences. Good error/empty copy is part of design.

---

## 13. Responsive & mobile

Do not shrink desktop. Re-decide per breakpoint what disappears / stacks / becomes a
drawer / becomes primary.

| Breakpoint | Rule |
|---|---|
| base (mobile first) | single column; bottom nav; dominant CTA above fold; thumb targets ≥44px |
| sm (≥640) | 2-col grids allowed for compact lists, not cards |
| md (≥768) | side nav appears; hero/action can pair |
| lg (≥1024) | page grids (plan/mastery) unlock; landing grids full |
| xl (≥1280) | shell width caps (student max-w-5xl, admin max-w-6xl) |

---

## 14. Accessibility contract

- Contrast ≥4.5:1 for text (verified in light + dark via Playwright).
- Visible focus everywhere (global focus-visible outline).
- Semantic HTML, `aria-label` on icon-only controls, `role="progressbar"` + values.
- Never color-only meaning.
- Reduced motion respected globally.
- Touch targets and readable tap spacing on mobile.

---

## 15. Performance contract

- No unnecessary JS: prefer server components; keep client components for
  interactivity/RQ only.
- No heavy image/video assets on critical pages; `loading="lazy"` where allowed.
- Motion is transform/opacity only; no layout-thrashing animation.
- No hidden UI rendered "just in case".

---

## 16. Do / Don't

**DO** use tokens, logical RTL utilities, typography-first hierarchy, one dominant
action, calm correction language, skeletons, meaningful motion.
**DON'T** use random gradients, glassmorphism, emoji-as-icons, oversized rounded
everything, fake social proof, artificial urgency, spreadsheet dashboards, red
shame-copy, or per-page bespoke styling.

---

## 17. Definition of done

A page ships when: UX is clear in seconds · primary action obvious · Arabic
typography polished · RTL correct · responsive intentional · dark mode verified ·
loading/empty/error/success all exist · focus + a11y respected · motion purposeful ·
built from tokens + shared components (no one-off styling) · business logic intact ·
perf acceptable · light + dark contrast pass (Playwright) · lint/type/test/build green.

---

## 18. Governance

1. New visual surfaces start from this doc + `globals.css` tokens.
2. Reuse the shared components (once shipped) — extend, don't duplicate.
3. Every change that alters visible hierarchy updates this doc's affected section.
4. Dark-mode and contrast verification are merge conditions.
5. This doc is versioned in-repo beside the code it describes.