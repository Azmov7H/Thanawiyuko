# إجراء حذف الحساب (Account Deletion SOP) — ثانويكو

**الهدف:** تنفيذ حق الحذف (Right to Erasure) بأمان، شفافية، وامتثال للقانون المصري وGDPR.

---

## 1. تدفق المستخدم (User Flow)

```
الإعدادات → "حذف حسابي" → تأكيد بخطوتين
  → مهلة 30 يوم (استرداد) → إخفاء المعرفات + أرشفة الإحصاءات
  → تأكيد نهائي بالبريد الإلكتروني
```

---

## 2. خطوات التنفيذ (Backend)

### المرحلة 1: طلب الحذف (Soft Delete - يوم 0)
```typescript
// POST /api/account/delete-request
// 1. التحقق من الهوية + كلمة المرور
// 2. تعيين: user.status = "deletion_pending"
// 3. تعيين: user.deletionRequestedAt = now()
// 4. إلغاء جميع الجلسات النشطة (revoke)
// 5. إرسال بريد تأكيد: "طلب الحذف تلقى — لديك 30 يوم للتراجع"
// 6. تسجيل في AuditLog: action="account.delete_request"
```

### المرحلة 2: فترة الاسترداد (أيام 1-30)
- المستخدم يستطيع تسجيل الدخول → يرىBanner: "حسابك قيد الحذف — اضغط هنا للتراجع"
- ضغطة واحدة على "تراجع" → `status = "active"`، إلغاء `deletionRequestedAt`، بريد تأكيد.

### المرحلة 3: التنفيذ النهائي (يوم 31)
```typescript
// Cron يومي: processFinalDeletion()
for (user of usersWhere(status === "deletion_pending" AND deletionRequestedAt < now() - 30d)) {
  // 1. إخفاء المعرفات الشخصية (Pseudonymization)
  await UserModel.updateOne({ _id: user._id }, {
    $set: {
      name: `Deleted User ${user._id.toString().slice(-6)}`,
      email: `deleted_${user._id}@thanawico.local`,
      phone: null,
      passwordHash: null,           // لا يمكن تسجيل الدخول
      status: "deleted",
      deletedAt: new Date(),
    },
  });

  // 2. إخفاء المعرفات في الجداول المرتبطة
  await AttemptModel.updateMany({ userId: user._id }, { $set: { userId: null, studentId: null } });
  await XPTransactionModel.updateMany({ studentId: user._id }, { $set: { studentId: null } });
  await StreakModel.deleteOne({ studentId: user._id });
  await MistakeModel.updateMany({ studentId: user._id }, { $set: { studentId: null } });
  await TopicMasteryModel.updateMany({ studentId: user._id }, { $set: { studentId: null } });
  await AIConversationModel.updateMany({ studentId: user._id }, { $set: { studentId: null, messages: [] } });
  await SubscriptionModel.updateOne({ studentId: user._id }, { $set: { status: "cancelled", tier: "free" } });
  // PaymentModel: نبقي المبلغ والمرجع للضرائب، نزيل studentId

  // 3. الإحصاءات المجهولة تبقى (مجهولة الهوية بالفعل)
  // 4. سجل التدقيق
  await AuditLogModel.create({ actorId: SYSTEM, action: "account.final_delete", entity: "user", entityId: user._id });

  // 5. بريد نهائي: "تم حذف حسابك نهائياً. شكراً لاستخدامك ثانويكو."
}
```

---

## 3. ما يُحذف وما يبقى (Data Retention Matrix)

| البيانات | الإجراء | السبب |
|----------|---------|-------|
| الاسم، البريد، الهاتف، كلمة المرور | **مسح كامل** | معرفة شخصية مباشرة (PII) |
| الملف الدراسي (صف، شعبة، هدف) | **مسح** | PII غير مباشرة |
| المحاولات (Attempts) | **إخفاء المعرف** (`userId=null`) | إحصاءات مجهولة للتعلم |
| الإجابات، الدرجات، التوقيت | **يبقى مجهولاً** | تحسين النموذج، تحليل المنهج |
| مكتبة الأخطاء (Mistakes) | **إخفاء المعرف** | أنماط الخطأ العامة |
| محادثات الذكاء الاصطناعي | **مسح المحتوى** (`messages=[]`) | خصوصية المحادثات |
| الاشتراكات + المدفوعات | **إبقاء المبلغ/المرجع، إزالة `studentId`** | متطلب ضريبي (5 سنوات) |
| سجل التدقيق (AuditLog) | **يبقى** (actorId=SYSTEM) | سلامة السجل |
| الإنجازات، XP، السلسلة | **مسح** | مرتبطة بالهوية |

---

## 4. واجهة المستخدم (Frontend)

### صفحة الإعدادات → "حذف حسابي"
```tsx
// 1. زر "طلب الحذف" → مودال تأكيد
//    - "أفهم أن هذا لا يمكن التراجع عنه بعد 30 يوم"
//    - إدخال كلمة المرور الحالية
//    - زر "طلب الحذف" (أحمر، يحتاج تأكيد)

// 2. بعد الطلب: شريط علوي دائم
//    "حسابك قيد الحذف — سيتم الحذف النهائي في {date}.
//     [تراجع]"

// 3. يوم 31: تسجيل خروج قسري + صفحة "تم الحذف"
```

---

## 5. طلبات الولي (Parent Requests)
- إذا كان الطالب < 18 سنة: الولي يطلب الحذف من حسابه → نفس التدفق.
- إذا بلغ الطالب 18 أثناء الفترة: الطالب يصبح المتحكم الوحيد.

---

## 6. قائمة التحقق قبل الإطلاق (Pre-Launch Checklist)
- [ ] `POST /api/account/delete-request` +_rate_limit(1/يوم)_
- [ ] Cron يومي `processFinalDeletion()` + `CRON_SECRET`
- [ ] بريد إلكتروني: طلب، تراجع، تأكيد نهائي (عربي، RTL)
- [ ] اختبارات: طلب → تراجع (يوم 5) → الحساب نشط، طلب → عدم تراجع (يوم 31) → مجهول
- [ ] استعلام GDPR: `GET /api/account/export` يعيد JSON كامل قبل الحذف
- [ ] توثيق في `privacy-policy.md` (القسم 5، 7)

---

## 6. سيناريوهات الحافة (Edge Cases)
| السيناريو | السلوك |
|------------|---------|
| مستخدم يطلب الحذف أثناء اشتراك نشط | الإلغاء الفوري + استرداد نسبي (إن وجد) → ثم حذف |
| مستخدم يطلب الحذف ثم يحاول تسجيل الدخول | رسالة: "الحساب قيد الحذف — [تراجع]" |
| الولي يطلب حذف حساب القاصر | نفس التدفق، الولي هو من يبدأ الطلب |
| طلب حذف عبر البريد الإلكتروني (بدون تسجيل دخول) | تحقق الهوية (OTP للبريد المسجل) → نفس التدفق |
| استعادة بعد يوم 31 | **غير ممكن** — البيانات مجهولة، لا يمكن ربطها |

---

## 7. السجلات والامتثال (Audit & Compliance)
- كل خطوة تسجل في `AuditLog` مع `actorId`، `action`، `before/after`.
- تقرير شهري: عدد طلبات الحذف، معدل التراجع، متوسط وقت المعالجة.
- مراجعة ربع سنوية من مسؤول حماية البيانات (DPO).