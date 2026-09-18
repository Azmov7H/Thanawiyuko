# قائمة التحقق قبل النشر الإنتاجي (Production Deploy Checklist)

**يجب إكمال كل بند قبل ترقية `main` إلى الإنتاج.**
**آخر تحديث:** 2026-09-18

> البنود الموسومة بـ `GAP` غير منفّذة بعد في الكود؛ تُعامل كمانع إطلاق (Launch Blocker)
> ما لم يُتفق على تأجيلها صراحةً. راجع `docs/runbooks.md` §0 و`docs/TASKS.md`.

---

## 1. الكود والجودة (Code & Quality)
- [ ] `npm test` — 118 اختبار وحدة خضراء
- [ ] `npm run test:integration` — 10 اختبارات تكامل خضراء (تتطلب MongoDB؛ CI يوفّر `mongo:8`)
- [ ] `npm run test:a11y` — 4 اختبارات وصولية (Playwright + axe) خضراء
- [ ] `npm run typecheck` — صفر أخطاء TypeScript
- [ ] `npm run lint` — صفر أخطاء ESLint
- [ ] `npm run build` — بناء ناجح بدون أخطاء
- [ ] لا `console.log` / `debugger` في كود الإنتاج
- [ ] لا `any` صريح في الكود الجديد (`no-explicit-any`)
- [ ] تغطية المنطق الحرج (mastery، scoring، billing، auth، admin authz، learning loop) مغطاة

## 2. الأمان (Security)
- [ ] `AUTH_SECRET` مولّد بقوة (`openssl rand -base64 32`) ومخزّن في منصة النشر فقط
- [ ] `PAYMOB_API_KEY`، `PAYMOB_HMAC_SECRET`، `PAYMOB_INTEGRATION_ID` مضبوطة
- [ ] `AI_GATEWAY_KEY`، `AI_GATEWAY_URL`، `AI_MODEL_*` مضبوطة
- [ ] `DATABASE_URL` يشير إلى عنقود الإنتاج (وليس Dev)
- [ ] `CRON_SECRET` مولّد ومضبوط، وجدولة `/api/cron/reconcile` يوميًا
- [ ] لا أسرار في `.env.local` أو الكود أو Git history (استخدم `.env.example` للقوالب)
- [ ] رؤوس الأمان مختبرة: CSP/HSTS/X-Frame-Options/Referrer-Policy/Permissions-Policy
      (`next.config.ts`) + `src/proxy.ts`
- [ ] Rate limit على مسارات المصادقة (5/دقيقة) — `rateLimit()` (T-N3)؛
      على تعدد النسخ فعّل `UPSTASH_REDIS_REST_URL`/`_TOKEN` لتوزيع الحدود
- [ ] لا `eval`، ولا `dangerouslySetInnerHTML` بدون تنظيف
- [ ] `AuditLog` يسجّل: عمليات الأدمن (`user.*`، `plan.update`، محتوى/امتحانات) والاسترداد
      (`payment.refund`)

## 3. قاعدة البيانات (Database)
- [ ] عنقود الإنتاج: Backup/PITR مفعّل (30 يومًا)
- [ ] جميع الفهارس (بما فيها `unique`) في `src/server/modules/**/*.model.ts` مطبّقة
- [ ] قيود فريدة: `email`، `Attempt(userId+clientAttemptId)`، `UserAchievement(studentId+achievementId)`، `Subscription.studentId`، `Payment.providerRef`
- [ ] Seed المنهج: `npm run seed:curriculum` (idempotent، إصدار `2026.1-sec3-skeleton`)
- [ ] Seed الإنجازات: `npm run seed:achievements` (10 شارات، idempotent) — **مطلوب** وإلا
      لن تُفتح أي شارة (`evaluateAchievements` يتخطى الرموز غير المزروعة)
- [ ] كتالوج الخطط: يُزرع تلقائيًا من `src/server/payments/config.ts` (`ensurePlansSeeded`)
      وقابل للتعديل من الأدمن (`PATCH /api/admin/plans`) — **لا تُثبّت الأسعار نصيًا في
      الواجهات التسويقية** (README §3.2)
- [ ] أول مسؤول: `npm run make-admin -- user@example.com`

## 4. الدفع (Payments — Paymob)
- [ ] مفاتيح Paymob مضبوطة في بيئة الإنتاج
- [ ] Webhook مسجّل: `https://<domain>/api/subscription/webhook`
- [ ] التحقق من HMAC يعمل (اختبار يدوي من Paymob Dashboard)
- [ ] `GRACE_DAYS=3`، `CURRENCY=EGP` (ثوابت في `src/server/payments/config.ts`)
- [ ] الأسعار من مصدر واحد: `PLANS` (Seed) + جدول `Plan` — تُراجع تجاريًا ولا تُنشر كوعود ثابتة
- [ ] سيناريوهات مختبرة: نجاح، فشل، إلغاء، استرداد، تجديد
- [ ] Cron Grace مجدول ومحمي بـ `CRON_SECRET`

