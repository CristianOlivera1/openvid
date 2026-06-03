import { getRequestConfig } from 'next-intl/server';

export const locales = ['es', 'en', 'ru', 'vi'] as const;
export const defaultLocale = 'es' as const;
export type Locale = (typeof locales)[number];

export default getRequestConfig(async ({ requestLocale }) => {
  const locale = await requestLocale;

  const baseLocale = (locale && locales.includes(locale as Locale))
    ? locale
    : defaultLocale;

  return {
    locale: baseLocale,
    messages: (await import(`./messages/${baseLocale}.json`)).default
  };
});