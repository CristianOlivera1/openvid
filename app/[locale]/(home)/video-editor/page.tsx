import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@iconify/react";
import { StructuredData } from "@/app/components/seo/StructuredData";
import { SEO_BASE_URL } from "@/lib/seo";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui/button";
import FAQ from "@/app/components/ui/home/FAQ";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "videoEditor" });
  const canonical = `${SEO_BASE_URL}/${locale}/video-editor`;
  const title = `${t("heroTitle1")} ${t("heroTitle2")} | Openvid`;
  const description = t("heroSubtitle");
  return {
    title,
    description,
    keywords: ["video editor", "editor de video", "online video editor", "free video editor"],
    alternates: {
      canonical,
      languages: {
        es: `${SEO_BASE_URL}/es/video-editor`,
        en: `${SEO_BASE_URL}/en/video-editor`,
        ru: `${SEO_BASE_URL}/ru/video-editor`,
        ko: `${SEO_BASE_URL}/ko/video-editor`,
        "x-default": `${SEO_BASE_URL}/en/video-editor`,
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
  { icon: "mdi:magnify-plus-outline", videoSrc: "/videos/seo/zoom-demo.mp4", banner: "/images/banners/banner-zoom.webp", colSpan: "md:col-span-2", aspect: "aspect-video md:aspect-[16/9]" },
  { icon: "mdi:cellphone", videoSrc: "/videos/seo/mockup-3d.mp4", banner: "/images/banners/banner-mockup.webp", colSpan: "md:col-span-1", aspect: "aspect-video md:aspect-[3/4]" },
  { icon: "mdi:layers-outline", videoSrc: "/videos/seo/timeline.mp4", banner: "/images/banners/banner-timeline.webp", colSpan: "md:col-span-3", aspect: "aspect-video md:aspect-[21/9]" },
];

export default async function VideoEditorPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale, namespace: "videoEditor" });
  const faqItems = t.raw("faqItems") as { q: string; a: string }[];
  const features = t.raw("features") as { title: string; desc: string }[];
  const steps = t.raw("steps") as { t: string; d: string; tag: string }[];

  return (
    <>
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: locale === "es" ? "Inicio" : locale === "ru" ? "Главная" : locale === "ko" ? "홈" : "Home", item: `${SEO_BASE_URL}/${locale}` },
            { "@type": "ListItem", position: 2, name: t("heroTitle1"), item: `${SEO_BASE_URL}/${locale}/video-editor` },
          ],
        }}
      />
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "FAQPage",
          inLanguage: locale,
          mainEntity: faqItems.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
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
                  <Link href={`/${locale}/editor`}>{t("ctaPrimary")}</Link>
                </Button>
              </div>
            </div>
            <div className="relative squircle-element-2xl overflow-hidden border border-white/10 bg-neutral-950 aspect-video flex items-center justify-center">
              <video autoPlay loop muted playsInline poster="/images/banners/banner-hero.webp" className="absolute inset-0 w-full h-full object-cover opacity-90">
                <source src="/videos/hero/demo-preview-editor.mp4" type="video/mp4" />
              </video>
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-16 w-full">
          <h2 className="text-2xl sm:text-3xl font-semibold text-white tracking-tight mb-2">{t("comparisonTitle")}</h2>
          <p className="text-neutral-400 text-sm mb-8 max-w-2xl">{t("comparisonSubtitle")}</p>
          <div className="overflow-x-auto border border-white/10 rounded-2xl">
            <table className="w-full text-sm">
              <thead className="bg-white/[0.04] text-white/50 text-xs uppercase tracking-widest">
                <tr>
                  <th className="text-left p-4 font-medium">Feature</th>
                  <th className="text-center p-4 font-medium">Openvid</th>
                  <th className="text-center p-4 font-medium">CapCut</th>
                  <th className="text-center p-4 font-medium">Premiere</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-neutral-300">
                <tr>
                  <td className="p-4">No watermark</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                  <td className="p-4 text-center text-white/30">—</td>
                  <td className="p-4 text-center text-emerald-400">✓</td>
                </tr>
                <tr>
                  <td className="p-4">AI cinematic zooms</td>
                  <td className="p-4 text-center text-emerald-400">✓ Auto</td>
                  <td className="p-4 text-center text-white/30">Manual</td>
                  <td className="p-4 text-center text-white/30">Manual</td>
                </tr>
                <tr>
                  <td className="p-4">3D Mockups</td>
                  <td className="p-4 text-center text-emerald-400">✓ 1 click</td>
                  <td className="p-4 text-center text-white/30">No</td>
                  <td className="p-4 text-center text-white/30">Plugin</td>
                </tr>
                <tr>
                  <td className="p-4">100% browser, private</td>
                  <td className="p-4 text-center text-emerald-400">✓ Local</td>
                  <td className="p-4 text-center text-white/30">Cloud</td>
                  <td className="p-4 text-center text-white/30">Install</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {FEATURE_META.map((f, i) => {
            const feat = features[i];
            return (
              <article key={f.icon} className={`group relative squircle-element-2xl bg-neutral-950/80 border border-neutral-800/80 p-6 backdrop-blur-sm transition-all hover:border-neutral-700 flex flex-col justify-between ${f.colSpan}`}>
                <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/0 group-hover:via-cyan-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-all" />
                <div className="mb-4">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-neutral-900 border border-neutral-800 flex items-center justify-center">
                      <Icon icon={f.icon} width={16} className="text-neutral-400" />
                    </div>
                    <h3 className="text-white font-medium">{feat?.title ?? `Feature ${i + 1}`}</h3>
                  </div>
                  <p className="text-sm text-neutral-400">{feat?.desc ?? ""}</p>
                </div>
                <div className={`relative rounded-xl overflow-hidden bg-neutral-900/80 border border-neutral-800 ${f.aspect}`}>
                  <video autoPlay loop muted playsInline poster={f.banner} className="absolute inset-0 w-full h-full object-cover opacity-90">
                    <source src={f.videoSrc} type="video/mp4" />
                  </video>
                </div>
              </article>
            );
          })}
        </section>

        <section className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight text-white mb-3">{t("howItWorksTitle")}</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {steps.map((s, idx) => (
              <div key={s.t} className="rounded-2xl border border-neutral-800 bg-neutral-950/80 p-6">
                <span className="font-mono text-xs text-cyan-400">0{idx + 1}</span>
                <h3 className="text-white font-medium mt-2">{s.t}</h3>
                <p className="text-sm text-neutral-400 mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </section>

        <FAQ items={faqItems} eyebrow={t("faqEyebrow")} title1={t("faqTitle1")} title2={t("faqTitle2")} subtitle={t("faqSubtitle")} />

        <section className="max-w-7xl mx-auto px-6 pb-20">
          <div className="squircle-element-2xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-fuchsia-500/20 border border-white/10 p-8 sm:p-12 text-center">
            <h2 className="text-3xl font-semibold text-white mb-3">{t("ctaTitle")}</h2>
            <p className="text-neutral-400 mb-6">{t("ctaSubtitle")}</p>
            <Button asChild size="lg" className="rounded-full bg-white text-black hover:bg-neutral-100">
              <Link href={`/${locale}/editor`}>{t("ctaButton")}</Link>
            </Button>
          </div>
        </section>
      </div>
    </>
  );
}
