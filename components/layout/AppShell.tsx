"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ReleaseAnnouncement } from "@/components/layout/ReleaseAnnouncement";
import { Sidebar } from "@/components/layout/Sidebar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useActivityTracking } from "@/hooks/useActivityTracking";
import { clearPersona, getStoredPersona, hasPersona, onPersonaChange, setPersona } from "@/lib/persona";
import {
  canRoleUsePersona,
  businessWorkspaceForRole,
  clearAuthSession,
  fetchCurrentAuthUser,
  getAuthLandingPath,
  getStoredAuthSession,
  isCeoRole,
  isBusinessRole,
  isClientRole,
  isManagerRole,
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

function isManagerOnlyPath(pathname: string) {
  return (
    pathname === "/manager" ||
    pathname.startsWith("/manager/") ||
    pathname === "/team-leads" ||
    pathname.startsWith("/team-leads/")
  );
}

function isCeoAllowedAdminPath(pathname: string) {
  return (
    pathname === "/admin/users" ||
    pathname === "/admin/user-performance" ||
    pathname === "/admin/knowledge" ||
    pathname.startsWith("/admin/knowledge/") ||
    pathname === "/settings/system-monitor"
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isChooser = pathname === "/" || pathname === "/choose-persona";
  const isAuthRoute = pathname === "/sign-in";
  const isFlushContentRoute = pathname === "/nizo-ai" || pathname === "/dashboard";
  const [selected, setSelected] = useState<boolean>(() => hasPersona());
  const [session, setSession] = useState<AuthSession | null>(() => getStoredAuthSession());
  const [authChecked, setAuthChecked] = useState(false);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const role = session?.user.role ?? null;
  const isSuperAdmin = isSuperAdminRole(role);
  const isCeo = isCeoRole(role);
  const isClient = isClientRole(role);
  const isBusiness = isBusinessRole(role);
  const isManager = isManagerRole(role);
  const forcedPersona = personaForRole(role);
  const businessWorkspace = businessWorkspaceForRole(role);
  const businessLandingPath = businessWorkspace ? `/business/${businessWorkspace}` : null;
  const isCeoWorkspaceAdminRoute = isCeo && isCeoAllowedAdminPath(pathname);
  const isAdminAreaRoute = isAdminAreaPath(pathname) && !isCeoWorkspaceAdminRoute;
  const sidebarExpanded = sidebarHovered;

  useActivityTracking(Boolean(authChecked && session && !isAuthRoute), session?.user.id);

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

    if (isSuperAdmin && pathname === "/dashboard") {
      router.replace("/campaigns");
      return;
    }

    if (isClient) {
      if (pathname !== "/dashboard") {
        router.replace("/dashboard");
      }
      return;
    }

    if (isBusiness) {
      if (businessLandingPath && pathname !== businessLandingPath && pathname !== "/profile") {
        router.replace(businessLandingPath);
      }
      return;
    }

    if (isManager && pathname === "/admin/user-performance") {
      router.replace("/manager/user-performance");
      return;
    }

    if (isCeo && pathname === "/admin") {
      router.replace("/admin/users");
      return;
    }

    if (isCeo) {
      if (getStoredPersona() !== "ceo") {
        setPersona("ceo");
        return;
      }

      if (isChooser) {
        router.replace("/dashboard");
        return;
      }
    }

    if (isManagerOnlyPath(pathname) && !isManager) {
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
      if (isCeo && isCeoAllowedAdminPath(pathname)) {
        return;
      }
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
  }, [authChecked, businessLandingPath, forcedPersona, isAdminAreaRoute, isAuthRoute, isBusiness, isCeo, isChooser, isClient, isManager, isSuperAdmin, pathname, role, router, selected, session]);

  if (!authChecked) return null;

  if (!session) {
    if (!isAuthRoute) return null;
    return <main className="min-h-screen bg-transparent">{children}</main>;
  }

  if (isManagerOnlyPath(pathname) && !isManager) return null;

  if (isSuperAdmin && pathname === "/dashboard") return null;

  if (!isSuperAdmin && isSuperOnlyPath(pathname) && !(isCeo && isCeoAllowedAdminPath(pathname))) {
    return null;
  }

  if (forcedPersona) {
    if (getStoredPersona() !== forcedPersona) return null;
    if (isChooser || isSuperOnlyPath(pathname)) return null;
  }

  if (isClient) {
    if (pathname !== "/dashboard") return null;
    return (
      <>
        <main className="min-h-screen bg-transparent">{children}</main>
        <NotificationCenter sessionKey={session.user.id} />
      </>
    );
  }

  if (isBusiness) {
    if (!businessLandingPath || (pathname !== businessLandingPath && pathname !== "/profile")) return null;
    return (
      <>
        <Sidebar
          isExpanded={sidebarExpanded}
          onHoverChange={setSidebarHovered}
        />
        <main
          className={`min-h-screen bg-transparent p-6 transition-[margin] duration-300 ease-out ${
            sidebarExpanded ? "ml-72" : "ml-24"
          }`}
          style={{ "--app-sidebar-width": sidebarExpanded ? "18rem" : "6rem" } as CSSProperties}
        >
          {children}
        </main>
        <ReleaseAnnouncement session={session} />
        <NotificationCenter sessionKey={session.user.id} />
      </>
    );
  }

  if (isCeo && isChooser) return null;

  if (isAuthRoute || isChooser) {
    return (
      <>
        <main className="min-h-screen bg-transparent">{children}</main>
        {!isAuthRoute ? <ReleaseAnnouncement session={session} /> : null}
        {!isAuthRoute ? <NotificationCenter sessionKey={session.user.id} /> : null}
      </>
    );
  }

  if (isAdminAreaRoute) {
    return (
      <>
        {children}
        <ReleaseAnnouncement session={session} />
        <NotificationCenter sessionKey={session.user.id} />
      </>
    );
  }

  if (!selected) return null;

  return (
    <>
      <Sidebar
        isExpanded={sidebarExpanded}
        onHoverChange={setSidebarHovered}
      />
      <main
        className={`min-h-screen bg-transparent transition-[margin] duration-300 ease-out ${
          sidebarExpanded ? "ml-72" : "ml-24"
        } ${isFlushContentRoute ? "p-0" : "p-6"}`}
        style={{ "--app-sidebar-width": sidebarExpanded ? "18rem" : "6rem" } as CSSProperties}
      >
        {children}
      </main>
      <ReleaseAnnouncement session={session} />
      <NotificationCenter sessionKey={session.user.id} />
    </>
  );
}
