import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";

const plexAr = IBM_Plex_Sans_Arabic({
  variable: "--font-plex-ar",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "700"],
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-num",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: {
    default: "ثانويكو | ذاكر صح، مش كتير",
    template: "%s | ثانويكو",
  },
  description:
    "نظام التعلم الشخصي لطلاب الثانوية العامة في مصر: ذاكر، اتدرب، افهم غلطاتك، وتابع تقدمك.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "ثانويكو | ذاكر صح، مش كتير",
    description:
      "نظام التعلم الشخصي لطلاب الثانوية العامة في مصر: ذاكر، اتدرب، افهم غلطاتك، وتابع تقدمك.",
    url: appUrl,
    siteName: "ثانويكو",
    locale: "ar_EG",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "ثانويكو | ذاكر صح، مش كتير",
    description:
      "نظام التعلم الشخصي لطلاب الثانوية العامة في مصر: ذاكر، اتدرب، افهم غلطاتك، وتابع تقدمك.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${plexAr.variable} ${plexMono.variable} h-full`}>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
