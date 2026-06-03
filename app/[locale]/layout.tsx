import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales, type Locale } from '@/i18n';
import { TooltipProvider } from "@/components/ui/tooltip";
import { Inter, Roboto, Poppins, Montserrat, DM_Sans } from "next/font/google";
import type { Metadata } from 'next';
import "../globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const roboto = Roboto({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-roboto", display: "swap" });
const poppins = Poppins({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-poppins", display: "swap" });
const montserrat = Montserrat({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-montserrat", display: "swap" });
const dmSans = DM_Sans({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-dm-sans", display: "swap" });

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://openvid.dev';

  const languages: Record<string, string> = {};
  locales.forEach((loc) => {
    languages[loc] = `${baseUrl}/${loc}`;
  });

  return {
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages,
    },
    openGraph: {
      locale: locale === 'es' ? 'es_ES' : locale === 'vi' ? 'vi_VN' : locale === 'ru' ? 'ru_RU' : 'en_US',
      alternateLocale: locale === 'es'
        ? ['en_US', 'vi_VN', 'ru_RU']
        : locale === 'en'
          ? ['es_ES', 'vi_VN', 'ru_RU']
          : locale === 'vi'
            ? ['es_ES', 'en_US', 'ru_RU']
            : ['es_ES', 'en_US', 'vi_VN'],
    },
  };
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`
        ${inter.variable} ${roboto.variable} ${poppins.variable} 
        ${montserrat.variable} ${dmSans.variable} ${inter.className} 
        antialiased dark
      `}>
        <NextIntlClientProvider key={locale} messages={messages} locale={locale}>
          <TooltipProvider delayDuration={200}>
            {children}
          </TooltipProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}