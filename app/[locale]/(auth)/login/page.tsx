"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import Image from "next/image";
import { Link } from "@/navigation";
import { useLocale, useTranslations } from "next-intl";

type OAuthProvider = "google" | "github" | "twitch";

interface ProviderConfig {
  name: string;
  icon: string;
  provider: OAuthProvider;
  bgClass: string;
  iconColor?: string;
}

const providers: ProviderConfig[] = [
  {
    name: "Google",
    icon: "material-icon-theme:google",
    provider: "google",
    bgClass: "border-white/10 bg-transparent hover:bg-white/5",
  },
  {
    name: "GitHub",
    icon: "mdi:github",
    provider: "github",
    bgClass: "border-white/10 bg-transparent hover:bg-white/5",
  },
  {
    name: "Twitch",
    icon: "mdi:twitch",
    provider: "twitch",
    bgClass: "border-white/10 bg-transparent hover:bg-white/5",
    iconColor: "text-[#9146FF]",
  },
];

function buildOAuthCallbackUrl(locale: string, redirectedFrom: string | null) {
  const url = new URL(`/${locale}/auth/callback`, window.location.origin);
  if (
    redirectedFrom &&
    redirectedFrom.startsWith("/") &&
    !redirectedFrom.startsWith("//") &&
    !redirectedFrom.includes("://")
  ) {
    url.searchParams.set("next", redirectedFrom);
  }
  return url.toString();
}

