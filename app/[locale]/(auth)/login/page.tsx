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
    iconColor: "text-[#9146FF]"
  },
];

export default function Login() {
  const t = useTranslations('login');
  const locale = useLocale();
  const [loading, setLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const handleOAuthSignIn = async (provider: OAuthProvider) => {
    try {
      setLoading(provider);
      setError(null);

      const redirectUrl = new URL(`/${locale}/auth/callback`, window.location.origin);
      const loginParams = new URL(window.location.href).searchParams;
      const redirectedFrom = loginParams.get("redirectedFrom");
      const autoupload = loginParams.get("autoupload");

      if (redirectedFrom) {
        redirectUrl.searchParams.set("redirectedFrom", redirectedFrom);
      }
      if (autoupload === "1") {
        redirectUrl.searchParams.set("autoupload", autoupload);
      }

      const { error: signInError } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: redirectUrl.toString(),
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
      setError(
        err instanceof Error
          ? err.message
          : t('errors.generic')
      );
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030303] grid lg:grid-cols-2 text-white selection:bg-white/30" role="main">
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
              {t('backToHome')}
            </Link>
          </Button>
        </div>

        <div className="w-full max-w-sm mx-auto mt-16 lg:mt-0">
          <div className="mb-10">
            <Image src="/svg/logo-openvid.svg" alt="openvid logo" width={60} height={60} className="mb-4" />
            <h1 className="text-3xl sm:text-4xl font-light tracking-tighter text-white mb-3">
              {t('title')}
            </h1>
            <p className="text-neutral-300 text-md font-light tracking-wide">
              {t('subtitle')}
            </p>
          </div>

          <div className="space-y-4" role="group" aria-label={t('providers.groupLabel') || 'Sign in options'}>
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
                    <Icon
                      icon="svg-spinners:ring-resize"
                      className="w-5 h-5"
                    />
                    <span>{t('providers.loading')}</span>
                  </>
                ) : (
                  <>
                    <Icon
                      icon={providerConfig.icon}
                      className={`${providerConfig.iconColor || 'text-white'} size-5`}
                    />
                    <span>{t(`providers.${providerConfig.provider}`)}</span>
                  </>
                )}
              </Button>
            ))}
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded" role="alert" aria-live="polite">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <p className="mt-12 text-md text-neutral-300 leading-relaxed font-light">
            {t.rich('disclaimer', {
              terms: (chunks) => <Link href="/terms" target="_blank" className="text-neutral-300 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors">{chunks}</Link>,
              privacy: (chunks) => <Link href="/privacy" target="_blank" className="text-neutral-300 hover:text-white underline decoration-white/30 underline-offset-4 transition-colors">{chunks}</Link>
            })}
          </p>
        </div>
      </div>
      <div className="hidden lg:block relative w-full h-full border-l border-white/10 bg-[#020203] overflow-hidden group" aria-hidden="true">
        <div className="absolute -top-[10%] -left-[10%] w-[70%] h-[70%] bg-cyan-600/20 rounded-full blur-[80px] pointer-events-none group-hover:bg-cyan-500/30 transition-colors duration-1000"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[60%] h-[60%] bg-purple-900/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-purple-700/50 transition-colors duration-1000"></div>
        <div className="absolute inset-0 bg-[radial-gradient(white_0.5px,transparent_0.5px)] bg-size-[40px_40px] opacity-[0.4] pointer-events-none"></div>
        <div className="absolute inset-0 transition-transform duration-1000 ease-in-out scale-110 group-hover:scale-125">
          <img
            src="/images/pages/openvid-login.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-contain mix-blend-luminosity opacity-70 transition-all duration-1000 ease-in-out [clip-path:inset(0_0_0_50%)] group-hover:opacity-0"
          />
          <img
            src="/images/pages/openvid-login.webp"
            alt=""
            className="absolute inset-0 w-full h-full object-contain transition-all duration-1000 ease-in-out [clip-path:inset(0_50%_0_0)] group-hover:[clip-path:inset(0_0_0_0%)]"
          />
          <div
            className="absolute inset-0 pointer-events-none mix-blend-screen opacity-40 transition-opacity duration-1000"
            style={{
              background: 'linear-gradient(130deg, rgba(0, 210, 255, 0.4), rgba(58, 123, 213, 0.4) 41.07%, rgba(106, 17, 203, 0.4) 76.05%)',
              maskImage: 'url(/images/pages/openvid-login.webp)',
              maskSize: 'contain',
              maskRepeat: 'no-repeat',
              maskPosition: 'center'
            }}
          />
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff22_1px,transparent_1px)] bg-size-[24px_24px] opacity-20 pointer-events-none z-10"></div>
        <div className="absolute inset-0 bg-linear-to-t from-black via-transparent to-black/60 pointer-events-none z-10"></div>
        <div className="absolute top-0 left-1/2 w-px h-full bg-white/20 group-hover:bg-transparent transition-colors duration-1000 pointer-events-none z-20"></div>
      </div>

    </div>
  );
}
