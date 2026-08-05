"use client";

import { Icon } from "@iconify/react";
import { useTranslations } from "next-intl";

import type { AutozoomFlowState } from "@/hooks/useAutozoomJob";

interface AutozoomUploadOverlayProps {
  state: AutozoomFlowState;
  onRetry: () => void;
  onDismiss: () => void;
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AutozoomUploadOverlay({ state, onRetry, onDismiss }: AutozoomUploadOverlayProps) {
  const t = useTranslations("autozoomOverlay");
  if (state.status === "idle") return null;

  const failed = state.status === "failed";
  const completed = state.status === "completed";
  const progress = Math.max(0, Math.min(100, Math.round(state.progress * 100)));
  const stage = state.stage || "queued";

  return (
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-black/50 px-4 backdrop-blur-md" role="dialog" aria-modal="true" aria-labelledby="autozoom-upload-title">
      <div className="w-full max-w-lg overflow-hidden border border-white/15 bg-[#101014]/90 shadow-2xl shadow-black/60">
        <div className="relative overflow-hidden border-b border-white/10 p-6">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-cyan-500/15 blur-3xl" />
          <div className="relative flex items-start gap-4">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full border border-cyan-300/20 bg-cyan-400/10 text-cyan-200">
              <Icon icon={failed ? "solar:danger-triangle-linear" : completed ? "solar:check-circle-linear" : "svg-spinners:ring-resize"} className="size-6" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-cyan-200/80">{t("eyebrow")}</p>
              <h2 id="autozoom-upload-title" className="mt-1 text-xl font-medium tracking-tight text-white">
                {failed ? t("failedTitle") : completed ? t("finishingTitle") : t("title")}
              </h2>
              <p className="mt-1 text-sm leading-6 text-neutral-400">
                {failed ? t("failedDescription") : completed ? t("finishingDescription") : t(`status.${stage}`)}
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-5 p-6">
          {state.fileName && (
            <div className="flex items-center justify-between gap-4 border border-white/10 bg-black/20 px-4 py-3 text-sm">
              <div className="min-w-0">
                <p className="truncate font-medium text-white">{state.fileName}</p>
                <p className="mt-0.5 text-xs text-neutral-500">{state.fileSize ? formatFileSize(state.fileSize) : t("processingFile")}</p>
              </div>
              <Icon icon="solar:video-frame-play-horizontal-linear" className="size-5 shrink-0 text-neutral-400" aria-hidden="true" />
            </div>
          )}

          {!failed && (
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
                <span>{t("progress")}</span>
                <span className="font-mono text-white">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden bg-white/10">
                <div className="h-full bg-linear-to-r from-cyan-400 via-sky-400 to-violet-400 transition-[width] duration-500" style={{ width: `${Math.max(progress, 2)}%` }} />
              </div>
            </div>
          )}

          {failed && state.error && (
            <p className="border border-red-500/25 bg-red-500/10 px-3 py-2 text-sm text-red-200" role="alert">
              {t("error", { message: state.error })}
            </p>
          )}

          {!failed && !completed && (
            <p className="text-xs leading-5 text-neutral-500">{t("hint")}</p>
          )}

          {failed && (
            <div className="flex flex-wrap justify-end gap-3 pt-1">
              <button type="button" onClick={onDismiss} className="px-3 py-2 text-sm text-neutral-300 transition hover:text-white">
                {t("dismiss")}
              </button>
              <button type="button" onClick={onRetry} className="bg-white px-4 py-2 text-sm font-medium text-black transition hover:bg-neutral-200">
                {t("retry")}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
