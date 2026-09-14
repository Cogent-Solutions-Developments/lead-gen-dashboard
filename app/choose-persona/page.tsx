"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Factory,
  Handshake,
  Home,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import { SupernizoWordmark } from "@/components/brand/SupernizoWordmark";
import { Button } from "@/components/ui/button";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { clearPersona, getStoredPersona } from "@/lib/persona";
import { clearAuthSession } from "@/lib/auth";
import { toast } from "sonner";

type PersonaValue = "sales" | "delegate-sales" | "delegates" | "production";

const workspaceCards = [
  {
    id: "sales" as const,
    title: "Sales",
    icon: BarChart3,
    accentBar: "bg-blue-600",
    iconClassName: "bg-blue-600 text-white",
    activeRing: "border-blue-300 bg-blue-50/70 shadow-[0_20px_55px_-38px_rgba(37,99,235,0.75)]",
  },
  {
    id: "delegate-sales" as const,
    title: "Delegate Sales",
    icon: BarChart3,
    accentBar: "bg-violet-600",
    iconClassName: "bg-violet-600 text-white",
    activeRing: "border-violet-300 bg-violet-50/70 shadow-[0_20px_55px_-38px_rgba(124,58,237,0.75)]",
  },
  {
    id: "delegates" as const,
    title: "Delegate",
    icon: Handshake,
    accentBar: "bg-sky-600",
    iconClassName: "bg-sky-600 text-white",
    activeRing: "border-cyan-300 bg-cyan-50/70 shadow-[0_20px_55px_-38px_rgba(8,145,178,0.75)]",
  },
  {
    id: "production" as const,
    title: "Production",
    icon: Factory,
    accentBar: "bg-indigo-600",
    iconClassName: "bg-indigo-600 text-white",
    activeRing: "border-indigo-300 bg-indigo-50/70 shadow-[0_20px_55px_-38px_rgba(79,70,229,0.75)]",
  },
];

function AdminRoleIllustration() {
  return (
    <div className="relative mt-7 flex min-h-[14rem] flex-1 items-center justify-center overflow-hidden rounded-2xl border border-blue-100/80 bg-gradient-to-br from-blue-50/90 via-white to-indigo-50/80 px-5 py-4">
      <div className="absolute -left-12 -top-16 h-40 w-40 rounded-full bg-blue-200/25 blur-3xl" />
      <div className="absolute -bottom-20 -right-10 h-44 w-44 rounded-full bg-indigo-200/30 blur-3xl" />
      <svg
        aria-hidden="true"
        viewBox="0 0 360 220"
        className="relative h-auto w-full max-w-[21rem]"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="adminShieldFill" x1="180" y1="38" x2="180" y2="166" gradientUnits="userSpaceOnUse">
            <stop stopColor="#3B82F6" />
            <stop offset="1" stopColor="#1D4ED8" />
          </linearGradient>
          <linearGradient id="adminNodeFill" x1="0" y1="0" x2="1" y2="1">
            <stop stopColor="#FFFFFF" />
            <stop offset="1" stopColor="#EFF6FF" />
          </linearGradient>
          <filter id="adminIllustrationShadow" x="-40%" y="-40%" width="180%" height="180%" colorInterpolationFilters="sRGB">
            <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#1D4ED8" floodOpacity="0.16" />
          </filter>
        </defs>

        <path d="M52 52H308M34 110H326M64 176H296" stroke="#BFDBFE" strokeOpacity="0.55" strokeDasharray="4 8" />
        <path d="M94 72L143 92M266 72L217 92M104 161L148 140M256 161L212 140" stroke="#93C5FD" strokeWidth="1.5" strokeDasharray="4 5" />

        <g filter="url(#adminIllustrationShadow)">
          <circle cx="86" cy="64" r="25" fill="url(#adminNodeFill)" stroke="#BFDBFE" strokeWidth="2" />
          <circle cx="274" cy="64" r="25" fill="url(#adminNodeFill)" stroke="#BFDBFE" strokeWidth="2" />
          <circle cx="76" cy="166" r="25" fill="url(#adminNodeFill)" stroke="#BFDBFE" strokeWidth="2" />
          <circle cx="284" cy="166" r="25" fill="url(#adminNodeFill)" stroke="#BFDBFE" strokeWidth="2" />

          <path d="M86 53.5C81.9 53.5 78.5 56.9 78.5 61C78.5 65.1 81.9 68.5 86 68.5C90.1 68.5 93.5 65.1 93.5 61C93.5 56.9 90.1 53.5 86 53.5ZM74.5 76.5C75.7 71.8 80.2 69 86 69C91.8 69 96.3 71.8 97.5 76.5" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M265 64.5H282M268.5 59.5H278.5V69.5H268.5V59.5Z" stroke="#4F46E5" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M76 153.5V178.5M67 162.5H85M68.5 174.5H83.5" stroke="#0EA5E9" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M284 152.5L287.4 157.4L293 158.8L289.4 163.3L289.7 169L284 167L278.3 169L278.6 163.3L275 158.8L280.6 157.4L284 152.5Z" stroke="#6366F1" strokeWidth="2" strokeLinejoin="round" />

          <path d="M180 31L224 48V92C224 122 205.5 148 180 160C154.5 148 136 122 136 92V48L180 31Z" fill="url(#adminShieldFill)" stroke="#1E40AF" strokeWidth="2" />
          <path d="M157 95L173 111L205 77" stroke="white" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M180 50V64" stroke="#DBEAFE" strokeWidth="3" strokeLinecap="round" />
        </g>

        <circle cx="180" cy="181" r="5" fill="#2563EB" />
        <circle cx="180" cy="181" r="12" stroke="#93C5FD" strokeOpacity="0.7" strokeDasharray="2 4" />
      </svg>
    </div>
  );
}

