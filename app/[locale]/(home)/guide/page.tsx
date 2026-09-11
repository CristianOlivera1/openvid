import { getTranslations, setRequestLocale } from "next-intl/server";
import type { Metadata } from "next";
import InteractiveRecordingSteps from "@/app/components/ui/home/RecordingSteps";
import { buildPageMetadata } from "@/lib/seo";

type Props = {
  params: Promise<{ locale: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations("recording.steps");
  
  return buildPageMetadata({
    locale,
    path: "/guide",
    title: t("title"),
    description: t("subtitle"),
  });
}

export default async function GuidePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return (
    <div className="min-h-screen bg-black pt-12 pb-24">
      <InteractiveRecordingSteps />
    </div>
  );
}