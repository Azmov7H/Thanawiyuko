import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "سياسة الخصوصية",
  description: "كيف تجمع منصة ثانويكو بيانات طلاب الثانوية العامة وتستخدمها وتحميها.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10">
      <nav aria-label="مسار التنقل" className="text-sm text-ink-mute">
        <Link href="/" className="hover:text-ink">
          الرئيسية
        </Link>
        <span aria-hidden="true"> / </span>
        <span className="text-ink">سياسة الخصوصية</span>
      </nav>

      <h1 className="mt-4 text-3xl font-bold text-ink">سياسة الخصوصية</h1>
      <p className="mt-2 text-sm text-ink-mute">آخر تحديث: 18 سبتمبر 2026</p>

      <div className="prose-rtl mt-8 flex flex-col gap-6 text-sm leading-7 text-ink-soft">
        <section>
          <h2 className="text-lg font-bold text-ink">1. من نحن</h2>
          <p>
            ثانويكو منصة تعليمية لطلاب الثانوية العامة في مصر. للتواصل بخصوص الخصوصية:{" "}
            <span dir="ltr">privacy@thanawico.com</span>.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">2. البيانات التي نجمعها</h2>
          <ul className="mt-2 list-disc space-y-1 ps-6">
            <li>بيانات الحساب: الاسم، البريد الإلكتروني، وكلمة المرور (مُجزّأة، لا نراها).</li>
            <li>الملف الدراسي: الصف، الشعبة، وهدف المذاكرة اليومي.</li>
            <li>بيانات الأداء: الإجابات، التوقيت، الأخطاء، والتقدم.</li>
            <li>محادثات المساعد الذكي عند استخدامها (اختياري).</li>
            <li>بيانات الدفع عبر مزوّد دفع خارجي — لا نخزّن بيانات البطاقة.</li>
          </ul>
          <p className="mt-2">
            لا نجمع الرقم القومي، ولا الموقع الجغرافي الدقيق، ولا الصور، ولا بيانات صحية.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">3. كيف نستخدمها</h2>
          <p>
            لتقديم الخدمة التعليمية (تخصيص المحتوى، الخطة، تقارير التقدم)، وللأمان ومنع إساءة
            الاستخدام، ولتحسين المنتج عبر إحصاءات مجهولة الهوية. لا نبيع بياناتك ولا نعرض إعلانات
            مستهدفة.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">4. حقوقك</h2>
          <p>
            يمكنك تصدير بياناتك (JSON) من صفحة{" "}
            <Link href="/settings" className="font-bold text-brand-strong underline">
              حسابي
            </Link>{" "}
            وطلب حذف حسابك. للحذف مهلة 30 يومًا للتراجع، ثم تُخفى هويتك وتُحذف بياناتك المرتبطة.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-ink">5. القاصرون والأمان</h2>
          <p>
            المستخدمون الأساسيون طلاب ثانوية. يتعهّد المستخدم عند التسجيل بإقرار ولي الأمر.
            نستخدم تشفير النقل، وتُخزّن كلمات المرور مُجزّأة (scrypt)، مع رؤوس أمان وحدود
            لمحاولات الدخول.
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
