"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CameraOff, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GestureRecognizer as MediaPipeGestureRecognizer } from "@mediapipe/tasks-vision";

type ViewMode = "grid" | "list";

type ConferenceGestureControllerProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  onHoverTargetChange?: (targetId: string | null) => void;
  onVoiceSearchTrigger?: () => void;
  onVoiceSearchStop?: () => void;
  onVoiceBackspace?: () => void;
};

type CursorState = {
  x: number;
  y: number;
  visible: boolean;
};

type ClickIntent = {
  target: HTMLAnchorElement | HTMLButtonElement;
  startedAt: number;
  x: number;
  y: number;
};

type ViewCommandIntent = {
  mode: ViewMode;
  startedAt: number;
};

type HandLandmark = {
  x: number;
  y: number;
};

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const CLICK_HOLD_MS = 720;
const CLICK_COOLDOWN_MS = 1800;
const CLICK_MOVE_TOLERANCE_PX = 34;
const PINCH_THRESHOLD = 0.038;
const TOP_EDGE_SCROLL_ZONE_RATIO = 0.38;
const BOTTOM_EDGE_SCROLL_ZONE_RATIO = 0.24;
const EDGE_SCROLL_DOWN_MAX_STEP = 18;
const EDGE_SCROLL_UP_MAX_STEP = 26;
const VIEW_COMMAND_HOLD_MS = 760;
const VIEW_COMMAND_COOLDOWN_MS = 1600;
const VOICE_SEARCH_HOLD_MS = 780;
const VOICE_SEARCH_COOLDOWN_MS = 2200;
const BACKSPACE_HOLD_MS = 620;
const BACKSPACE_COOLDOWN_MS = 900;
const DISABLE_GESTURES_HOLD_MS = 950;
const HOVER_DWELL_MS = 140;
const HOVER_CLEAR_DELAY_MS = 220;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getEdgeScrollStep(container: HTMLElement, cursorY: number) {
  const rect = container.getBoundingClientRect();
  const topZoneSize = Math.max(148, rect.height * TOP_EDGE_SCROLL_ZONE_RATIO);
  const bottomZoneSize = Math.max(96, rect.height * BOTTOM_EDGE_SCROLL_ZONE_RATIO);
  const topZoneEnd = rect.top + topZoneSize;
  const bottomZoneStart = rect.bottom - bottomZoneSize;

  if (cursorY < topZoneEnd) {
    const intensity = Math.min(1, (topZoneEnd - cursorY) / topZoneSize);
    return -EDGE_SCROLL_UP_MAX_STEP * intensity;
  }

  if (cursorY > bottomZoneStart) {
    const intensity = Math.min(1, (cursorY - bottomZoneStart) / bottomZoneSize);
    return EDGE_SCROLL_DOWN_MAX_STEP * intensity;
  }

  return 0;
}

function getGestureErrorMessage(error: unknown) {
  if (error instanceof DOMException) {
    if (error.name === "NotAllowedError") return "Camera permission was blocked.";
    if (error.name === "NotFoundError") return "No camera was found.";
    if (error.name === "NotReadableError") return "Camera is already in use.";
    if (error.name === "SecurityError") return "Camera requires HTTPS or localhost.";
  }

  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;

  try {
    return JSON.stringify(error);
  } catch {
    return "Gesture control failed.";
  }
}

function isFingerRaised(landmarks: HandLandmark[], tipIndex: number, pipIndex: number) {
  return landmarks[tipIndex]?.y < landmarks[pipIndex]?.y - 0.025;
}

function isThumbRaised(landmarks: HandLandmark[]) {
  const thumbTip = landmarks[4];
  const thumbIp = landmarks[3];
  if (!thumbTip || !thumbIp) return false;
  return thumbTip.y < thumbIp.y - 0.02;
}

function isFourFingerCommand(landmarks: HandLandmark[]) {
  return (
    isFingerRaised(landmarks, 8, 6) &&
    isFingerRaised(landmarks, 12, 10) &&
    isFingerRaised(landmarks, 16, 14) &&
    isFingerRaised(landmarks, 20, 18)
  );
}

function isFiveFingerOpenPalm(gesture: string, landmarks: HandLandmark[]) {
  if (gesture === "Open_Palm") return true;
  return (
    isThumbRaised(landmarks) &&
    isFingerRaised(landmarks, 8, 6) &&
    isFingerRaised(landmarks, 12, 10) &&
    isFingerRaised(landmarks, 16, 14) &&
    isFingerRaised(landmarks, 20, 18)
  );
}

