"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { Building2, Users2, ArrowRight, Webhook } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePersona } from "@/hooks/usePersona";
import { getStoredPersona } from "@/lib/persona";

export default function ChoosePersonaPage() {
  const router = useRouter();
  const { persona, setPersona } = usePersona();
  const stored = getStoredPersona();
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    const rotateIcon = () => {
      setRotation((prev) => prev + 360);
      const randomDelay = Math.floor(Math.random() * 7000) + 3000;
      timeoutId = setTimeout(rotateIcon, randomDelay);
    };

    timeoutId = setTimeout(rotateIcon, 2000);
    return () => clearTimeout(timeoutId);
  }, []);

  const selectPersona = (next: "sales" | "delegates") => {
    setPersona(next);
    router.push("/dashboard");
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#FFFFFF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-48 right-[-10%] h-[520px] w-[520px] rounded-full bg-[#5984C8]/5 blur-3xl" />
        <div className="absolute -bottom-48 left-[-10%] h-[520px] w-[520px] rounded-full bg-[#00d2ff]/5 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-10 flex flex-col items-center gap-4 text-center"
        >
          <div className="flex items-center gap-3">
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
          </div>

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

        <div className="grid w-full grid-cols-1 gap-6 md:grid-cols-2">
          <Card className="group relative overflow-hidden rounded-lg border border-zinc-200/80 bg-white/85 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl">

            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-left text-sidebar-primary">
                <Building2 className="h-6 w-6" />
              </div>
              {(stored === "sales" || !stored) && (
                <span className="rounded-full border border-sidebar-200 bg-sidebar/90 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Current
                </span>
              )}
            </div>

            <h2 className="mt-5 text-lg font-semibold text-zinc-900">Sales Workspace</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Core sales operations with campaign building, lead review, and outreach execution.
            </p>

         

            <Button
              className="mt-6 w-full rounded-sm bg-sidebar text-white hover:bg-sidebar/90"
              onClick={() => selectPersona("sales")}
            >
              Continue as Sales
              <ArrowRight className="ml-0 h-4 w-4" />
            </Button>
          </Card>

          <Card className="group relative overflow-hidden rounded-md border border-zinc-200/80 bg-white/85 p-6 shadow-sm backdrop-blur transition-all hover:-translate-y-1 hover:border-zinc-300 hover:shadow-xl">

            <div className="flex items-start justify-between">
              <div className="flex h-11 w-11 items-center justify-lefttext-slate-700">
                <Users2 className="h-6 w-6" />
              </div>
              {stored === "delegates" && (
                <span className="rounded-full border border-sidebar-200 bg-sidebar/90 px-2.5 py-2 text-[10px] font-semibold uppercase tracking-wider text-white">
                  Current
                </span>
              )}
            </div>

            <h2 className="mt-5 text-lg font-semibold text-zinc-900">Delegate Workspace</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Delegate-focused access that maps to the same workflows through delegate APIs.
            </p>

        
        

            <Button
              variant="outline"
              className="mt-6 w-full rounded-sm border-zinc-200 text-zinc-700 hover:bg-zinc-50"
              onClick={() => selectPersona("delegates")}
            >
              Continue as Delegates
              <ArrowRight className="ml-0 h-4 w-4" />
            </Button>
          </Card>
        </div>

        {stored && (
          <div className="pt-10 text-xs  text-zinc-400">
            Current selection: <span className="font-semibold text-zinc-600">{persona}</span>
          </div>
        )}
      </div>
    </div>
  );
}
