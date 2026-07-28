"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { CakeSlice, CheckCheck, Gift, Inbox, Loader2, MessageSquareDot, PartyPopper, RefreshCw, X } from "lucide-react";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type PeopleNotification,
} from "@/lib/peopleApi";
import {
  localCalendarDateKey,
  markEveryNotificationRead,
  markOneNotificationRead,
  millisecondsUntilNextLocalDay,
  notificationCalendarDate,
  notificationsForCalendarDate,
} from "@/lib/peopleUtils";

const NOTIFICATION_POLL_MS = 60_000;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Notifications could not be loaded.";
}

function formatNotificationTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function newestFirst(notifications: PeopleNotification[]) {
  return [...notifications].sort(
    (left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  );
}

export function NotificationCenter({ sessionKey }: { sessionKey: string }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<PeopleNotification[]>([]);
  const [birthdayPopup, setBirthdayPopup] = useState<PeopleNotification | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [updatingIds, setUpdatingIds] = useState<Set<string>>(new Set());
  const [markingAll, setMarkingAll] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<AbortController | null>(null);
  const actionControllersRef = useRef<Set<AbortController>>(new Set());
  const notificationsRef = useRef<PeopleNotification[]>([]);
  const notificationCountRef = useRef(0);
  notificationCountRef.current = notifications.length;

  const replaceNotifications = useCallback((next: PeopleNotification[]) => {
    notificationsRef.current = next;
    notificationCountRef.current = next.length;
    setNotifications(next);
    setUnreadCount(next.filter((notification) => !notification.isRead).length);
  }, []);

  const load = useCallback(async (append = false) => {
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    if (append) setLoadingMore(true);
    else setLoading((current) => current || notificationCountRef.current === 0);
    setError("");
    try {
      const response = await listNotifications({
        unreadOnly: false,
        limit: 50,
        offset: append ? notificationCountRef.current : 0,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const today = localCalendarDateKey();
      const dailyNotifications = notificationsForCalendarDate(response.notifications, today);
      const current = notificationsForCalendarDate(notificationsRef.current, today);
      const next = newestFirst(
        append
          ? [...current, ...dailyNotifications.filter((item) => !current.some((old) => old.id === item.id))]
          : dailyNotifications,
      );
      replaceNotifications(next);
      setHasMore(response.pagination.hasMore && dailyNotifications.length === response.notifications.length);
    } catch (error) {
      if (!controller.signal.aborted) setError(errorMessage(error));
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  }, [replaceNotifications]);

  useEffect(() => {
    const actionControllers = actionControllersRef.current;
    void load();
    const interval = window.setInterval(() => void load(), NOTIFICATION_POLL_MS);
    return () => {
      window.clearInterval(interval);
      requestRef.current?.abort();
      actionControllers.forEach((controller) => controller.abort());
      actionControllers.clear();
    };
  }, [load, sessionKey]);

  useEffect(() => {
    if (open) void load();
  }, [load, open]);

  useEffect(() => {
    let timeout = 0;
    const scheduleReset = () => {
      timeout = window.setTimeout(() => {
        replaceNotifications([]);
        setHasMore(false);
        setOpen(false);
        setBirthdayPopup(null);
        void load();
        scheduleReset();
      }, millisecondsUntilNextLocalDay());
    };
    scheduleReset();
    return () => window.clearTimeout(timeout);
  }, [load, replaceNotifications, sessionKey]);

  useEffect(() => {
    if (pathname !== "/dashboard") {
      setBirthdayPopup(null);
      return;
    }

    const wish = notifications.find((notification) => notification.type === "birthday_wish");
    if (!wish) return;
    const occurrenceDate = notificationCalendarDate(wish) || localCalendarDateKey();
    const storageKey = `supernizo:birthday-popup:last-shown:${sessionKey}`;
    if (window.localStorage.getItem(storageKey) === occurrenceDate) return;
    window.localStorage.setItem(storageKey, occurrenceDate);
    setBirthdayPopup(wish);
  }, [notifications, pathname, sessionKey]);

  useEffect(() => {
    if (!birthdayPopup) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setBirthdayPopup(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [birthdayPopup]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const selectNotification = async (notification: PeopleNotification) => {
    if (notification.isRead || updatingIds.has(notification.id)) return;
    const controller = new AbortController();
    actionControllersRef.current.add(controller);
    setUpdatingIds((current) => new Set(current).add(notification.id));
    const previous = notificationsRef.current;
    replaceNotifications(markOneNotificationRead(previous, notification.id));
    try {
      await markNotificationRead(notification.id, controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      replaceNotifications(previous);
      setError(errorMessage(error));
    } finally {
      actionControllersRef.current.delete(controller);
      if (!controller.signal.aborted) {
        setUpdatingIds((current) => {
          const next = new Set(current);
          next.delete(notification.id);
          return next;
        });
      }
    }
  };

  const markAll = async () => {
    if (!unreadCount || markingAll) return;
    const controller = new AbortController();
    actionControllersRef.current.add(controller);
    const previous = notificationsRef.current;
    setMarkingAll(true);
    replaceNotifications(markEveryNotificationRead(previous));
    try {
      await markAllNotificationsRead(controller.signal);
    } catch (error) {
      if (controller.signal.aborted) return;
      replaceNotifications(previous);
      setError(errorMessage(error));
    } finally {
      actionControllersRef.current.delete(controller);
      if (!controller.signal.aborted) setMarkingAll(false);
    }
  };

  return (
    <div ref={rootRef} className="fixed bottom-4 right-3 z-[70] font-sans sm:bottom-6 sm:right-5">
      {birthdayPopup ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-[2px]">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="birthday-popup-title"
            className="relative w-full max-w-md overflow-hidden rounded-3xl border border-pink-200 bg-white p-7 text-center shadow-2xl"
          >
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-pink-100 via-amber-100 to-blue-100" aria-hidden="true" />
            <button
              type="button"
              onClick={() => setBirthdayPopup(null)}
              aria-label="Close birthday wish"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-zinc-600 shadow-sm hover:text-zinc-950 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="relative mx-auto flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-pink-500 to-fuchsia-600 text-white shadow-lg">
              <Gift className="h-9 w-9" aria-hidden="true" />
            </div>
            <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.2em] text-pink-600">A special wish for you</p>
            <h2 id="birthday-popup-title" className="relative mt-2 text-3xl font-bold tracking-tight text-zinc-950">
              {birthdayPopup.title || "Happy Birthday!"}
            </h2>
            <p className="relative mt-3 text-sm leading-6 text-zinc-600">{birthdayPopup.message}</p>
            <button
              type="button"
              onClick={() => setBirthdayPopup(null)}
              className="relative mt-6 inline-flex h-11 items-center justify-center rounded-xl bg-pink-600 px-6 text-sm font-semibold text-white shadow-sm hover:bg-pink-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-500 focus-visible:ring-offset-2"
            >
              Thank you
            </button>
          </section>
        </div>
      ) : null}
      <span className="sr-only" aria-live="polite" aria-atomic="true">
        {unreadCount ? `${unreadCount} unread notifications` : "No unread notifications"}
      </span>
      <button
        type="button"
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-lg transition hover:border-blue-300 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
      >
        <Inbox className="h-5 w-5" aria-hidden="true" />
        {unreadCount ? (
          <span
            aria-hidden="true"
            className="absolute -right-1.5 -top-1.5 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold text-white"
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <section
          role="dialog"
          aria-label="Notifications"
          className="absolute bottom-full right-0 mb-3 flex max-h-[min(42rem,calc(100dvh-5rem))] w-[min(25rem,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        >
          <header className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-3">
            <div>
              <h2 className="font-semibold text-zinc-950">Notifications</h2>
              <p className="text-xs text-zinc-500">Updates from your workspace</p>
            </div>
            <button
              type="button"
              onClick={() => void markAll()}
              disabled={!unreadCount || markingAll}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {markingAll ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCheck className="h-3.5 w-3.5" />}
              Mark all as read
            </button>
          </header>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-zinc-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading notifications…
              </div>
            ) : error && notifications.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm font-semibold text-zinc-900">Notifications unavailable</p>
                <p className="mt-1 text-sm text-zinc-500">{error}</p>
                <button
                  type="button"
                  onClick={() => void load()}
                  className="mt-4 inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-semibold text-zinc-700 hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600"
                >
                  <RefreshCw className="h-4 w-4" /> Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <Inbox className="mx-auto h-7 w-7 text-zinc-300" />
                <p className="mt-3 text-sm font-semibold text-zinc-900">You’re all caught up</p>
                <p className="mt-1 text-sm text-zinc-500">No notifications yet.</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-100 py-2">
                {notifications.map((notification) => {
                  const subjectName = notification.metadata?.subjectDisplayName?.trim();
                  const isBirthdayWish = notification.type === "birthday_wish";
                  const isMemberBirthday = notification.type === "member_birthday";
                  return (
                    <button
                      key={notification.id}
                      type="button"
                      onClick={() => void selectNotification(notification)}
                      className={`flex w-full gap-3 px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 ${
                        notification.isRead ? "bg-white hover:bg-zinc-50" : "bg-blue-50/70 hover:bg-blue-50"
                      }`}
                    >
                      <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isBirthdayWish
                          ? "bg-pink-100 text-pink-700"
                          : isMemberBirthday
                            ? "bg-amber-100 text-amber-800"
                            : "bg-blue-100 text-blue-700"
                      }`}>
                        {isBirthdayWish ? (
                          <PartyPopper className="h-4 w-4" />
                        ) : isMemberBirthday ? (
                          <CakeSlice className="h-4 w-4" />
                        ) : (
                          <MessageSquareDot className="h-4 w-4" />
                        )}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-2">
                          <span className="text-sm font-semibold text-zinc-950">{notification.title}</span>
                          {!notification.isRead ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-700"><span className="sr-only">Unread</span></span> : null}
                        </span>
                        {isMemberBirthday && subjectName ? (
                          <span className="mt-1 block text-xs font-bold text-amber-900">Birthday: {subjectName}</span>
                        ) : null}
                        <span className="mt-1 block text-sm leading-5 text-zinc-600">{notification.message}</span>
                        <time className="mt-1.5 block text-xs text-zinc-500" dateTime={notification.createdAt}>
                          {formatNotificationTime(notification.createdAt)}
                        </time>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {error && notifications.length ? (
            <div className="border-t border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-900">
              Refresh failed. <button type="button" className="font-bold underline" onClick={() => void load()}>Retry</button>
            </div>
          ) : null}
          {hasMore ? (
            <button
              type="button"
              onClick={() => void load(true)}
              disabled={loadingMore}
              className="border-t border-zinc-100 px-4 py-3 text-sm font-semibold text-blue-700 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-600 disabled:opacity-60"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
