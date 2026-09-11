"use client";

import { useTranslations } from "next-intl";
import { AuthProvider } from "@/app/contexts/useAuth";
import { Link } from "@/navigation";
import Footer from "../components/common/Footer";
import Header from "../components/common/Header";
import Image from "next/image";

export default function NotFound() {
  const t = useTranslations('notFound');
  
  return (
    <AuthProvider>
        <Header />

      <div className="flex flex-col items-center justify-center min-h-dvh bg-[#050505] text-center px-6 relative overflow-hidden dark">

        <h1 className="text-8xl md:text-[12rem] font-black tracking-tighter animate-reveal opacity-0 [animation-delay:150ms] bg-linear-to-b from-white/20 to-transparent bg-clip-text text-transparent select-none">
          404
        </h1>

        <div className="-mt-8 space-y-3 animate-reveal opacity-0 [animation-delay:300ms] relative z-10">
          <div className="flex justify-center mb-4 opacity-50">
            <Image src="/svg/openvid.svg" alt="Openvid" width={120} height={30} />
          </div>

          <h2 className="text-2xl md:text-4xl font-bold text-white tracking-tight">
            {t('title')}
          </h2>
          <p className="text-neutral-500 max-w-sm mx-auto leading-relaxed text-sm md:text-base font-medium">
            {t('description')}
          </p>
        </div>

        <Link
          href="/"
          className="mt-12 px-10 py-4 bg-gradient-primary text-white font-bold rounded-full hover:scale-105 active:scale-95 transition-all animate-reveal opacity-0"
        >
          {t('backHome')}
        </Link>

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,163,255,0.08)_0%,transparent_60%)] pointer-events-none" />
      </div>
      <Footer/>
    </AuthProvider>
  );
}
