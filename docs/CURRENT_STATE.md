# Thanawico — Current State Audit

> Evidence-based audit of the repository. Every claim below was verified against code,
> not inferred from the README spec. Last updated: Phase 0 discovery.

## 0. Snapshot

| Item | Value |
|---|---|
| Stack | Next.js 16.3.5 (App Router, Turbopack), React 19.2, TypeScript 5, Tailwind CSS v4 |
| Auth | NextAuth/Auth.js v5 beta (Credentials, **JWT** session strategy) + `@auth/mongodb-adapter` |
| DB | MongoDB via Mongoose 9 + raw `mongodb` driver (adapter) |
| State/data | TanStack Query v5 (client), Zustand (gamification store) |
| Validation | Zod v4 |
| Tests | Vitest 5 — 17 files / 77 tests (unit + pure functions) |
| Package manager | Repo is **npm**-based (`package-lock.json`); local dev used `pnpm` |
| Language/locale | Arabic-first, RTL hardcoded in `src/app/layout.tsx` (`<html lang="ar" dir="rtl">`) |
| Verified green | `pnpm typecheck`, `pnpm lint` (0 warnings), `pnpm test` (77), `pnpm build` |

Git HEAD: `00c7c71 feat(billing): enhance subscription management and payment handling`.

## 1. Implemented (working, verified)

### Identity & access
- Registration (`POST /api/auth/register`) with zod validation + password hashing (`src/lib/password.ts`).
- Login via Credentials provider, JWT session cookie, `role`/`id` on JWT+session (`src/server/auth/config.ts`, `src/types/next-auth.d.ts`).
- Rate limiting: proxy-level (`src/proxy.ts`, per-IP fixed window) + server-level (`src/server/ratelimit.ts`) on login/register.
- Admin authorization guard (`requireAdminUser`) and admin-gated content/exam APIs.
- Security headers + CSP (`next.config.ts`), `Cache-Control: no-store` on APIs, Next 16 `proxy.ts` middleware.

### Onboarding & profile
- Student profile model with grade/track/dailyMinutes/targetExamDate/resumable onboarding state (`student-profile.model.ts`).
- `GET`/`PATCH /api/students/me` owner-only; grade→track normalization rule (`normalizeTrack`).
- Onboarding UI: grade → track → daily minutes (`src/app/(student)/onboarding/page.tsx`).

### Curriculum & content
- Models: Subject → Unit → Topic → Lesson → Question, with lifecycle statuses `draft|review|published|archived` and `version` (`content.models.ts`, `question.model.ts`).
- Admin content API: list, lifecycle transitions (`canTransition`, `nextVersion`), field edits, question explanation gate, audit logging (`/api/admin/content`, `audit-log.model.ts`).
- Curriculum seed script + seed data (`scripts/seed-curriculum.ts`).
- Subject tree API (`/api/subjects`, `/api/subjects/[subjectId]`) with per-topic published question counts.

### Practice engine
- Start attempt: scope validation, published-only question pool, shuffle/snapshot, daily practice budget, idempotent by `clientAttemptId` (`/api/practice/start`).
- Instant per-question check with locked feedback (`/api/practice/[attemptId]/check`).
- Submit with deterministic server-side scoring, idempotent resubmit, review payload (`handlers.ts`).
- Answer-leak protection (`toPublic`, `assertNoLeak`).

### Exam engine
- Published mock listing scoped by grade/track with attempts-left and best score (`/api/exams`).
- Briefing + start with blueprint sampling, per-attempt shuffle, server-authoritative `deadlineAt` (`logic.ts`).
- Autosave heartbeat, flags, tab-switch counter (`PATCH /api/exams/attempt/[attemptId]`).
- Submit with deadline grace + `lateSubmit` flag; post-submit review + deterministic per-topic analysis (`analyzeAttempt`).

