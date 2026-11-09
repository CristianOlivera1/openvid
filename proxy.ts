import { type NextRequest, NextResponse } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { locales, defaultLocale } from "./i18n";
import {
  updateSession,
  enforceAuthRoutes,
  shouldRefreshSession,
} from "@/utils/supabase/middleware";

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale,
  localePrefix: "always",
  localeDetection: true,
});

export default async function proxy(request: NextRequest) {
  const country = request.headers.get("x-vercel-ip-country") || "UNKNOWN";

  const needsAuth = shouldRefreshSession(request);

  if (!needsAuth) {
    const intlResponse = intlMiddleware(request);
    intlResponse.headers.set("x-user-country", country);
    return intlResponse;
  }

  const { user, applyAuthCookies } = await updateSession(request);

  const authRedirect = enforceAuthRoutes(request, user);
  if (authRedirect) {
    applyAuthCookies(authRedirect);
    authRedirect.headers.set("x-user-country", country);
    return authRedirect;
  }

  const intlResponse = intlMiddleware(request);
  const didSetAuthCookies = applyAuthCookies(intlResponse);
  intlResponse.headers.set("x-user-country", country);

  if (didSetAuthCookies) {
    return forwardWithRefreshedRequest(request, intlResponse, country);
  }

  return intlResponse;
}

function forwardWithRefreshedRequest(
  request: NextRequest,
  source: NextResponse,
  country: string,
): NextResponse {
  if (source.status >= 300 && source.status < 400) {
    source.headers.set("x-user-country", country);
    return source;
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  source.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    finalResponse.headers.set(key, value);
  });

  const setCookies =
    typeof source.headers.getSetCookie === "function"
      ? source.headers.getSetCookie()
      : [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      finalResponse.headers.append("Set-Cookie", cookie);
    }
  } else {
    source.cookies.getAll().forEach(({ name, value }) => {
      finalResponse.cookies.set(name, value);
    });
  }

  finalResponse.headers.set("x-user-country", country);
  return finalResponse;
}

export const config = {
  matcher: [
    "/((?!api|ffmpeg|models|hdri|_next/static|_next/image|sitemap.xml|robots.txt|site.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|avif|webm|wasm|js|glb|gltf|webmanifest|json|ico)$).*)",
  ],
};
