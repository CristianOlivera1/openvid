"use client";
import { useState, useEffect } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Link } from "@/navigation";
import { UserMenu } from "./UserMenu";
import { MobileMenu } from "./MobileMenu";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useTranslations } from "next-intl";
import { Icon } from "@iconify/react";
import { Button } from "@/components/ui/button";
import { useRecording } from "@/hooks/RecordingContext";
import RecordingSetupDialog from "../ui/RecordingSetupDialog"; 
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Header() {
  const t = useTranslations('header');
  const tRecording = useTranslations('recording.steps');
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const { startCountdown, stopRecording, isIdle, isRecording, isCountdown, isProcessing } = useRecording();
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [showMobileAlert, setShowMobileAlert] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleHeaderAction = () => {
    if (isRecording) {
      stopRecording();
      return;
    }

    const isMobile = typeof window !== "undefined" && 
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
    
    if (isMobile) {
      setShowMobileAlert(true);
      setTimeout(() => setShowMobileAlert(false), 5000);
    } else {
      setSetupDialogOpen(true);
    }
  };

  const getButtonContent = () => {
    if (isCountdown || isProcessing) {
      return <Icon icon="eos-icons:loading" className="w-4 h-4 animate-spin" />;
    }
    if (isRecording) {
      return <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />;
    }
    return <Icon icon="material-symbols:cast-outline-rounded" className="w-4 h-4" />;
  };

  return (
    <>
      <header className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled ? "border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl py-0" : "bg-transparent border-transparent py-2"
      )}
      >
        <div className="max-w-6xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <Image src="/svg/logo-openvid.svg" alt="Logo" width={50} height={50} style={{ height: "auto" }} />
            <Image src="/svg/openvid.svg" alt="Logo" width={100} height={50} className="hidden sm:flex" style={{ height: "auto" }} />
          </Link>

          <div className="hidden md:flex items-center gap-8 text-md font-medium text-neutral-400">
            <a href="#docs" className="hover:text-white transition-colors">{t('docs')}</a>
            <a href="https://github.com/CristianOlivera1/openvid" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">{t('github')}</a>
            <Link href="/donate" target="_blank" className="hover:text-white transition-colors">{t('donate')}</Link>
          </div>

          <div className="flex items-center gap-3 sm:gap-6">
            <Button 
              variant="outline" 
              onClick={handleHeaderAction}
              disabled={isCountdown || isProcessing}
              className={cn(
                "transition-all hidden sm:flex",
                isRecording && "border-red-500/50 text-red-400 hover:bg-red-500/5"
              )}
            >
              {getButtonContent()}
              <span className="text-xs font-bold tracking-tight">
                {isRecording ? tRecording('step4.visual.stop') : t('screen')}
              </span>
              {!isRecording && (
                <kbd className="hidden lg:flex items-center ml-1 px-1.5 py-0.5 rounded bg-black/20 border border-white/20 text-[9px] font-black text-white/80 uppercase">
                  Alt + S
                </kbd>
              )}
            </Button>

            <div className="flex items-center gap-2">
              {!isMounted ? (
                <div className="w-25 h-9 rounded-md bg-white/10 animate-pulse border border-white/5"></div>
              ) : (
                <LanguageSwitcher />
              )}
              <div className="block">
                {!isMounted ? (
                  <div className="flex items-center gap-2 px-2 py-1">
                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse border border-white/5"></div>
                    <div className="w-24 h-4 rounded-md bg-white/10 animate-pulse"></div>
                  </div>
                ) : (
                  <UserMenu />
                )}
              </div>

              {!isMounted ? (
                <div className="w-9 h-9 rounded-md bg-white/10 animate-pulse border border-white/5"></div>
              ) : (
                <MobileMenu />
              )}
            </div>
          </div>
        </div>

        {showMobileAlert && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 w-full max-w-xs px-4">
            <Alert variant="warning" className="bg-[#0A0A0A] border-yellow-500/50">
              <Icon icon="solar:laptop-minimalistic-broken" className="text-xl" />
              <AlertTitle>{tRecording('step1.permissionRequired')}</AlertTitle>
              <AlertDescription>{tRecording('step1.mobileAlert')}</AlertDescription>
            </Alert>
          </div>
        )}
      </header>

      <RecordingSetupDialog 
        open={setupDialogOpen} 
        onClose={() => setSetupDialogOpen(false)} 
        onStart={(config) => startCountdown(config)} 
      />
    </>
  );
}