# Thanawico — Architecture

> Describes the implementation as it exists in code. Update when structure changes.
> Normative product rules live in `README.md` §4–§13.

## 1. Runtime & stack

- **Framework**: Next.js 16 App Router (Turbopack), React 19, TypeScript strict.
- **Edge middleware**: `src/proxy.ts` (Next 16 renamed from `middleware.ts`) — rate limits auth paths,
  sets security headers. Matcher: `/api/auth/:path*`, `/login`, `/register`.
- **Auth**: Auth.js v5 (`next-auth@5 beta`), Credentials provider, **JWT** session strategy
  (30 days), `@auth/mongodb-adapter` for adapter collections. Session `id`/`role` are added via callbacks
  and typed in `src/types/next-auth.d.ts`.
- **Data**: MongoDB. Two connections in `src/server/db/client.ts`:
  - `dbConnect()` — shared Mongoose connection for domain models;
  - `authMongoClient()` — raw driver for the Auth.js adapter.
  Both are lazy (never connect at build).
- **Validation**: Zod schemas at API boundaries (`src/lib/validators.ts` + per-route schemas).
- **Client data**: TanStack Query for server state; Zustand (`src/state/gamification.ts`) for gamification UI.
- **Styling**: Tailwind CSS v4 + CSS tokens in `src/app/globals.css`; RTL via `<html dir="rtl">`;
  `@custom-variant dark` is declared but no toggle exists.

## 2. Module boundaries

```
src/
  app/                 # routes, pages, layouts (App Router)
    (auth)/            # login, register
    (student)/         # dashboard, practice, exams, onboarding, subscription
    (admin)/admin/     # content, exams, dashboard
    api/               # route handlers (REST-ish JSON + SSE)
  components/          # shared UI (AppShell, AiPanel, gamification widgets)
  lib/                 # PURE logic only (no server imports except pure helpers)
  server/
    db/client.ts       # connections
    auth/config.ts     # NextAuth config
    ai/                # provider, service, prompts loader, eval
    billing/service.ts # subscriptions/payments/entitlement
    payments/          # provider abstraction + plans config
    modules/           # domain models + services, grouped by domain
  proxy.ts             # edge middleware
  state/ types/        # client store, ambient types
```

`src/lib` is deliberately framework-free and unit-tested; `src/server/modules` holds Mongoose
models and DB-touching services. Pure rules (mastery, planner, scoring, content lifecycle,
cairo time, xp math) live in `src/lib` and are imported by services.

## 3. Domain model (MongoDB collections)

Academic:
- `Subject` (code, grade, tracks[], examWeight, status, version)
- `Unit` (subjectId, order) → `Topic` (unitId, subjectId, objectives, conceptTags, order)
- `Lesson` (topicId, bodyMD, diagrams[], videoUrl, readingMinutes, order)
- `Question` (topicId, lessonId, type mcq_single|true_false, options[], correctKeys[], explanationMD
  required, difficulty, conceptTags[], stats, status, version)

Assessment:
- `Attempt` (userId + studentId, kind practice|quiz|exam|diagnostic, clientAttemptId (unique per user),
  status, shuffleSeed, scope, **snapshots** of questions, answers[], score/total/accuracy, startedAt,
  submittedAt, examId, deadlineAt, lateSubmit, flaggedQIds, tabSwitches)

Learning:
- `TopicMastery` (studentId, topicId unique together, masteryScore, band, n, last10Accuracy)
- `Mistake` (studentId, topicId, questionId, conceptTag, chosen/correct keys, dueAt, reviewCount,
  consecutiveCorrect, resolvedAt, lastReviewAt) — SM-2-lite intervals `[1,3,7,14,30]`
- `Streak` (studentId unique, current, longest, lastActiveDay, history[])
- `StudyPlan` (studentId + date unique, items[], status, source deterministic, feedback)

Gamification:
- `XPTransaction` (studentId, amount, reason, refId, balanceAfter) — append-only
- `Achievement` (code, titleAr, descriptionAr, icon, rule, xpReward, isSecret)
- `UserAchievement` (studentId + achievementId unique)
- `LeaderboardEntry` (studentId, weekStart, xp, rank, nickname)

