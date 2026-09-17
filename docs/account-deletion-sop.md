# إجراء حذف الحساب (Account Deletion SOP) — ثانويكو

**الهدف:** تنفيذ حق الحذف (Right to Erasure) بأمان وشفافية وامتثال للقانون المصري.
**آخر تحديث:** 2026-09-18

> **الحالة: منفّذ (T-N2).**
> المسارات: `POST /api/account/delete-request`، `POST /api/account/delete-cancel`،
> `GET /api/account/export`. المنطق في `src/server/modules/account/service.ts`،
> والتنفيذ النهائي عبر `/api/cron/reconcile` (مهلة `DELETION_GRACE_DAYS`، افتراضي 30).
> واجهة الإدارة في `/settings` مع شريط تحذير دائم في واجهة الطالب.

---

## 1. تدفق المستخدم (User Flow)

```
الإعدادات → "حذف حسابي" → تأكيد بخطوتين
  → مهلة 30 يومًا (استرداد) → إخفاء المعرفات + إبقاء الإحصاءات المجهولة
  → تأكيد نهائي
```

---

## 2. خطوات التنفيذ (Backend)

### المتطلبات المسبقة على المخطط
- إضافة حالة `deletion_pending` إلى `UserDoc.status` (حاليًا: `active | suspended | deleted`).
- إضافة الحقلين `deletionRequestedAt?: Date` و`deletedAt?: Date` إلى `UserModel`.

### المرحلة 1: طلب الحذف (Soft Delete — يوم 0)
```typescript
// POST /api/account/delete-request
// 1. التحقق من الهوية + كلمة المرور الحالية (verifyPassword)
// 2. user.status = "deletion_pending"
// 3. user.deletionRequestedAt = now()
// 4. تدوير AUTH_SECRET غير عملي لكل مستخدم؛ بدلاً من ذلك:
//    - يُمنع تسجيل دخول جديد لأن مزوّد المصادقة يفلتر status: "active"
//      (الجلسات JWT الحالية تبقى صالحة حتى 30 يومًا — قيد موثّق)
// 5. تسجيل: AuditLog action="account.delete_request"
```

### المرحلة 2: فترة الاسترداد (أيام 1–30)
- عند محاولة الدخول: شاشة «حسابك قيد الحذف» مع زر «تراجع».
- التراجع → `status = "active"`، ومسح `deletionRequestedAt`، وتسجيل تدقيق `account.delete_cancel`.

### المرحلة 3: التنفيذ النهائي (يوم 31)
```typescript
// Cron يومي: processFinalDeletion() — محمي بـ CRON_SECRET
// يُوسّع /api/cron/reconcile أو مسار cron منفصل.
for (user of usersWhere(status === "deletion_pending" AND deletionRequestedAt < now() - 30d)) {
  // 1. إخفاء الهوية (Pseudonymization)
  await UserModel.updateOne({ _id: user._id }, {
    $set: {
      name: `مستخدم محذوف ${user._id.toString().slice(-6)}`,
      email: `deleted_${user._id}@thanawico.local`,
      passwordHash: await hashPassword(randomBytes(32).toString("hex")), // تعطيل الدخول
      status: "deleted",
      deletedAt: new Date(),
    },
  });

  // 2. إخفاء المعرفات في الجداول المرتبطة
  //    ملاحظة: بعض الحقول required — يلزم إما nullable أو حذف السجلات المرتبطة.
  await StreakModel.deleteOne({ studentId: user._id });
  await MistakeModel.deleteMany({ studentId: user._id });
  await TopicMasteryModel.deleteMany({ studentId: user._id });
  await XPTransactionModel.deleteMany({ studentId: user._id });
  await UserAchievementModel.deleteMany({ studentId: user._id });
  await AIConversationModel.updateMany({ studentId: user._id }, { $set: { messages: [], title: null } });
  await SubscriptionModel.updateOne({ studentId: user._id }, { $set: { status: "cancelled", tier: "free" } });

  // 3. المحاولات (Attempts) + المدفوعات: تبقى كما هي (معرّفات مجهولة الهوية بلا PII).
  //    لا تُجعل الحقول nullable؛ يكفي أن المستخدم نفسه مُخفى الهوية.

  // 4. سجل التدقيق
  await AuditLogModel.create({ actorId: SYSTEM_ACTOR, action: "account.final_delete", entity: "user", entityId: user._id });
}
```

