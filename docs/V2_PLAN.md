# Thanawico — V2 Plan

> Working plan for V2, based on the normative spec (`README.md` §5.4, §6, §7), the
> roadmap's Phase M (teacher dimension), and a fresh audit of current code (this file
> supersedes the Phase M section's sequencing: four tracks run in waves, not one track).
> Track the finished phase in `docs/CURRENT_STATE.md` and per-task detail in `docs/TASKS.md`.

## Tracks (selected)

| Track | Source | Theme |
|---|---|---|
| **T1 — Teacher portal** | ROADMAP M2–M5 | Content studio, teacher analytics, discovery/ranking, economy |
| **T2 — Finish V1.1 gaps** | README §6 V1.1 | Parent portal, i18n, AI rec ranking, leaderboard, `mcq_multi` |
| **T3 — Question-type expansion** | README §6/V2 eval | numerical, ordering, matching + autograding |
| **T4 — Hardening / scale** | README §6, CURRENT_STATE §5.2 | shared rate limiting, observability, integration/authorization tests |

## Current baseline (verified against code)

- Student core is wired: `awardXp` called from learning submit paths; attempts persist mastery/mistakes/XP/streak/plan.
- Content model (`src/server/modules/academic/content.models.ts`): Subject → Unit → Topic → Lesson → Question, lifecycle `draft|review|published|archived`, versioned. Holds **no owner fields** (`createdBy/updatedBy`).
- Question types: `mcq_single`, `true_false` only.
- Teacher: role + `TeacherProfile` stub (`isPublic`, headline/bio/subjectAreas) + `/teacher` area + `requireTeacherUser` guard. **Invite-only, no self-serve join, no publishing rights.**
- Admin: content lifecycle API, exams, users, audit log viewer, plans. Publishing is admin-only (good — keeps four-eyes). Admin content API has no per-item owner (`createdBy` absent).
- Billing: Paymob provider + entitlements + DB-driven plans (`PlanModel`), grace windows. **No payout/wallet mechanism.**
- Notifications: Resend + transactional + weekly-report emails (T-L2 DONE).
- AI: gate + quotas + logging. Deterministic recommendation ranking **is built** (T-E1: `src/lib/recommendations.ts` — review → weakest topic → repeated-mistake lesson → mini-mock).
- Leaderboard: read API + `buildWeeklyLeaderboard` exists but **never scheduled**; references missing `StudentProfile.nickname`; no opt-in.
- i18n: foundation **DONE** (T-J1: `src/lib/i18n/` Arabic dictionary, `useI18n`, locale-aware formatters); app-wide migration incomplete, `en` known-but-disabled.
- Parent: `role` enum reserved only; no `(parent)` route group, no link codes.
- Observability: **DONE** (T-H1 structured logs + request ids; T-N3 Sentry + Upstash distributed rate limiting with in-memory fallback). Residual: proxy still keeps its own per-IP map; multi-instance dedupe not audited.
- Identity convention: `studentId` = `User._id` canonical (T-B1 DONE; only a cosmetic schema-`ref` follow-up remains).
- Quality: typecheck/lint/build green, 30 files / 176 unit tests, 38 integration tests, 6 Playwright a11y.

## Sequencing rationale

1. **Wave 0 first** — teacher dimension can't function without per-item ownership and item-quality signals feeding stats/economy.
2. **Wave 1 (V1.1 gaps) before teacher public launch** — teacher trade/public trust depends on i18n + opt-in leaderboard + parent oversight + recs being solid.
3. **Studio (W2) before analytics/economy (W3/W5)** — analytics & payouts need published, consumed teachers' content.
4. **Question types (T3) parallelizes** — isolated model/autograder work; land after `mcq_multi` (V1.1) to reuse the extension pattern.
5. **Hardening (T4) is continuous** — every wave's APIs ship with integration/authz tests; rate-limit shared store lands before any public teacher surface.

---

## Wave 0 — Foundations (P0, prerequisite for T1)

- **F0.1 Teacher identity self-serve.** Registration/join path for teachers (apply → super approves; keep invite-only internal flag). Expand `TeacherProfile`: penName, avatar, subjects, public links, `verified`, `approvalStatus`. Migrate existing stub to optional fields (no breaking change).
- **F0.2 Content ownership.** Add `createdBy`/`updatedBy` (User id) + `source: "team"|"teacher"` to content models. Publish authority stays admin/super (four-eyes) — teachers get `submitForReview`.
- **F0.3 Item-quality signals.** New aggregate collector: per-question attempts/correct/distractor picks → difficulty + discrimination. Fed by the existing submit path (publish/de-queue, no PII).
- **F0.4 Identity-convention debt.** `studentId` = `User._id` is already canonized (T-B1); here align the remaining schema `ref` declarations (cosmetic, no data migration) so new teacher-stats writers don't reintroduce drift.
- **F0.5 Ops baseline.** Extend existing structured logging + Sentry to the new teacher APIs; add release tagging; auditor: proxy vs server rate-limit duplication.

*Exit:* teacher can join via approval flow; content items carry owners; item stats begin collecting on every submitted attempt; no correctness regressions (176 tests stay green).

## Wave 1 — Close V1.1 gaps (P1, T2)

- **T2.1 i18n — complete migration.** Foundation exists (T-J1); finish wrapping all student/teacher/admin/auth strings through `useI18n()`, then add `dictionaries/en.ts` (J3) without UI changes. RTL/LTR abstraction stays Arabic-default.
- **T2.2 Parent portal (read-only).** Link-code join (student approves → student,L 1–2 parents); parent area views weekly summary, mastery by subject, study time, streak, subscription. **No** AI transcripts, no per-question answers, no messaging.
- **T2.3 Leaderboard (opt-in).** Add `nickname` to `StudentProfile` (edit UI + validation), `optInLeaderboard` flag, schedule `buildWeeklyLeaderboard` daily (cron/route), personal rank shown, anti-abuse XP caps.
- **T2.4 Rec ranking surfaces.** Engine exists (T-E1); surface ranked recommendations in the study planner and shared aggregates — no new ranking logic, reuse `src/lib/recommendations.ts`.
- **T2.5 `mcq_multi` question type.** Partial credit model + scoring + review UI + snapshot compat, extending the pattern `mcq_multi` later reuses.

