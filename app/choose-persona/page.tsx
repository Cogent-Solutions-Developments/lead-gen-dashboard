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
  Webhook,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { usePersona } from "@/hooks/usePersona";
import { useAuth } from "@/hooks/useAuth";
import { clearPersona, getStoredPersona } from "@/lib/persona";
import { clearAuthSession } from "@/lib/auth";
import { toast } from "sonner";

type PersonaValue = "sales" | "delegates" | "production";

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

export default function ChoosePersonaPage() {
  const router = useRouter();
  const { persona, setPersona } = usePersona();
  const { isSuperAdmin } = useAuth();
  const stored = getStoredPersona();
  const [rotation, setRotation] = useState(0);

  const currentPersona: PersonaValue =
    stored === "delegates" || stored === "production" || stored === "sales" ? stored : "sales";
  const activePersona =
    persona === "delegates" || persona === "production" || persona === "sales" ? persona : currentPersona;
  const selectPersona = (next: PersonaValue) => {
    setPersona(next);
    router.push("/dashboard");
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

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    const rotateIcon = () => {
      setRotation((prev) => prev + 360);
      const randomDelay = Math.floor(Math.random() * 7000) + 3000;
      timeoutId = setTimeout(rotateIcon, randomDelay);
    };

    timeoutId = setTimeout(rotateIcon, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-50 text-slate-900">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[46%] bg-blue-600/5 [clip-path:polygon(18%_0,100%_0,100%_100%,0_100%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1, rotate: rotation }}
            transition={{
              scale: { type: "spring", stiffness: 260, damping: 20 },
              rotate: { duration: 2, ease: "easeInOut" },
            }}
            className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-[0_16px_32px_-20px_rgba(37,99,235,0.9)]"
          >
            <Webhook className="h-5 w-5" />
          </motion.div>
          <div>
            <p className="text-base font-semibold text-blue-950">supernizo</p>
            <p className="text-xs font-medium text-slate-500">campaigns</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard">
            <Button
              variant="outline"
              className="h-10 w-10 rounded-xl border-slate-200 bg-white/90 p-0 text-slate-600 shadow-sm hover:bg-blue-50 hover:text-blue-700"
              aria-label="Go to dashboard"
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

      <main className="relative z-10 mx-auto grid min-h-[calc(100dvh-5.25rem)] w-full max-w-7xl items-center gap-8 px-5 pb-8 sm:px-8 lg:grid-cols-[0.72fr_1.55fr]">
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[2rem] border border-white/80 bg-white/75 p-6 shadow-[0_30px_80px_-58px_rgba(15,23,42,0.55)] backdrop-blur-xl sm:p-8"
        >
          <h1 className="max-w-sm text-5xl font-semibold leading-[1.02] text-blue-950 sm:text-6xl">
            Workspaces
          </h1>

          <div className="mt-8">
            {isSuperAdmin ? (
              <Link
                href="/admin"
                className="group block overflow-hidden rounded-3xl border border-blue-100 bg-blue-600 text-white shadow-[0_26px_64px_-44px_rgba(37,99,235,0.95)] transition-all hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_34px_76px_-46px_rgba(37,99,235,0.95)]"
              >
                <span className="flex items-center justify-between gap-4 p-4">
                  <span className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/20">
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
        </motion.section>

        <section className="grid gap-4 md:grid-cols-3">
          {workspaceCards.map((workspace, index) => {
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
                className={`group relative flex min-h-[15.5rem] flex-col justify-between overflow-hidden rounded-[1.75rem] border bg-white/90 p-5 text-left shadow-[0_24px_70px_-54px_rgba(15,23,42,0.65)] backdrop-blur-xl transition-all duration-200 hover:-translate-y-1 hover:border-blue-200 hover:shadow-[0_34px_82px_-56px_rgba(37,99,235,0.55)] ${
                  isActive ? workspace.activeRing : "border-white/80"
                }`}
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${workspace.accentBar}`} />
                <span className="absolute right-5 top-5 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white">
                  {isActive ? <span className="h-2.5 w-2.5 rounded-full bg-blue-600" /> : null}
                </span>

                <span>
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${workspace.iconClassName} shadow-[0_18px_36px_-26px_rgba(37,99,235,0.85)]`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="mt-7 block text-2xl font-semibold text-slate-900">{workspace.title}</span>
                </span>

                <span>
                  <span className="flex items-center justify-between border-t border-slate-100 pt-4 text-sm font-semibold text-blue-700">
                    Enter workspace
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 transition-transform group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </span>
                </span>
              </motion.button>
            );
          })}
        </section>
      </main>
    </div>
  );
}
