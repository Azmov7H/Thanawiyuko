# Thanawico — Task System

> The single backlog of remaining work. Statuses: `TODO | IN_PROGRESS | BLOCKED | REVIEW | DONE`.
> Priorities: `P0` critical, `P1` high, `P2` medium, `P3` enhancement.
> IDs are stable. Update status + notes as work lands. Keep in sync with `docs/ROADMAP.md`.

## Overview

| ID | Pri | Phase | Feature | Status |
|----|-----|-------|---------|--------|
| T-B1 | P0 | B | Learning loop — identity convention | DONE |
| T-B2 | P0 | B | Learning loop — record outcomes on submit | DONE |
| T-B3 | P0 | B | Learning loop — wire practice + exam submits | DONE |
| T-B4 | P0 | B | Learning loop — planner/weak-topic inputs | DONE |
| T-C1 | P1 | C | Decide/implement `/subjects/[id]` + `/mistakes` | DONE |
| T-C2 | P1 | C | Enable `/progress`, `/study-plan` in nav | DONE |
| T-D1 | P1 | D | Lesson/topic consumption page | DONE |
| T-D2 | P1 | D | Lesson completion → StudySession | DONE |
| T-E1 | P1 | E | Deterministic recommendation engine | DONE |
| T-F1 | P1 | F | DB-driven plans | DONE |
| T-F2 | P1 | F | Free/Plus entitlement matrix enforcement | DONE |
| T-G1 | P1 | G | Admin role/authz + audit viewer | DONE |
| T-H1 | P1 | H | Structured logging + request ids | DONE |
| T-H3 | P1 | H | Integration/authorization tests | DONE |
| T-I1 | P2 | I | Landing page upgrade | DONE |
| T-I3 | P2 | I | RTL accessibility pass | DONE |
| T-I4 | P2 | I | axe-playwright a11y smoke suite + CI | DONE |
| T-J1 | P2 | J | i18n foundation | DONE |
| T-K1 | P2 | K | PDF export architecture | TODO |
| T-L1 | P2 | L | Transactional notifications | TODO |
| T-M1 | P3 | M | Teacher role + profile stub | TODO |
| T-N1 | P1 | N | Restore ops docs + backup/restore drill | DONE |
| T-N2 | P1 | N | Account deletion/export + privacy pages + guardian consent | DONE |
| T-N3 | P2 | N | Error monitoring + distributed limits + enforce kill switches | TODO |

---

## Phase B — Learning Loop Correctness (P0)

### T-B1 — Standardize student identity convention
- **Priority / Phase / Feature**: P0 / B / data integrity
- **Description**: Learning records (`TopicMastery`, `Mistake`, `Streak`, `XPTransaction`,
  `UserAchievement`, `StudyPlan`, `AIConversation`, `Subscription`) are keyed by `studentId`,
  but the field is declared `ref: "StudentProfile"` while readers/writers use the session
  `User._id` (`studentOfSession().userId`). Confirm and document the canonical value
  (**User._id**) and, where feasible, align the schema `ref`/naming without a data migration.
  `AttemptModel` stores BOTH `studentId` (StudentProfile.\_id) and `userId` (User.\_id) — audit
  every read to ensure per-user queries use `userId`.
- **Dependencies**: none.
- **Files**: `src/server/modules/**/*.model.ts`, `src/app/api/subjects/route.ts` (`studentOfSession`).
- **DB impact**: documentation/ref alignment only (no destructive migration).
- **API impact**: none expected.
- **Security impact**: prevents cross-user data mixing (IDOR-adjacent).
- **UX impact**: none.
- **Acceptance criteria**: written convention in `docs/ARCHITECTURE.md`; every learning read/write
  uses the same id value; no query mixes profile id with user id.
- **Status**: DONE — canonical value is `User._id`; documented in `docs/ARCHITECTURE.md`. New
  learning-loop writers key on `User._id`. Schema `ref` alignment deferred as cosmetic follow-up
  (no data change).

