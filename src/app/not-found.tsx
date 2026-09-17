import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center">
      <p className="text-5xl font-bold text-ink-mute">404</p>
      <h1 className="text-2xl font-bold text-ink">الصفحة مش موجودة</h1>
      <p className="text-sm text-ink-mute">يمكن الرابط غلط أو الصفحة اتحذفت. رجّع للرئيسية وجرّب تاني.</p>
      <Link href="/" className="mt-2 rounded-lg bg-brand-600 px-6 py-2.5 font-bold text-white">
        العودة للرئيسية
      </Link>
    </div>
  );
}