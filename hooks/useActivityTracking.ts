"use client";

import { useEffect } from "react";
import { sendActivityHeartbeat } from "@/lib/peopleApi";
import { ACTIVITY_IDLE_MS, shouldReportActive } from "@/lib/peopleUtils";

export const HEARTBEAT_INTERVAL_MS = 60_000;
const INTERACTION_THROTTLE_MS = 1_000;

export function useActivityTracking(enabled: boolean, sessionKey?: string) {
  useEffect(() => {
    if (!enabled || !sessionKey || typeof window === "undefined") return;

    let disposed = false;
    let lastInteractionAt = Date.now();
    let lastInteractionUpdateAt = 0;
    let lastReportedActive: boolean | null = null;
    let idleTimer: number | null = null;
    const controller = new AbortController();

    const isActiveNow = () =>
      shouldReportActive({
        visible: document.visibilityState === "visible",
        focused: document.hasFocus(),
        lastInteractionAt,
        now: Date.now(),
      });

    const report = (active: boolean, keepalive = false, force = false) => {
      if (disposed || (!force && lastReportedActive === active)) return;
      lastReportedActive = active;
      void sendActivityHeartbeat(
        { active },
        keepalive ? { keepalive: true } : { signal: controller.signal }
      ).catch(() => {
        // Activity reporting is deliberately non-blocking.
      });
    };

    const scheduleIdleTransition = () => {
      if (idleTimer) window.clearTimeout(idleTimer);
      const remaining = Math.max(0, ACTIVITY_IDLE_MS - (Date.now() - lastInteractionAt));
      idleTimer = window.setTimeout(() => {
        if (!isActiveNow()) report(false);
      }, remaining + 25);
    };

    const onInteraction = () => {
      const now = Date.now();
      if (now - lastInteractionUpdateAt < INTERACTION_THROTTLE_MS) return;
      lastInteractionUpdateAt = now;
      lastInteractionAt = now;
      scheduleIdleTransition();
      if (isActiveNow() && lastReportedActive === false) report(true);
    };

    const onAttentionChange = () => {
      const active = isActiveNow();
      if (active) {
        lastInteractionAt = Date.now();
        scheduleIdleTransition();
      }
      report(active, !active && document.visibilityState === "hidden");
    };

    const onPageHide = () => report(false, true);
    const interactionEvents: Array<keyof WindowEventMap> = [
      "keydown",
      "pointerdown",
      "mousemove",
      "touchstart",
      "scroll",
      "focus",
    ];

    interactionEvents.forEach((eventName) =>
      window.addEventListener(eventName, onInteraction, { passive: true })
    );
    document.addEventListener("visibilitychange", onAttentionChange);
    window.addEventListener("focus", onAttentionChange);
    window.addEventListener("blur", onAttentionChange);
    window.addEventListener("pagehide", onPageHide);

    scheduleIdleTransition();
    report(isActiveNow());
    const interval = window.setInterval(() => report(isActiveNow(), false, isActiveNow()), HEARTBEAT_INTERVAL_MS);

    return () => {
      if (lastReportedActive !== false) {
        void sendActivityHeartbeat({ active: false }, { keepalive: true }).catch(() => {});
      }
      disposed = true;
      controller.abort();
      window.clearInterval(interval);
      if (idleTimer) window.clearTimeout(idleTimer);
      interactionEvents.forEach((eventName) => window.removeEventListener(eventName, onInteraction));
      document.removeEventListener("visibilitychange", onAttentionChange);
      window.removeEventListener("focus", onAttentionChange);
      window.removeEventListener("blur", onAttentionChange);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [enabled, sessionKey]);
}
