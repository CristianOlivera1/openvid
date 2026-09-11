import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { Icon } from "@iconify/react";
import { StructuredData } from "@/app/components/seo/StructuredData";
import { SEO_BASE_URL } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "screenRecorder" });
  const canonical = `${SEO_BASE_URL}/${locale}/screen-recorder`;
  const title = `${t("heroTitle1")} ${t("heroTitle2")} | Openvid`;
  const description = t("heroSubtitle");
  return {
    title,
    description,
    keywords: ["screen recorder", "grabar pantalla", "record screen", "screen recorder online"],
    alternates: {
      canonical,
      languages: {
        es: `${SEO_BASE_URL}/es/screen-recorder`,
        en: `${SEO_BASE_URL}/en/screen-recorder`,
        ru: `${SEO_BASE_URL}/ru/screen-recorder`,
        ko: `${SEO_BASE_URL}/ko/screen-recorder`,
        "x-default": `${SEO_BASE_URL}/en/screen-recorder`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "website",
      images: [{ url: `${SEO_BASE_URL}/images/metadata/preview-openvid.jpg`, width: 1200, height: 630 }],
    },
  };
}

const FEATURE_META = [
  { icon: "mdi:monitor-screenshot", imageSrc: "/images/screen-recorder/banner-recorder.webp", colSpan: "md:col-span-2", aspect: "aspect-video md:aspect-[16/9]" },
  { icon: "mdi:account-circle-outline", imageSrc: "/images/screen-recorder/banner-cam.webp", colSpan: "md:col-span-1", aspect: "aspect-video md:aspect-[3/4]" },
  { icon: "mdi:record-circle-outline", imageSrc: "/images/screen-recorder/banner-audio.webp", colSpan: "md:col-span-3", aspect: "aspect-video md:aspect-[21/9]" },
];

const STEP_ICONS = ["mdi:monitor-screenshot", "mdi:record-circle-outline", "mdi:wand-wave"];

export default async function ScreenRecorderPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "screenRecorder" });
  const features = t.raw("features") as { title: string; desc: string }[];
  const steps = t.raw("steps") as { n: string; t: string; d: string; tag: string }[];

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: locale === "es" ? "Inicio" : locale === "ru" ? "Главная" : locale === "ko" ? "홈" : "Home", item: `${SEO_BASE_URL}/${locale}` },
            { "@type": "ListItem", position: 2, name: t("heroTitle1"), item: `${SEO_BASE_URL}/${locale}/screen-recorder` },
          ],
        }}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "HowTo",
          name: t("heroTitle1"),
          description: t("heroSubtitle"),
          totalTime: "PT2M",
          step: steps.map((s) => ({ "@type": "HowToStep", name: s.t, text: s.d })),
        }}
      />

      <div className="flex flex-col bg-black">
        <section className="relative overflow-hidden pt-28 pb-12 sm:pt-36 sm:pb-16">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-cyan-500/10 blur-[100px] pointer-events-none" />
          <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-10 items-center relative z-10">
            <div>
              <p className="text-[11px] tracking-[0.18em] uppercase text-white/40 mb-3">{t("heroEyebrow")}</p>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-white leading-[1.05] mb-4">
                {t("heroTitle1")} <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-300 to-neutral-600">{t("heroTitle2")}</span>
              </h1>
              <p className="text-[16px] leading-relaxed text-neutral-400 max-w-xl mb-7">{t("heroSubtitle")}</p>
              <div className="flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-neutral-100">
                  <Link href={`/${locale}/guide`}>{t("ctaPrimary")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative squircle-element-2xl overflow-hidden border border-white/10 bg-neutral-950 aspect-video flex items-center justify-center">
              <Image src="/images/pages/preview-editor-poster.webp" alt={t("heroTitle1")} fill priority className="object-cover opacity-90" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURE_META.map((m, i) => {
            const f = features[i];
            if (!f) return null;
            return (
              <article key={f.title} className={`group relative squircle-element-2xl bg-neutral-950/80 border border-neutral-800/80 p-6 backdrop-blur-sm transition-all duration-300 hover:border-neutral-700 hover:bg-neutral-900/30 flex flex-col justify-between ${m.colSpan}`}>
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/0 group-hover:via-cyan-500/40 to-transparent transition-all duration-500 opacity-0 group-hover:opacity-100" />
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center shrink-0 group-hover:bg-neutral-800/50 transition-colors">
                      <Icon icon={m.icon} width={16} className="text-neutral-400" />
                    </div>
                    <h3 className="text-white font-medium tracking-tight text-base">{f.title}</h3>
                  </div>
                  <p className="text-sm text-neutral-400 leading-relaxed">{f.desc}</p>
                </div>
                <div className={`relative rounded-xl overflow-hidden bg-neutral-900/80 border border-neutral-800 group-hover:border-neutral-700 transition-colors ${m.aspect}`}>
                  <Image src={m.imageSrc} alt={f.title} fill className="object-cover opacity-90 group-hover:scale-[1.02] transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                </div>
              </article>
            );
          })}
        </section>

        <section className="max-w-6xl mx-auto px-6 py-24 relative overflow-hidden">
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent blur-[120px] pointer-events-none" />
          <div className="text-center mb-16 relative z-10">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-3">{t("stepsTitle")}</h2>
            <p className="text-sm text-neutral-400 max-w-md mx-auto">{t("stepsSubtitle")}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-4 relative z-10">
            {steps.map((s, idx) => (
              <div key={s.n} className="group relative rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6 backdrop-blur-sm transition-all hover:border-neutral-700 flex flex-col justify-between">
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/0 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-mono text-xs text-neutral-400 bg-neutral-900 border border-neutral-800 px-2.5 py-1 rounded-md">
                      <span className="text-cyan-400">{s.n}</span>
                    </span>
                    <span className="font-mono text-[10px] uppercase text-neutral-500 tracking-wider">{s.tag}</span>
                  </div>
                  <h3 className="text-lg font-medium text-white mb-2 flex items-center justify-between">
                    {s.t}
                    <Icon icon={STEP_ICONS[idx] ?? "mdi:wand-wave"} width={18} className="text-neutral-600" />
                  </h3>
                  <p className="text-sm text-neutral-400 leading-relaxed mb-6">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="squircle-element-2xl relative overflow-hidden bg-[#100e0b]/60 border border-white/10 p-8 sm:p-12 text-center">
            <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
              <div className="absolute -top-[40%] left-[10%] w-[130%] h-[150%] rounded-full blur-[70px] opacity-65" style={{ background: "radial-gradient(circle at center, rgba(247,164,66,0.9) 0%, rgba(247,115,22,0.5) 50%, transparent 100%)", mixBlendMode: "hard-light" as const }} />
              <div className="absolute -bottom-[30%] -right-[20%] w-[100%] h-[130%] rounded-full blur-[60px] opacity-35" style={{ background: "radial-gradient(circle at center, rgba(0,138,255,0.7) 0%, rgba(233,66,247,0.5) 60%, transparent 100%)", mixBlendMode: "soft-light" as const }} />
            </div>
            <div className="relative z-10">
              <h2 className="text-3xl font-semibold text-white tracking-tight mb-3">{t("ctaTitle")}</h2>
              <p className="text-neutral-400 mb-6">{t("ctaSubtitle")}</p>
              <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-neutral-100">
                <Link href={`/${locale}/guide`}>{t("ctaButton")}</Link>
              </Button>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