### T-B2 — Record learning outcomes on attempt submit
- **Priority / Phase / Feature**: P0 / B / progress + gamification
- **Description**: Add a service that, exactly once per submitted attempt, updates:
  1. `TopicMastery` — recompute per affected topic from the last 20 answers (recency decay +
     volume confidence, existing `computeMastery`);
  2. `Mistake` — upsert on incorrect, schedule with `nextDueAt`, resolve after 2 consecutive correct reviews;
  3. XP — difficulty multiplier, +2 first-attempt effort on incorrect, exam bonus +25 once per exam,
     daily cap 600, <5s time gate, duplicate penalty;
  4. `Streak` — qualifying activity (≥5 questions or exam submitted), Cairo day;
  5. Achievements via `evaluateAchievements`.
- **Dependencies**: T-B1.
- **Files (new)**: `src/lib/learning.ts` (pure rules), `src/server/modules/learning/service.ts`.
- **Files (edit)**: `topic-mastery.model.ts` (add capped `recent` history array if needed),
  `gamification/service.ts` (stubbed rules).
- **DB impact**: additive field on `TopicMastery` (`recent: boolean[]`, default `[]`); new writes only.
- **API impact**: none public (side effects of existing submit endpoints).
- **Security impact**: all writes server-side, scoped to the authenticated user; idempotent per attempt.
- **UX impact**: dashboard/mistakes/XP/streak become real.
- **Acceptance criteria**: unit tests for XP/streak/mastery pure rules; two concurrent submits record once;
  a practice session updates mastery, mistake, XP, streak; exam submit adds +25 once.
- **Status**: DONE — `src/lib/learning.ts` (pure rules) + `src/server/modules/learning/service.ts`
  (`recordAttemptOutcomes`); `TopicMastery.recent: boolean[]` added; `Mistake` index on
  `{studentId, questionId}`. Unit tests in `tests/unit/learning.test.ts` (9 cases).

### T-B3 — Wire outcome recording into practice + exam submit
- **Priority / Phase / Feature**: P0 / B / integration
- **Description**: Make the finalize step atomic (`findOneAndUpdate` guarded by
  `status: "in_progress"`) so only one submit finalizes, then invoke the recorder.
  Return the stored result for a losing concurrent submit.
- **Dependencies**: T-B2.
- **Files**: `src/app/api/practice/[attemptId]/handlers.ts`,
  `src/app/api/exams/attempt/[attemptId]/handlers.ts`.
- **DB impact**: none.
- **API impact**: no contract change (same response shape).
- **Security impact**: removes double-count race.
- **UX impact**: none.
-   **Acceptance criteria**: submit remains idempotent and leak-free; outcomes recorded once even under retries.
- **Status**: DONE — both submit handlers now finalize via `findOneAndUpdate({_id, status:"in_progress"})`
  and call `recordAttemptOutcomes` once; concurrent loser returns the stored result (`resubmitted: true`).

### T-B4 — Complete planner + weak-topic inputs
- **Priority / Phase / Feature**: P0 / B / personalization
- **Description**: Replace stubbed planner inputs (`recentActivity: {}`, `examWeight: 1`,
  subject weights) with real per-topic recency and subject weights; implement weak-topic
  detection per README §4.7; remove `void subjectWeights`.
- **Dependencies**: T-B2.
- **Files**: `src/lib/planner.ts`, `src/app/api/progress/route.ts`, `src/app/api/study-plan/route.ts`.
- **DB impact**: none.
- **API impact**: same endpoints, correct data.
- **Security impact**: none.
- **UX impact**: plan reasons become truthful.
- **Acceptance criteria**: planner unit tests for recency/weights; weak topics reflect real mastery.
- **Status**: DONE — `generatePlan` now consumes normalized `subjectWeights`, real `recentActivity`
  (from mastery `updatedAt`), and enforces 2-topic/subject/day cap; `void subjectWeights` removed.
  New `src/lib/weakness.ts` implements the §4.7 three-condition detector + severity score; new
  `src/server/modules/planning/plan-input.ts` (`buildPlanContext`) is the single plan-input source
  used by `/api/study-plan` and `/api/progress`. Tests: `weakness.test.ts` + planner recency/weight/cap.

---

## Phase C — Broken UX Repair (P0/P1)

### T-C1 — Resolve dead links `/subjects/[id]` and `/mistakes`
- **Description**: Dashboard links to routes that do not exist. Either implement (preferred: subject
  browse + mistakes library pages) or remove/replace the links.
