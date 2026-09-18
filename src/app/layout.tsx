import type { Metadata } from "next";
import { IBM_Plex_Sans_Arabic, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { DEFAULT_LOCALE, htmlAttributes } from "@/lib/i18n";

const appUrl = process.env.APP_URL ?? "http://localhost:3000";
const { lang, dir } = htmlAttributes(DEFAULT_LOCALE);

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
    <html lang={lang} dir={dir} className={`${plexAr.variable} ${plexMono.variable} h-full`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k="thanawico.theme";var s=localStorage.getItem(k);var d=s? s==="dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;var r=document.documentElement;r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
