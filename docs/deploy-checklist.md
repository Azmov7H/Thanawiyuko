# قائمة التحقق قبل النشر الإنتاجي (Production Deploy Checklist)

**يجب إكمال كل بند قبل ترقية `main` إلى الإنتاج.**

---

## 1. الكود والجودة (Code & Quality)
- [ ] `npm test` — جميع الاختبارات خضراء (77/77)
- [ ] `npm run typecheck` — صفر أخطاء TypeScript
- [ ] `npm run lint` — صفر أخطاء ESLint (التحذيرات مقبولة)
- [ ] `npm run build` — بناء ناجح بدون أخطاء
- [ ] لا `console.log` / `debugger` في كود الإنتاج
- [ ] لا `any` صريح في الكود الجديد (تحقق من `no-explicit-any`)
- [ ] تغطية الاختبارات ≥ 80% للمنطق الحرج (mastery، scoring، billing، auth)

## 2. الأمان (Security)
- [ ] `AUTH_SECRET` مولد بقوة (`openssl rand -base64 32`) ومخزن في Vercel فقط
- [ ] `PAYMOB_API_KEY`، `PAYMOB_HMAC_SECRET`، `PAYMOB_INTEGRATION_ID` مضبوطة في Vercel
- [ ] `AI_GATEWAY_KEY`، `AI_GATEWAY_URL`، `AI_MODEL_*` مضبوطة
- [ ] `DATABASE_URL` يشير لـ Atlas Production Cluster (وليس Dev)
- [ ] `CRON_SECRET` مولد ومضبط في Vercel + جدولة Cron
- [ ] لا أسرار في `.env.local` أو الكود أو Git history
- [ ] CSP، HSTS، CSP Nonce (إن وجد) مختبرة على Staging
- [ ] Rate Limits مفعلة على `/api/auth/*`، `/api/ai/*`
- [ ] `X-Frame-Options: DENY`، `HSTS`، `CSP` مفعلة في `next.config.ts`
- [ ] لا `eval`، لا `dangerouslySetInnerHTML` بدون تنظيف
- [ ] `AuditLog` يسجل كل عمليات الأدمن، الدفع، الحذف، تغيير الأسرار

## 3. قاعدة البيانات (Database)
- [ ] Atlas Production Cluster: M10+، Auto-scaling، Backup PITR مفعل (30 يوم)
- [ ] Indexes: جميع الفهارس في `src/server/modules/**/*.model.ts` مطبقة
- [ ] Unique Constraints: `userId+clientAttemptId`، `providerRef`، `email`، إلخ
- [ ] TTL Indexes: `AIConversation.messages` (cap 200)، `Notification` (إن وجد)
- [ ] Seed Data: منهج الصف الثالث الثانوي (3 شعب) محمل ومحتمل
- [ ] Achievements: 10 شارات MVP مزروعة
- [ ] Plans: 3 خطط (monthly/semester/annual) بأسعار صحيحة

## 4. الدفع (Payments - Paymob)
- [ ] `PAYMOB_API_KEY`، `PAYMOB_HMAC_SECRET`، `PAYMOB_INTEGRATION_ID` في Vercel Production
- [ ] Webhook URL مسجل في Paymob Dashboard: `https://thanawico.com/api/subscription/webhook`
- [ ] HMAC Verification يعمل (اختبار يدوي من Paymob Dashboard)
- [ ] `GRACE_DAYS=3`، `CURRENCY=EGP` مضبوطة
- [ ] خطط الأسعار: Monthly 129، Semester 449، Annual 799 (EGP)
- [ ] اختبار سيناريوهات: نجاح، فشل، إلغاء، استرداد، تجديد
- [ ] Grace Period Cron مجدول يومياً (`CRON_SECRET` محمي)

## 5. الذكاء الاصطناعي (AI)
- [ ] `AI_GATEWAY_KEY`، `AI_GATEWAY_URL`، `AI_MODEL_TUTOR`، `AI_MODEL_TUTOR_PREMIUM`، `AI_MODEL_FALLBACK` في Vercel
- [ ] Quotas: Free 10/يوم، Plus 100/يوم، 8/دقيقة، 800 token response cap
- [ ] Golden Eval: 100 زوج محفوظ في `prompts/eval/golden.json` (CI gate)
- [ ] Prompt Templates: `prompts/v1/tutor.*`، `prompts/v1/mistake-explainer.*` مؤرشفة
- [ ] RAG: Lesson chunks loader يعمل (Top-3 chunks per topic)
- [ ] Cache: 7 يوم TTL للشرح المتطابق
- [ ] Cost Alert: 80% budget → Slack/Email
- [ ] Feature Flags: `AI_ENABLED`، `AI_FALLBACK_ONLY` جاهزة للإغلاق

