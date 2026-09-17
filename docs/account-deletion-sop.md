# إجراء حذف الحساب (Account Deletion SOP) — ثانويكو

**الهدف:** تنفيذ حق الحذف (Right to Erasure) بأمان وشفافية وامتثال للقانون المصري.
**آخر تحديث:** 2026-09-18

> **الحالة: غير منفّذ (مواصفة مقترحة) — T-N2.**
> لا توجد حاليًا أي مسارات `/api/account/*`، ولا واجهة «حذف حسابي»، ولا `deletionRequestedAt`.
> هذا المستند هو خطة التنفيذ المعتمَدة قبل الإطلاق.

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

  // 3. المحاولات: إبقاء إحصاءات مجهولة (userId/studentId = null) بعد جعل الحقول nullable.
  //    PaymentModel: إبقاء المبلغ/المرجع للضرائب مع إزالة الرابط بالطالب.

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
| الاسم، البريد، كلمة المرور | **إخفاء/تعطيل** | PII مباشر |
| الملف الدراسي | **حذف** | PII غير مباشر |
| المحاولات (Attempts) | **إخفاء المعرف** (`null`) | إحصاءات مجهولة |
| الإجابات، الدرجات، التوقيت | **تبقى مجهولة** | تحسين المنتج/المنهج |
| مكتبة الأخطاء (Mistakes) | **حذف** | مرتبطة بالهوية |
| محادثات الذكاء الاصطناعي | **مسح المحتوى** (`messages=[]`) | خصوصية المحادثات |
| الاشتراكات + المدفوعات | **إبقاء المبلغ/المرجع، إزالة الرابط** | متطلب ضريبي (5 سنوات) |
| سجل التدقيق | **يبقى** | سلامة السجل |
| الإنجازات، XP، السلسلة | **حذف** | مرتبطة بالهوية |

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
- [ ] تعديل المخطط: `deletion_pending`, `deletionRequestedAt`, `deletedAt`.
- [ ] `POST /api/account/delete-request` + `POST /api/account/delete-cancel` + Rate limit.
- [ ] Cron `processFinalDeletion()` محمي بـ `CRON_SECRET`.
- [ ] `GET /api/account/export` (تصدير JSON) — شرط للحذف.
- [ ] اختبارات تكامل: طلب → تراجع (يوم 5) → نشط؛ طلب → بلا تراجع (يوم 31) → مجهول.
- [ ] توثيق في `privacy-policy.md`.

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
