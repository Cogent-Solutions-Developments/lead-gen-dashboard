"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { CameraOff, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GestureRecognizer as MediaPipeGestureRecognizer } from "@mediapipe/tasks-vision";

type ViewMode = "grid" | "list";

type ConferenceGestureControllerProps = {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
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

const WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/gesture_recognizer/gesture_recognizer/float16/1/gesture_recognizer.task";
const CLICK_HOLD_MS = 720;
const CLICK_COOLDOWN_MS = 1800;
const CLICK_MOVE_TOLERANCE_PX = 34;
const PINCH_THRESHOLD = 0.038;
const EDGE_SCROLL_ZONE_RATIO = 0.24;
const EDGE_SCROLL_MAX_STEP = 18;
const VIEW_SWITCH_THRESHOLD = 0.28;
const VIEW_SWITCH_COOLDOWN_MS = 1300;

function distance(a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function getEdgeScrollStep(container: HTMLElement, cursorY: number) {
  const rect = container.getBoundingClientRect();
  const zoneSize = Math.max(96, rect.height * EDGE_SCROLL_ZONE_RATIO);
  const topZoneEnd = rect.top + zoneSize;
  const bottomZoneStart = rect.bottom - zoneSize;

  if (cursorY < topZoneEnd) {
    const intensity = Math.min(1, (topZoneEnd - cursorY) / zoneSize);
    return -EDGE_SCROLL_MAX_STEP * intensity;
  }

  if (cursorY > bottomZoneStart) {
    const intensity = Math.min(1, (cursorY - bottomZoneStart) / zoneSize);
    return EDGE_SCROLL_MAX_STEP * intensity;
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

export function ConferenceGestureController({
  scrollContainerRef,
  viewMode,
  onViewModeChange,
}: ConferenceGestureControllerProps) {
  const [enabled, setEnabled] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gestureLabel, setGestureLabel] = useState("Idle");
  const [cursor, setCursor] = useState<CursorState>({ x: 0, y: 0, visible: false });
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastYRef = useRef<number | null>(null);
  const lastXRef = useRef<number | null>(null);
  const lastSwitchAtRef = useRef(0);
  const lastClickAtRef = useRef(0);
  const clickIntentRef = useRef<ClickIntent | null>(null);
  const viewModeRef = useRef(viewMode);

  useEffect(() => {
    viewModeRef.current = viewMode;
  }, [viewMode]);

  useEffect(() => {
    if (!enabled) {
      setReady(false);
      setGestureLabel("Idle");
      setCursor((current) => ({ ...current, visible: false }));
      lastXRef.current = null;
      lastYRef.current = null;
      clickIntentRef.current = null;
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
            lastXRef.current = null;
            lastYRef.current = null;
            clickIntentRef.current = null;
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

          if (isFist) {
            lastXRef.current = indexTip.x;
            lastYRef.current = indexTip.y;
            clickIntentRef.current = null;
            rafRef.current = requestAnimationFrame(tick);
            return;
          }

          if (!isPinching) {
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

          if (lastXRef.current !== null && now - lastSwitchAtRef.current > VIEW_SWITCH_COOLDOWN_MS) {
            const dx = indexTip.x - lastXRef.current;
            if (dx > VIEW_SWITCH_THRESHOLD && viewModeRef.current !== "list") {
              onViewModeChange("list");
              viewModeRef.current = "list";
              lastSwitchAtRef.current = now;
            } else if (dx < -VIEW_SWITCH_THRESHOLD && viewModeRef.current !== "grid") {
              onViewModeChange("grid");
              viewModeRef.current = "grid";
              lastSwitchAtRef.current = now;
            }
          }

          if (isPinching && now - lastClickAtRef.current > CLICK_COOLDOWN_MS) {
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
          } else if (!isPinching) {
            clickIntentRef.current = null;
            setGestureLabel(edgeScrollLabel ?? gesture.replaceAll("_", " "));
          }

          lastXRef.current = indexTip.x;
          lastYRef.current = indexTip.y;
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
  }, [enabled, onViewModeChange, scrollContainerRef]);

  return (
    <>
      <button
        type="button"
        aria-label={enabled ? "Disable gesture control" : "Enable gesture control"}
        aria-pressed={enabled}
        onClick={() => setEnabled((current) => !current)}
        className={cn(
          "inline-flex h-11 w-11 items-center justify-center rounded-2xl border p-0 transition",
          enabled
            ? "border-blue-400/70 bg-blue-600 text-[rgb(255,255,255)] shadow-[inset_0_1px_0_rgba(255,255,255,0.24),0_0_26px_-12px_rgba(59,130,246,0.9)]"
            : "border-zinc-300 bg-zinc-900/95 text-zinc-400 hover:text-zinc-100"
        )}
      >
        {error ? <CameraOff className="h-4 w-4" /> : <Hand className="h-4 w-4" />}
      </button>

      {enabled ? (
        <div className="pointer-events-none fixed right-6 top-6 z-[120] rounded-full border border-[rgba(255,255,255,0.16)] bg-black/45 px-3 py-1 text-xs font-medium text-[rgba(255,255,255,0.76)] shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          {ready ? gestureLabel : "Starting camera"}
        </div>
      ) : null}

      {error ? (
        <div className="pointer-events-none fixed right-6 top-6 z-[120] max-w-xs rounded-2xl border border-rose-400/30 bg-black/64 px-3 py-2 text-xs font-medium text-rose-100 shadow-[0_18px_40px_-26px_rgba(0,0,0,0.9)] backdrop-blur-xl">
          {error}
        </div>
      ) : null}

      {cursor.visible ? (
        <div
          className="pointer-events-none fixed z-[119] h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[rgba(255,255,255,0.74)] bg-blue-400/28 shadow-[0_0_28px_rgba(125,211,252,0.62)] backdrop-blur-sm"
          style={{ left: cursor.x, top: cursor.y }}
        />
      ) : null}
    </>
  );
}