- **Files**: `src/app/(student)/dashboard/page.tsx`, new `src/app/(student)/subjects/[subjectId]/page.tsx`,
  new `src/app/(student)/mistakes/page.tsx`.
- **Acceptance criteria**: no 404 from in-app links.
- **Status**: DONE — added `src/app/(student)/subjects/[subjectId]/page.tsx` (unit/topic tree →
  start practice) and `.../mistakes/page.tsx` plus `GET /api/mistakes` (hydrated mistake library,
  due/all filter). All in-app links now resolve.

### T-C2 — Enable shipped student nav routes
- **Description**: `/progress` and `/study-plan` have APIs but are marked "soon" in `AppShell`.
  Implement pages and enable; keep unshipped items non-clickable.
- **Files**: `src/components/AppShell.tsx`, new pages under `src/app/(student)/progress`, `.../study-plan`.
- **Status**: DONE — added `src/app/(student)/progress/page.tsx` and `.../study-plan/page.tsx`
  (React Query, existing APIs) and enabled both in `NAV_ITEMS`; `/settings` remains "soon".

---

## Phase D — Content Consumption (P1)

### T-D1 — Lesson/topic consumption page
- **Description**: Student-facing topic/lesson reading (text-first, diagrams, optional video embed),
  published-only, entitlement-aware.
- **Files**: new API `src/app/api/lessons/[lessonId]/route.ts`, new pages.
- **Acceptance criteria**: unpublished content never returned to students.
- **Status**: DONE — `GET /api/lessons/[lessonId]` (published-only; lesson + topic/subject + prev/next)
  and `src/app/(student)/lessons/[lessonId]/page.tsx` reader; `subjectTree` now returns published
  lessons per topic and the subject page links them.

### T-D2 — Lesson completion logging
- **Description**: Mark-complete / dwell rule logs `StudySession` (no mastery grant per README §4.3).
- **Dependencies**: T-D1.
- **Status**: DONE — new `StudySession` model (one row per student/lesson/Cairo-day) and
  `POST /api/lessons/[lessonId]/complete`; reader tracks dwell and posts minutes. No mastery granted.

---

## Phase E — Personalization (P1)

### T-E1 — Deterministic recommendation engine
- **Description**: Ranked "next" list (mistake review → weakest topic → lesson for repeated
  mistakes → mini-mock), max 3, each with reason. No AI ranking in MVP.
- **Dependencies**: T-B2, T-B4.
- **Status**: DONE — `src/lib/recommendations.ts` ranks review → weakest quiz → repeated-mistake
  lesson → mini-mock (readiness<60 & exam<45d), max 3 with reasons. `src/lib/readiness.ts` computes
  the §4.4 weighted score. `/api/progress` now returns `readiness` + `next`; dashboard renders
  "التالي المقترح". Tests: `recommendations.test.ts` (readiness + ranking).

---

## Phase F — Monetization (P1)

### T-F1 — DB-driven plans
- **Description**: Move plans from `server/payments/config.ts` into a `Plan` collection
  (price/duration/features/limits/access/status) with admin editing; keep a typed loader.
- **Status**: DONE — new `Plan` model + `src/server/billing/plans.ts` loader (idempotent seed
  from defaults via `$setOnInsert`, so admin edits survive deploys). Pricing page, `/api/subscription`,
  and checkout now read active plans from the DB. `PATCH /api/admin/plans` edits
  price/duration/features/popular/order/active with an audited `plan.update`. `toPlanView`/`isPlanKey`
  in `src/lib/plans.ts`; tests in `plans.test.ts`.

### T-F2 — Entitlement matrix enforcement
- **Description**: Server-side Free vs Plus limits for practice/exam/AI/mocks; centralized
  `hasPlusAccess`/`entitlements` checks; no frontend authority.
- **Status**: DONE — `src/server/billing/entitlements.ts` is the single Free/Plus matrix
  (practice quota, AI quota, mock attempts, mistakes history, adaptive plan), resolved from
  `hasPlusAccess`. Wired: practice/start (30 vs unlimited), exams briefing/start (1 free mock
  then `PLUS_REQUIRED`), mistakes (20 vs 200), study-plan GET preview + POST gate,
  `/api/progress` plan cap + `upgradeRequired`, AI quota via `entitlementsFor`. Unit tests in
  `entitlements.test.ts`.

