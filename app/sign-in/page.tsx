"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Loader2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabaseClient";

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [rotation, setRotation] = useState(0);

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const supabase = getSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        if (data.session) router.replace("/choose-persona");
      } catch {
        // Missing env or auth client init failure: keep user on sign in page.
      }
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

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

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw error;

      toast.success("Signed in successfully.");
      router.replace("/choose-persona");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      toast.error("Sign in failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-dvh bg-transparent">
      <div className="grid h-full lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden border-r border-blue-900/30 lg:flex lg:flex-col lg:justify-between">
          <div className="absolute inset-0 bg-[linear-gradient(148deg,#2d71df_0%,#145acc_54%,#0f4697_100%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_95%_at_20%_0%,rgba(255,255,255,0.2)_0%,rgba(255,255,255,0)_58%)]" />
          <div className="pointer-events-none absolute -left-40 top-1/2 h-[520px] w-[520px] -translate-y-1/2 rounded-full bg-sky-300/15 blur-3xl" />
          <div className="pointer-events-none absolute -right-24 -top-14 h-[380px] w-[380px] rounded-full bg-blue-200/10 blur-3xl" />
          <div className="pointer-events-none absolute -right-60 top-[70%] -translate-y-1/2 rotate-[18deg] opacity-[0.12]">
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
              className="h-[58rem] w-[58rem] text-white/90"
            >
              <path d="M18 16.98h-5.99c-1.1 0-1.95.94-2.48 1.9A4 4 0 0 1 2 17c.01-.7.2-1.4.57-2" />
              <path d="m6 17 3.13-5.78c.53-.97.1-2.18-.5-3.1a4 4 0 1 1 6.89-4.06" />
              <path d="m12 6 3.13 5.73C15.66 12.7 16.9 13 18 13a4 4 0 0 1 0 8" />
            </svg>
          </div>

          <div className="relative z-10 p-10 text-white">
            <div className="mb-10 flex items-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: rotation }}
                transition={{
                  scale: { type: "spring", stiffness: 260, damping: 20 },
                  rotate: { duration: 2, ease: "easeInOut" },
                }}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-sidebar-primary-foreground shadow-[0_6px_14px_-10px_rgba(2,6,23,0.65)]"
              >
                <Webhook className="h-5 w-5 opacity-70" />
              </motion.div>
              <span className="text-2xl font-medium tracking-wide text-sidebar-foreground drop-shadow-sm">
                supernizo
              </span>
            </div>

            <h1 className="max-w-2xl text-[2.5rem] font-semibold leading-tight">
AI-powered outreach orchestration for the Cogent Solutions Sales and Delegate teams.            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-blue-50/90">
              supernizo helps your team run targeted campaigns, review leads faster, and manage outreach in one
              premium workflow.
            </p>
          </div>
        </section>

        <section className="relative flex items-center justify-center bg-[linear-gradient(145deg,rgba(232,242,255,0.62)_0%,rgba(255,255,255,0.96)_52%,rgba(235,245,255,0.55)_100%)] px-4 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-lg text-center">
            <p className="text-4xl font-medium leading-none tracking-tight text-zinc-800">Welcome To supernizo</p>
            <p className="mt-4 text-base font-normal leading-6 text-zinc-500">
              Sign in to continue your campaigns.
            </p>

            <form className="mt-15 space-y-5" onSubmit={submit}>
              <div className="mx-auto w-[76%]">
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email"
                  autoComplete="email"
                  className="h-11 w-full border-0 border-b border-zinc-300/80 bg-transparent px-0 text-sm text-zinc-800 placeholder:text-zinc-400/80 outline-none transition-colors duration-200 focus:border-blue-300/70"
                />
              </div>

              <div className="mx-auto w-[76%]">
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="h-11 w-full border-0 border-b border-zinc-300/80 bg-transparent px-0 text-sm text-zinc-800 placeholder:text-zinc-400/80 outline-none transition-colors duration-200 focus:border-blue-300/70"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="btn-sidebar-noise btn-sidebar-noise-strong mx-auto mt-10 h-11 w-52 rounded-md text-sm font-medium text-white disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>

              <p className="pt-0 text-[11px] text-zinc-500">
                *Confidential workspace. Contact admin for account access.
              </p>
            </form>
          </div>
          <div className="absolute bottom-2 left-1/2 w-full -translate-x-1/2 px-6 text-center text-[11px] text-zinc-500">
            Internal tool. Confidential use only. Unauthorized access is prohibited. (c) 2026 supernizo. All rights
            reserved.
          </div>
        </section>
      </div>
    </div>
  );
}
