import type { Metadata } from "next";
import { Inter, Roboto, Poppins, Montserrat, DM_Sans } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const roboto = Roboto({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-roboto",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-poppins",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-montserrat",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: "swap",
  variable: "--font-dm-sans",
});

export const metadata: Metadata = {
  title: "openvid - Crea demos profesionales",
  description: "Crea demos cinemáticas y edita videos en segundos. Añade zooms suaves, mockups, personaliza fondos y exporta demos profesionales.",
  applicationName: "openvid",
  keywords: [
    "openvid",
    "edición de video",
    "zoom video",
    "grabación de pantalla",
    "creador de demos",
    "tomas cinemáticas",
    "mockups",
    "Cristian Olivera",
  ],
  authors: [{ name: "Cristian Olivera" }],
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  alternates: {
    canonical: "https://openvid.dev/",
  },
  icons: {
    icon: "/images/metadata/favicon.svg",
    shortcut: "/images/metadata/shortcut.svg",
    apple: "/images/metadata/apple.svg",
  },
  openGraph: {
    type: "website",
    url: "https://openvid.dev/",
    title: "openvid - Crea demos profesionales y edita en segundos",
    description:
      "Añade zooms suaves, mockups, personaliza fondos y exporta demos profesionales sin editores complejos.",
    images: [
      {
        url: "https://openvid.dev/images/metadata/preview-openvid.jpg",
        width: 1200,
        height: 630,
        alt: "openvid - Creador de demos, Graba Pantalla y Editor de Video",
      },
    ],
    locale: "es_ES",
    siteName: "openvid",
  },
  twitter: {
    card: "summary_large_image",
    title: "openvid - Crea demos profesionales y edita en segundos",
    description:
      "Añade zooms suaves, mockups, personaliza fondos y exporta demos profesionales sin editores complejos.",
    images: ["https://openvid.dev/images/metadata/preview-openvid.jpg"],
  },
  other: {
    "msapplication-TileColor": "#1f2937",
    "format-detection": "telephone=no",
    "mobile-web-app-capable": "yes",
    "apple-mobile-web-app-capable": "yes",
    "apple-mobile-web-app-status-bar-style": "black-translucent",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#050505",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${roboto.variable} ${poppins.variable} ${montserrat.variable} ${dmSans.variable} ${inter.className} antialiased dark`}>
        <TooltipProvider delayDuration={200}>
          {children}
        </TooltipProvider>
      </body>
    </html>
  );
}