### Progress / gamification / planning
- Pure mastery math (`src/lib/mastery.ts`), deterministic planner (`src/lib/planner.ts`), Cairo timezone utilities (`src/lib/cairo.ts`).
- Unified progress snapshot API (XP/streak/subjects/weak topics/mistakes due/plan) with de-N+1 lookups.
- Topic mastery read API; study-plan preview + persist APIs.
- Gamification read API (XP, level, streak, achievements); XP/level math; 10 achievement definitions; weekly leaderboard read API + build function.
- Client gamification store + dashboard widgets (`XpProgress`, `StreakWidget`, `AchievementGallery`).

### AI
- OpenRouter-compatible provider abstraction with fallback model, streaming + non-streaming.
- Tutor SSE route with entitlement, validation, persistence, quota, conversation id; mistake explainer route.
- Daily quota (free/plus), in-memory explanation cache, grounded prompts (`prompts/v1/*`), AI call logging.

### Billing / subscriptions
- Paymob provider abstraction: accept-token, order, payment-key, checkout session; HMAC verification over Paymob's canonical field list with timing-safe compare.
- Checkout, webhook (idempotent, correlates `merchant_order_id`), grace reconciliation, cancel, refund, invoices.
- `hasPlusAccess` includes `active|grace|past_due` within grace window; subscription UI (plans, manage, success).
- Daily cron endpoint for grace + streak reconciliation (secret-guarded).

### Ops / quality
- SEO/app files: metadata + OG/Twitter in root layout, `robots.ts`, `sitemap.ts`, `not-found.tsx`, `loading.tsx`, `error.tsx`, `icon.svg`; `noindex` on student/admin layouts.
- `.env.example`, GitHub Actions CI (`.github/workflows`), Lighthouse config, k6 smoke script.
- 77 unit tests; typecheck/lint/build green.

## 2. Partially implemented

| Area | State | Gap |
|---|---|---|
| Onboarding | grade/track/daily minutes only | no goals, learning style, interests, current level, subject confirmation, diagnostic; no role choice (student vs teacher) |
| Gamification | read APIs + math + rules | **no writers** (XP/streak/achievements never updated on submit); several achievement rules are `// TODO` (planFollowDays, comebackAfterBreak, accurate20, examReadiness) |
| Leaderboard | read API + build function | `buildWeeklyLeaderboard` never scheduled; references `StudentProfile.nickname` which does not exist in the schema; no opt-in flag |
| Progress | API reads mastery/mistakes | depends on data never written; planner input hardcodes `recentActivity: {}` and `examWeight: 1` |
| Content | models + admin API + tree API | no student-facing lesson page/API, no subject browse page, no bookmarks, no search |
| Admin | content lifecycle + exams | no user management, finance/refunds UI, audit viewer, plans/feature-flag editor, reports |
| Subscriptions | Paymob + plans | plans are **hardcoded** in `server/payments/config.ts` (not DB-driven); no free-tier entitlement matrix |
| Design system | tokens in `globals.css`, dark class variant | no theme toggle/persistence, no component inventory, dark mode effectively unused |
| i18n | none | all strings hardcoded Arabic; no translation keys or locale abstraction |
| Observability | `console.log` only | no error tracking, request ids, structured logging, metrics |
| Accessibility | focus-visible + reduced-motion | no full audit; dialogs/forms partial |
| Analytics | none | no teacher/student analytics surfaces |

## 3. Broken (confirmed defects)

1. **Learning loop is not persisted (critical).**
   `awardXp`, `computeMastery`, and all writers of `TopicMasteryModel`, `MistakeModel`,
   `StreakModel`, `UserAchievementModel` are absent from the request path.
   - Verified: `awardXp` has **zero call sites**; `computeMastery` has **zero call sites**;
     no `TopicMasteryModel.create/findOneAndUpdate`, `MistakeModel.create/...`,
     `StreakModel.create/...` anywhere in `src`.
   - Consequence: dashboard/progress/gamification/planner show 0 forever; mistakes library stays empty;
     study plan has no weak topics; achievements never unlock on activity.
