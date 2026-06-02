"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2, Webhook } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAuthLandingPath, getStoredAuthSession, loginWithPassword, personaForRole } from "@/lib/auth";
import { setPersona } from "@/lib/persona";

const LOGIN_REVEAL_DELAY_MS = 7600;
const HERO_GIF_SRC = "/videos/BlockchainEventPromoconverted_1-ezgif.com-optimize%20(1).gif";

export default function SignInPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const desktopLayoutClassName = showLogin
    ? "lg:grid-cols-[minmax(0,1.12fr)_minmax(29rem,0.78fr)]"
    : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0fr)]";

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      const session = getStoredAuthSession();
      if (!active || !session) return;
      const forcedPersona = personaForRole(session.user.role);
      if (forcedPersona) {
        setPersona(forcedPersona);
      }
      router.replace(getAuthLandingPath(session.user.role));
    };

    checkSession();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (prefersReducedMotion) {
      setShowLogin(true);
      return;
    }

    const timeoutId = window.setTimeout(() => setShowLogin(true), LOGIN_REVEAL_DELAY_MS);
    return () => window.clearTimeout(timeoutId);
  }, [prefersReducedMotion]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.error("Username and password are required.");
      return;
    }

    setLoading(true);
    try {
      const session = await loginWithPassword(username.trim(), password);
      const forcedPersona = personaForRole(session.user.role);
      if (forcedPersona) {
        setPersona(forcedPersona);
      }

      toast.success("Signed in successfully.");
      router.replace(getAuthLandingPath(session.user.role));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      toast.error("Sign in failed", { description: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-[#f7f7f7] font-sans text-zinc-950">
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,#ffffff_0%,#fafafa_42%,#f3f6fb_100%)]" />
      <header className="absolute left-6 right-6 top-5 z-40 flex h-12 items-center justify-between border-b border-zinc-200/90 pb-4 sm:left-8 sm:right-8 sm:top-7">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-500/20 bg-blue-600 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)]">
            <Webhook className="h-4.5 w-4.5" />
          </div>
          <p className="text-lg font-medium tracking-wide text-zinc-950">supernizo</p>
        </div>
        <p className="hidden text-xs font-medium uppercase tracking-wide text-zinc-400 sm:block">
          Authorized workspace
        </p>
      </header>

      <main
        className={`relative z-10 grid h-full grid-cols-1 transition-[grid-template-columns] duration-1000 ease-out ${desktopLayoutClassName}`}
      >
        <section
          className={`relative min-h-0 overflow-hidden bg-transparent transition-colors duration-700 ${
            showLogin ? "lg:border-r lg:border-zinc-200/90" : ""
          }`}
        >
          <div className="relative z-20 mx-auto flex h-full max-w-6xl flex-col items-center px-6 pb-[54vh] pt-28 text-center sm:px-10 sm:pt-32 lg:pb-[55vh]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{
                opacity: 1,
                scale: showLogin ? 0.96 : 1,
                y: showLogin ? -2 : 0,
              }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="max-w-4xl"
            >
              <h1 className="text-[clamp(2.75rem,5vw,5.25rem)] font-light leading-[0.9] tracking-[-0.065em] text-zinc-950">
                supernizo
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-[clamp(1.1rem,1.65vw,1.55rem)] font-light leading-tight tracking-[-0.025em] text-blue-700">
                Enterprise agentic AI for intelligent outreach.
              </p>
              <div className="mx-auto mt-6 max-w-2xl text-sm font-light leading-7 text-zinc-500 sm:text-base">
                <p>
                  I am an enterprise agentic AI platform that intelligently identifies your dream customers and
                  prospects, autonomously manages outreach, and streamlines customer engagement at scale.
                </p>
                <p className="mt-5 text-sm font-medium text-zinc-950">
                  Intelligent <span className="px-2 text-zinc-300">/</span> Autonomous{" "}
                  <span className="px-2 text-zinc-300">/</span> Limitless
                </p>
              </div>
            </motion.div>
          </div>

          <motion.div
            aria-hidden="true"
            animate={{
              left: showLogin ? "-20%" : "50%",
              x: showLogin ? "0%" : "-50%",
              width: showLogin ? "150%" : "min(152vw, 2050px)",
              opacity: showLogin ? [0.34, 0.72, 0.42] : [0.28, 0.62, 0.36],
              scaleY: [0.88, 1.12, 0.94],
            }}
            transition={{
              left: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
              x: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
              width: { duration: 1.15, ease: [0.22, 1, 0.36, 1] },
              opacity: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
              scaleY: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="pointer-events-none absolute bottom-0 z-[5] h-[48vh] origin-bottom bg-[linear-gradient(90deg,transparent_0%,rgba(37,99,235,0.08)_10%,rgba(37,99,235,0.25)_34%,rgba(14,165,233,0.24)_52%,rgba(99,102,241,0.12)_78%,transparent_100%)] blur-3xl"
          />

          <motion.div
            aria-hidden="true"
            animate={{
              left: showLogin ? "-26%" : "50%",
              x: showLogin ? "0%" : "-50%",
              width: showLogin ? "158%" : "min(152vw, 2050px)",
            }}
            transition={{ duration: 1.15, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-none absolute bottom-0 z-10 aspect-video max-h-[88vh] min-h-[560px] origin-bottom overflow-visible"
          >
            <Image
              src={HERO_GIF_SRC}
              alt=""
              fill
              priority
              unoptimized
              sizes={showLogin ? "(min-width: 1024px) 56vw, 100vw" : "100vw"}
              className="object-contain object-bottom"
              draggable={false}
            />
          </motion.div>
        </section>

        <motion.section
          initial={false}
          animate={{
            opacity: showLogin ? 1 : 0,
            x: showLogin ? 0 : 56,
            scale: showLogin ? 1 : 0.98,
            pointerEvents: showLogin ? "auto" : "none",
          }}
          transition={{ duration: 0.65, delay: showLogin ? 0.25 : 0, ease: "easeOut" }}
          className="absolute inset-x-4 bottom-5 z-30 mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white/94 p-6 text-zinc-950 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)] backdrop-blur-xl sm:bottom-8 sm:p-8 lg:static lg:mx-0 lg:flex lg:h-full lg:max-w-none lg:items-center lg:justify-center lg:rounded-none lg:border-0 lg:bg-transparent lg:px-12 lg:shadow-none"
        >
          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white/88 p-8 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all">
            <div className="mb-8 border-b border-zinc-100 pb-6 text-left">
              <p className="text-sm font-medium text-zinc-400">Secure workspace</p>
              <h2 className="mt-3 text-4xl font-light leading-none tracking-tighter text-zinc-950">
                Sign in
              </h2>
              <p className="mt-3 text-sm font-light leading-relaxed text-zinc-500">
                Continue to your assigned outreach workspace.
              </p>
            </div>

            <form className="space-y-7" onSubmit={submit}>
              <div>
                <label className="mb-3 block text-xs font-medium text-zinc-400">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="Username"
                  autoComplete="username"
                  className="h-12 w-full rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 placeholder:text-zinc-300 outline-none transition-colors duration-200 focus:border-blue-600"
                />
              </div>

              <div>
                <label className="mb-3 block text-xs font-medium text-zinc-400">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  autoComplete="current-password"
                  className="h-12 w-full rounded-none border-0 border-b border-zinc-300 bg-transparent px-0 text-lg font-light tracking-tight text-zinc-950 placeholder:text-zinc-300 outline-none transition-colors duration-200 focus:border-blue-600"
                />
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-blue-500/20 bg-blue-600 px-7 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_10px_22px_-14px_rgba(37,99,235,0.95)] transition-colors hover:bg-blue-700 disabled:border-blue-400/20 disabled:bg-blue-600/55 disabled:text-white/80 disabled:opacity-100"
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

              <p className="text-center text-[11px] font-light text-zinc-400">
                *Confidential workspace. Contact admin for account access.
              </p>
            </form>
          </div>
        </motion.section>
      </main>

    </div>
  );
}