> **تصحيح مهم عن المسودة السابقة:** لا يوجد `SessionModel` (الجلسات JWT). لذلك لا يمكن
> «إلغاء جميع الجلسات» إلا بتدوير `AUTH_SECRET` العام. القيد موثّق في `docs/runbooks.md` §2.4.

---

## 3. ما يُحذف وما يبقى (Data Retention Matrix)

| البيانات | الإجراء | السبب |
|----------|---------|-------|
| الاسم، البريد، كلمة المرور | **إخفاء + تعطيل** (اسم «مستخدم محذوف»، بريد مُشتق، hash عشوائي) | PII مباشر |
| الملف الدراسي | **حذف** | PII غير مباشر |
| المحاولات (Attempts) | **إبقاء مجهولة** — تبقى معرّفات ObjectId المشيرة لحساب مُخفى الهوية، بلا أي PII | إحصاءات تعلّم مجهولة الهوية |
| الإجابات، الدرجات، التوقيت | **تبقى داخل Attempts** | تحسين المنتج/المنهج |
| مكتبة الأخطاء (Mistakes) | **حذف** | مرتبطة بالهوية |
| تقدّم المواضيع، XP، السلسلة، الإنجازات | **حذف** | مرتبطة بالهوية |
| محادثات الذكاء الاصطناعي | **مسح المحتوى** (`messages=[]`, `title=null`) | خصوصية المحادثات |
| خطة المذاكرة وجلسات الدرس | **حذف** | مرتبطة بالهوية |
| الاشتراكات | **إلغاء** (`cancelled`, `tier=free`) | إنهاء الاستحقاق |
| المدفوعات | **تبقى** (المبلغ/المرجع/`studentId` مجهول الهوية) | متطلب ضريبي (5 سنوات) |
| سجل التدقيق | **يبقى** | سلامة السجل |

---

## 4. واجهة المستخدم (Frontend)
- صفحة إعدادات (غير موجودة حاليًا — تُبنى في T-N2):
  - زر «طلب الحذف» → مودال تأكيد + إدخال كلمة المرور.
  - شريط علوي دائم بعد الطلب: «حسابك قيد الحذف — سيتم في {date} [تراجع]».
  - عند يوم التنفيذ: تسجيل خروج + صفحة «تم الحذف».

---

## 5. طلبات ولي الأمر (Parent Requests)
- إذا كان الطالب < 18: الولي يبدأ الطلب بنفس التدفق.
- إذا بلغ 18 خلال المهلة: الطالب هو المتحكم الوحيد.

---

## 6. قائمة التحقق قبل الإطلاق (Pre-Launch Checklist — T-N2)
- [x] تعديل المخطط: `deletion_pending`, `deletionRequestedAt`, `deletedAt`, `guardianConsentAt`.
- [x] `POST /api/account/delete-request` + `POST /api/account/delete-cancel` (مع تحديد معدل).
- [x] Cron `processFinalDeletion()` مدمج في `/api/cron/reconcile` المحمي بـ `CRON_SECRET`.
- [x] `GET /api/account/export` (تصدير JSON).
- [x] اختبارات تكامل: `tests/integration/account-lifecycle.test.ts` (طلب/تراجع/تصدير/تنفيذ نهائي).
- [x] توثيق في `privacy-policy.md` ومنح شريط تراجع في واجهة الطالب.

---

## 7. سيناريوهات الحافة (Edge Cases)
| السيناريو | السلوك |
|------------|---------|
| طلب الحذف أثناء اشتراك نشط | الإلغاء الفوري ثم الحذف (سياسة الاسترداد التجارية تُحدد). |
| محاولة دخول بعد الطلب | شاشة «قيد الحذف — [تراجع]». |
| طلب ولي عن قاصر | نفس التدفق. |
| طلب عبر البريد | تحقق OTP للبريد المسجّل → نفس التدفق. |
| استعادة بعد يوم 31 | **غير ممكنة** — البيانات مجهولة. |

---

## 8. السجلات والامتثال (Audit & Compliance)
- كل خطوة تُسجّل في `AuditLog` (`account.delete_request`, `account.delete_cancel`, `account.final_delete`).
- تقرير شهري: عدد الطلبات، معدل التراجع، متوسط المعالجة.
- مراجعة ربع سنوية من DPO.
