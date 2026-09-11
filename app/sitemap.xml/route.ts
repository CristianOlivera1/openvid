import { locales, defaultLocale } from '@/i18n';

const BASE_URL = 'https://openvid.dev';

const routes = [
  { path: '', priority: 1.0, changeFrequency: 'weekly' },
  { path: '/guide', priority: 0.8, changeFrequency: 'weekly' },
  { path: '/donate', priority: 0.7, changeFrequency: 'monthly' },
  { path: '/privacy', priority: 0.5, changeFrequency: 'yearly' },
  { path: '/terms', priority: 0.5, changeFrequency: 'yearly' },
];

const LAST_MOD = '2026-08-03T00:00:00+00:00';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function GET() {
  const urls = routes.flatMap(({ path, priority, changeFrequency }) =>
    locales.map((locale) => {
      const selfHref = `${BASE_URL}/${locale}${path}`;
      const xDefault = `${BASE_URL}/${defaultLocale}${path}`;

      const alternates = locales
        .map(
          (loc) =>
            `      <xhtml:link rel="alternate" hreflang="${loc}" href="${escapeXml(
              `${BASE_URL}/${loc}${path}`
            )}" />`
        )
        .join('\n');

      return `  <url>
    <loc>${escapeXml(selfHref)}</loc>
    <lastmod>${LAST_MOD}</lastmod>
    <changefreq>${changeFrequency}</changefreq>
    <priority>${priority}</priority>
${alternates}
      <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(xDefault)}" />
  </url>`;
    })
  );

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
}