function getViewCommandMode(gesture: string, landmarks: HandLandmark[]): ViewMode | null {
  if (gesture === "Thumb_Up") return "list";
  if (isFourFingerCommand(landmarks)) return "grid";
  return null;
}

export function ConferenceGestureController({
  scrollContainerRef,
  viewMode,
  onViewModeChange,
  onHoverTargetChange,
  onVoiceSearchTrigger,
  onVoiceSearchStop,
  onVoiceBackspace,
}: ConferenceGestureControllerProps) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestureLabel, setGestureLabel] = useState("Idle");
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, visible: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastSwitchAtRef = useRef(0);
  const lastClickAtRef = useRef(0);
  const clickIntentRef = useRef<ClickIntent | null>(null);
  const viewCommandRef = useRef<ViewCommandIntent | null>(null);
  const hoverTargetRef = useRef<string | null>(null);
  const hoverCandidateRef = useRef<{ id: string; startedAt: number } | null>(null);
  const hoverClearAtRef = useRef<number | null>(null);
  const viewModeRef = useRef(viewMode);
  const voiceCommandStartedAtRef = useRef<number | null>(null);
  const lastVoiceSearchAtRef = useRef(0);
  const backspaceCommandStartedAtRef = useRef<number | null>(null);
  const lastBackspaceAtRef = useRef(0);
  const disableCommandStartedAtRef = useRef<number | null>(null);

  const setHoverTarget = useCallback((targetId: string | null) => {
    if (hoverTargetRef.current === targetId) return;
    hoverTargetRef.current = targetId;
    onHoverTargetChange?.(targetId);
  }, [onHoverTargetChange]);

  const updateGestureHover = useCallback((targetId: string | null, now: number) => {
    if (!targetId) {
      hoverCandidateRef.current = null;
      if (hoverTargetRef.current && hoverClearAtRef.current === null) {
        hoverClearAtRef.current = now + HOVER_CLEAR_DELAY_MS;
      }
    } else {
      hoverClearAtRef.current = null;
      if (hoverTargetRef.current === targetId) return;

      const candidate = hoverCandidateRef.current;
      if (!candidate || candidate.id !== targetId) {
        hoverCandidateRef.current = { id: targetId, startedAt: now };
      } else if (now - candidate.startedAt >= HOVER_DWELL_MS) {
        setHoverTarget(targetId);
      }
    }

    if (hoverClearAtRef.current !== null && now >= hoverClearAtRef.current) {
      hoverClearAtRef.current = null;
      setHoverTarget(null);
    }
  }, [setHoverTarget]);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setGestureLabel("Idle");
      setCursor((current) => ({ ...current, visible: false }));
      clickIntentRef.current = null;
      viewCommandRef.current = null;
      voiceCommandStartedAtRef.current = null;
      backspaceCommandStartedAtRef.current = null;
      disableCommandStartedAtRef.current = null;
      hoverCandidateRef.current = null;
      hoverClearAtRef.current = null;
      setHoverTarget(null);
      onVoiceSearchStop?.();
      return;
    }

    let cancelled = false;
    let recognizer: MediaPipeGestureRecognizer | null = null;
    const originalConsoleError = console.error;
    const patchedConsoleError: typeof console.error = (...args) => {
      const message = args.map((arg) => String(arg)).join(" ");
      if (message.includes("INFO: Created TensorFlow Lite XNNPACK delegate for CPU")) return;
      originalConsoleError(...args);
    };
    console.error = patchedConsoleError;

    const stop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      recognizer?.close();
      recognizer = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.srcObject = null;
      }
      if (console.error === patchedConsoleError) {
        console.error = originalConsoleError;
      }
    };

    const run = async () => {
      setError(null);
      setReady(false);

      try {
        const [{ FilesetResolver, GestureRecognizer }, stream] = await Promise.all([
          import("@mediapipe/tasks-vision"),
          navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 640 },
              height: { ideal: 480 },
            },
            audio: false,
          }),
        ]);

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        const video = document.createElement("video");
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;
        video.srcObject = stream;
        videoRef.current = video;
        await video.play();

        const vision = await FilesetResolver.forVisionTasks(WASM_URL);
        try {
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
          });
        } catch {
          recognizer = await GestureRecognizer.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: MODEL_URL,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numHands: 1,
          });
        }

        if (cancelled) return;
        setReady(true);

        const tick = () => {
          if (!videoRef.current || !recognizer || cancelled) return;

          const result = recognizer.recognizeForVideo(videoRef.current, performance.now());
          const landmarks = result.landmarks?.[0];
          const gesture = result.gestures?.[0]?.[0]?.categoryName || "Tracking";

          if (!landmarks?.length) {
            setCursor((current) => ({ ...current, visible: false }));
            setGestureLabel("Searching");
            clickIntentRef.current = null;
            viewCommandRef.current = null;
            updateGestureHover(null, performance.now());
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          const indexTip = landmarks[8];
          const thumbTip = landmarks[4];
          const now = performance.now();
          const x = (1 - indexTip.x) * window.innerWidth;
          const y = indexTip.y * window.innerHeight;
          const pinchDistance = distance(indexTip, thumbTip);
          const isPinching = pinchDistance < PINCH_THRESHOLD;
          const isFist = gesture === "Closed_Fist";
          let edgeScrollLabel: string | null = null;

          setCursor({ x, y, visible: !isFist });
          const gestureHoverId =
            document
              .elementFromPoint(x, y)
              ?.closest<HTMLElement>("[data-gesture-hover-id]")
              ?.dataset.gestureHoverId ?? null;
          updateGestureHover(isFist ? null : gestureHoverId, now);

          if (isFist) {
            clickIntentRef.current = null;
            viewCommandRef.current = null;
            voiceCommandStartedAtRef.current = null;
            backspaceCommandStartedAtRef.current = null;
            disableCommandStartedAtRef.current = null;
            onVoiceSearchStop?.();
            setGestureLabel("Paused");
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          const commandMode = getViewCommandMode(gesture, landmarks);
          const wantsVoiceSearch = isFiveFingerOpenPalm(gesture, landmarks);
          const wantsBackspace = gesture === "Victory";
          const wantsDisable = gesture === "Thumb_Down";

          if (wantsVoiceSearch) {
            clickIntentRef.current = null;
            viewCommandRef.current = null;
            backspaceCommandStartedAtRef.current = null;
            disableCommandStartedAtRef.current = null;
            if (voiceCommandStartedAtRef.current === null) {
              voiceCommandStartedAtRef.current = now;
              setGestureLabel("Hold for voice search");
            } else if (now - voiceCommandStartedAtRef.current < VOICE_SEARCH_HOLD_MS) {
              setGestureLabel("Hold for voice search");
            } else if (now - lastVoiceSearchAtRef.current > VOICE_SEARCH_COOLDOWN_MS) {
              onVoiceSearchTrigger?.();
              lastVoiceSearchAtRef.current = now;
              setGestureLabel("Voice search");
            }
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          voiceCommandStartedAtRef.current = null;

          if (wantsDisable) {
            clickIntentRef.current = null;
            viewCommandRef.current = null;
            backspaceCommandStartedAtRef.current = null;

            if (disableCommandStartedAtRef.current === null) {
              disableCommandStartedAtRef.current = now;
              setGestureLabel("Hold to disable gestures");
            } else if (now - disableCommandStartedAtRef.current < DISABLE_GESTURES_HOLD_MS) {
              setGestureLabel("Hold to disable gestures");
            } else {
              onVoiceSearchStop?.();
              setGestureLabel("Gesture mode off");
              setEnabled(false);
              return;
            }
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          disableCommandStartedAtRef.current = null;

          if (wantsBackspace) {
            clickIntentRef.current = null;
            viewCommandRef.current = null;

            if (backspaceCommandStartedAtRef.current === null) {
              backspaceCommandStartedAtRef.current = now;
              setGestureLabel("Hold for backspace");
            } else if (now - backspaceCommandStartedAtRef.current < BACKSPACE_HOLD_MS) {
              setGestureLabel("Hold for backspace");
            } else if (now - lastBackspaceAtRef.current > BACKSPACE_COOLDOWN_MS) {
              onVoiceBackspace?.();
              lastBackspaceAtRef.current = now;
              setGestureLabel("Backspace");
            }
            rafRef.current = requestAnimationFrame(tick);
            return;
          }
          backspaceCommandStartedAtRef.current = null;

          if (commandMode) {
            clickIntentRef.current = null;
            const existingCommand = viewCommandRef.current;
            const commandLabel = commandMode === "list" ? "Hold for list" : "Hold for grid";

            if (!existingCommand || existingCommand.mode !== commandMode) {
              viewCommandRef.current = { mode: commandMode, startedAt: now };
              setGestureLabel(commandLabel);
            } else if (now - existingCommand.startedAt < VIEW_COMMAND_HOLD_MS) {
              setGestureLabel(commandLabel);
            } else if (now - lastSwitchAtRef.current > VIEW_COMMAND_COOLDOWN_MS) {
              if (viewModeRef.current !== commandMode) {
                onViewModeChange(commandMode);
                viewModeRef.current = commandMode;
              }
              lastSwitchAtRef.current = now;
              setGestureLabel(commandMode === "list" ? "List view" : "Grid view");
            }
          } else {
            viewCommandRef.current = null;
          }

          if (!commandMode && !isPinching) {
            const scrollContainer = scrollContainerRef.current;
            if (scrollContainer) {
              const scrollStep = getEdgeScrollStep(scrollContainer, y);
              if (Math.abs(scrollStep) > 0.5) {
                scrollContainer.scrollBy({
                  top: scrollStep,
                  behavior: "auto",
                });
                edgeScrollLabel = scrollStep > 0 ? "Scroll down" : "Scroll up";
              }
            }
          }

          if (!commandMode && isPinching && now - lastClickAtRef.current > CLICK_COOLDOWN_MS) {
            const target = document.elementFromPoint(x, y);
            const clickable = target?.closest<HTMLAnchorElement | HTMLButtonElement>("a,button");
            const existingIntent = clickIntentRef.current;

            if (!clickable) {
              clickIntentRef.current = null;
              setGestureLabel("Pinch");
            } else if (!existingIntent || existingIntent.target !== clickable) {
              clickIntentRef.current = { target: clickable, startedAt: now, x, y };
              setGestureLabel("Hold to click");
            } else {
              const movement = Math.hypot(x - existingIntent.x, y - existingIntent.y);
              if (movement > CLICK_MOVE_TOLERANCE_PX) {
                clickIntentRef.current = { target: clickable, startedAt: now, x, y };
                setGestureLabel("Hold steady");
              } else if (now - existingIntent.startedAt > CLICK_HOLD_MS) {
                clickable.click();
                lastClickAtRef.current = now;
                clickIntentRef.current = null;
                setGestureLabel("Clicked");
              } else {
                setGestureLabel("Hold to click");
              }
            }
          } else if (!commandMode && !isPinching) {
            clickIntentRef.current = null;
            setGestureLabel(edgeScrollLabel ?? gesture.replaceAll("_", " "));
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (err) {
        stop();
        setEnabled(false);
        setError(getGestureErrorMessage(err));
      }
    };

    void run();

    return () => {
      cancelled = true;
      stop();
    };
  }, [enabled, onViewModeChange, onVoiceBackspace, onVoiceSearchStop, onVoiceSearchTrigger, scrollContainerRef, setHoverTarget, updateGestureHover]);

  const overlay =
    typeof document !== "undefined" ? createPortal(
      <>
        {enabled ? (
          <div className="pointer-events-none fixed right-6 top-6 z-[240] rounded-full border border-[rgba(255,255,255,0.16)] bg-black/45 px-3 py-1 text-xs font-medium text-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {ready ? gestureLabel : "Starting camera"}
          </div>
        ) : null}

        {error ? (
          <div className="pointer-events-none fixed right-6 top-6 z-[240] max-w-xs rounded-2xl border border-rose-400/30 bg-black/64 px-3 py-2 text-xs font-medium text-rose-100 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)] backdrop-blur-xl">
            {error}
          </div>
        ) : null}

        {cursor.visible ? (
          <div
            className="pointer-events-none fixed z-[241] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,255,255,0.74)] bg-blue-400/28 shadow-[0_0_28px_rgba(125,211,252,0.62)] backdrop-blur-sm"
            style={{ left: cursor.x, top: cursor.y }}
          />
        ) : null}
      </>,
      document.body
    ) : null;

  return (
    <>
      <button
        type="button"
        aria-label={enabled ? "Disable gesture control" : "Enable gesture control"}
        aria-pressed={enabled}
        onClick={() => setEnabled((current) => !current)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-full border p-0 transition",
          enabled
            ? "border-blue-400/70 bg-blue-600 text-[rgb(255,255,255)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_0_26px_-12px_rgba(59,130,246,0.9)]"
            : "border-white/85 bg-white/68 text-zinc-900 ring-1 ring-white/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.96),inset_0_-1px_0_rgba(255,255,255,0.38),0_12px_28px_-18px_rgba(2,10,27,0.58),0_4px_12px_-8px_rgba(2,10,27,0.42)] backdrop-blur-[30px] hover:bg-white/78"
        )}
      >
        {error ? <CameraOff className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
      </button>

      {overlay}
    </>
  );
}
