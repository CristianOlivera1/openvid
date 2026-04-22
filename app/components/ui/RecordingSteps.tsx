"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@iconify/react";
import StepRow from "./StepRow";
import { useRecording } from "@/hooks/RecordingContext";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import RecordingSetupDialog from "./RecordingSetupDialog";
import { useTranslations } from "next-intl";

export default function InteractiveRecordingSteps() {
  const t = useTranslations('recording.steps');
  const { startCountdown, stopRecording, isIdle, isRecording, isCountdown, isProcessing } = useRecording();
  const [showMobileAlert, setShowMobileAlert] = useState(false);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);

  const handleStartRecording = () => {
    const isMobile = typeof window !== "undefined" && (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768);
    if (isMobile) {
      setShowMobileAlert(true);
      setTimeout(() => setShowMobileAlert(false), 5000);
    } else {
      setSetupDialogOpen(true);
    }
  };

  const getStartButtonContent = () => {
    if (isCountdown) {
      return (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          {t('step1.countdownButton')}
        </>
      );
    }
    if (isRecording) {
      return (
        <>
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse mr-2" />
          {t('step1.recordingButton')}
        </>
      );
    }
    if (isProcessing) {
      return (
        <>
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
          {t('step1.processingButton')}
        </>
      );
    }
    return (
      <div className="flex items-center gap-3">
        <Icon icon="material-symbols:cast-outline-rounded" className="size-6" />
        <span>{t('step1.startButton')}</span>
        <div className="hidden sm:flex items-center gap-1 text-[10px] bg-white/10 text-neutral-300 px-1.5 py-0.5 rounded border border-white/5 ml-2">
          <kbd>Alt</kbd>
          <span>+</span>
          <kbd>S</kbd>
        </div>
      </div>
    );
  };

  const stepsData = [
    {
      id: 1,
      title: t('step1.title'),
      description: (
        <p>
          {t.rich('step1.description', {
            tab: (chunks) => <strong className="text-gray-200">{chunks}</strong>,
            window: (chunks) => <strong className="text-gray-200">{chunks}</strong>
          })}
        </p>
      ),
      isReversed: true,
      actionButton: (
        <div className="flex flex-col items-center gap-4 w-full">
          <Button
            variant="outline"
            size="xl"
            className={`text-lg relative overflow-hidden ${isRecording ? 'border-red-500/50 text-red-400' : ''} ${!isIdle ? 'opacity-70 cursor-not-allowed' : ''}`}
            onClick={handleStartRecording}
            disabled={!isIdle}
          >
            {getStartButtonContent()}
          </Button>
          {showMobileAlert && (
            <Alert variant="warning" className="animate-in fade-in slide-in-from-top-2 duration-300 w-full max-w-sm text-left">
              <Icon icon="solar:laptop-minimalistic-broken" className="text-xl" />
              <AlertTitle>{t('step1.permissionRequired')}</AlertTitle>
              <AlertDescription>
                {t('step1.mobileAlert')}
              </AlertDescription>
            </Alert>
          )}
        </div>
      ),
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl flex items-center justify-center relative group shadow-2xl p-1 sm:p-0">
          <div className="absolute inset-0 bg-[radial-linear(#ffffff22_1px,transparent_1px)] [bg-size:16px_16px] opacity-10"></div>
          <div className="bg-[#292A2D] rounded-xl w-full max-w-full shadow-2xl relative z-10 flex flex-col font-sans border border-white/5 origin-center">
            <div className="flex justify-between px-2 sm:px-4 pt-2 sm:pt-3 border-b border-white/10 text-[9px] sm:text-[11px] font-medium">
              <div className="pb-2 text-neutral-400 hover:text-neutral-200 cursor-pointer flex-1 text-center transition-colors truncate px-1">
                {t('step1.visual.browserTab')}
              </div>
              <div className="pb-2 text-[#C0B4F0] border-b-2 border-[#C0B4F0] flex-1 text-center truncate px-1">
                {t('step1.visual.window')}
              </div>
              <div className="pb-2 text-neutral-400 hover:text-neutral-200 cursor-pointer flex-1 text-center transition-colors truncate px-1 hidden sm:block">
                {t('step1.visual.fullscreen')}
              </div>
            </div>
            <div className="p-3 sm:p-5 flex justify-center gap-3 sm:gap-4 h-auto sm:h-37.5">
              <div className="w-24 sm:w-32.5 flex flex-col gap-2">
                <div className="w-full h-14 sm:h-18.75 bg-[#141414] rounded-md border-2 border-[#C0B4F0] overflow-hidden shadow-inner relative transition-colors cursor-pointer">
                  <div className="absolute top-1 sm:top-2 left-1 sm:left-2 w-full h-full bg-neutral-800 rounded-t-md border border-white/5"></div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-neutral-200">
                  <Icon icon="logos:brave" width="12" className="shrink-0" />
                  <span className="truncate">{t('step1.visual.tabTitle')}</span>
                </div>
              </div>
              <div className="w-24 sm:w-32.5 flex flex-col gap-2">
                <div className="w-full h-14 sm:h-18.75 bg-[#141414] rounded-md border border-gray-500 overflow-hidden shadow-inner relative cursor-pointer">
                  <div className="absolute top-1 left-1 w-[95%] h-[90%] bg-[#1E1E1E] rounded border border-white/5 flex flex-col">
                    <div className="h-1.5 sm:h-2 border-b border-white/5"></div>
                    <div className="p-1 sm:p-1.5 space-y-1">
                      <div className="h-0.5 w-1/2 bg-blue-400/50 rounded"></div>
                      <div className="h-0.5 w-3/4 bg-green-400/50 rounded"></div>
                      <div className="h-0.5 w-1/3 bg-orange-400/50 rounded"></div>
                      <div className="h-0.5 w-2/3 bg-blue-400/50 rounded"></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[9px] sm:text-[10px] text-neutral-200">
                  <Icon icon="logos:visual-studio-code" width="12" className="shrink-0" />
                  <span className="truncate">{t('step1.visual.codeTitle')}</span>
                </div>
              </div>
            </div>
            <div className="px-3 sm:px-5 pb-3 sm:pb-5">
              <div className="border-t border-white/10 pt-3 sm:pt-4 flex flex-col sm:flex-row justify-between items-center mb-4 sm:mb-6 gap-3 sm:gap-0">
                <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-neutral-300">
                  <Icon icon="solar:volume-loud-bold" width="14" className="text-neutral-400 shrink-0" />
                  {t('step1.visual.shareAudio')}
                </div>
                <div className="w-7 h-4 bg-[#5F6368] rounded-full relative shadow-inner shrink-0">
                  <div className="absolute top-0.5 left-0.5 w-3 h-3 bg-neutral-300 rounded-full shadow"></div>
                </div>
              </div>
              <div className="flex w-full sm:w-auto justify-end gap-2 sm:gap-3">
                <button className="flex-1 sm:flex-none px-4 sm:px-5 py-1.5 bg-[#3C3D3F] text-neutral-400 rounded-full text-[10px] sm:text-[11px] font-medium cursor-not-allowed">
                  {t('step1.visual.share')}
                </button>
                <button className="flex-1 sm:flex-none px-4 sm:px-5 py-1.5 bg-[#292A2D] text-white rounded-full text-[10px] sm:text-[11px] font-medium border border-[#C0B4F0] ring-1 ring-[#C0B4F0] ring-offset-2 ring-offset-[#292A2D] outline-none">
                  {t('step1.visual.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 2,
      title: t('step2.title'),
      description: (
        <p>
          {t.rich('step2.description', { hide: (chunks) => <strong className="text-gray-200">{chunks}</strong> })}
        </p>
      ),
      isReversed: false,
      actionButton: null,
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden flex items-center justify-center relative group shadow-2xl p-4">
          <div className="absolute inset-0 bg-[radial-linear(#ffffff22_1px,transparent_1px)] [bg-size:16px_16px] opacity-10"></div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-75 h-37.5 bg-blue-500/5 rounded-[100%] blur-3xl"></div>
          <div className="bg-[#1C1A20] border border-white/5 rounded-2xl sm:rounded-full px-4 sm:pl-4 sm:pr-6 py-3 sm:py-2 flex flex-col sm:flex-row items-center gap-3 sm:gap-4 shadow-2xl z-10 w-full sm:w-auto max-w-[90%] sm:max-w-none text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
              <Icon icon="ic:baseline-pause" className="text-white text-lg hidden sm:block" />
              <span className="text-[10px] sm:text-[11px] text-[#E8EAED] leading-tight">
                {t('step2.visual.barText')}
              </span>
            </div>
            <div className="flex items-center gap-3 sm:gap-4 sm:ml-2 mt-1 sm:mt-0">
              <button className="bg-[#B7BEF8] hover:bg-[#A6AEF7] text-[#141414] text-[10px] sm:text-[11px] font-medium px-3 sm:px-4 py-1.5 rounded-full transition-colors whitespace-nowrap cursor-default!">
                {t('step2.visual.stop')}
              </button>
              <div className="relative group/btn cursor-pointer">
                <span className="text-[#8AB4F8] text-[10px] sm:text-[11px] font-medium hover:text-white transition-colors">
                  {t('step2.visual.hide')}
                </span>
                <Icon icon="solar:cursor-default-bold" className="absolute -bottom-4 sm:-bottom-5 -right-2 sm:-right-3 text-white text-lg sm:text-xl drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] z-20" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 3,
      title: t('step3.title'),
      description: (
        <p>
          {t.rich('step3.description', { countdown: (chunks) => <strong className="text-gray-200">{chunks}</strong> })}
        </p>
      ),
      isReversed: true,
      actionButton: null,
      visual: (
        <div className="aspect-video bg-[#000B13] border border-white/10 rounded-xl overflow-hidden relative group shadow-2xl">
          <div className="absolute inset-0 bg-[#000B13]/95 backdrop-blur-md flex items-center justify-center z-10 p-4 sm:p-6">
            <div className="flex flex-col items-center justify-center h-full w-full max-h-full">
              <div className="relative w-20 h-20 sm:w-32 sm:h-32 flex items-center justify-center shrink-0">
                <div className="absolute inset-0 rounded-full bg-[#00A3FF]/20 animate-pulse" />
                <div className="absolute inset-2 sm:inset-4 rounded-full bg-[#00A3FF]/10" />
                <div className="relative w-16 h-16 sm:w-28 sm:h-28 rounded-full bg-linear-to-br from-[#00A3FF] to-blue-800 p-0.5 shadow-[0_0_30px_rgba(0,163,255,0.2)]">
                  <div className="w-full h-full rounded-full bg-[#0E0E12] flex items-center justify-center">
                    <span className="text-3xl sm:text-6xl font-bold text-white tabular-nums tracking-tighter">
                      5
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-center mt-3 sm:mt-6 flex flex-col gap-1 sm:gap-2">
                <h2 className="text-base sm:text-xl md:text-2xl font-bold text-white tracking-tight leading-tight">
                  {t('step3.visual.title')}
                </h2>
                <p className="text-[10px] sm:text-sm text-neutral-400 max-w-48 sm:max-w-60 mx-auto leading-relaxed">
                  {t('step3.visual.subtitle')}
                </p>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 4,
      title: t('step4.title'),
      description: (
        <p>
          {t.rich('step4.description', { countdown: (chunks) => <span className="font-bold">{chunks}</span> })}
        </p>
      ),
      isReversed: false,
      actionButton: (
        <Button
          variant="outline"
          size="xl"
          className={`text-lg flex items-center ${isRecording ? 'text-red-500 border-red-500/50 hover:bg-red-500/10' : 'text-neutral-500 border-neutral-500/50 cursor-not-allowed opacity-50'}`}
          onClick={stopRecording}
          disabled={!isRecording}
        >
          <div className={`w-4 h-4 rounded-sm mr-2 ${isRecording ? 'bg-red-500' : 'bg-neutral-500'}`}></div>
          {isRecording ? t('step1.stopButton') : t('step1.startButton')}
          <div className={`hidden sm:flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border ml-3 ${isRecording ? 'bg-red-500/10 text-red-300 border-red-500/20' : 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20'}`}>
            <kbd>Alt</kbd>
            <span>+</span>
            <kbd>D</kbd>
          </div>
        </Button>
      ),
      visual: (
        <div className="aspect-video bg-[#0A0A0A] border border-white/10 rounded-xl overflow-hidden relative group shadow-2xl flex items-center justify-center">
          <div className="absolute top-1/2 left-0 w-full h-px bg-white/5"></div>
          <div className="absolute top-0 left-1/2 w-px h-full bg-white/5"></div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto w-full px-4 sm:px-0 sm:w-auto">
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 bg-[#1E1E20] border border-white/10 rounded-2xl sm:rounded-full py-3 sm:pl-5 sm:pr-2 sm:py-2 shadow-2xl mx-auto max-w-[200px] sm:max-w-none">
              <div className="flex items-center justify-center gap-2 sm:gap-3 w-full sm:w-auto pb-2 sm:pb-0 border-b sm:border-b-0 sm:border-r border-white/10 sm:pr-2">
                <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-red-500 animate-pulse" />
                <span className="text-[10px] sm:text-[11px] text-white font-medium">{t('step4.visual.recording')}</span>
                <span className="text-[10px] sm:text-[11px] text-red-400 font-mono font-bold">
                  00:42
                </span>
              </div>
              <button className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-1.5 sm:bg-red-500/10 sm:hover:bg-red-500/20 sm:border border-transparent sm:border-red-500/30 hover:border-red-500/50 rounded-full transition-all w-full sm:w-auto cursor-default!">
                <div className="flex items-center gap-2 text-red-400 text-xs sm:text-sm font-medium">
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-red-500 rounded-sm group-hover:scale-110 transition-transform" />
                  {t('step4.visual.stop')}
                </div>
                <div className="hidden sm:flex items-center gap-1 text-[10px] bg-red-500/10 text-red-300 px-1.5 py-0.5 rounded border border-red-500/20">
                  <kbd>Alt</kbd>
                  <span>+</span>
                  <kbd>D</kbd>
                </div>
              </button>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div id="docs" className="w-full max-w-7xl mx-auto px-0 sm:px-6 py-6 sm:py-24 text-left">
      <div className="max-w-3xl mx-auto text-center mb-32">
        <h2 className="text-4xl md:text-6xl font-bold tracking-tighter text-white mb-6 leading-tight drop-shadow-[1.2px_1.2px_100.2px_rgba(183,203,248,1)]">
          {t('title')} <br />
          <span className="bg-linear-to-r from-[#003780] to-white bg-clip-text text-transparent">
            {t('title2')}
          </span>
        </h2>
        <p className="text-lg md:text-xl text-neutral-400 font-light leading-relaxed mb-8">
          {t('subtitle')}
        </p>
      </div>

      <div className="space-y-32">
        {stepsData.map((step) => (
          <StepRow
            key={step.id}
            number={step.id}
            title={step.title}
            description={step.description}
            visual={step.visual}
            actionButton={step.actionButton}
            isReversed={step.isReversed}
          />
        ))}
      </div>

      <RecordingSetupDialog
        open={setupDialogOpen}
        onClose={() => setSetupDialogOpen(false)}
        onStart={(config) => startCountdown(config)}
      />
    </div>
  );
}