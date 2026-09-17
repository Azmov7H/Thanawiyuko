# دليل العمليات (Runbooks) — ثانويكو

**الهدف:** إجراءات موحدة للاستجابة للحوادث، النشر، والصيانة الدورية.
**آخر تحديث:** 2026-09-18

> **ملاحظة صدق:** هذا الدليل يعكس ما هو **منفّذ فعلاً** في الكود حتى تاريخ التحديث.
> البنود غير المنفّذة مُوسَمة صراحةً بـ `GAP` مع رقم المهمة المتابعة في `docs/TASKS.md`.

---

## 0. حالة جاهزية الإنتاج (Production Posture)

| القدرة | الحالة | المرجع |
|--------|--------|--------|
| رؤوس أمان (CSP/HSTS/XFO/Referrer/Permissions) | ✅ منفّذ | `next.config.ts` |
| تحديد معدل Auth (5/دقيقة/مسارات) | ✅ منفّذ (ذاكرة العملية الواحدة) | `src/proxy.ts` |
| Health check | ✅ منفّذ | `GET /api/health`, rewrite `/health` |
| Cron الاستحقاق/السلاسل/الحذف | ✅ منفّذ (`CRON_SECRET`) | `src/app/api/cron/reconcile/route.ts` |
| سجلات JSON مع `requestId` وحجب PII | ✅ منفّذ | `src/lib/logger.ts`, `src/server/logger.ts` |
| سجل تدقيق (أدمن/خطط/دفع/محتوى/حساب) | ✅ منفّذ | `AuditLogModel` |
| Feature Flags (Kill Switches) | 🟡 مُعرّفة فقط | `src/lib/features.ts` — `GAP`: لا تُقرأ في أي مسار بعد |
| صفحة/وضع الصيانة | ❌ غير منفّذ | `GAP` — لا `/maintenance` |
| مراقبة الأخطاء (Sentry) | ❌ غير منفّذ | `GAP` |
| Rate limit موزّع (Redis/Upstash) | ❌ غير منفّذ | `GAP` — fallback: حدود الذاكرة |
| حذف/تصدير الحساب | ✅ منفّذ (T-N2) | `src/server/modules/account/service.ts` |
| صفحات الخصوصية/الشروط + إقرار ولي الأمر | ✅ منفّذ | `/privacy`, `/terms`, التسجيل |
| بنية تصدير PDF | 🟡 بنية جاهزة (T-K1) | `src/server/modules/pdf/` — `PDF_ENGINE=chromium` يحتاج متصفحًا على المضيف |

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
# 1. تحقق من حالة العنقود (Atlas أو محلي)
atlas clusters describe <cluster> --output=json
# 2. تحقق من الـ IP Whitelist
# 3. تحقق من `DATABASE_URL` في بيئة النشر
# 4. Health check سريع
curl -fsS https://<host>/api/health
```
**التخفيف:**
- إعادة تشغيل النشر (يفرض إعادة اتصال lazy عبر `global.__mongoosePromise`).
- `GAP`: لا يوجد `MAINTENANCE_MODE` فعّال ولا صفحة `/maintenance` بعد
  (العلم معرّف في `src/lib/features.ts` لكنه لا يُقرأ). حتى التنفيذ: صفحة حالة ثابتة خارجية + إشعار.
**الحل:** إصلاح الشبكة/الـ IP، ترقية العنقود، أو الاستعادة من PITR (انظر §4).

### 2.2 الذكاء الاصطناعي لا يستجيب / بطيء جداً
**الأعراض:** `/api/ai/tutor` يستغرق >30s، أخطاء 504، `QUOTA_EXCEEDED`
**التشخيص:**
- تحقق من `AI_GATEWAY_KEY` و`AI_GATEWAY_URL` (متوافق OpenRouter) والرصيد.
- راجع الحدود المضبوطة: `AI_QUOTA_FREE` (افتراضي 10)، `AI_QUOTA_PLUS` (100)،
  `AI_PER_MINUTE_LIMIT` (8)، `AI_RESPONSE_CAP` (800) — `src/server/ai/config.ts`.
**التخفيف:**
- `GAP`: `AI_ENABLED` / `AI_FALLBACK_ONLY` معرّفان لكنهما غير مُفعّلين في الكود؛ حاليًا
  التخفيف اليدوي عبر تعطيل المفتاح أو خفض `AI_RESPONSE_CAP`.
- الإبقاء على التدريب (لا يعتمد على AI).
**الحل:** ترقية خطة المزود، تبديل الموديل (`AI_MODEL_TUTOR`)، أو تحسين البرومبت.

### 2.3 فشل الدفع (Paymob Webhook Failures)
**الأعراض:** مستخدمون دفعوا دون تفعيل الاشتراك، أخطاء 500 في `/api/subscription/webhook`
**التشخيص:**
- تحقق من `PAYMOB_HMAC_SECRET` (تطابق التوقيع) و`PAYMOB_API_KEY` و`PAYMOB_INTEGRATION_ID`.
- راجع `AuditLog` للأحداث `payment.refund` / حالة الدفع في `PaymentModel`.
**التخفيف:**
- إعادة إرسال الـ Webhook يدويًا من Paymob Dashboard.
- التفعيل اليدوي من لوحة الأدمن (`PATCH /api/admin/users`) مع سبب موثّق.
- `GAP`: `PAYMENTS_MANUAL_MODE` غير مُفعّل في الكود.
**الحل:** تصحيح الـ Secret/Integration ID، أو التواصل مع دعم Paymob.

### 2.4 تسريب بيانات / وصول غير مصرح
**الأعراض:** بلاغ مستخدم، نشاط مشبوه في `AuditLog`، بريد من باحث أمني
**الإجراء الفوري:**
1. تعليق الحساب/الحسابات المتأثرة: `status: "suspended"` (يمنع تسجيل دخول جديد — يُفلتر في
   `src/server/auth/config.ts`).
2. تدوير جميع الأسرار: `AUTH_SECRET`، `PAYMOB_HMAC_SECRET`، `AI_GATEWAY_KEY`، `DATABASE_URL`.
   **ملاحظة مهمة:** الجلسات هنا JWT (صلاحية 30 يومًا) ولا يوجد `SessionModel`. تدوير
   `AUTH_SECRET` يُبطل كل الجلسات فورًا — لا توجد طريقة إبطال لجلسة فردية حاليًا (`GAP`).
3. إشعار DPO + الجهات المختصة (خلال 72 ساعة حسب القانون المصري).
4. تحقيق كامل + تقرير RCA.

### 2.5 نفاد حصة الذكاء الاصطناعي (AI Quota Exhausted)
**الأعراض:** مستخدمو بلس يحصلون على `QUOTA_EXCEEDED`، تكاليف AI ترتفع بشكل غير طبيعي
**التشخيص:**
- راجع `AIConversationModel` (الحصة مُخزّنة في `quota` ونافذة `quotaPeriod`).
- تحقق من `AI_MODEL_TUTOR` (هل تغيّر إلى موديل أغلى؟).
**التخفيف:**
- خفض `AI_RESPONSE_CAP` و/أو `AI_QUOTA_PLUS` مؤقتًا.
- تعليق الحسابات المشبوهة.
**الحل:** تحسين الكاش/البرومبت، ترقية خطة المزود.

---

## 3. قائمة النشر (ملخّص — التفصيل في `docs/deploy-checklist.md`)
- [ ] CI أخضر: `lint` + `typecheck` + `test` (118) + `test:integration` (10) + `test:a11y` (4) + `build`.
- [ ] لا تغييرات غير مقصودة في الأسرار/`DATABASE_URL`.
- [ ] فحص يدوي سريع: `/`, `/login`, `/register`, `/api/health`, `/dashboard` (مُصادق).
- [ ] ترقية تدريجية مع مراقبة السجلات (`LOG_LEVEL=info`) لمدة 15 دقيقة على الأقل.

---

## 4. استعادة الكارثة (Disaster Recovery)

### RTO / RPO Targets
| المكون | RTO (وقت الاستعادة) | RPO (فقدان البيانات المقبول) |
|----------|---------------------|----------------------------|
| قاعدة البيانات (Atlas) | 4 ساعات | 24 ساعة (PITR) |
| الملفات (R2) | 1 ساعة | 0 (Versioning) — `GAP`: لا تخزين ملفات بعد |
| التطبيق (Vercel) | 15 دقيقة | 0 (Immutable Deploys) |
| الأسرار (Secrets) | 30 دقيقة | 0 (Vercel/1Password) |

### إجراءات الاستعادة
1. **قاعدة البيانات:** Atlas → Backups → Restore to new cluster → تحديث `DATABASE_URL` → إعادة نشر.
2. **التطبيق:** Vercel → Deployments → Rollback إلى النسخة السابقة (`vercel rollback`).
3. **الأسرار:** Vercel → Environment Variables → استرجاع/إعادة إدخال من 1Password.

### تمرين الاستعادة (Restore Drill)
```bash
# يتطلب: mongodump, mongorestore, mongosh
# الافتراضي: mongodb://127.0.0.1:27017/thanawico
MONGODB_URI="mongodb://127.0.0.1:27017/thanawico" ./scripts/restore-drill.sh
```
التمرين ينفّذ: dump فعلي → استعادة إلى قاعدة منفصلة `*_restore_drill` → التحقق من عدد
المستندات/سلامتها → تنظيف. يُنفّذ **شهريًا** ويُحفظ السجل.

---

## 5. الصيانة الدورية (Maintenance Schedule)

| التكرار | المهمة | المسؤول | الملاحظات |
|----------|--------|---------|----------|
| يومي | Cron `reconcile` (Grace + Streaks + تنفيذ حذف منتهي المهلة) | Auto | محمي بـ `CRON_SECRET` |
| يومي | مراقبة التكاليف (AI، Paymob) | DevOps | تنبيه عند 80% |
| أسبوعي | تحديث Dependencies (`npm audit`) | Dev | Dependabot PRs |
| شهري | Restore Drill | DevOps | `scripts/restore-drill.sh` |
| شهري | مراجعة تكاليف AI / Paymob | PM + DevOps | تحسين البرومبت / التفاوض |
| ربع سنوي | مراجعة خصوصية / قانونية | DPO + Legal | تحديث السياسة |
| سنوي | اختبار اختراق كامل | External | تقرير + خطة تصحيح |

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

معرّفة في `src/lib/features.ts`، وتُقرأ من متغيرات البيئة بالشكل `FEATURE_<NAME>` بقيم
`1`/`true` أو `0`/`false`.

| العلم | الوصف | افتراضي | متى نغلق |
|--------|-------|---------|----------|
| `AI_ENABLED` | كل ميزات الذكاء الاصطناعي | `true` | quota exceeded، bug حرجة، تكلفة عالية |
| `AI_FALLBACK_ONLY` | ردود مخزنة فقط (بدون API) | `false` | انقطاع المزود |
| `PAYMENTS_ENABLED` | كل عمليات الدفع | `true` | Paymob down، حادثة أمنية |
| `PAYMENTS_MANUAL_MODE` | تفعيل يدوي من أدمن فقط | `false` | تكرار فشل الـ Webhook |
| `EXAMS_ENABLED` | الامتحانات الموقوتة | `true` | bug حرجة في التوقيت/التصحيح |
| `LEADERBOARD_ENABLED` | لوحة الترتيب | `false` | سلوك سام / غش |
| `MAINTENANCE_MODE` | وضع الصيانة | `false` | DB down، نشر حرج |
| `NEW_UI_ENABLED` | واجهات تجريبية | `false` | A/B testing |

> **`GAP`:** لا تُقرأ هذه الأعلام في أي مسار تطبيقي بعد. التحكم الحالي يدوي (بيئة/إعادة نشر).
> راجع `docs/TASKS.md` — T-N3.

---

*هذا الدليل وثيقة حية — يُحدّث بعد كل حادث، مراجعة، أو تغيير في البنية.*
