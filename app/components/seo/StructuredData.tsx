import { SEO_BASE_URL, SEO_ICON_ABSOLUTE, SEO_OG_IMAGE } from "@/lib/seo";

type WebApplicationSchema = {
  '@context': 'https://schema.org';
  '@type': 'WebApplication';
  name: string;
  applicationCategory: 'MultimediaApplication';
  operatingSystem: 'Any';
  offers: {
    '@type': 'Offer';
    price: '0';
    priceCurrency: 'USD';
  };
  description: string;
  url: string;
  inLanguage?: string;
  image?: string;
  author?: {
    '@type': 'Organization' | 'Person';
    name: string;
    url?: string;
  };
  featureList?: string[];
};

type OrganizationSchema = {
  '@context': 'https://schema.org';
  '@type': 'Organization';
  name: string;
  url: string;
  logo?: string;
  sameAs?: string[];
  contactPoint?: {
    '@type': 'ContactPoint';
    contactType: string;
    email?: string;
  };
};

type WebSiteSchema = {
  '@context': 'https://schema.org';
  '@type': 'WebSite';
  name: string;
  alternateName?: string;
  url: string;
  inLanguage?: string;
  publisher?: {
    '@type': 'Organization';
    name: string;
    url: string;
    logo?: string;
  };
};

type BreadcrumbSchema = {
  '@context': 'https://schema.org';
  '@type': 'BreadcrumbList';
  itemListElement: Array<{
    '@type': 'ListItem';
    position: number;
    name: string;
    item?: string;
  }>;
};

type FAQItem = { q: string; a: string };

type FAQPageSchema = {
  "@context": "https://schema.org";
  "@type": "FAQPage";
  inLanguage?: string;
  mainEntity: Array<{
    "@type": "Question";
    name: string;
    acceptedAnswer: { "@type": "Answer"; text: string };
  }>;
};

type VideoObjectSchema = {
  "@context": "https://schema.org";
  "@type": "VideoObject";
  name: string;
  description: string;
  thumbnailUrl: string;
  uploadDate?: string;
  contentUrl?: string;
  embedUrl?: string;
  duration?: string;
  inLanguage?: string;
};

type HowToSchema = {
  "@context": "https://schema.org";
  "@type": "HowTo";
  name: string;
  description?: string;
  inLanguage?: string;
  totalTime?: string;
  step: Array<{ "@type": "HowToStep"; name: string; text: string; url?: string }>;
};

type StructuredDataProps = {
  data: WebApplicationSchema | OrganizationSchema | WebSiteSchema | BreadcrumbSchema | FAQPageSchema | VideoObjectSchema | HowToSchema | Record<string, unknown>;
};

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      id={`structured-data-${data['@type']}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      suppressHydrationWarning
    />
  );
}

export function generateFAQSchema(locale: string, items: FAQItem[]): FAQPageSchema {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: locale,
    mainEntity: items.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };
}

export function generateVideoObjectSchema(locale: string): VideoObjectSchema {
  const content: Record<string, { name: string; description: string }> = {
    es: {
      name: "OpenVid — Editor de video online con zooms cinemáticos",
      description: "Demo del editor de video online gratuito: screen recorder, zooms cinemáticos, mockups 3D y exportación HD sin marca de agua.",
    },
    en: {
      name: "OpenVid — Online video editor with cinematic zooms",
      description: "Demo of the free online video editor: screen recorder, cinematic zooms, 3D mockups and HD export without watermark.",
    },
    ru: {
      name: "OpenVid — Онлайн-редактор с кинематографическими зумами",
      description: "Демо бесплатного онлайн-редактора: запись экрана, кинематографические зумы, 3D-мокапы и HD-экспорт без водяных знаков.",
    },
    ko: {
      name: "OpenVid — 시네마틱 줌 온라인 비디오 에디터",
      description: "무료 온라인 비디오 에디터 데모: 화면 녹화, 시네마틱 줌, 3D 목업, 워터마크 없는 HD 내보내기.",
    },
  };
  const c = content[locale] ?? content.en;
  return {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    name: c.name,
    description: c.description,
    thumbnailUrl: `${SEO_BASE_URL}/images/pages/preview-editor-poster.webp`,
    contentUrl: `${SEO_BASE_URL}/videos/hero/demo-preview-editor.mp4`,
    embedUrl: `${SEO_BASE_URL}/${locale}`,
    uploadDate: "2026-01-01T00:00:00+00:00",
    duration: "PT30S",
    inLanguage: locale,
  };
}

export function generateHowToSchema(
  locale: string,
  t: (key: string) => string
): HowToSchema {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: t("title"),
    description: t("subtitle"),
    inLanguage: locale,
    totalTime: "PT2M",
    step: [1, 2, 3, 4].map((n) => ({
      "@type": "HowToStep",
      name: t(`step${n}.title`),
      text: t(`step${n}.description`),
      url: `${SEO_BASE_URL}/${locale}/guide#step-${n}`,
    })),
  };
}