export default function Login() {
  const t = useTranslations("login");
  const locale = useLocale();
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    try {
      setLoading(provider);
      setError(null);
      const redirectedFrom = new URLSearchParams(window.location.search).get(
        "redirectedFrom"
      );
      const redirectUrl = buildOAuthCallbackUrl(locale, redirectedFrom);

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: "offline",
            prompt: "consent",
          },
        },
      });

      if (signInError) {
        throw signInError;
      }
    } catch (err) {
      console.error(`Error signing in with ${provider}:`, err);
      setError(err instanceof Error ? err.message : t("errors.generic"));
      setLoading(null);
    }
  };
  return (
    <div
      className="min-h-screen w-full bg-[#030303] grid lg:grid-cols-2 text-white selection:bg-white/30"
      role="main"
    >
      <div className="relative flex flex-col justify-center px-8 sm:px-16 lg:px-24 xl:px-32">
        <div className="absolute top-8 left-8 sm:left-12 lg:left-16">
          <Button
            variant="ghost"
            size="sm"
            className="text-neutral-500 hover:text-white hover:bg-white/5 tracking-wide text-xs uppercase"
            asChild
          >
            <Link href="/">
              <Icon icon="solar:arrow-left-linear" className="mr-2" width="16" />
              {t("backToHome")}
            </Link>
          </Button>
        </div>
        <div className="w-full max-w-sm mx-auto mt-16 lg:mt-0">
          <div className="mb-10">
            <Image
              src="/svg/logo-openvid.svg"
              alt="openvid logo"
              width={60}
              height={60}
              className="mb-4"
            />
            <h1 className="text-3xl sm:text-4xl font-light tracking-tighter text-white mb-3">
              {t("title")}
            </h1>
            <p className="text-neutral-300 text-md font-light tracking-wide">
              {t("subtitle")}
            </p>
          </div>
          <div
            className="space-y-4"
            role="group"
            aria-label={t("providers.groupLabel") || "Sign in options"}
          >
            {providers.map((providerConfig) => (
              <Button
                key={providerConfig.provider}
                onClick={() => handleOAuthSignIn(providerConfig.provider)}
                disabled={loading !== null}
                variant="outline"
                size="lg"
                className={`w-full h-12 gap-3 text-white transition-all font-light rounded-none ${providerConfig.bgClass} disabled:opacity-50 disabled:cursor-not-allowed`}
                aria-label={`${t(`providers.${providerConfig.provider}`)} sign in`}
              >
                {loading === providerConfig.provider ? (
                  <>
                    <Icon icon="svg-spinners:ring-resize" className="w-5 h-5" />
                    <span>{t("providers.loading")}</span>
                  </>
                ) : (
                  <>
                    <Icon
                      icon={providerConfig.icon}
                      className={`${providerConfig.iconColor || "text-white"
                        } size-5`}
                    />
                    <span>{t(`providers.${providerConfig.provider}`)}</span>
                  </>
                )}
              </Button>
            ))}
          </div>
          {error && (
            <div
              className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded"
              role="alert"
              aria-live="polite"
            >
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}
          <p className="mt-12 text-md text-neutral-300 leading-relaxed font-light">
            {t.rich("disclaimer", {
              terms: (chunks) => (
                <Link
                  href="/terms"
                  target="_blank"
                  className="text-neutral-300 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors"
                >
                  {chunks}
                </Link>
              ),
              privacy: (chunks) => (
                <Link
                  href="/privacy"
                  target="_blank"
                  className="text-neutral-300 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </div>
      </div>
      <div
        className="hidden lg:block relative w-full h-full border-l border-white/10 bg-[#020203] overflow-hidden"
        aria-hidden="true"
      >
        <div className="absolute inset-0 w-full h-full flex items-center justify-center pointer-events-none">
          <div
            className="absolute inset-0 w-full h-full mix-blend-hard-light blur-[100px] xl:blur-[140px] opacity-70"
            style={{
              background:
                "linear-gradient(rgba(0,0,0,0) 0%, rgba(150,150,150,0.1) 30%, rgb(100,100,100) 50%, rgb(180,180,180) 80%, rgb(240,240,240) 100%)",
            }}
          />
          <div
            className="absolute inset-0 w-full h-full mix-blend-multiply blur-[100px] xl:blur-[140px] opacity-90"
            style={{
              background:
                "linear-gradient(rgba(0, 0, 0, 0) 0%, rgba(10, 10, 12, 0.2) 35%, rgb(15, 15, 18) 70%, rgb(8, 8, 10) 85%, rgb(0, 0, 0) 100%)",
            }}
          />
          <div
            className="absolute top-12 left-[-10%] w-[50%] h-[50%] rounded-full bg-radial from-white/50 via-white/15 to-transparent blur-[80px] xl:blur-[120px] mix-blend-screen opacity-60 pointer-events-none"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 left-[-20%] w-[60%] h-[60%] rounded-full bg-radial from-white/10 via-transparent to-transparent blur-[100px] xl:blur-[150px] mix-blend-plus-lighter opacity-50 pointer-events-none"
          />
        </div>

        <div className="absolute inset-0 bg-[radial-gradient(#ffffff11_1px,transparent_1px)] bg-[size:24px_24px] opacity-40 pointer-events-none"></div>
        <div className="absolute top-1/2 -translate-y-1/2 left-6 lg:left-10 w-[130%] xl:w-[140%] max-w-none aspect-[16/9.5] z-10 animate-fade-in-up">
          <div
            aria-hidden="true"
            className="absolute -inset-6 blur-3xl -z-10 bg-linear-to-b from-white/10 via-white/5 to-transparent"
          />
          <div className="relative w-full h-full p-1 squircle-element-2xl border border-white/10 bg-white/5 backdrop-blur-md shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_30px_100px_rgba(0,0,0,0.5)] transition-transform duration-700 hover:-translate-x-2 mask-r-from-40% mask-r-to-70%">
            <div className="relative w-full h-full overflow-hidden squircle-element-2xl border border-black/50 bg-[#0a0a0c]">
              <div className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-white/50 to-transparent z-20" />
              <div className="absolute inset-x-0 top-0 h-40 bg-linear-to-b from-white/10 to-transparent z-10 pointer-events-none" />
              <Image
                src="/images/pages/openvid-login.avif"
                alt="Openvid Editor Preview"
                fill
                priority
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 80vw"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}