## 5. الذكاء الاصطناعي (AI)
- [ ] `AI_GATEWAY_KEY`، `AI_GATEWAY_URL`، `AI_MODEL_TUTOR`، `AI_MODEL_TUTOR_PREMIUM`، `AI_MODEL_FALLBACK` مضبوطة
- [ ] الحدود: Free 10/يوم، Plus 100/يوم، 8/دقيقة، `AI_RESPONSE_CAP=800` (`src/server/ai/config.ts`)
- [ ] قوالب البرومبت موجودة ومؤرشفة (`prompts/v1/tutor.*`, `prompts/v1/mistake-explainer.*`)
- [ ] تقييم AI (`src/server/ai/eval.ts` + `tests/unit/ai-eval.test.ts`) أخضر؛ لا تراجع >5%
- [ ] كاش الشرح وفق `AI_EXPLANATION_CACHE_TTL` (افتراضي 7 أيام)
- [ ] `GAP`: تنبيه التكلفة عند 80% (`AI_BUDGET_ALERT_PCT`) غير موصول بقناة تنبيه بعد

## 6. الأداء (Performance)
- [ ] مراجعة حجم الحِزم (Initial JS) يدويًا عبر تقرير `next build`
- [ ] لا استعلامات ممسوحة بالكامل على المجموعات الساخنة (راجع الفهارس)
- [ ] الصور/الخطوط: تحميل كسول، `display=swap`، RTL سليم
- [ ] `GAP`: لا Lighthouse CI مُفعّل بعد (`lighthouserc.json` موجود؛ لا job)
- [ ] `GAP`: لا اختبار حمل k6 مُفعّل بعد (`tests/perf/k6-smoke.js` موجود)
- [ ] `GAP`: لا طبقة كاش موزّع (Redis/Upstash) بعد

## 7. الوصولية (Accessibility)
- [ ] `npm run test:a11y` أخضر: صفر انتهاكات على الصفحات العامة والحرجة
- [ ] تنقّل لوحة المفاتيح كامل (Quiz، Exam، AI، الحوارات، الاشتراك)
- [ ] تسميات عربية لقارئ الشاشة (`aria-label`، `role`، `sr-only`)
- [ ] تباين WCAG AA (4.5:1 نص، 3:1 عناصر كبيرة) — رموز `globals.css`
- [ ] `:focus-visible` واضح، وأهداف لمس ≥44px
- [ ] RTL منضبط؛ `prefers-reduced-motion` محترم

## 8. المراقبة والتنبيهات (Observability & Alerting)
- [ ] سجلات JSON مع `requestId` وحجب PII (`src/lib/logger.ts`)
- [ ] `LOG_LEVEL` مضبوط لبيئة الإنتاج
- [ ] `AuditLog` يعمل لكل عمليات الأدمن والدفع
- [ ] مراقبة الأخطاء (Sentry) مفعّلة: `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (البنية جاهزة T-N3)
- [ ] `GAP`: تنبيه تكلفة الذكاء الاصطناعي (`AI_BUDGET_ALERT_PCT`) غير موصول بقناة تنبيه بعد
      (تنبيهات Error rate/Latency متاحة عبر Sentry)

## 9. النسخ الاحتياطي والاستعادة (Backup & Restore)
- [ ] نسخ احتياطية/PITR مفعّلة على عنقود الإنتاج
- [ ] تمرين الاستعادة الشهري منفّذ وموثّق: `scripts/restore-drill.sh`
- [ ] RTO/RPO موثّق: DB 4h/24h، App 15m/0 (انظر `docs/runbooks.md` §4)

## 10. الخصوصية والقانون (Privacy & Legal)
- [ ] `docs/privacy-policy.md` مراجَعة قانونيًا
- [x] صفحتا `/privacy` و`/terms` مبنيّتان ومربوطتان من الفوتر وsitemap
- [x] خانة موافقة ولي الأمر إلزامية في التسجيل (`guardianConsentAt`)
- [x] `GET /api/account/export` (تصدير JSON) — مدمج من صفحة `/settings`
- [x] حذف الحساب: طلب + تراجع + تنفيذ نهائي عبر cron — `docs/account-deletion-sop.md`
- [x] `docs/data-minimization.md` محدّث ومراجَع
- [ ] عقود معالجة بيانات (DPA) مع: Atlas، Paymob، OpenRouter، ومنصة النشر

## 11. CI/CD والنشر (CI/CD)
- [ ] GitHub Actions: `build-test` (lint → typecheck → test → build) + `integration` + `a11y`
- [ ] Preview Deployments لكل PR
- [ ] الإنتاج من `main` فقط، مع موافقة يدوية
- [ ] Secret Scanning وDependabot مفعّلان
- [ ] خطة تراجع مختبرة: `vercel rollback` (RTO < 15 دقيقة)

## 12. العمليات اليومية (Day 1 Operations)
- [ ] Runbooks محدّثة: `docs/runbooks.md` (سيناريوهات، RCA، أعلام)
- [ ] Feature Flags مُفعّلة: `FEATURE_*` تُقرأ في `featureGate()` والـ proxy (T-N3)؛
      توثيقها في `.env.example`
- [ ] جدول on-call وأرقام ومصادر تنبيه
- [ ] قالب الحادث (Runbooks §1) + عملية Postmortem

## 13. إطلاق اليوم صفر (Launch Day)
- [ ] مراقبة مكثفة أول 24 ساعة
- [ ] خطة تواصل/إعلان للمستخدمين (عربي، RTL)
- [ ] دعم العملاء: بريد/نموذج + FAQ

---

## توقيع الإطلاق (Launch Sign-off)

| الدور | الاسم | التوقيع | التاريخ |
|--------|------|---------|--------|
| Tech Lead | | | |
| DevOps | | | |
| DPO / Privacy | | | |
| Product Owner | | | |
| Security Review | | | |

**الإطلاق معتمد فقط عند اكتمال جميع البنود أعلاه وتوقيع جميع الأطراف.**
