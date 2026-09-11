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
import { getIsMobileSnapshot } from "@/lib/layers.utils";
import { Button } from "@/components/ui/button";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useRecording } from "@/app/contexts/RecordingContext";
import RecordingSetupDialog from "../ui/RecordingSetupDialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function Header() {
  const t = useTranslations("header");
  const tRecording = useTranslations("recording.steps");
  const tTour = useTranslations("tour");
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const { startCountdown, stopRecording, isRecording, isCountdown, isProcessing } = useRecording();
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

  useEffect(() => {
    const tourCompleted = localStorage.getItem("openvid-tour-completed");

    // El tour usa elementos ocultos en móvil (`hidden sm:flex`), así que no se muestra < sm.
    if (!tourCompleted && !getIsMobileSnapshot()) {
      const driverTimer = setTimeout(() => {
        if (getIsMobileSnapshot()) return;
        if (document.getElementById("tour-video-upload")) {
          import("driver.js").then(({ driver }) => {
            const driverObj = driver({
              showProgress: true,
              animate: true,
              nextBtnText: tTour("nextBtn"), 
              prevBtnText: tTour("prevBtn"),
              doneBtnText: tTour("doneBtn"),
              popoverClass: "minimal-dark-theme",
              onDestroyed: () => {
                localStorage.setItem("openvid-tour-completed", "true");
              },
              steps: [
                {
                  element: "#tour-record-btn",
                  popover: {
                    title: tTour("step1.title"),
                    description: `${tTour("step1.description")} <a href="/guide" target="_blank" style="color: #60a5fa; text-decoration: underline;">${tTour("step1.guideLinkText")}</a>`,
                    side: "bottom",
                    align: "center",
                  },
                },
                {
                  element: "#tour-video-upload",
                  popover: {
                    title: tTour("step2.title"),
                    description: tTour("step2.description"),
                    side: "bottom",
                    align: "center",
                  },
                },
                {
                  element: "#tour-photo-upload",
                  popover: {
                    title: tTour("step3.title"),
                    description: tTour("step3.description"),
                    side: "bottom",
                    align: "center",
                  },
                },
              ],
            });

            driverObj.drive();
          });
        }
      }, 800);

      return () => clearTimeout(driverTimer);
    }
  }, [tTour]); 

  const handleHeaderAction = () => {
    if (isRecording) {
      stopRecording();
      return;
    }
    const isMobile =
      typeof window !== "undefined" &&
      (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
        window.innerWidth < 768);
    if (isMobile) {
      setShowMobileAlert(true);
      setTimeout(() => setShowMobileAlert(false), 5000);
    } else {
      setSetupDialogOpen(true);
    }
  };

  const getButtonContent = () => {
    if (isCountdown || isProcessing) {
      return <Icon icon="eos-icons:loading" className="w-4 h-4 animate-spin" aria-hidden="true" />;
    }
    if (isRecording) {
      return <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" aria-hidden="true" />;
    }
    return <Icon icon="material-symbols:cast-outline-rounded" className="w-4 h-4" aria-hidden="true" />;
  };

  return (
    <>
      <header
        className={cn(
          "fixed top-0 w-full z-50 transition-all duration-300",
          isScrolled ? "border-b border-white/10 bg-[#050505]/80 backdrop-blur-xl py-0" : "bg-transparent border-transparent py-2"
        )}
      >
        <div className="max-w-7xl px-6 xl:px-8 mx-auto h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group" aria-label="Openvid - Go to home">
            <Image src="/svg/logo-openvid.svg" alt="" aria-hidden="true" width={50} height={50} style={{ height: "auto" }} />
            <Image src="/svg/openvid.svg" alt="Openvid" width={100} height={50} className="hidden sm:flex" style={{ height: "auto" }} />
          </Link>

          <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-md font-medium text-neutral-400" aria-label="Main navigation">
            <DropdownMenu.Root>
              <DropdownMenu.Trigger className="group flex items-center gap-1.5 hover:text-white transition-colors outline-none data-[state=open]:text-white">
                {t("product")}
                <Icon icon="solar:alt-arrow-down-linear" width="14" className="transition-transform duration-200 group-data-[state=open]:rotate-180" aria-hidden="true" />
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="min-w-52 bg-[#0a0a0a] border border-white/10 squircle-element shadow-xl p-1 z-50 animate-in fade-in slide-in-from-top-2 duration-200"
                  sideOffset={8}
                  align="start"
                >
                  <DropdownMenu.Item asChild className="flex items-center gap-3 px-3 py-2.5 text-sm squircle-element cursor-pointer outline-none transition-colors text-white/70 hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white">
                    <Link href="/video-editor" className="flex items-center gap-3 w-full">
                      <Icon icon="mdi:movie-edit-outline" width="18" className="text-neutral-400" aria-hidden="true" />
                      <span>{t("videoEditor")}</span>
                    </Link>
                  </DropdownMenu.Item>
                  <DropdownMenu.Item asChild className="flex items-center gap-3 px-3 py-2.5 text-sm squircle-element cursor-pointer outline-none transition-colors text-white/70 hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white">
                    <Link href="/screen-recorder" className="flex items-center gap-3 w-full">
                      <Icon icon="mdi:record-circle-outline" width="18" className="text-neutral-400" aria-hidden="true" />
                      <span>{t("screenRecorder")}</span>
                    </Link>
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
            <Link href="/guide" target="_blank" className="hover:text-white transition-colors">
              {t("guide")}
            </Link>
            <Link href="/donate" target="_blank" className="hover:text-white transition-colors">
              {t("donate")}
            </Link>
          </nav>

          <div className="flex items-center gap-3 sm:gap-6">
            <Button
              id="tour-record-btn"
              variant="outline"
              onClick={handleHeaderAction}
              disabled={isCountdown || isProcessing}
              aria-label={isRecording ? tRecording("step4.visual.stop") : t("screen")}
              aria-pressed={isRecording}
              className={cn("transition-all hidden sm:flex", isRecording && "border-red-500/50 text-red-400 hover:bg-red-500/5")}
            >
              {getButtonContent()}
              <span className="text-xs font-bold tracking-tight">
                {isRecording ? tRecording("step4.visual.stop") : t("screen")}
              </span>
              {!isRecording && (
                <kbd className="hidden lg:flex items-center ml-1 px-1.5 py-0.5 rounded bg-black/20 border border-white/20 text-[9px] font-black text-white/80 uppercase" aria-label="Alt + S">
                  Alt + S
                </kbd>
              )}
            </Button>
            <div className="flex items-center gap-2">
              {!isMounted ? (
                <div className="hidden sm:flex w-25 h-9 rounded-md bg-white/10 animate-pulse border border-white/5"></div>
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
            <Alert variant="warning" className="bg-[#0A0A0A] border-yellow-500/50" role="alert">
              <Icon icon="solar:laptop-minimalistic-broken" className="text-xl" aria-hidden="true" />
              <AlertTitle>{tRecording("step1.permissionRequired")}</AlertTitle>
              <AlertDescription>{tRecording("step1.mobileAlert")}</AlertDescription>
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
