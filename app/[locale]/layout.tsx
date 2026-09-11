import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { defaultLocale, locales, type Locale } from "@/i18n";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Inter, Roboto } from "next/font/google";
import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { GoogleAnalytics } from "@next/third-parties/google";
import { SuppressScriptWarning } from "@/app/components/SuppressScriptWarning";
import {
  buildPageMetadata,
  getOgLocales,
  getRouteAlternates,
  SEO_BASE_URL,
  SEO_ICONS,
  SEO_OG_IMAGE,
} from "@/lib/seo";
import "../globals.css";

const THEME_INLINE_SCRIPT = `
(function () {
  try {
    var get = function (name) {
      var m = document.cookie.match(new RegExp("(?:^|;\\s*)" + name + "=([^;]*)"));
      return m ? decodeURIComponent(m[1]) : null;
    };
    var pref = get("openvid_theme_pref") || get("openvid_theme") || "system";
    var dark = pref === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
      : pref === "dark";
    document.documentElement.classList.toggle("dark", dark);
  } catch (e) {}
})();
`;

async function getThemeClass(): Promise<string> {
  try {
    const cookieStore = await cookies();
    const pref =
      cookieStore.get("openvid_theme_pref")?.value ||
      cookieStore.get("openvid_theme")?.value ||
      "system";
    if (pref === "dark") return "dark";
    if (pref === "light") return "light";
    return "";
  } catch {
    return "";
  }
}

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});
const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  variable: "--font-roboto",
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "dark light",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const { locale: ogLocale, alternateLocale } = getOgLocales(locale);
  const alternates = getRouteAlternates(locale);

  const defaults = buildPageMetadata({
    locale,
    title: "Create Cinematic Product Demos in Your Browser",
    description:
      "Free, privacy-first, browser-based video editor. Turn screen recordings into professional product demos with 3D mockups, cinematic zooms, and 4K export.",
    keywords: [
      "openvid",
      "product demo creator",
      "browser video editor",
      "screen recorder",
      "3D device mockups",
      "cinematic video zooms",
      "local video rendering",
      "privacy-first video tool",
      "SaaS marketing video",
    ],
  });

  return {
    ...defaults,
    metadataBase: new URL(SEO_BASE_URL),
    title: {
      default: "Openvid | Create Cinematic Product Demos in Your Browser",
      template: "%s | Openvid",
    },
    applicationName: "Openvid",
    category: "design tool",
    manifest: "/site.webmanifest",
    authors: [
      { name: "Cristian Olivera", url: "https://github.com/CristianOlivera1" },
    ],
    creator: "Cristian Olivera",
    publisher: "Openvid",
    icons: {
      icon: [
        { url: SEO_ICONS.faviconIco, type: "image/x-icon", sizes: "any" },
        { url: SEO_ICONS.favicon32, sizes: "32x32", type: "image/png" },
        { url: SEO_ICONS.favicon48, sizes: "48x48", type: "image/png" },
        { url: SEO_ICONS.tab, type: "image/svg+xml", sizes: "any" },
        { url: SEO_ICONS.pwa192, sizes: "192x192", type: "image/png" },
        { url: SEO_ICONS.pwa512, sizes: "512x512", type: "image/png" },
        { url: SEO_ICONS.solid, type: "image/svg+xml", sizes: "any" },
      ],
      shortcut: [{ url: SEO_ICONS.tab, type: "image/svg+xml" }],
      apple: [
        { url: SEO_ICONS.appleTouch, sizes: "180x180", type: "image/png" },
      ],
    },
    appleWebApp: {
      title: "Openvid",
      statusBarStyle: "black-translucent",
      capable: true,
    },
    alternates,
    openGraph: {
      ...defaults.openGraph,
      locale: ogLocale,
      alternateLocale,
      images: [
        {
          url: SEO_OG_IMAGE.url,
          width: SEO_OG_IMAGE.width,
          height: SEO_OG_IMAGE.height,
          alt: SEO_OG_IMAGE.alt,
          type: SEO_OG_IMAGE.type,
        },
      ],
    },
    other: {
      "msapplication-TileColor": "#000000",
      "format-detection": "telephone=no",
    },
  };
}

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!locales.includes(locale as Locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = (await getMessages()) as Record<string, unknown>;

  const publicMessages = {
    header: messages.header,
    footer: messages.footer,
    userMenu: messages.userMenu,
    recording: messages.recording,
    recordingSetup: messages.recordingSetup,
    hero: messages.hero,
    demo: messages.demo,
    featuresShowcase: messages.featuresShowcase,
    featuresGrid: messages.featuresGrid,
    socialReactions: messages.socialReactions,
    donation: messages.donation,
    notFound: messages.notFound,
    tour: messages.tour,
    heroPreview: messages.heroPreview,
    faq: messages.faq
  };

  const isProduction = process.env.NODE_ENV === "production";
  const gaId = process.env.NEXT_PUBLIC_GA_ID;
  const themeClass = await getThemeClass();

  return (
    <html lang={locale || defaultLocale} suppressHydrationWarning className={themeClass}>
      <head>
        <SuppressScriptWarning />
        <script dangerouslySetInnerHTML={{ __html: THEME_INLINE_SCRIPT }} />
      </head>
      <body
        className={`${inter.variable} ${roboto.variable} ${inter.className} antialiased`}
      >
        <NextIntlClientProvider
          key={locale}
          messages={publicMessages}
          locale={locale}
        >
          <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
        </NextIntlClientProvider>
      </body>
      {isProduction && gaId ? <GoogleAnalytics gaId={gaId} /> : null}
    </html>
  );
}
