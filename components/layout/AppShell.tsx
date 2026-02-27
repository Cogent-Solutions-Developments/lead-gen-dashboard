"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { hasPersona, onPersonaChange } from "@/lib/persona";
import { getSupabaseClient } from "@/lib/supabaseClient";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isChooser = pathname === "/" || pathname === "/choose-persona";
  const isAuthRoute = pathname === "/sign-in";
  const [selected, setSelected] = useState<boolean>(() => hasPersona());
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthed, setIsAuthed] = useState(false);

  useEffect(() => {
    const unsubscribe = onPersonaChange(() => setSelected(hasPersona()));

    const onStorage = (event: StorageEvent) => {
      if (event.key === "persona") setSelected(hasPersona());
    };

    window.addEventListener("storage", onStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setIsAuthed(Boolean(data.session));
      } catch {
        if (!active) return;
        setIsAuthed(false);
      } finally {
        if (active) setAuthChecked(true);
      }
    };

    boot();

    let unsubscribe = () => {};
    try {
      const supabase = getSupabaseClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        setIsAuthed(Boolean(session));
        setAuthChecked(true);
      });
      unsubscribe = () => subscription.unsubscribe();
    } catch {
      // Missing env vars keeps user unauthenticated.
    }

    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!isAuthed) {
      if (!isAuthRoute) router.replace("/sign-in");
      return;
    }

    if (isAuthRoute) {
      router.replace("/choose-persona");
      return;
    }

    if (!isChooser && !selected) {
      router.replace("/");
    }
  }, [authChecked, isAuthed, isAuthRoute, isChooser, selected, router]);

  if (!authChecked) return null;

  if (!isAuthed) {
    if (!isAuthRoute) return null;
    return <main className="min-h-screen bg-transparent">{children}</main>;
  }

  if (isAuthRoute || isChooser) {
    return <main className="min-h-screen bg-transparent">{children}</main>;
  }

  if (!selected) return null;

  return (
    <>
      <Sidebar />
      <main className="ml-72 min-h-screen bg-transparent p-6">{children}</main>
    </>
  );
}