export default function ChoosePersonaPage() {
  const router = useRouter();
  const { persona, setPersona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const stored = getStoredPersona();

  const currentPersona: PersonaValue =
    stored === "delegate-sales" || stored === "delegates" || stored === "production" || stored === "sales" ? stored : "sales";
  const activePersona =
    persona === "delegate-sales" || persona === "delegates" || persona === "production" || persona === "sales" ? persona : currentPersona;
  const availableWorkspaceCards = isSuperAdmin ? workspaceCards : [];
  const selectPersona = (next: PersonaValue) => {
    setPersona(next);
    router.push("/campaigns");
  };

  const handleSignOut = async () => {
    try {
      clearAuthSession();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign out.";
      toast.error("Sign out failed", { description: message });
      return;
    }

    clearPersona();
    router.replace("/sign-in");
  };

  return (
    <div className="persona-chooser-page relative min-h-screen w-full overflow-hidden text-slate-900">
      <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[46%] bg-blue-600/5 [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]" />
      <div aria-hidden="true" className="persona-chooser-background">
        <span className="persona-chooser-wave persona-chooser-wave-one" />
        <span className="persona-chooser-wave persona-chooser-wave-two" />
        <span className="persona-chooser-wave persona-chooser-wave-three" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <SupernizoWordmark tone="dark" size="sm" />

        <div className="flex items-center gap-2">
          <Link href={isSuperAdmin ? "/admin" : "/campaigns"}>
            <Button
              variant="outline"
              className="h-10 w-10 rounded-xl border-slate-200 bg-white/90 p-0 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-700"
              aria-label={isSuperAdmin ? "Go to Admin Panel" : "Go to department workspace"}
            >
              <Home className="h-4 w-4" />
            </Button>
          </Link>
          <Button
            variant="outline"
            onClick={handleSignOut}
            className="h-10 rounded-xl border-slate-200 bg-white/90 px-3 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-5.25rem)] w-full max-w-7xl items-center gap-8 px-5 pb-8 sm:px-8 lg:grid-cols-[0.68fr_1.55fr] lg:gap-10">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col rounded-[2rem] border border-white/80 bg-white/75 p-7 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-9 lg:h-[31.5rem]"
        >
          <h1 className="max-w-sm text-4xl font-semibold leading-[1.04] tracking-tight text-blue-950 sm:text-5xl">
            Workspaces
          </h1>

          <div className="mt-9">
            {isSuperAdmin ? (
              <Link
                href="/admin"
                className="group block overflow-hidden rounded-2xl border border-blue-100 bg-blue-600 text-white shadow-[0_26px_64px_-44px_rgba(37,99,235,0.95)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_34px_76px_-46px_rgba(37,99,235,0.95)]"
              >
                <span className="flex items-center justify-between gap-4 p-3.5">
                  <span className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-white ring-1 ring-white/20">
                      <ShieldCheck className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-base font-semibold">Admin Panel</span>
                      <span className="mt-0.5 block text-xs font-medium text-blue-100">Users, roles, security</span>
                    </span>
                  </span>
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-white transition-transform group-hover:translate-x-1">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </span>
              </Link>
            ) : null}
          </div>
          <AdminRoleIllustration />
        </motion.section>

        <section className="rounded-[2rem] border border-white/80 bg-white/45 p-4 shadow-[0_30px_80px_-62px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-5 lg:h-[31.5rem]">
          <div className="mb-4 px-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">Departments</p>
              <p className="mt-1 text-sm text-slate-500">Choose the workspace you want to open.</p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {availableWorkspaceCards.map((workspace, index) => {
              const Icon = workspace.icon;
              const isActive = activePersona === workspace.id;

              return (
                <motion.button
                  key={workspace.id}
                  type="button"
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.06 * index }}
                  onClick={() => selectPersona(workspace.id)}
                  className={`group relative flex min-h-[12.5rem] flex-col justify-between overflow-hidden rounded-2xl border bg-white/90 p-5 text-left shadow-[0_18px_50px_-42px_rgba(15,23,42,0.55)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-[0_26px_60px_-42px_rgba(37,99,235,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${
                    isActive ? workspace.activeRing : "border-slate-200/80"
                  }`}
                >
                  <span className="flex items-start justify-between gap-4">
                    <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${workspace.iconClassName} shadow-[0_14px_28px_-22px_rgba(37,99,235,0.75)]`}>
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full border ${isActive ? "border-blue-200 bg-blue-50" : "border-slate-200 bg-white"}`}>
                      {isActive ? <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
                    </span>
                  </span>

                  <span className="mt-7 flex items-end justify-between gap-4">
                    <span className="block text-xl font-semibold tracking-tight text-slate-900">{workspace.title}</span>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700 transition-transform group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </motion.button>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}
