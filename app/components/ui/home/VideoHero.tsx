"use client";

import { useTranslations } from "next-intl";

export default function VideoHero() {
  const t = useTranslations("demo");

  return (
    <section className="relative w-full overflow-visible flex justify-center animate-fade-in-up">
      <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-screen max-w-480 h-full -z-10">
        <div className="absolute inset-0 -top-28 bottom-64 mix-blend-hard-light blur-[80px]" style={{ background: 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 138, 255, 0.1) 30%, rgb(255, 255, 255) 20%, rgb(247, 164, 66) 70%, rgb(233, 66, 247) 100%)' }} />
        <div className="absolute inset-0 -top-28 bottom-64 mix-blend-soft-light blur-[80px]" style={{ background: 'linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(0, 138, 255, 0.2) 35%, rgb(255, 255, 255) 70%, rgb(247, 164, 66) 80%, rgb(233, 66, 247) 100%)' }} />
      </div>

      <div className="relative px-4 w-full">
        <div className="relative mx-auto max-w-7xl">
          <div className="relative mt-4 h-fit w-full md:mt-12">
            <div className="relative -mx-6 flex max-w-screen justify-center p-8 delay-[800ms] duration-1000 will-change-transform starting:translate-y-16 starting:opacity-0 starting:blur-xs">
              <div className="relative w-full max-w-[calc(100vw-48px)] lg:w-7xl lg:min-w-200 lg:aspect-video">
                <div aria-hidden="true" className="absolute -inset-6 squircle-element-xl blur-3xl -z-10 bg-linear-to-b from-cyan-500/15 via-fuchsia-500/10 to-transparent" />
                <div className="relative w-full h-full p-0 sm:p-4 squircle-element-2xl sm:border sm:border-white/10 bg-white/2 sm:backdrop-blur-xs shadow-[0_0_0_1px_rgba(255,255,255,0.04),0_30px_120px_rgba(0,0,0,0.25)]">
                  <div className="relative w-full h-full overflow-hidden squircle-element-xl border border-white/10 bg-white/3">
                    <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/40 to-transparent z-20" />
                    <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-white/10 to-transparent z-10 pointer-events-none" />
                    <video autoPlay loop muted playsInline preload="auto" poster="/images/pages/demo-hero-poster2.webp" aria-label={t("title")} className="block w-full h-full object-cover">
                      <source src="/images/pages/demo-hero2.mp4" type="video/mp4" />
                    </video>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
