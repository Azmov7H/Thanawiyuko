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
| T-C1 | P1 | C | Decide/implement `/subjects/[id]` + `/mistakes` | TODO |
| T-C2 | P1 | C | Enable `/progress`, `/study-plan` in nav | TODO |
| T-D1 | P1 | D | Lesson/topic consumption page | TODO |
| T-D2 | P1 | D | Lesson completion → StudySession | TODO |
| T-E1 | P1 | E | Deterministic recommendation engine | TODO |
| T-F1 | P1 | F | DB-driven plans | TODO |
| T-F2 | P1 | F | Free/Plus entitlement matrix enforcement | TODO |
| T-G1 | P1 | G | Admin role/authz + audit viewer | TODO |
| T-H1 | P1 | H | Structured logging + request ids | TODO |
| T-H3 | P1 | H | Integration/authorization tests | TODO |
| T-I1 | P2 | I | Landing page upgrade | TODO |
| T-I3 | P2 | I | RTL accessibility pass | TODO |
| T-J1 | P2 | J | i18n foundation | TODO |
| T-K1 | P2 | K | PDF export architecture | TODO |
| T-L1 | P2 | L | Transactional notifications | TODO |
| T-M1 | P3 | M | Teacher role + profile stub | TODO |
| T-N1 | P1 | N | Restore ops docs + backup/restore drill | TODO |

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
- **Status**: TODO

### T-C2 — Enable shipped student nav routes
- **Description**: `/progress` and `/study-plan` have APIs but are marked "soon" in `AppShell`.
  Implement pages and enable; keep unshipped items non-clickable.
- **Files**: `src/components/AppShell.tsx`, new pages under `src/app/(student)/progress`, `.../study-plan`.
- **Status**: TODO

---

## Phase D — Content Consumption (P1)

### T-D1 — Lesson/topic consumption page
- **Description**: Student-facing topic/lesson reading (text-first, diagrams, optional video embed),
  published-only, entitlement-aware.
- **Files**: new API `src/app/api/lessons/[lessonId]/route.ts`, new pages.
- **Acceptance criteria**: unpublished content never returned to students.
- **Status**: TODO

### T-D2 — Lesson completion logging
- **Description**: Mark-complete / dwell rule logs `StudySession` (no mastery grant per README §4.3).
- **Dependencies**: T-D1.
- **Status**: TODO

---

## Phase E — Personalization (P1)

### T-E1 — Deterministic recommendation engine
- **Description**: Ranked "next" list (mistake review → weakest topic → lesson for repeated
  mistakes → mini-mock), max 3, each with reason. No AI ranking in MVP.
- **Dependencies**: T-B2, T-B4.
- **Status**: TODO

---

## Phase F — Monetization (P1)

### T-F1 — DB-driven plans
- **Description**: Move plans from `server/payments/config.ts` into a `Plan` collection
  (price/duration/features/limits/access/status) with admin editing; keep a typed loader.
- **Status**: TODO

### T-F2 — Entitlement matrix enforcement
- **Description**: Server-side Free vs Plus limits for practice/exam/AI/mocks; centralized
  `hasPlusAccess`/`entitlements` checks; no frontend authority.
- **Status**: TODO

---

## Phase G — Admin (P1)

### T-G1 — Admin roles + audit viewer
- **Description**: Role-based admin capabilities, audit-log read UI, user search/suspend.
- **Status**: TODO

---

## Phase H — Observability & Quality (P1)

### T-H1 — Structured logging + request ids
- **Status**: TODO

### T-H3 — Integration/authorization tests
- **Description**: Add DB-backed integration tests (e.g. `mongodb-memory-server`) for authz and
  critical flows (register→onboarding→practice→submit→progress).
- **Status**: TODO

---

## Phase I/J/K/L — Growth, i18n, PDF, Notifications (P2)
- T-I1 Landing page upgrade — TODO
- T-I3 RTL accessibility pass — TODO
- T-J1 i18n foundation — TODO
- T-K1 PDF export architecture — TODO
- T-L1 Transactional notifications — TODO

## Phase M — Teacher Dimension (P3, V2)
- T-M1 Teacher role + profile stub — TODO
- M2–M5 content studio / analytics / discovery / economy — backlog

## Phase N — Production Readiness (P1)
- T-N1 Restore operational docs (data-minimization, deploy checklist, runbooks, privacy,
  account-deletion SOP) and run a backup/restore drill — TODO