Billing:
- `Subscription` (studentId, tier, plan, status active|grace|past_due|pending|cancelled,
  provider, providerRef, currentPeriodStart/End, cancelAtPeriodEnd)
- `Payment` (subscriptionId, studentId, amountEGP, currency, provider, providerRef unique,
  status succeeded|failed|refunded, refund metadata)

AI:
- `AIConversation` (studentId, topicId, title, messages[] embedded ≤200, quotaPeriod, quota{limit,used})
  — doubles as the daily quota bucket.

Infra/ops:
- `AuditLog` (actorId, action, entity, entityId, before/after, reason)
- `User` (name, email unique, passwordHash `select:false`, role student|teacher|admin|super, status)

### Identity convention (IMPORTANT)
`studentOfSession()` returns `{ userId, profile }` where `userId` is `User._id`. The de-facto
convention for all per-student learning records (`TopicMastery`, `Mistake`, `Streak`, `XP`,
`StudyPlan`, `Subscription`, `AIConversation`) is **`studentId` = `User._id`**, despite the
schema `ref: "StudentProfile"`. `Attempt` stores both `userId` (User.\_id) and `studentId`
(`StudentProfile._id`); per-user attempt reads always filter on `userId`. Ref alignment is a
cosmetic follow-up (T-B1); the learning loop (`src/server/modules/learning/service.ts`) keys
writes on `User._id`.

## 4. Request & data flow

### Practice
`POST /api/practice/start` → entitlement/budget → sample published questions (seeded shuffle) →
snapshot → `Attempt`. `POST .../check` locks an answer + instant feedback. `POST .../submit` grades
from snapshots (server-authoritative), then triggers the learning loop
(`recordAttemptOutcomes` → mastery/mistakes/XP/streak/achievements) exactly once.

### Exam
`POST /api/exams/[id]` start → blueprint sampling → snapshots + `deadlineAt`.
`PATCH /api/exams/attempt/[id]` autosave (no feedback). `POST .../submit` merges autosave + final,
grades, flags `lateSubmit` past `deadlineAt + 60s` grace, then triggers the learning loop.

### Progress read model
`GET /api/progress` aggregates mastery, due mistakes, streak, XP, subject rollups, weak topics,
and today's plan (generated deterministically if absent). `GET /api/progress/mastery` returns per-topic rows.

### Billing
`POST /api/subscription/checkout` → provider checkout → `Payment`/`Subscription` pending.
`POST /api/subscription/webhook` (HMAC field-list verified) → idempotent activate/fail.
`GET /api/cron/reconcile` (secret header) runs grace + streak reconciliation.

### AI
`POST /api/ai/tutor` (SSE) and `POST /api/ai/mistake` → entitlement + quota → grounded prompt →
provider (stream/non-stream) → persist message(s) → log. AI never mutates learning state.

## 5. Security architecture

- CSP + HSTS + `X-Content-Type-Options` + `X-Frame-Options: DENY` + Referrer-Policy +
  Permissions-Policy in `next.config.ts`; API responses `no-store`.
- Auth rate limiting at proxy + server; `checkRateLimit` in-memory (non-shared).
- RBAC: `requireAdminUser` for admin APIs; owner-scoped queries use session `userId`.
- Answer-leak prevention: `toPublic` / `assertNoLeak`; correct answers only post-submit.
- Payment webhook: HMAC over Paymob canonical field list, timing-safe compare, idempotent by `providerRef`.
- Input validation via Zod at every mutating boundary; server-authoritative scoring/entitlement.

## 6. Testing

- `tests/unit/*` — Vitest, pure logic (mastery, planner, scoring, cairo, xp, password, validators,
  content lifecycle, billing HMAC, ratelimit, seed data).
- `tests/perf/k6-smoke.js` — smoke load script.
- CI in `.github/workflows` runs lint/typecheck/test/build.

## 7. Deployment

- Vercel-compatible Next build; env vars documented in `.env.example`
  (`DATABASE_URL`, `AUTH_SECRET`, `APP_URL`, `NEXTAUTH_URL`, `AI_*`, `PAYMOB_*`, `CRON_SECRET`,
  `FREE_PRACTICE_DAILY_LIMIT` (legacy `PRACTICE_DAILY_LIMIT`), `FEATURE_*`).
- Daily reconciliation endpoint to be scheduled externally with `x-cron-secret`.
