"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { clearPersona, getStoredPersona, hasPersona, onPersonaChange, setPersona } from "@/lib/persona";
import {
  canRoleUsePersona,
  clearAuthSession,
  fetchCurrentAuthUser,
  getAuthLandingPath,
  getStoredAuthSession,
  isSuperAdminRole,
  onAuthSessionChange,
  personaForRole,
  type AuthSession,
} from "@/lib/auth";

function isSuperOnlyPath(pathname: string) {
  return (
    pathname === "/settings" ||
    pathname.startsWith("/settings/") ||
    pathname === "/replies" ||
    pathname === "/campaigns/new" ||
    pathname.startsWith("/admin")
  );
}

function isAdminAreaPath(pathname: string) {
  return (
    pathname.startsWith("/admin") ||
    pathname === "/replies" ||
    pathname === "/settings" ||
    pathname.startsWith("/settings/")
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isChooser = pathname === "/" || pathname === "/choose-persona";
  const isAuthRoute = pathname === "/sign-in";
  const isAdminAreaRoute = isAdminAreaPath(pathname);
  const [selected, setSelected] = useState<boolean>(() => hasPersona());
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [authChecked, setAuthChecked] = useState(false);
  const role = session?.user.role ?? null;
  const isSuperAdmin = isSuperAdminRole(role);
  const isFlushContentRoute =
    pathname === "/nizo-ai" ||
    pathname === "/dashboard" ||
    pathname === "/campaigns" ||
    pathname === "/my-leads" ||
    (pathname === "/leads" && !isSuperAdmin);
  const forcedPersona = personaForRole(role);

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
    const sync = () => setSession(getStoredAuthSession());
    sync();
    return onAuthSessionChange(sync);
  }, []);

  useEffect(() => {
    let active = true;

    const boot = async () => {
      const current = getStoredAuthSession();
      if (!current) {
        if (active) {
          setSession(null);
          setAuthChecked(true);
        }
        return;
      }

      setSession(current);
      try {
        await fetchCurrentAuthUser();
      } catch {
        clearAuthSession();
        clearPersona();
        if (active) setSession(null);
      } finally {
        if (active) setAuthChecked(true);
      }
    };

    void boot();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!authChecked) return;

    if (!session) {
      if (!isAuthRoute) router.replace("/sign-in");
      return;
    }

    if (isAuthRoute) {
      router.replace(getAuthLandingPath(role));
      return;
    }

    if (forcedPersona) {
      if (getStoredPersona() !== forcedPersona) {
        setPersona(forcedPersona);
        return;
      }

      if (isChooser || isSuperOnlyPath(pathname)) {
        router.replace("/dashboard");
      }
      return;
    }

    if (!isSuperAdmin && isSuperOnlyPath(pathname)) {
      router.replace("/dashboard");
      return;
    }

    if (!isChooser && !isAdminAreaRoute && !selected) {
      router.replace("/");
      return;
    }

    const selectedPersona = getStoredPersona();
    if (selectedPersona && !canRoleUsePersona(role, selectedPersona)) {
      clearPersona();
      router.replace(getAuthLandingPath(role));
    }
  }, [authChecked, forcedPersona, isAdminAreaRoute, isAuthRoute, isChooser, isSuperAdmin, pathname, role, router, selected, session]);

  if (!authChecked) return null;

  if (!session) {
    if (!isAuthRoute) return null;
    return <main className="persona-theme min-h-screen bg-transparent">{children}</main>;
  }

  if (forcedPersona) {
    if (getStoredPersona() !== forcedPersona) return null;
    if (isChooser || isSuperOnlyPath(pathname)) return null;
  }

  if (isAuthRoute || isChooser) {
    return <main className="persona-theme min-h-screen bg-transparent">{children}</main>;
  }

  if (isAdminAreaRoute) {
    return <>{children}</>;
  }

  if (!selected) return null;

  return (
    <>
      <Sidebar />
      <main
        className={`persona-theme min-h-screen bg-transparent ${isFlushContentRoute ? "p-0" : "p-6 pb-28"}`}
      >
        {children}
      </main>
    </>
  );
}
