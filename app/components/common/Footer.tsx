"use client";

import { Icon } from "@iconify/react";
import { Link } from "@/navigation";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations('footer');
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-white/10 bg-[#050505] pt-16 pb-8" role="contentinfo">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between gap-12 mb-16">
        <div className="w-full md:w-1/3">
          <div className="flex items-center gap-2 mb-4">
            <Link href="/" className="flex items-center gap-2 group" aria-label="Openvid - Go to home">
              <Image src="/svg/logo-openvid.svg" alt="" width={50} height={50} aria-hidden="true" />
              <Image src="/svg/openvid.svg" alt="Openvid" width={100} height={50} />
            </Link>
          </div>
          <p className="text-neutral-500 text-sm leading-relaxed">
            {t.rich('description', {
              recording: (chunks) => <span className="text-neutral-400 font-bold">{chunks}</span>,
              editing: (chunks) => <span className="text-neutral-400 font-bold">{chunks}</span>
            })}
          </p>
        </div>

        <div className="flex gap-12 md:gap-24">
          <nav aria-label={t('product')}>
            <h4 className="text-white font-medium text-sm mb-4">{t('product')}</h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><Link href="/guide" target="_blank" className="hover:text-white transition-colors">{t('guide')}</Link></li>
              <li><Link href="/editor" className="hover:text-white transition-colors">{t('editor')}</Link></li>
              <li><Link href="/donate" target="_blank" className="hover:text-white transition-colors">{t('donate')}</Link></li>
            </ul>
          </nav>
          <nav aria-label={t('contact')}>
            <h4 className="text-white font-medium text-sm mb-4">{t('contact')}</h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><a href="https://mail.google.com/mail/?view=cm&fs=1&to=oliverachavezcristian@gmail.com" target="_blank" className="hover:text-white transition-colors">{t('email')}</a></li>
            </ul>
          </nav>
          <nav aria-label={t('legal')}>
            <h4 className="text-white font-medium text-sm mb-4">{t('legal')}</h4>
            <ul className="space-y-3 text-sm text-neutral-500">
              <li><Link href="/privacy" className="hover:text-white transition-colors">{t('privacy')}</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">{t('terms')}</Link></li>
            </ul>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center gap-4">
        <span className="text-xs text-neutral-600">© {currentYear} openvid  {t('rights')}</span>
        <div className="flex gap-4 text-white" aria-label="Social links">
          <a href="https://x.com/openvid" className="hover:text-white transition-colors" aria-label="X" target="_blank" rel="noopener noreferrer"><Icon icon="mingcute:social-x-line" width="18" aria-hidden="true" /></a>
          <a href="https://www.instagram.com/openvidink" className="hover:text-white transition-colors" aria-label="Instagram" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:instagram" width="18" aria-hidden="true" /></a>
          <a href="https://www.youtube.com/@openvidink" className="hover:text-white transition-colors" aria-label="Youtube" target="_blank" rel="noopener noreferrer"><Icon icon="mdi:youtube" width="18" aria-hidden="true" /></a>
        </div>
      </div>
    </footer>
  );
}