"use client";

import { motion } from "framer-motion";
import { ArrowRight, BarChart3, Factory, Handshake, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { usePersona } from "@/hooks/usePersona";
import { availablePersonasForUser, clearAuthSession } from "@/lib/auth";
import { clearPersona, type Persona } from "@/lib/persona";

const workspaces = [
  { id: "sales" as const, title: "Sales", icon: BarChart3, accent: "bg-blue-600" },
  { id: "delegates" as const, title: "Delegate", icon: Handshake, accent: "bg-sky-600" },
  { id: "production" as const, title: "Production", icon: Factory, accent: "bg-indigo-600" },
  { id: "delegate-sales" as const, title: "Delegate Sales", icon: BarChart3, accent: "bg-violet-600" },
];

export default function SelectWorkspacePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { setPersona } = usePersona();
  const available = workspaces.filter((workspace) =>
    availablePersonasForUser(user).includes(workspace.id),
  );

  const choose = (persona: Persona) => {
    setPersona(persona);
    router.replace("/campaigns");
  };

  const signOut = () => {
    clearAuthSession();
    clearPersona();
    router.replace("/sign-in");
  };

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8fc] text-slate-950">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_15%,rgba(37,99,235,0.12),transparent_30%),radial-gradient(circle_at_82%_82%,rgba(124,58,237,0.1),transparent_32%)]" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[42%] bg-blue-600/[0.045] [clip-path:polygon(22%_0,100%_0,100%_100%,0_100%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-10">
        <div>
          <p className="text-lg font-semibold tracking-tight text-blue-950">supernizo</p>
          <p className="text-xs uppercase tracking-[0.2em] text-blue-600">Lite</p>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-300 bg-white px-5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </header>

      <main className="relative z-10 mx-auto flex min-h-[calc(100dvh-5.75rem)] w-full max-w-5xl flex-col justify-center px-6 pb-16 sm:px-10">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mb-9">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-blue-600">Choose persona</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.045em] text-blue-950 sm:text-6xl">Select workspace</h1>
          <p className="mt-4 text-base text-slate-600">Continue as your primary role or Delegate Sales.</p>
        </motion.div>

        <section className="grid gap-5 sm:grid-cols-2">
          {available.map((workspace, index) => {
            const Icon = workspace.icon;
            return (
              <motion.button
                key={workspace.id}
                type="button"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.07 * index }}
                onClick={() => choose(workspace.id)}
                className="group relative min-h-60 overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white p-7 text-left shadow-[0_24px_70px_-48px_rgba(15,23,42,0.35)] transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-[0_30px_76px_-46px_rgba(37,99,235,0.42)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-4"
              >
                <span className={`absolute inset-x-0 top-0 h-1 ${workspace.accent}`} />
                <span className={`flex h-13 w-13 items-center justify-center rounded-2xl text-white shadow-md ${workspace.accent}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="mt-12 flex items-end justify-between gap-4">
                  <span>
                    <span className="block text-2xl font-semibold text-slate-950">{workspace.title}</span>
                    <span className="mt-2 block text-sm font-medium text-blue-700">Enter workspace</span>
                  </span>
                  <span className="grid h-11 w-11 place-items-center rounded-full bg-blue-50 text-blue-700 transition group-hover:translate-x-1 group-hover:bg-blue-600 group-hover:text-white">
                    <ArrowRight className="h-4 w-4" />
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