---

## Phase G — Admin (P1)

### T-G1 — Admin roles + audit viewer
- **Description**: Role-based admin capabilities, audit-log read UI, user search/suspend.
- **Status**: DONE — `requireSuperUser()` guard + pure rules in `src/lib/admin.ts`
  (`canManageUser`, `canAssignRole`) enforcing §5.1 (admin manages non-admins; super manages
  admins; super flag never assigned). `GET/PATCH /api/admin/users` searches users and
  suspends/activates/sets roles with `user.*` audit entries. `GET /api/admin/audit` read
  trail. UI: `/admin/users` and `/admin/audit` + nav links. Tests in `admin.test.ts`.

---

## Phase H — Observability & Quality (P1)

### T-H1 — Structured logging + request ids
- **Status**: DONE — `src/lib/logger.ts` (levels, threshold via `LOG_LEVEL`,
  recursive redaction of password/token/email/phone/card/transcript, `errorToLog`, JSON
  emission) + `src/lib/request-id.ts` (edge-safe `x-request-id` validation/generation) +
  `src/server/logger.ts` (`hashUser` sha256 pseudonym, `getRequestId`, `logServerEvent`/
  `logServerError`). `src/proxy.ts` generates/forwards `x-request-id`, echoes it on
  responses, and now matches all routes (global security headers). Replaced every server
  `console.*` with structured events (auth/AI/payments/cron/learning). Tests in
  `logger.test.ts`; `LOG_LEVEL` documented in `.env.example`.

### T-H3 — Integration/authorization tests
- **Description**: Add DB-backed integration tests for authz and critical flows.
- **Status**: DONE — `vitest.integration.config.ts` (serial, `tests/integration/**`, setup file
  forces `DATABASE_URL` to `MONGODB_URI_TEST`), `npm run test:integration`. Suite:
  `admin-authz.test.ts` (real Mongo + mocked session: unauthenticated/student denied, admin
  list/search, no secret leakage, self-modification blocked, suspend + audit row, admin-blocked
  role change, super-only `set-role`, set-role validation, audit trail gating) and
  `learning-flow.test.ts` (submit → `TopicMastery`, `Mistake`, XP ledger, `Streak`,
  achievements, then `/api/progress` read-back). 10 tests. `mongodb-memory-server` dropped in
  favour of a plain Mongo (local `mongod` / CI `mongo:8` service). **Found & fixed a real bug**:
  `/api/progress` XP aggregation matched a string `studentId` against ObjectId values, so the
  dashboard always showed 0 XP (`src/app/api/progress/route.ts`).

---

## Phase I/J/K/L — Growth, i18n, PDF, Notifications (P2)
- T-I1 Landing page upgrade — DONE (`src/app/page.tsx`): hero value prop + trust strip,
  features, 5-step journey (§8.1), qualitative Free/Plus (`#plans`, no hardcoded prices per
  §3.2), FAQ with `FAQPage` JSON-LD, final CTA. Static (SSG), RTL, anchor nav. No fabricated
  social proof — ethical conversion only.
- T-I3 RTL accessibility pass — DONE: reusable `useModal` (Escape, focus trap, initial
  focus, focus restore) applied to AI drawer, exam submit and subscription cancel; skip
  links + `<main id="main">` in student/admin/landing shells; Arabic `aria-label`s on
  previously unlabelled admin controls and the AI input; `role="progressbar"` with values on
  XP, mastery and exam-topic bars; non-color correctness cues (`✓ الصحيحة` / `✗ اختيارك`)
  and locked/unlocked `sr-only` state; decorative SVGs/emoji `aria-hidden`; lesson diagram
  `alt` text; RTL logical spacing (`ms-*`, `end-*`); ≥44px targets (AI close, exam map,
  small admin/student buttons); inline `role="alert"` instead of `alert()`; contrast pass
  (brand-600, ok, bad, gold-600, ink-mute now ≥4.5:1). Automated coverage added in T-I4.
