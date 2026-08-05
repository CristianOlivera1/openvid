import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { defaultLocale, locales, type Locale } from "@/i18n";

function getLocale(pathname: string): Locale {
  const segment = pathname.split("/").filter(Boolean)[0];
  return locales.includes(segment as Locale) ? (segment as Locale) : defaultLocale;
}

function getDestination(
  redirectedFrom: string | null,
  origin: string,
  locale: Locale,
): URL {
  const fallback = new URL(`/${locale}/editor`, origin);

  if (!redirectedFrom || !redirectedFrom.startsWith("/") || redirectedFrom.startsWith("//")) {
    return fallback;
  }

  const destination = new URL(redirectedFrom, origin);
  if (destination.origin !== origin) {
    return fallback;
  }

  const firstSegment = destination.pathname.split("/").filter(Boolean)[0];
  if (!locales.includes(firstSegment as Locale)) {
    destination.pathname = destination.pathname === "/"
      ? `/${locale}`
      : `/${locale}${destination.pathname}`;
  }

  return destination;
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const redirectedFrom = requestUrl.searchParams.get("redirectedFrom");
  const autoupload = requestUrl.searchParams.get("autoupload");
  const locale = getLocale(requestUrl.pathname);
  
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
  
  const origin = host ? `${protocol}://${host}` : requestUrl.origin;

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("Error exchanging code for session:", error);
      const loginUrl = new URL(`/${locale}/login`, origin);
      loginUrl.searchParams.set("error", "auth_failed");
      if (redirectedFrom) {
        loginUrl.searchParams.set("redirectedFrom", redirectedFrom);
      }
      if (autoupload === "1") {
        loginUrl.searchParams.set("autoupload", autoupload);
      }
      return NextResponse.redirect(loginUrl);
    }
  }

  const destination = getDestination(redirectedFrom, origin, locale);
  if (autoupload === "1") {
    destination.searchParams.set("autoupload", autoupload);
  }
  return NextResponse.redirect(destination);
}
