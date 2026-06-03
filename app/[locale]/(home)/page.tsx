import { CarouselDemos } from "@/app/components/ui/home/CarouselDemos";
import Hero from "@/app/components/ui/home/Hero";
import InteractiveRecordingSteps from "@/app/components/ui/home/RecordingSteps";
import { StructuredData, generateWebAppSchema, generateOrganizationSchema } from "@/app/components/seo/StructuredData";
import type { Metadata } from 'next';
import DonationCard from "@/app/components/ui/home/DonationCard";
import EditorPreview from "@/app/components/ui/home/EditorPreview";
import VideoHero from "@/app/components/ui/home/VideoHero";
import BannerCTA from "@/app/components/ui/home/BannerCTA";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const baseUrl = 'https://openvid.dev';

  const metadata = {
    es: {
      title: 'Crea demos profesionales y edita videos en segundos',
      description: 'Editor de video online gratuito con IA. Graba pantalla, añade zooms cinemáticos, mockups profesionales y exporta en HD. Sin marca de agua.',
      keywords: ['editor de video', 'grabar pantalla', 'demos profesionales', 'zoom video', 'mockups', 'screen recorder', 'video editor online'],
    },
    en: {
      title: 'Create Professional Demos and Edit Videos in Seconds',
      description: 'Free AI-powered online video editor. Screen recorder, cinematic zooms, professional mockups, and HD export. No watermark.',
      keywords: ['video editor', 'screen recorder', 'professional demos', 'video zoom', 'mockups', 'online video editor', 'free video editor'],
    },
    vi: {
      title: 'Tạo demo chuyên nghiệp và chỉnh sửa video trong vài giây',
      description: 'Trình chỉnh sửa video trực tuyến miễn phí có hỗ trợ AI. Ghi màn hình, thêm zoom điện ảnh, mockup chuyên nghiệp và xuất HD. Không có watermark.',
      keywords: ['trình chỉnh sửa video', 'ghi màn hình', 'demo chuyên nghiệp', 'zoom video', 'mockup', 'chỉnh sửa video online', 'trình chỉnh sửa video miễn phí'],
    },
  };

  const { title, description, keywords } = metadata[locale as 'es' | 'en' | 'vi'] || metadata.es;

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        es: `${baseUrl}/es`,
        en: `${baseUrl}/en`,
        ru: `${baseUrl}/ru`,
        vi: `${baseUrl}/vi`,
      },
    },
    openGraph: {
      title,
      description,
      url: `${baseUrl}/${locale}`,
      images: [
        {
          url: `${baseUrl}/images/metadata/preview-openvid.jpg`,
          width: 1200,
          height: 630,
          alt: 'openvid - Professional Video Editor',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`${baseUrl}/images/metadata/preview-openvid.jpg`],
    },
  };
}

export default async function Home({ params }: Props) {
  const { locale } = await params;

  return (
    <>
      <StructuredData data={generateWebAppSchema(locale as 'es' | 'en' | 'ru' | 'vi')} />
      <StructuredData data={generateOrganizationSchema()} />

      <div className="flex flex-col">
        <div className="relative overflow-hidden bg-gradient-radial-primary w-full">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-75 h-75 rounded-full bg-cyan-500/15 blur-[80px] pointer-events-none z-0" aria-hidden="true" />
          <section className="pt-32 pb-6 sm:pb-14" aria-label="Hero section">
            <div className="max-w-6xl mx-auto px-6 text-center relative z-10">
              <Hero />
            </div>
            <VideoHero />
          </section>
          <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-[#0a0a0a] to-transparent pointer-events-none z-20" />
        </div>

        <section className="w-full py-10 sm:py-16" aria-label="How it works">
          <div className="max-w-6xl mx-auto px-6 xl:px-0">
            <InteractiveRecordingSteps />
          </div>
        </section>

        <div className="relative overflow-hidden bg-gradient-radial-primary w-full sm:pt-24">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-250 h-[150%] rounded-[100%] blur-xl pointer-events-none" aria-hidden="true"></div>
          <section className="w-full" aria-label="Editor features and demos">
            <div className="w-full mx-auto bg-[url('/images/pages/dots.svg')] bg-no-repeat bg-[size:68%] bg-center">
              <EditorPreview />
            </div>
            <CarouselDemos />
            <section className="pt-4 pb-10 sm:py-2 w-full mb-0 sm:mb-42" aria-label="Support the project">
              <div
                className="absolute left-1/2 -translate-x-1/2 w-150 h-500 pointer-events-none z-0 pro-glow"
                style={{
                  mixBlendMode: 'plus-lighter',
                  willChange: 'filter, background',
                  background: 'radial-gradient(circle at var(--glow-x) 20%, rgba(6, 182, 212, 0.25) 0%, transparent 70%)'
                }}
                aria-hidden="true"
              />
              <div className="max-w-xl mx-auto px-6">
                <DonationCard />
              </div>
              <div className="absolute inset-x-0 bottom-0 h-32 bg-linear-to-t from-[#0a0a0a] to-transparent pointer-events-none z-20" />
            </section>
            <BannerCTA />
          </section>
        </div>
      </div>
    </>
  );
}