- T-I4 axe-playwright a11y smoke suite + CI — DONE: `playwright.config.ts` (chromium channel,
  `ar-SA`, `webServer` on `next start`, `E2E_BASE_URL` override), `tests/a11y/helpers.ts`
  (`expectNoA11yViolations` via axe tags wcag2a/2aa/21a/21aa/22aa), and
  `tests/a11y/public-pages.spec.ts` (landing, login, register, unauthenticated redirect →
  login). Added `(auth)/layout.tsx` (`main#main` + skip link, `noindex`). Script `test:a11y`;
  new `a11y` GitHub Actions job (installs browser, builds, runs, uploads HTML report).
  Authenticated student/admin coverage needs a seeded DB + session — deferred to T-H3
  (integration/authz tests). Local: `pnpm build && pnpm test:a11y`.
- T-J1 i18n foundation — DONE: added `src/lib/i18n/` with locale config
  (`LOCALES`/`DEFAULT_LOCALE`/`ENABLED_LOCALES`/`resolveLocale`/`directionFor`/`htmlAttributes`,
  cookie name), a pure `translate(dict, key, params)` (dot-path + `{param}` interpolation),
  locale-aware formatters (`formatDate`/`formatDateTime`/`formatNumber`/`formatCurrency`/
  `formatPercent`, Cairo TZ, Western digits via `-u-nu-latn`), a centralized Arabic
  `Dictionary` (`dictionaries/ar.ts`), `getDictionary(locale)`, and a client `LocaleProvider`
  + `useI18n()` wired in `Providers`. Migrated the landing page (server) and AppShell nav
  (client) to read from the dictionary. `en` is a known-but-disabled locale (MVP stays
  Arabic-only, per README §1048); J3 becomes adding `dictionaries/en.ts` without touching UI.
  Tests: `tests/unit/i18n.test.ts` (8).
- T-K1 PDF export architecture — TODO
- T-L1 Transactional notifications — TODO

## Phase M — Teacher Dimension (P3, V2)
- T-M1 Teacher role + profile stub — TODO
- M2–M5 content studio / analytics / discovery / economy — backlog

## Phase N — Production Readiness (P1)
- T-N1 Restore operational docs + backup/restore drill — DONE: restored and corrected
  `docs/runbooks.md`, `docs/deploy-checklist.md`, `docs/data-minimization.md`,
  `docs/privacy-policy.md`, `docs/account-deletion-sop.md` (each now states implemented
  vs `GAP` against real code). Rewrote `scripts/restore-drill.sh` into a real
  dump → restore into a throwaway DB → per-collection count comparison → cleanup, and ran
  it against local `mongod` (green). Added `npm run seed:achievements`
  (`scripts/seed-achievements.ts`, idempotent, 10 definitions matching `ACHIEVEMENT_RULES`),
  closing the gap where no code seeded `AchievementModel` so achievements never unlocked.
  The docs also record known gaps (unenforced kill switches, no Sentry, no `/privacy`
  pages, no account deletion, JWT sessions cannot be revoked individually).
- T-N2 Account deletion/export, `/privacy` + `/terms` pages, guardian consent — DONE:
  - `UserModel` gains `deletion_pending` status, `deletionRequestedAt`, `deletedAt`,
    `guardianConsentAt`; login now allows `deletion_pending` (so a user can cancel) but still
    blocks `suspended`.
  - `src/server/modules/account/service.ts`: `requestAccountDeletion`,
    `cancelAccountDeletion`, `exportAccount` (JSON), `purgeUser` (anonymize + delete
    identity-linked rows, cancel subscription), `processFinalDeletion` (grace from
    `DELETION_GRACE_DAYS`, default 30). Wired into `/api/cron/reconcile`.
  - Routes: `POST /api/account/delete-request` (password-confirmed, rate-limited),
    `POST /api/account/delete-cancel`, `GET /api/account/export`.
  - `/settings` page (nav enabled) with export download + delete/undo flow; persistent
    deletion banner in the student shell.
  - Public `/privacy` and `/terms` pages, linked from landing footer and sitemap; required
    guardian-consent checkbox at registration (stored as `guardianConsentAt`).
  - Tests: `tests/integration/account-lifecycle.test.ts` (5) + validator unit test.
- T-N3 Error monitoring (Sentry), distributed rate limiting, and actually enforcing
  `src/lib/features.ts` kill switches — TODO.
