'use client';
import { useEffect, useRef } from 'react';
import Atropos from 'atropos';
import { useTranslations } from 'next-intl';

export default function EditorPreview() {
  const t = useTranslations('demo');

  const atroposRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!atroposRef.current) return;

    const myAtropos = Atropos({
      el: atroposRef.current,
      activeOffset: 40,
      shadow: false,
      highlight: true,
    });

    return () => {
      myAtropos.destroy();
    };
  }, []);
  return (
    <div className="relative max-w-6xl mx-auto mt-30 sm:mt-0 isolate">
      <div className="hidden sm:block absolute top-0 left-1/2 -translate-x-1/2 w-140 h-80 rounded-full bg-[#0095ED]/40 blur-[120px] pointer-events-none -z-10" />
      <div className="hidden sm:block absolute top-20 left-1/3 w-60 h-60 rounded-full bg-blue-600/20 blur-[80px] pointer-events-none -z-10" />
      <div className="absolute top-0 right-0 md:-right-10 z-30 pointer-events-none">
        <img
          src="/images/carousel/decorators/sparkle-blur.png"
          alt="decoración"
          className="size-40 md:size-50 object-contain opacity-80 animate-pulse"
        />
      </div>
      <h2 className="relative text-4xl md:text-6xl text-center font-bold tracking-tighter text-white mb-10 leading-tight drop-shadow-[0_0_30px_rgba(183,203,248,0.3)] z-20">
        {t('title')} <br />
        <span className="bg-linear-to-r from-[#003780] to-white bg-clip-text text-transparent">
          {t('subtitle')}
        </span>
      </h2>

      <div className="relative w-full">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-140 h-80 rounded-full bg-[#0095ED80] blur-[120px] pointer-events-none -z-10" />

        <div className="hero-3d-wrapper relative w-full">
          <div className="hidden sm:block absolute -left-20 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#06b6d433] blur-[110px] pointer-events-none -z-10" />

          <div className="hidden sm:block absolute -right-20 top-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-[#6366f126] blur-[110px] pointer-events-none -z-10" />

          <div ref={atroposRef} className="atropos w-full rounded-2xl">
            <div className="atropos-scale">
              <div className="atropos-rotate">
                <div className="atropos-inner rounded-2xl relative">
                  <div
                    className="absolute -inset-1 bg-linear-to-b from-neutral-700/10 to-transparent rounded-2xl blur-md -z-10"
                    data-atropos-offset="-5"
                  ></div>

                  <img
                    src="/images/pages/openvid2.webp"
                    alt="openvid Editor Preview"
                    className="w-full h-auto object-cover rounded-xl"
                    loading="lazy"
                    data-atropos-offset="3"
                  />

                  <div
                    className="absolute inset-0 pointer-events-none rounded-xl bg-[linear-gradient(to_bottom,#bf29f000_24%,#0095ED4D)]"
                    data-atropos-offset="4"
                  ></div>
                </div>
              </div>
            </div>
            <div
              className="absolute bottom-10 right-4 md:right-4 z-30 pointer-events-none"
              data-atropos-offset="8"
            >
              <img
                src="/images/carousel/decorators/sparkle-move.svg"
                alt="decor"
                className="size-6 md:size-8"
              />
            </div>

            <div
              className="absolute top-48 -left-4 md:-left-16 z-30 pointer-events-none opacity-80"
              data-atropos-offset="6"
            >
              <img
                src="/images/carousel/decorators/sparkle-static.svg"
                alt="decor-left"
                className="size-4 md:size-6"
              />
            </div>
          </div>
        </div>
        <div className="hidden sm:block absolute top-10 left-0 w-90 h-60 rounded-full bg-[#29b1ff33] blur-[100px] pointer-events-none -z-10" />
        <div className="hidden sm:block absolute bottom-10 left-0 w-90 h-60 rounded-full bg-[#0095ED33] blur-[100px] pointer-events-none -z-10" />
        <div className="hidden sm:block absolute bottom-10 right-0 w-100 h-60 rounded-full bg-[#ffffff33] blur-[100px] pointer-events-none -z-10" />
      </div>

      <div className="hidden sm:block absolute -bottom-10 left-0 w-80 h-60 rounded-full bg-[#0095ED33] blur-[100px] pointer-events-none -z-10" />
      <div className="hidden sm:block absolute bottom-0 left-1/2 -translate-x-1/2 w-140 h-80 rounded-full bg-[#0095ED] blur-[120px] pointer-events-none -z-10" />
      <div className="hidden sm:block absolute -bottom-10 right-0 w-80 h-60 rounded-full bg-[#01a2ff33] blur-[100px] pointer-events-none -z-10" />
    </div>
  );
}