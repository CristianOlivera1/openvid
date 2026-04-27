import { updateSession } from "@/utils/supabase/middleware";
import { type NextRequest } from "next/server";
import createIntlMiddleware from 'next-intl/middleware';
import { locales, defaultLocale } from './i18n';

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: 'always',
  localeDetection: true
});

export default async function proxy(request: NextRequest) {
  const country = request.headers.get('x-vercel-ip-country') || 'UNKNOWN';

  const intlResponse = intlMiddleware(request);
  intlResponse.headers.set('x-user-country', country);

  const supabaseResponse = await updateSession(request);
  supabaseResponse.cookies.getAll().forEach((cookie) => {
    intlResponse.cookies.set(cookie.name, cookie.value);
  });

  return intlResponse;
}

export const config = {
  matcher: [
    '/((?!api|ffmpeg|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|avif|webm|wasm|js|sitemap.xml|robots.txt)$).*)'
  ],
};