*Exit:* new routes in i18n, parent portal + no-PII invariant tested, leaderboard live + scheduled, recs ranked, multi-select practiceable end-to-end.

## Wave 2 — Teacher content studio (P1, M2)

- **T1.2.1 Teacher dashboard (own content).** List lessons/questions with status (`draft|review|published`), counts, re-open drafts.
- **T1.2.2 Studio editors.** Lesson editor (rich text, `.prose-rtl`, math LTR blocks), question builder for all supported types, metadata (subject/unit/topic, tags, explanation gate), autosave drafts.
- **T1.2.3 Review workflow.** Teacher → `review` → admin/super approve → `published`/`archived`; version bump; mastery snapshots invalidated on edit (reuse `nextVersion` + `canTransition`).
- **T1.2.4 Live preview.** RTL student-view preview (practice fill + locked feedback + explanation), answer-leak safe (no `toPublic` bypass).

*Exit:* teacher publishes a lesson + questions through the approval pipeline; preview matches student rendering; audit log records transitions.

## Wave 3 — Teacher analytics (P2, M3)

- **T1.3.1 Item stats UI.** Per-question difficulty, % correct, common distractors; per-lesson reads/completions; subject breakdown — aggregate only, no PII, confidence labels on low sample.
- **T1.3.2 Teacher portlets.** Own-content performance dashboard using Wave-0 signals.

*Exit:* teacher sees aggregate item stats for own published content; numbers match admin-exam reports.

## Wave 4 — Discovery & ranking (P2, M4)

- **T1.4.1 Public teacher profile.** `/teacher/[handle]` public page gated by `isPublic` + `verified`; follow toggle (authenticated).
- **T1.4.2 Signals + fair ranking.** Engagement/completion-weighted ranking (quality over popularity); scheduled recompute; opt-out.

*Exit:* public teacher discovery works, ranking deterministic and explained.

## Wave 5 — Teacher economy (P3, M5)

- **T1.5.1 Reward formula.** Deterministic server-side payout points from item-quality + engagement signals; caps, cooling-off, monthly settlement window.
- **T1.5.2 Wallet + ledger.** Balance ledger (immutable entries), withdrawal requests → admin approval → Paymob payout; audit-logged; `Retry-After`-style failure UX reusing billing patterns.
- **T1.5.3 Earnings reports.** Earnings/payout history with eligibility metadata.

*Exit:* teacher earns, withdraws with admin approval, ledger reconciles with payouts; no rollback possible (immutable entries).

## Wave 6 — Question-type expansion (P3, T3)

- **T6.1 numerical** (tolerance), **ordering**, **matching** — model extensions, robust autograder, Arabic RTL math rendering, review UI.
- **T6.2 Feedback/explanation parity** with existing types; snapshot + `toPublic` safety preserved.

*Exit:* all three types fully practiceable/examinable with autograding deterministic in RTL math.

## Wave 7 — Hardening / scale (P1, continuous, T4)

- **T4.1 Shared rate limiting — complete.** Upstash support exists (T-N3); audit remaining in-memory paths (proxy per-IP map, any service-level buckets), make multi-instance behaviour explicit and tested with the distributed store configured.
- **T4.2 Integration + authorization tests.** Every new public/teacher/admin API ships with tests; IDOR/authorization matrix coverage; CI gate extends to integration suite (suite + harness already exist).
- **T4.3 Upload & secrets review** (teacher avatars/images, CSP exclusions), IDOR sweep on new scoped queries.
- **T4.4 Perf budgets.** Bundle + query budgets; k6 load on studio + item-stats.

*Exit:* rate-limit shared-store live, integration suite green in CI, no new IDOR findings.

---

## Dependency graph

```
Wave 0 ─┬─► Wave 1 (i18n, parent, leaderboard, recs, mcq_multi)
        └─► Wave 2 (studio) ──► Wave 3 (analytics) ──► Wave 4 (discovery) ──► Wave 5 (economy)
Wave 6 (question types) ── parallel, after T2.5
Wave 7 ── continuous, gated: public teacher surfaces require T4.1 + T4.2 foundations
```

## Risks

| Risk | Mitigation |
|---|---|
| Teacher quality variance at scale | Four-eyes review stays (admin publishes); item-quality signals inform ranking |
| Payment/payout complexity (M5) | Reuse Paymob + grace patterns; immutable ledger; admin approval gate |
| i18n churn / scope creep | Incremental wrapping; Arabic stays default; no UI rewrite |
| Parent-PII exposure | Aggregate-only invariant + tests; no transcripts/answers |
| Question-type autograding bugs in RTL math | Deterministic autograder + unit tests before UI |
| Rate-limit migration regression | Keep proxy limit as first line; shared store behind service abstraction |
| mcq_multi / snapshot compat | Version checks on attempt snapshots; migration for new types only |

## Definition of Done per wave

- Typecheck + lint + build green; existing 176 unit + 38 integration + 6 a11y tests stay green.
- New APIs have unit/integration tests (authz + IDOR positive/negative).
- Audit log on every teacher/admin mutation (G1 invariant).
- Docs updated (`CURRENT_STATE.md`, `TASKS.md`, `ARCHITECTURE.md` as needed).
- No PII in logs; no new secrets in repo.