## 6. الأداء (Performance)
- [ ] Lighthouse CI: Performance ≥ 90، Accessibility ≥ 95، Best Practices ≥ 90
- [ ] Bundle Budget: Initial JS ≤ 220KB gz (Student shell)
- [ ] API p95: `/api/health` < 100ms، `/api/practice/start` < 500ms، `/api/ai/tutor` first token < 3s
- [ ] DB Queries: جميع الفهارس مستخدمة، لا full collection scans
- [ ] Images: `next/image` مع AVIF/WebP، `loading=lazy`، `placeholder=blur`
- [ ] Fonts: `IBM Plex Sans Arabic` subset، `display=swap`
- [ ] Caching: Redis (Upstash) لـ content lists (1h)، mastery (5min)، AI explanations (7d)

## 7. الوصولية (Accessibility)
- [ ] axe-core CI: صفر انتهاكات Critical/Serious على الصفحات الحرجة
- [ ] Keyboard-only navigation: جميع التدفقات (Quiz، Exam، AI، Subscription)
- [ ] Arabic screen reader labels: `aria-label`، `aria-describedby`، `role`
- [ ] Contrast: WCAG AA (4.5:1 للنص، 3:1 للعناصر الكبيرة)
- [ ] Focus visible: جميع العناصر التفاعلية لها `:focus-visible`
- [ ] RTL: جميع التخطيطات تنقلب بشكل صحيح، الأرقام LTR
- [ ] Reduced Motion: `prefers-reduced-motion` معطل للرسوم المتحركة

## 8. المراقبة والبلاغات (Observability & Alerting)
- [ ] Sentry DSN في Vercel Production، Source Maps مرفوعة
- [ ] Alerts: Error rate > 1%، Latency p95 > 1s، AI Cost > 80%، Payment Failures > 5%
- [ ] Logs: JSON strukturado، لا PII، لا أسرار، `requestId` للتبعية
- [ ] AuditLog: جميع عمليات الأدمن، الدفع، الحذف، تغيير الاشتراك
- [ ] Dashboards: Vercel Analytics، Sentry، Atlas Metrics، Upstash Metrics

## 9. النسخ الاحتياطي والاستعادة (Backup & Restore)
- [ ] Atlas PITR: 30 يوم، Snapshots يومية
- [ ] R2 Versioning: مفعل، Lifecycle rules للأرشفة
- [ ] Restore Drill: شهري موثق (`scripts/restore-drill.sh`)
- [ ] RTO/RPO موثق: DB 4h/24h، App 15m/0، Files 1h/0

## 10. الخصوصية والقانون (Privacy & Legal)
- [ ] Privacy Policy مراجعة قانونية، منشورة في `/privacy`
- [ ] Terms of Service منشورة في `/terms`
- [ ] Cookie Banner (إن وجد) مطابق للقانون المصري
- [ ] Data Minimization Doc محدث (`docs/data-minimization.md`)
- [ ] Account Deletion SOP موثق ومختبر (`docs/account-deletion-sop.md`)
- [ ] Minor Consent: خانة اختيار ولي الأمر في التسجيل
- [ ] Data Export API: `GET /api/account/export` يعيد JSON كامل
- [ ] Account Deletion SOP: 30 يوم مهلة، Pseudonymization، Audit Log
- [ ] عقود معالجة البيانات (DPA) مع: MongoDB Atlas، Upstash، Cloudflare، Paymob، OpenRouter

## 11. CI/CD والنشر (CI/CD)
- [ ] GitHub Actions: lint → typecheck → test → build على كل PR
- [ ] Preview Deployments: كل PR ينشر على Vercel Preview
- [ ] Staging: فرع `staging` ينشر تلقائياً، بيئة منفصلة
- [ ] Production: فرع `main` فقط، يتطلب موافقة يدوية (Manual Approval)
- [ ] Secret Scanning: GitHub Secret Scanning مفعل
- [ ] Dependabot: مفعل، PRs تلقائية للـ security updates
- [ ] Rollback: `vercel rollback` مختبر، RTO < 15 دقيقة

## 12. العمليات اليومية (Day 1 Operations)
- [ ] Runbooks موثقة: `docs/runbooks.md` (سيناريوهات، RCA template، Feature Flags)
- [ ] Feature Flags: جميع الـ 9 أعلام معرفة، `FEATURE_*` في Vercel
- [ ] On-call Rotation: جدول، أرقام، Slack/Email alerts
- [ ] Incident Template: `docs/runbooks.md` قسم 1
- [ ] Postmortem Process: بلاغ → RCA → إجراءات تصحيحية → تحديث Runbooks
- [ ] Staging Parity: نفس المتغيرات، نفس البنيان، بيانات اختبار واقعية

## 13. إطلاق اليوم صفر (Launch Day)
- [ ] Feature Flags: `AI_ENABLED=true`، `PAYMENTS_ENABLED=true`، `EXAMS_ENABLED=true`
- [ ] مراقبة مكثفة: 4 ساعات أول 24 ساعة (فريق كامل)
- [ ] خطة تراجع: Feature Flag `MAINTENANCE_MODE=true` جاهزة
- [ ] خطة اتصال: قالب إعلان للمستخدمين (عربي، RTL)
- [ ] دعم العملاء: بريد/نموذج جاهز، FAQ محدث

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