export function generateWebAppSchema(locale: 'es' | 'en' | 'ru' | 'ko'): WebApplicationSchema {
  const baseUrl = SEO_BASE_URL;

  const content = {
    es: {
      name: 'openvid - Editor de Video Online',
      description: 'Editor de video online gratuito con IA. Graba pantalla, añade zooms cinemáticos, mockups profesionales y exporta en HD sin marca de agua.',
      features: [
        'Grabación de pantalla HD',
        'Zooms cinemáticos con IA',
        'Mockups profesionales',
        'Sin marca de agua',
        'Exportación en alta calidad',
        'Editor online gratuito',
      ],
    },
    en: {
      name: 'openvid - Online Video Editor',
      description: 'Free AI-powered online video editor. Screen recorder, cinematic zooms, professional mockups, and HD export without watermark.',
      features: [
        'HD screen recording',
        'AI-powered cinematic zooms',
        'Professional mockups',
        'No watermark',
        'High quality export',
        'Free online editor',
      ],
    },
    ru: {
      name: 'openvid - Online Video Editor',
      description: 'Бесплатный онлайн-видеоредактор на базе ИИ. Запись экрана, кинематографичное приближение, профессиональные мокапы и экспорт в HD без водяных знаков.',
      features: [
        'Запись экрана в HD',
        'Кинематографичное приближение на базе ИИ',
        'Профессиональные мокапы',
        'Без водяных знаков',
        'Экспорт в высоком качестве',
        'Бесплатный онлайн-редактор',
      ],
    },
    ko: {
      name: 'openvid - 온라인 동영상 에디터',
      description: '무료 AI 기반 온라인 동영상 에디터. 화면을 녹화하고 시네마틱 줌, 전문 목업을 추가해 워터마크 없이 HD로 내보내세요.',
      features: [
        'HD 화면 녹화',
        'AI 기반 시네마틱 줌',
        '전문 목업',
        '워터마크 없음',
        '고화질 내보내기',
        '무료 온라인 에디터',
      ],
    },
  };

  const { name, description, features } = content[locale];

  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name,
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Any',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    description,
    url: `${baseUrl}/${locale}`,
    inLanguage: locale,
    image: SEO_OG_IMAGE.url,
    author: {
      '@type': 'Person',
      name: 'Cristian Olivera',
      url: baseUrl,
    },
    featureList: features,
  };
}

export function generateOrganizationSchema(): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'openvid',
    url: SEO_BASE_URL,
    logo: SEO_ICON_ABSOLUTE.logo,
    sameAs: [
      'https://x.com/openvid',
      'https://www.tiktok.com/@openvid',
      'https://www.instagram.com/openvidink',
      'https://www.youtube.com/@openvidink',
      'https://github.com/CristianOlivera1/openvid',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'oliverachavezcristian@gmail.com',
    },
  };
}

export function generateWebSiteSchema(locale: 'es' | 'en' | 'ru' | 'ko'): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Openvid',
    alternateName: 'openvid',
    url: `${SEO_BASE_URL}/${locale}`,
    inLanguage: locale,
    publisher: {
      '@type': 'Organization',
      name: 'openvid',
      url: SEO_BASE_URL,
      logo: SEO_ICON_ABSOLUTE.logo,
    },
  };
}
