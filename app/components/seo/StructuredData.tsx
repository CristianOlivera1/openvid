import Script from 'next/script';

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

type StructuredDataProps = {
  data: WebApplicationSchema | OrganizationSchema | BreadcrumbSchema | Record<string, unknown>;
};

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <Script
      id={`structured-data-${data['@type']}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
      strategy="beforeInteractive"
    />
  );
}

export function generateWebAppSchema(locale: 'es' | 'en' | 'ru' | 'vi'): WebApplicationSchema {
  const baseUrl = 'https://openvid.dev';

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
    vi: {
      name: 'openvid - Trình chỉnh sửa video trực tuyến',
      description: 'Trình chỉnh sửa video trực tuyến miễn phí có hỗ trợ AI. Ghi màn hình, zoom điện ảnh, mockup chuyên nghiệp và xuất HD không watermark.',
      features: [
        'Ghi màn hình HD',
        'Zoom điện ảnh có hỗ trợ AI',
        'Mockup chuyên nghiệp',
        'Không có watermark',
        'Xuất video chất lượng cao',
        'Trình chỉnh sửa trực tuyến miễn phí',
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
    url: baseUrl,
    image: `${baseUrl}/images/metadata/preview-openvid.jpg`,
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
    url: 'https://openvid.dev',
    logo: 'https://openvid.dev/images/metadata/favicon.svg',
    sameAs: [
      'https://twitter.com/openviddev',
      'https://github.com/openviddev',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Customer Support',
      email: 'support@openvid.dev',
    },
  };
}
