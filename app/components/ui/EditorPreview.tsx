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
    <div className="relative max-w-6xl mx-auto mt-30 sm:mt-0 hero-perspective-container">
      <h2 className="text-4xl md:text-6xl text-center font-bold tracking-tighter text-white mb-10 leading-tight drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
        {t('title')} <br />
        <span className="bg-linear-to-r from-[#003780] to-white bg-clip-text text-transparent">
          {t('subtitle')}
        </span>
      </h2>
      <div className="hero-3d-wrapper relative w-full">

        <div ref={atroposRef} className="atropos w-full rounded-2xl">
          <div className="atropos-scale">
            <div className="atropos-rotate">
              <div className="atropos-inner rounded-2xl">

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

              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}