"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter, usePathname } from "@/navigation";
import type { RecordingState, RecordingResult, VideoData } from "@/types";
import type { CameraConfig, RecordingSetupConfig } from "@/types/camera.types";
import {
  DEFAULT_RECORDING_SETUP,
  requestCameraStream,
  requestMicrophoneStream,
} from "@/types/camera.types";
import { clearAllThumbnailCache } from "@/lib/thumbnail-cache";

export type { RecordingState, RecordingResult, VideoData };

function generateVideoId(): string {
  return `vid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const dbName = "openvidDB";
    const storeName = "videos";
    const version = 2;

    const request = indexedDB.open(dbName, version);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.close();
        const retryRequest = indexedDB.open(dbName, version + 1);
        retryRequest.onupgradeneeded = (e) => {
          const retryDb = (e.target as IDBOpenDBRequest).result;
          if (!retryDb.objectStoreNames.contains(storeName)) {
            retryDb.createObjectStore(storeName);
          }
        };
        retryRequest.onsuccess = () => resolve(retryRequest.result);
        retryRequest.onerror = () => reject(retryRequest.error);
      } else {
        resolve(db);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

async function saveVideoToIndexedDB(
  blob: Blob,
  duration: number,
  extras: {
    cameraBlob?: Blob | null;
    cameraConfig?: CameraConfig | null;
  } = {}
): Promise<string> {
  try {
    await clearAllThumbnailCache();
  } catch (e) {
    console.warn("Failed to clear thumbnail cache:", e);
  }

  const videoId = generateVideoId();
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const storeName = "videos";
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);

    const videoData = {
      blob,
      duration,
      videoId,
      timestamp: Date.now(),
      isRecordedVideo: true,
      cameraBlob: extras.cameraBlob ?? null,
      cameraConfig: extras.cameraConfig ?? null,
    };

    const putRequest = store.put(videoData, "currentVideo");

    putRequest.onsuccess = () => {
      db.close();
      resolve(videoId);
    };

    putRequest.onerror = () => {
      db.close();
      reject(putRequest.error);
    };
  });
}

export async function loadVideoFromIndexedDB(): Promise<{
  blob: Blob;
  duration: number;
  url: string;
  videoId: string;
  timestamp: number;
  isRecordedVideo?: boolean;
  cameraBlob?: Blob | null;
  cameraUrl?: string | null;
  cameraConfig?: CameraConfig | null;
} | null> {
  try {
    const db = await getDB();
    const storeName = "videos";

    if (!db.objectStoreNames.contains(storeName)) {
      db.close();
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readonly");
      const store = transaction.objectStore(storeName);
      const getRequest = store.get("currentVideo");

      getRequest.onsuccess = () => {
        db.close();
        const data = getRequest.result;

        if (data) {
          const url = URL.createObjectURL(data.blob);
          const videoId = data.videoId || `vid_${data.timestamp || Date.now()}`;
          const timestamp = data.timestamp || Date.now();
          const cameraBlob: Blob | null = data.cameraBlob ?? null;
          const cameraUrl = cameraBlob ? URL.createObjectURL(cameraBlob) : null;
          resolve({
            blob: data.blob,
            duration: data.duration,
            url,
            videoId,
            timestamp,
            isRecordedVideo: data.isRecordedVideo || false,
            cameraBlob,
            cameraUrl,
            cameraConfig: data.cameraConfig ?? null,
          });
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    });
  } catch (error) {
    console.error("Error al cargar video desde la base de datos:", error);
    return null;
  }
}

export async function deleteRecordedVideo(): Promise<void> {
  try {
    const db = await getDB();
    const storeName = "videos";

    if (!db.objectStoreNames.contains(storeName)) {
      db.close();
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([storeName], "readwrite");
      const store = transaction.objectStore(storeName);
      const deleteRequest = store.delete("currentVideo");

      deleteRequest.onsuccess = () => {
        db.close();
        resolve();
      };
      deleteRequest.onerror = () => {
        db.close();
        reject(deleteRequest.error);
      };
    });
  } catch (error) {
    throw error;
  }
}

const titles = {
  idle: "openvid - Crea tomas cinemáticas",
  countdown: (count: number) => `Grabando en ${count}...`,
  recording: "Grabando...",
  processing: "⏳ Procesando video...",
};

function pickSupportedMimeType(preferred: string[]): string | undefined {
  for (const mimeType of preferred) {
    try {
      if (MediaRecorder.isTypeSupported(mimeType)) return mimeType;
    } catch {
      // continue
    }
  }
  return undefined;
}

export function useScreenRecording() {
  const [state, setState] = useState<RecordingState>("idle");
  const [countdown, setCountdown] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [recordingTime, setRecordingTime] = useState<number>(0);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraConfig, setCameraConfig] = useState<CameraConfig | null>(null);

  const router = useRouter();
  const pathname = usePathname();

  const screenRecorderRef = useRef<MediaRecorder | null>(null);
  const cameraRecorderRef = useRef<MediaRecorder | null>(null);
  const screenChunksRef = useRef<Blob[]>([]);
  const cameraChunksRef = useRef<Blob[]>([]);

  const screenStreamRef = useRef<MediaStream | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const startTimeRef = useRef<number>(0);
  const originalTitleRef = useRef<string>("");
  const stateRef = useRef<RecordingState>("idle");
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const cameraConfigRef = useRef<CameraConfig | null>(null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    cameraConfigRef.current = cameraConfig;
  }, [cameraConfig]);

  const setTitle = useCallback((title: string) => {
    if (typeof document === "undefined") return;
    document.title = title;
  }, []);

  const restoreOriginals = useCallback(() => {
    setTitle(originalTitleRef.current || titles.idle);
  }, [setTitle]);

  useEffect(() => {
    if (typeof document !== "undefined") {
      originalTitleRef.current = document.title;
    }
  }, []);

  useEffect(() => {
    if (state === "idle") {
      restoreOriginals();
    } else if (state === "countdown") {
      setTitle(titles.countdown(countdown));
    } else if (state === "recording") {
      const timeStr = recordingTime.toString().padStart(2, "0");
      setTitle(`Grabando ${timeStr}s`);
    } else if (state === "processing") {
      setTitle(titles.processing);
    }
  }, [state, countdown, recordingTime, setTitle, restoreOriginals]);

  useEffect(() => {
    if (state !== "recording") return;
    const interval = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
    recordingTimerRef.current = interval;
    return () => {
      clearInterval(interval);
      recordingTimerRef.current = null;
    };
  }, [state]);

  const cleanupStreams = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach((t) => t.stop());
      cameraStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
      audioCtxRef.current.close().catch(() => undefined);
      audioCtxRef.current = null;
    }
    setCameraStream(null);
  }, []);

  const stopRecording = useCallback(() => {
    if (
      screenRecorderRef.current &&
      screenRecorderRef.current.state !== "inactive"
    ) {
      screenRecorderRef.current.stop();
    }
    if (
      cameraRecorderRef.current &&
      cameraRecorderRef.current.state !== "inactive"
    ) {
      cameraRecorderRef.current.stop();
    }
  }, []);

  const updateCameraConfig = useCallback((partial: Partial<CameraConfig>) => {
    setCameraConfig((prev) => (prev ? { ...prev, ...partial } : prev));
  }, []);

  const startRecording = useCallback(
    (screenStream: MediaStream, camStream: MediaStream | null) => {
      try {
        screenChunksRef.current = [];
        cameraChunksRef.current = [];
        startTimeRef.current = Date.now();

        const screenMime =
          pickSupportedMimeType([
            "video/webm;codecs=vp9,opus",
            "video/webm;codecs=vp8,opus",
            "video/webm;codecs=vp9",
            "video/webm;codecs=vp8",
            "video/webm",
          ]) || undefined;

        const screenRecorder = new MediaRecorder(
          screenStream,
          screenMime ? { mimeType: screenMime } : undefined
        );
        screenRecorderRef.current = screenRecorder;

        screenRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            screenChunksRef.current.push(event.data);
          }
        };
        screenRecorder.onerror = (event) => {
          console.error("Error del MediaRecorder (pantalla):", event);
          setError("Error durante la grabación");
          setState("idle");
          cleanupStreams();
          restoreOriginals();
        };

        let cameraRecorder: MediaRecorder | null = null;
        if (camStream) {
          const camMime =
            pickSupportedMimeType([
              "video/webm;codecs=vp9",
              "video/webm;codecs=vp8",
              "video/webm",
            ]) || undefined;

          cameraRecorder = new MediaRecorder(
            camStream,
            camMime ? { mimeType: camMime } : undefined
          );
          cameraRecorderRef.current = cameraRecorder;

          cameraRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
              cameraChunksRef.current.push(event.data);
            }
          };
          cameraRecorder.onerror = (event) => {
            console.error("Error del MediaRecorder (cámara):", event);
          };
        }

        let pendingCount = cameraRecorder ? 2 : 1;
        let screenBlob: Blob | null = null;
        let cameraBlob: Blob | null = null;

        const finalize = async () => {
          setState("processing");
          const duration = (Date.now() - startTimeRef.current) / 1000;
          cleanupStreams();

          try {
            await saveVideoToIndexedDB(
              screenBlob || new Blob([], { type: "video/webm" }),
              duration,
              { cameraBlob, cameraConfig: cameraConfigRef.current }
            );

            if (pathname === "/editor") {
              window.location.reload();
            } else {
              router.push("/editor");
            }
          } catch (err) {
            console.error("Error al guardar video:", err);
            setError("Error al procesar el video");
            setState("idle");
            restoreOriginals();
          }
        };

        screenRecorder.onstop = () => {
          screenBlob = new Blob(screenChunksRef.current, { type: "video/webm" });
          pendingCount -= 1;
          if (pendingCount <= 0) finalize();
          else if (cameraRecorder && cameraRecorder.state !== "inactive") {
            cameraRecorder.stop();
          }
        };

        if (cameraRecorder) {
          cameraRecorder.onstop = () => {
            cameraBlob = new Blob(cameraChunksRef.current, {
              type: "video/webm",
            });
            pendingCount -= 1;
            if (pendingCount <= 0) finalize();
            else if (
              screenRecorderRef.current &&
              screenRecorderRef.current.state !== "inactive"
            ) {
              screenRecorderRef.current.stop();
            }
          };
        }

        setState("recording");

        // Retrasar el inicio de la grabadora para que no aparesca el overlay de la cuenta regresiva

        setTimeout(() => {
          startTimeRef.current = Date.now();
          screenRecorder.start(1000);
          cameraRecorder?.start(1000);
        }, 300);
      } catch (err) {
        console.error("Error al iniciar grabación:", err);
        setError(
          err instanceof Error ? err.message : "No se pudo iniciar la grabación"
        );
        setState("idle");
        cleanupStreams();
        restoreOriginals();
      }
    },
    [router, pathname, restoreOriginals, cleanupStreams]
  );

  const startCountdown = useCallback(
    async (setupArg?: RecordingSetupConfig) => {
      const setup: RecordingSetupConfig = setupArg ?? DEFAULT_RECORDING_SETUP;

      try {
        setError(null);
        setRecordingTime(0);

        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { displaySurface: "browser" },
          audio: setup.systemAudio
            ? { echoCancellation: true, noiseSuppression: true }
            : false,
        });
        screenStreamRef.current = screenStream;

        let camStream: MediaStream | null = null;
        if (setup.camera.enabled) {
          try {
            camStream = await requestCameraStream(setup.camera.deviceId);
            cameraStreamRef.current = camStream;
            setCameraStream(camStream);
            setCameraConfig(setup.camera);
          } catch (err) {
            console.warn("Cámara denegada, continuando sin cámara:", err);
          }
        }

        let micStream: MediaStream | null = null;
        if (setup.microphone.enabled) {
          try {
            micStream = await requestMicrophoneStream(
              setup.microphone.deviceId,
              {
                noiseSuppression: setup.microphone.noiseSuppression,
                echoCancellation: setup.microphone.echoCancellation,
              }
            );
            micStreamRef.current = micStream;
          } catch (err) {
            console.warn("Micrófono denegado, continuando sin micrófono:", err);
          }
        }

        const screenAudioTracks = screenStream.getAudioTracks();
        const micAudioTracks = micStream ? micStream.getAudioTracks() : [];
        const needsMixing = micAudioTracks.length > 0;

        let finalScreenStream: MediaStream = screenStream;
        if (needsMixing) {
          try {
            const AudioCtx =
              window.AudioContext ||
              (window as unknown as { webkitAudioContext: typeof AudioContext })
                .webkitAudioContext;
            const audioCtx = new AudioCtx();
            audioCtxRef.current = audioCtx;

            const destination = audioCtx.createMediaStreamDestination();

            if (screenAudioTracks.length > 0) {
              const screenSource = audioCtx.createMediaStreamSource(
                new MediaStream(screenAudioTracks)
              );
              screenSource.connect(destination);
            }

            if (micAudioTracks.length > 0) {
              const micSource = audioCtx.createMediaStreamSource(
                new MediaStream(micAudioTracks)
              );
              const micGain = audioCtx.createGain();
              micGain.gain.value = setup.microphone.volume;
              micSource.connect(micGain);
              micGain.connect(destination);
            }

            finalScreenStream = new MediaStream([
              ...screenStream.getVideoTracks(),
              ...destination.stream.getAudioTracks(),
            ]);
          } catch (err) {
            console.warn(
              "Error al mezclar audio, usando solo audio de pantalla:",
              err
            );
            finalScreenStream = screenStream;
          }
        }

        screenStream.getVideoTracks()[0].onended = () => {
          if (stateRef.current === "recording") {
            stopRecording();
          } else {
            setState("idle");
            cleanupStreams();
            restoreOriginals();
          }
        };

        setState("countdown");
        setCountdown(4);

        let count = 4;
        const countdownInterval = setInterval(() => {
          count -= 1;
          setCountdown(count);
          if (count <= 0) {
            clearInterval(countdownInterval);
            startRecording(finalScreenStream, camStream);
          }
        }, 1000);
      } catch (err) {
        console.error("Error al iniciar captura:", err);
        setError("No se pudo iniciar la captura de pantalla");
        setState("idle");
        cleanupStreams();
        restoreOriginals();
      }
    },
    [restoreOriginals, stopRecording, startRecording, cleanupStreams]
  );

  const cancelRecording = useCallback(() => {
    if (
      screenRecorderRef.current &&
      screenRecorderRef.current.state !== "inactive"
    ) {
      screenRecorderRef.current.stop();
    }
    if (
      cameraRecorderRef.current &&
      cameraRecorderRef.current.state !== "inactive"
    ) {
      cameraRecorderRef.current.stop();
    }
    cleanupStreams();
    screenChunksRef.current = [];
    cameraChunksRef.current = [];
    setRecordingTime(0);
    setState("idle");
    setCameraConfig(null);
    restoreOriginals();
  }, [cleanupStreams, restoreOriginals]);

  useEffect(() => {
    if (recordingTime >= 120 && state === "recording") {
      stopRecording();
    }
  }, [recordingTime, state, stopRecording]);

  return {
    state,
    countdown,
    recordingTime,
    error,
    startCountdown,
    stopRecording,
    cancelRecording,
    isIdle: state === "idle",
    isCountdown: state === "countdown",
    isRecording: state === "recording",
    isProcessing: state === "processing",
    cameraStream,
    cameraConfig,
    updateCameraConfig,
  };
}