2. **Dead links / missing routes.**
   Dashboard links to `/subjects/[subjectId]` and `/mistakes`; neither route/page exists (`/subjects` page absent).
   `AppShell` marks `/study-plan`, `/progress`, `/settings` as "soon" although APIs exist for the first two.
3. **Identity convention is inconsistent.**
   `studentOfSession` returns `userId` (User._id) and readers query `{ studentId: userId }`,
   while `AttemptModel.studentId` stores the `StudentProfile._id`. Models declare
   `studentId: { ref: "StudentProfile" }` but actually hold User ids in most paths.
   Works only because the learning writers are missing; must be standardized before wiring.
4. **Gamification "today" XP uses server-local midnight**, not Cairo day (`/api/gamification`),
   inconsistent with `/api/progress` which uses `cairoDayStartUTC()`.
5. **Leaderboard build references a non-existent `nickname` field** and is never invoked.
6. **`evaluateAchievements` mixes reads**: `AttemptModel.find({ userId })` mixed with
   `studentId`-keyed reads, and four rule contexts are stubbed to `false`/`0`.

## 4. Missing (required, not present)

- Teacher content studio, analytics, following, discovery, economy, wallet/withdrawals (M2–M5); the `teacher` role + profile stub are implemented (T-M1).
- DB-driven plans, content-access grants (free/paid/course/content), and content permission enforcement.
- Lesson consumption (student reading UI) and lesson-completion StudySession logging.
- Personalization/recommendation engine (deterministic ranked "next actions").
- Notifications (transactional only), quiet hours, preferences.
- PDF export system (progress report, exam result, mistake report).
- Bookmarks and content/question search.
- i18n/localization foundation (keys, locale formatting, RTL/LTR abstraction).
- Dark-mode toggle + full component/design-system inventory.
- Admin: user management, finance/withdrawals, audit viewer, reports, plan/feature-flag config.
- Observability: error tracking, request ids, structured logs, metrics.
- Integration/authorization/end-to-end tests (currently pure-unit only).

## 5. Technical debt

- Identity convention drift (`studentId` = User id vs profile id) described above.
- Duplicated rate limiting (proxy map + server map) and non-shared state (not multi-instance safe).
- Planner inputs stubbed (`recentActivity`, `examWeight`), so "explainable" reasons are partially synthetic.
- `gamification/service.ts` has an import at the **bottom** of the file and a `// TODO` cluster in `EvalContext`.
- AI quota is stored on the first `AIConversation` of the Cairo day (index not unique) — accepted MVP limitation.
- Plans are DB-driven (`PlanModel`, seeded from `src/server/payments/config.ts`); feature flags are defined in `src/lib/features.ts` but **not enforced** anywhere.
- `README.md` is a full normative spec; code intentionally implements a subset (MVP). Docs must track reality.
- `docs/` was emptied in `00c7c71`; the operational set (runbooks, deploy checklist, data-minimization, privacy, account-deletion SOP) was restored and corrected in T-N1.

## 6. Risk areas (change carefully)

- **Scoring/submit handlers**: idempotency, snapshot immutability, answer-leak surface.
- **Billing webhook + entitlement**: `hasPlusAccess`, grace windows, idempotency by `providerRef`.
- **Auth/session**: JWT claim shape is consumed across guards and APIs.
- **Attempt identity fields** (`studentId` vs `userId`): any learning-loop writer must pick the
  de-facto convention (User id) to match existing readers, or a migration/alignment is required.
- **AI quota model overloading** `AIConversation` as a quota bucket.
- **Content lifecycle transitions + versioning**: admin edits bump versions; snapshots must stay valid.

## 7. Evidence index

- Models: `src/server/modules/**/*.model.ts`
- Services: `src/server/{ai,billing,modules}/**`
- APIs: `src/app/api/**/route.ts`
- Pure logic: `src/lib/*.ts`
- Tests: `tests/unit/*.test.ts`, `tests/perf/k6-smoke.js`
- Normative spec: `README.md` §4 (business logic), §5 (roles), §6 (feature map), §11 (DB), §16 (security)
