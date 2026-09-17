# دليل العمليات (Runbooks) — ثانويكو

**الهدف:** إجراءات موحدة للاستجابة للحوادث، النشر، والصيانة الدورية.

---

## 1. قالب البلاغ عن الحادث (Incident Report Template)

```markdown
# INC-YYYYMMDD-###: [عنوان مختصر]

**الحالة:** 🔴 حرجة / 🟠 عالية / 🟡 متوسطة / 🟢 منخفضة
**المكتشف:** [الاسم / نظام المراقبة]
**الوقت (قاهرة):** YYYY-MM-DD HH:MM
**الخدمات المتأثرة:** [API، Web، AI، Payments، DB]
**التأثير على المستخدمين:** [نسبة، شريحة]

## الوصف
[وصف مختصر لما حدث، أعراض، رسائل خطأ]

## الجدول الزمني
- HH:MM — الكشف
- HH:MM — بدء الاستجابة
- HH:MM — التخفيف (Mitigation)
- HH:MM — الحل (Resolution)
- HH:MM — إغلاق البلاغ

## السبب الجذري (RCA)
[تحليل 5 Why's]

## الإجراءات التصحيحية
- [ ] إجراء فوري
- [ ] إجراء وقائي (خلال أسبوع)
- [ ] إجراء استراتيجي (خلال شهر)

## الدروس المستفادة
[ما تعلمناه، تحديثات للـ Runbooks]
```

---

## 2. سيناريوهات شائعة (Common Scenarios)

### 2.1 قاعدة البيانات غير متاحة (DB Down)
**الأعراض:** أخطاء 500/503 في API، `MongoNetworkError`، `connection refused`
**التشخيص:**
```bash
# 1. تحقق من حالة Atlas
atlas clusters describe <cluster> --output=json
# 2. تحقق من الـ IP Whitelist
# 3. تحقق من الـ Connection String في Vercel/Env
```
**التخفيف:**
- تفعيل `maintenance mode` (Feature Flag: `MAINTENANCE_MODE=true`)
- صفحة `/maintenance` ثابتة مع رسالة عربية
- إعادة تشغيل Vercel deployment (يفرض إعادة اتصال)
**الحل:** إصلاح الـ IP / ترقية Cluster / استعادة من PITR

### 2.2 الذكاء الاصطناعي لا يستجيب / بطيء جداً
**الأعراض:** `/api/ai/tutor` يستغرق >30s، أخطاء 504، `quota exceeded`
**التشخيص:**
- تحقق من `AI_GATEWAY_KEY` وصلاحية الرصيد
- تحقق من `AI_GATEWAY_URL` (OpenRouter status)
- تحقق من الـ Rate Limits (8/دقيقة، 100/يوم للبلس)
**التخفيف:**
- Feature Flag: `AI_ENABLED=false` (يغلق الشات، يبقي التدريب)
- Fallback: الرد المخزن محلياً (Cached explanations)
- زيادة `AI_RESPONSE_CAP` مؤقتاً
**الحل:** ترقية خطة OpenRouter / تبديل المزود / تحسين البرومبت

### 2.3 فشل الدفع (Paymob Webhook Failures)
**الأعراض:** مستخدمون دفعوا لكن الاشتراك لم يتفعل، أخطاء 500 في `/api/subscription/webhook`
**التشخيص:**
- تحقق من `PAYMOB_HMAC_SECRET` (تطابق التوقيع)
- تحقق من `PAYMOB_API_KEY` وصلاحية `INTEGRATION_ID`
- راجع `AuditLog` لـ `payment.failed`
**التخفيف:**
- تفعيل `PAYMENTS_MANUAL_MODE=true` (تفعيل يدوي من أدمن)
- إعادة إرسال الـ Webhook يدوياً من Paymob Dashboard
**الحل:** إصلاح الـ Secret / تحديث Integration ID / تواصل دعم Paymob

### 2.4 تسريب بيانات / وصول غير مصرح
**الأعراض:** بلاغ مستخدم، نشاط مشبوه في `AuditLog`، بريد من باحث أمني
**الإجراء الفوري:**
1. عزل الحساب/الحسابات المتأثرة (`status: suspended`)
2. تدوير جميع الأسرار: `AUTH_SECRET`، `PAYMOB_HMAC_SECRET`، `AI_GATEWAY_KEY`، `DATABASE_URL`
3. إلغاء جميع الجلسات (`SessionModel.deleteMany({})`)
4. إشعار DPO + الجهات المختصة (خلال 72 ساعة حسب القانون المصري)
5. تحقيق كامل + تقرير RCA

### 2.5 نفاد حصة الذكاء الاصطناعي (AI Quota Exhausted)
**الأعراض:** مستخدمون بلس يحصلون على `QUOTA_EXCEEDED`، تكاليف AI ترتفع بشكل غير طبيعي
**التشخيص:**
- تحقق من `AI_BUDGET_ALERT_PCT` (افتراضي 80%)
- راجع `AIConversation` لل uso غير الطبيعي
- تحقق من `AI_MODEL_TUTOR` (هل تغير لموديل أغلى؟)
**التخفيف:**
- خفض `AI_RESPONSE_CAP` مؤقتاً
- تفعيل `AI_FALLBACK_ONLY=true` (ردود مخزنة فقط)
- منع الحسابات المشبوهة (Feature Flag per user)
**الحل:** مراجعة البرومبت، تحسين الكاش، ترقية خطة OpenRouter

---

## 3. قائمة النشر (Deploy Checklist)

