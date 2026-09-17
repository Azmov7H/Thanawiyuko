import type { Metadata } from "next";
import { SkipLink } from "@/components/SkipLink";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SkipLink />
      <main id="main" tabIndex={-1} className="flex min-h-full flex-col outline-none">
        {children}
      </main>
    </>
  );
}
