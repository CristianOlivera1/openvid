import Hero from "@/app/components/ui/home/Hero";
import {
  StructuredData,
  generateWebAppSchema,
  generateOrganizationSchema,
  generateWebSiteSchema,
} from "@/app/components/seo/StructuredData";
import type { Metadata } from "next";
import DonationCard from "@/app/components/ui/home/DonationCard";
import BannerCTA from "@/app/components/ui/home/BannerCTA";
import FeaturesGrid from "@/app/components/ui/home/Featuresgrid";
import FeaturesShowcase from "@/app/components/ui/home/FeaturesShowcase";
import SocialReactions from "@/app/components/ui/home/SocialReactions";
import FAQ from "@/app/components/ui/home/FAQ";
import { buildPageMetadata } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import HeroEditorPreview from "@/app/components/ui/home/HeroEditorPreview";
import { generateFAQSchema, generateVideoObjectSchema } from "@/app/components/seo/StructuredData";

type Props = {
  params: Promise<{ locale: string }>;
};

const HOME_COPY = {
  es: {
    title: "Crea demos profesionales y edita videos en segundos",
    description:
      "Editor de video online gratuito con IA. Graba pantalla, zooms cinemáticos, mockups 3D y exporta en HD. Sin marca de agua.",
    keywords: [
      "editor de video",
      "grabar pantalla",
      "demos profesionales",
      "zoom video",
      "mockups 3D",
      "screen recorder",
      "video editor online",
      "openvid",
    ],
  },
  en: {
    title: "Create Professional Demos and Edit Videos in Seconds",
    description:
      "Free AI-powered online video editor. Screen recorder, cinematic zooms, 3D mockups, and HD export. No watermark.",
    keywords: [
      "video editor",
      "screen recorder",
      "professional demos",
      "video zoom",
      "3D mockups",
      "online video editor",
      "free video editor",
      "openvid",
    ],
  },
  ru: {
    title:
      "Создавайте профессиональные демонстрации и редактируйте видео за секунды",
    description:
      "Бесплатный онлайн-редактор видео с ИИ. Запись экрана, кинематические зумы, 3D-макеты и экспорт в HD. Без водяного знака.",
    keywords: [
      "редактор видео",
      "запись экрана",
      "профессиональные демонстрации",
      "зум видео",
      "3D макеты",
      "онлайн-редактор видео",
      "openvid",
    ],
  },
  ko: {
    title: "몇 초 만에 전문적인 데모를 만들고 동영상을 편집하세요",
    description:
      "무료 AI 기반 온라인 동영상 에디터. 화면 녹화, 시네마틱 줌, 3D 목업, HD 내보내기. 워터마크 없음.",
    keywords: [
      "동영상 에디터",
      "화면 녹화",
      "전문 데모",
      "동영상 줌",
      "3D 목업",
      "온라인 동영상 에디터",
      "openvid",
    ],
  },
} as const;

type HomeLocale = keyof typeof HOME_COPY;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const copy = HOME_COPY[(locale as HomeLocale)] ?? HOME_COPY.en;

  return buildPageMetadata({
    locale,
    path: "",
    title: copy.title,
    description: copy.description,
    keywords: [...copy.keywords],
  });
}

export default async function Home({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const schemaLocale = (locale in HOME_COPY ? locale : "en") as HomeLocale;
  const tFaq = await getTranslations({ locale, namespace: "faq" });
  const faqItems = tFaq.raw("items") as { q: string; a: string }[];
  const faqSchema = generateFAQSchema(locale, faqItems);

  return (
    <>
      <StructuredData data={generateWebAppSchema(schemaLocale)} />
      <StructuredData data={generateWebSiteSchema(schemaLocale)} />
      <StructuredData data={generateOrganizationSchema()} />
      <StructuredData data={generateVideoObjectSchema(locale)} />
      <StructuredData data={faqSchema} />

      <div className="flex flex-col">
        <div className="relative overflow-hidden bg-gradient-radial-primary w-full">
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-75 h-75 rounded-full bg-cyan-500/15 blur-[80px] pointer-events-none z-0"
            aria-hidden="true"
          />
          <section className="pt-32 pb-6 sm:pb-14" aria-label="Hero section">
            <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
              <Hero />
            </div>
            <HeroEditorPreview />
          </section>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#0a0a0a] to-transparent pointer-events-none z-20" />
        </div>

        <div className="relative overflow-hidden w-full bg-black">
          <section className="w-full" aria-label="Editor features and demos">
            <div className="w-full mx-auto">
              <FeaturesShowcase />
              <FeaturesGrid />
            </div>

            <div id="reactions" className="w-full">
              <SocialReactions />
            </div>

            <FAQ />

            <div className="max-w-xl mx-auto px-6 pt-24 pb-50">
              <DonationCard />
            </div>

            <BannerCTA />
          </section>
        </div>
      </div>
    </>
  );
}
