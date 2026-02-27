"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePersona } from "@/hooks/usePersona";
import { getStoredPersona } from "@/lib/persona";

export default function ChoosePersonaPage() {
  const router = useRouter();
  const { persona, setPersona } = usePersona();
  const stored = getStoredPersona();
  const salesCurrent = stored === "sales" || !stored;
  const delegatesCurrent = stored === "delegates";

  const selectPersona = (next: "sales" | "delegates") => {
    setPersona(next);
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-white">
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute -right-40 top-1/2 -translate-y-1/2 rotate-[26deg] opacity-[0.03]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-[75rem] w-[75rem] text-blue-900"
          >
            <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
            <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
            <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
          </svg>
        </div>
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-center gap-4 text-center"
        >
          {/* <div className="flex items-center gap-3">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1, rotate: rotation }}
              transition={{
                scale: { type: "spring", stiffness: 260, damping: 20 },
                rotate: { duration: 2, ease: "easeInOut" },
              }}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-sidebar text-white shadow-sm"
            >
              <Webhook className="h-6 w-6 stroke-2" />
            </motion.div>
            <span className="text-2xl font-semibold tracking-wide text-zinc-800">
              supernizo
            </span>
          </div> */}

          <div className="mb-2">
            {/* <p className="text-[14px] font-semibold text-zinc-700">
              Lead Generation And Outreach
            </p> */}
            <h1 className="mt-8 text-3xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
              Select Your Role
            </h1>
            <p className="mt-3 text-sm text-zinc-500">
              Choose the workspace that aligns with your role. You can switch later by returning here.
            </p>
          </div>
        </motion.div>

        <div className="w-full max-w-4xl">
          <div className="grid grid-cols-1 gap-10 md:grid-cols-2">
            <div className="group relative flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white/72 p-6 shadow-[0_14px_26px_-28px_rgba(9,40,105,0.32)] transition-all duration-200 hover:border-zinc-300/90 hover:shadow-[0_20px_30px_-28px_rgba(9,40,105,0.4)]">
              {salesCurrent && (
                <span className="absolute right-4 top-4 flex h-4 w-4 items-center justify-center rounded-full border border-blue-500/90 bg-white shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
                  <span className="h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#93c5fd_0%,#2563eb_55%,#1d4ed8_100%)]" />
                </span>
              )}
              <div className="space-y-1">
                <p className="text-lg font-semibold text-zinc-900">Sales Workspace</p>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-600">
                Core sales operations with campaign building, lead review, and outreach execution.
              </p>

              <Button
                className="btn-sidebar-noise mt-8 h-10 w-full rounded-md"
                onClick={() => selectPersona("sales")}
              >
                Continue as Sales
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>

            <div className="group relative flex h-full flex-col rounded-2xl border border-zinc-200/80 bg-white/72 p-6 shadow-[0_14px_26px_-28px_rgba(9,40,105,0.32)] transition-all duration-200 hover:border-zinc-300/90 hover:shadow-[0_20px_30px_-28px_rgba(9,40,105,0.4)]">
              {delegatesCurrent && (
                <span className="absolute right-4 top-4 flex h-4 w-4 items-center justify-center rounded-full border border-blue-500/90 bg-white shadow-[0_0_0_3px_rgba(59,130,246,0.14)]">
                  <span className="h-2 w-2 rounded-full bg-[radial-gradient(circle_at_35%_30%,#93c5fd_0%,#2563eb_55%,#1d4ed8_100%)]" />
                </span>
              )}
              <div className="space-y-1">
                <p className="text-lg font-semibold text-zinc-900">Delegate Workspace</p>
              </div>

              <p className="mt-4 text-sm leading-6 text-zinc-600">
                Delegate-focused access that maps to the same workflows through delegate APIs.
              </p>

              <Button
                variant="outline"
                className="mt-8 h-10 w-full rounded-md border-zinc-200 bg-white/80 text-zinc-700 hover:bg-zinc-50"
                onClick={() => selectPersona("delegates")}
              >
                Continue as Delegates
                <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {stored && (
          <div className="pt-10 text-xs  text-zinc-400">
            Current selection:{" "}
            <span className="font-semibold text-zinc-600">{persona === "delegates" ? "Delegates" : "Sales"}</span>
          </div>
        )}
      </div>
    </div>
  );
}
