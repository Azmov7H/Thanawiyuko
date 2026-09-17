# Thanawico — Roadmap

> Derived from `docs/CURRENT_STATE.md` and the normative spec in `README.md`.
> Phases are ordered by dependency and risk: fix broken core → security/data integrity →
> core student loop → monetization/ops → growth/V1.1 → teacher dimension (V2).

Legend: **P0** critical, **P1** high, **P2** medium, **P3** enhancement.

---

## Phase A — Audit & Architecture (P0) — *in progress*
Establish a single source of truth for state, architecture, and remaining work.
- `docs/CURRENT_STATE.md`, `docs/ARCHITECTURE.md`, `docs/ROADMAP.md`, `docs/TASKS.md`.
- Exit: docs match code; risk areas identified.

## Phase B — Learning Loop Correctness (P0)
The product's core promise (mastery/mistakes/XP/streak/plan) currently reads data that is never written.
- B1. Standardize student identity convention (`studentId` = User id) across learning records.
- B2. On attempt submit: update `TopicMastery` (recency-weighted, last 20), create/resolve `Mistake`,
  award XP (difficulty, first-attempt effort, exam bonus, daily cap, time gate), update `Streak`,
  evaluate achievements — atomically once per attempt.
- B3. Fix readers that assume the above data: progress/study-plan/weak-topic inputs
  (`recentActivity`, `examWeight`).
- B4. Cairo-day consistency in gamification; remove/replace stubbed achievement rules.
- Exit: one practice session changes dashboard, mistakes, XP, streak, and plan; tests cover pure rules.

## Phase C — Broken UX Repair (P0/P1)
- C1. Decision on `/subjects/[id]` + `/mistakes` routes: implement lesson/topic consumption or remove dead links.
- C2. Enable `/progress` and `/study-plan` in nav (APIs exist) or keep explicitly "soon" with no dead links.
- C3. Empty/error/loading states audit across student surfaces.

## Phase D — Content Consumption (P1)
- D1. Topic/lesson page (text-first + diagrams + optional video embed) with publish gating.
- D2. Lesson completion → `StudySession` logging (no mastery grant, per README §4.3).
- D3. Subject browse page + practice entry points.
- D4. Bookmarks and basic content/question search.

## Phase E — Personalization & Recommendations (P1)
- E1. Deterministic recommendation engine (mistake review, weakest topic, lesson for repeated mistake, mini-mock).
- E2. Planner input completion (recent activity, subject weights, exam-close mode) per README §4.8.
- E3. Weak-topic detection per README §4.7 (three OR conditions) surfaced consistently.

## Phase F — Monetization & Plans (P1)
- F1. DB-driven plans (price/duration/features/limits/access/status) replacing hardcoded `PLANS`.
- F2. Free vs Plus entitlement matrix enforced server-side (practice/exam/AI/PDF/export limits).
- F3. Paymob production hardening (live keys, refunds, receipts, failure UX, dunning copy).
- F4. Content access grants (free/paid/course/content) with server-side enforcement.

## Phase G — Admin & Operations (P1)
- G1. Admin authz expansion (role-based, server-enforced) + audit-log viewer.
- G2. User management (search/suspend/role, no password access).
- G3. Finance: payments, refunds, subscriptions, revenue reports.
- G4. Config: plans, feature flags, subjects/grades, quotas.

## Phase H — Observability, Security & Quality (P1)
- H1. Structured logging + request ids + error tracking; no sensitive data in logs.
- H2. Rate limiting to a shared store (Redis) for multi-instance; proxy/server dedupe.
- H3. Integration + authorization + critical-flow tests; CI gates.
- H4. Security review: IDOR, injection, uploads (when added), secrets handling, session hardening.

## Phase I — SEO, Growth & Accessibility (P2)
- I1. Landing page upgrade (value prop, journeys, social proof, FAQ) — ethical conversion only.
- I2. Structured data, canonicals, sitemap refinement; private routes noindex (done).
- I3. Accessibility pass in RTL (keyboard, semantics, contrast, dialogs).
- I4. Performance budgets (bundle, images, queries) and measurement.

## Phase J — Internationalization Foundation (P2)
- J1. Translation keys + centralized dictionaries; `ar` first.
- J2. Locale-aware dates/numbers/currency; RTL/LTR abstraction.
- J3. Add `en` without rewriting UI.

## Phase K — PDF & Export (P2)
- K1. Reusable PDF architecture (Arabic/RTL, paginated, no UI artifacts).
- K2. Progress report, exam result, mistake report exports (server-side, entitlement-aware).

## Phase L — Notifications (P2)
- L1. Transactional notifications with quiet hours (22:00–07:00 Cairo) and preferences.
- L2. Weekly report + milestone + subscription/content-correction events.

## Phase M — Teacher Dimension (V2, P3)
- M1. Teacher role, profile stub, invite-only internal content role (four-eyes publishing).
- M2. Teacher content studio (structured content model, draft/publish, live preview).
- M3. Teacher analytics (privacy-respecting aggregate).
- M4. Discovery signals (followers, engagement, completion) and fair ranking.
- M5. Teacher economy: server-side reward formula, wallet, withdrawals with audit + admin approval.

## Phase N — Production Readiness (P1, continuous)
- N1. Backup/restore drill, deploy checklist, runbooks (restore deleted `docs/` operational files).
- N2. Privacy/data-minimization docs for minors; account deletion flow.
- N3. Load/perf validation (k6), failure-mode review, rollback plan.

---

## Sequencing rationale
1. Phase B before everything: no progress product without persisted outcomes.
2. Phase C/D immediately after: make the loop visible and fix dead ends.
3. Phase F/G before growth: monetization + ops must be trustworthy.
4. Teacher dimension (M) last: README explicitly scopes self-serve teachers to V2.