### قبل النشر (Pre-Deploy)
- [ ] جميع الاختبارات خضراء محلياً (`npm test`, `typecheck`, `lint`)
- [ ] CI أخضر (GitHub Actions: lint, typecheck, test, build)
- [ ] لا تغييرات في `DATABASE_URL`، `AUTH_SECRET`، مفاتيح Paymob/AI
- [ ] مigrations قاعدة البيانات (إن وجدت) مختبرة على Staging
- [ ] Feature Flags الجديدة مضبوطة `false` افتراضياً
- [ ] تحديث `CHANGELOG.md` + `package.json` version

### أثناء النشر (During Deploy)
- [ ] Vercel Preview Deploy يعمل
- [ ] Smoke Test على Preview: `/`, `/login`, `/api/health`, `/dashboard`
- [ ] فحص Sentry: لا أخطاء جديدة
- [ ] فحص Lighthouse: Performance ≥ 90, Accessibility ≥ 95

### بعد النشر (Post-Deploy)
- [ ] ترقية Production Deploy
- [ ] فحص Sentry + Logs لمدة 15 دقيقة
- [ ] تشغيل Smoke Tests على Production
- [ ] تحديث Feature Flags تدريجياً (Canary)
- [ ] إشعار الفريق في Slack/Discord

---

## 4. استعادة الكارثة (Disaster Recovery)

### RTO / RPO Targets
| المكون | RTO (وقت الاستعادة) | RPO (فقدان البيانات المقبول) |
|----------|---------------------|----------------------------|
| قاعدة البيانات (Atlas) | 4 ساعات | 24 ساعة (PITR) |
| الملفات (R2) | 1 ساعة | 0 (Versioning) |
| التطبيق (Vercel) | 15 دقيقة | 0 (Immutable Deploys) |
| الأسرار (Secrets) | 30 دقيقة | 0 (Vercel/1Password) |

### إجراءات الاستعادة
1. **قاعدة البيانات:** Atlas → Backups → Restore to new cluster → تحديث `DATABASE_URL` في Vercel → إعادة نشر.
2. **الملفات:** R2 → Versioning → استعادة النسخة السابقة.
3. **التطبيق:** Vercel → Deployments → Rollback to previous → أو `vercel rollback`.
4. **الأسرار:** Vercel Dashboard → Environment Variables → Rollback أو إعادة إدخال من 1Password.

---

## 5. الصيانة الدورية (Maintenance Schedule)

| التكرار | المهمة | المسؤول | الملاحظات |
|----------|--------|---------|----------|
| يومي | Cron `reconcile` (Grace + Streaks) | Auto | يفحص `CRON_SECRET` |
| يومي | مراقبة التكاليف (AI، Paymob) | DevOps | Alert عند 80% |
| أسبوعي | مراجعة Sentry Errors | Dev | تجميع + RCA |
| أسبوعي | تحديث Dependencies (`npm audit fix`) | Dev | PR تلقائي (Dependabot) |
| شهري | Restore Drill | DevOps | `scripts/restore-drill.sh` |
| شهري | مراجعة تكاليف AI / Paymob | PM + DevOps | تحسين البرومبت / التفاوض |
| ربع سنوي | Penetration Test (خفيف) | Security | تقرير + RCA |
| ربع سنوي | مراجعة خصوصية / قانونية | DPO + Legal | تحديث Policy |
| سنوي | Full Penetration Test | External | تقرير + خطة تصحيح |

---

## 6. جهات الاتصال (Contacts)

| الدور | الاسم | البريد | الهاتف | Slack |
|--------|------|---------|--------|-------|
| Tech Lead | [الاسم] | tech@thanawico.com | +20-xxx | @techlead |
| DevOps | [الاسم] | devops@thanawico.com | +20-xxx | @devops |
| DPO / Privacy | [الاسم] | privacy@thanawico.com | +20-xxx | @dpo |
| Paymob Support | — | support@paymob.com | — | — |
| OpenRouter Support | — | support@openrouter.ai | — | — |
| Atlas Support | — | support@mongodb.com | — | — |
| Vercel Support | — | support@vercel.com | — | — |

---

## 7. Feature Flags (Kill Switches)

| العلم | الوصف | افتراضي | متى نغلق |
|--------|-------|---------|----------|
| `AI_ENABLED` | كل ميزات الذكاء الاصطناعي | `true` | quota exceeded، bug حرجة، تكلفة عالية |
| `AI_FALLBACK_ONLY` | ردود مخزنة فقط (بدون API) | `false` | quota exceeded، انقطاع المزود |
| `PAYMENTS_ENABLED` | كل عمليات الدفع | `true` | Paymob down، security incident |
| `PAYMENTS_MANUAL_MODE` | تفعيل يدوي من أدمن فقط | `false` | webhook failures متكررة |
| `EXAMS_ENABLED` | الامتحانات الموقوتة | `true` | bug حرجة في التوقيت/التصحيح |
| `LEADERBOARD_ENABLED` | لوحة الترتيب | `false` | toxicity، cheating |
| `MAINTENANCE_MODE` | وضع الصيانة (صفحة ثابتة) | `false` | DB down، deploy حرجة |
| `NEW_UI_ENABLED` | واجهات تجريبية | `false` | A/B testing |

**التحكم:** Vercel Environment Variables → تحديث فوري دون إعادة نشر.

---

*هذا الدليل وثيقة حية — يُحدث بعد كل حادث، مراجعة، أو تغيير في البنية.*