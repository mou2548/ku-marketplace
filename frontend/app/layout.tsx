import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "@/lib/i18n/locale";
import "./globals.css";

/**
 * Prompt covers Thai and Latin in one family, which matters here: the UI mixes
 * them in the same line constantly (a Thai label next to a course code next to
 * a price). Two families would mean two vertical rhythms in the same sentence.
 */
const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KU Marketplace",
  description:
    "Buy, sell, trade, and give away items inside Kasetsart University.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  /* `lang` is real, not decorative: it drives Thai line breaking and hyphenation
     and tells a screen reader which voice to use. It was hardcoded to "en"
     while the product already rendered Thai. */
  const locale = await getLocale();

  return (
    <html lang={locale} className={`${prompt.variable} h-full antialiased`}>
      <body className="min-h-full">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[120] focus:rounded-control focus:bg-surface focus:px-4 focus:py-2 focus:shadow-floating"
        >
          Skip to main content
        </a>
        <NextIntlClientProvider>{children}</NextIntlClientProvider>
      </body>
    </html>
  );
}
