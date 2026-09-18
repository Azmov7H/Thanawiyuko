import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "شروط الاستخدام",
  description: "شروط استخدام منصة ثانويكو التعليمية لطلاب الثانوية العامة.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav aria-label="مسار التنقل" className="text-sm text-ink-mute">
        <Link href="/" className="hover:text-ink">
          الرئيسية
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">شروط الاستخدام</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-ink">شروط الاستخدام</h1>
      <p className="mt-2 text-sm text-ink-mute">آخر تحديث: 18 سبتمبر 2026</p>

      <div className="prose-rtl mt-8 flex flex-col gap-6 text-sm leading-7 text-ink-soft">
        <section>
          <h2 className="text-lg font-bold text-ink">1. الحساب</h2>
          <p>
            أنت مسؤول عن سرية كلمة المرور وعن كل نشاط يجري عبر حسابك. يجب تقديم بيانات صحيحة.
            إن كنت أقل من 18 عامًا فيجب إقرار ولي الأمر عند التسجيل.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">2. الاستخدام المقبول</h2>
          <ul className="mt-2 list-disc space-y-1 ps-6">
            <li>يُمنع الغش أو محاولة تعطيل المنصة أو اختراقها.</li>
            <li>يُمنع إساءة استخدام المساعد الذكي أو مشاركة المحتوى المدفوع تجاريًا.</li>
            <li>يُمنع انتحال هوية الآخرين.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">3. المحتوى والاشتراكات</h2>
          <p>
            يخضع المحتوى المدفوع لخطة الاشتراك المختارة، وتُدار الأسعار عبر منصة الدفع. الرسوم
            المدفوعة مقابل الوصول ولا تُرد إلا وفق ما يقتضيه القانون أو سياسة الاسترداد المعلنة.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">4. المحتوى التعليمي</h2>
          <p>
            نبذل جهدًا لضمان دقة المحتوى، لكنه لأغراض تعليمية فقط ولا يُعد بديلًا عن المنهج
            الرسمي أو التوجيه المدرسي.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">5. تعديل الشروط</h2>
          <p>
            قد نحدّث هذه الشروط، وسيُنشر أي تغيير جوهري مسبقًا مع إشعار داخل التطبيق. استمرار
            استخدامك للخدمة يعني موافقتك على الشروط المحدّثة.
          </p>
        </section>
      </div>

      <p className="mt-10 text-center text-sm">
        <Link href="/register" className="font-bold text-brand-strong">
          العودة للتسجيل
        </Link>
      </p>
    </div>
  );
}
