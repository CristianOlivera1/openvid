"use client";

import { useState } from "react";
import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

type FAQProps = {
  items?: { q: string; a: string }[];
  eyebrow?: string;
  title1?: string;
  title2?: string;
  subtitle?: string;
};

export default function FAQ({ items: propItems, eyebrow, title1, title2, subtitle }: FAQProps) {
  const t = useTranslations("faq");
  const items = propItems ?? (t.raw("items") as { q: string; a: string }[]);
  const [open, setOpen] = useState<number | null>(0);

  return (
    <section
      id="faq"
      aria-labelledby="faq-heading"
      className="w-full bg-black border-t border-white/5 pb-24 sm:pb-32"
    >
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12 sm:mb-16">
          <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-white/40 mb-4">
            {eyebrow ?? t("eyebrow")}
          </p>
          <h2
            id="faq-heading"
            className="text-4xl sm:text-5xl font-semibold tracking-tight text-white leading-[1.05] mb-4"
          >
            {title1 ?? t("title1")}
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-neutral-300 to-neutral-600">
              {title2 ?? t("title2")}
            </span>
          </h2>
          <p className="text-[15px] leading-relaxed text-neutral-400 max-w-xl font-light">
            {subtitle ?? t("subtitle")}
          </p>
        </div>

        <div className="divide-y divide-white/10 border-y border-white/10">
          {items.map((item, i) => {
            const isOpen = open === i;
            return (
              <div key={item.q} className="py-1">
                <h3>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="flex w-full items-start justify-between gap-6 py-5 text-left group"
                  >
                    <span
                      className={`text-[15px] font-medium leading-snug transition-colors pr-2 ${
                        isOpen ? "text-white" : "text-white/90 group-hover:text-white"
                      }`}
                    >
                      {item.q}
                    </span>
                    <span
                      className={`shrink-0 mt-0.5 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-200 ${
                        isOpen
                          ? "bg-white text-black border-white rotate-180"
                          : "border-white/15 text-white/50 group-hover:border-white/25 group-hover:text-white/80"
                      }`}
                      aria-hidden="true"
                    >
                      <Icon
                        icon={isOpen ? "lucide:minus" : "lucide:plus"}
                        width={14}
                        className="transition-transform duration-200"
                      />
                    </span>
                  </button>
                </h3>
                <div
                  id={`faq-answer-${i}`}
                  role="region"
                  aria-labelledby={`faq-question-${i}`}
                  className={`grid transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                    isOpen ? "grid-rows-[1fr] opacity-100 pb-5" : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="text-[14px] leading-relaxed text-neutral-400 pr-12 max-w-2xl">
                      {item.a}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[13px] text-neutral-500">
          {t("contact")}{" "}
          <a href="mailto:oliverachavezcristian@gmail.com" className="text-white/80 hover:text-white underline underline-offset-4 decoration-white/20">
            {t("contactLink")}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
