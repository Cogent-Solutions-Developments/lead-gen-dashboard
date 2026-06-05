"use client";

import { useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getAuthLandingPath, getStoredAuthSession, loginWithPassword, personaForRole } from "@/lib/auth";
import { setPersona } from "@/lib/persona";

const LOGIN_REVEAL_DELAY_MS = 7600;
const HERO_GIF_SRC = "/videos/BlockchainEventPromoconverted_1-ezgif.com-optimize%20(1).gif";
const HERO_TITLE = "I am supernizo";
const HERO_TAGLINE = "An Enterprise Agentic AI for Intelligent Outreach";
const HERO_DESCRIPTION =
  "I am an enterprise agentic AI platform that intelligently identifies your dream customers and prospects, autonomously manages outreach, and streamlines customer engagement at scale.";
const HERO_MEDIA_TRANSITION = { duration: 1.45, ease: [0.16, 1, 0.3, 1] } as const;
const COMPACT_HERO_VIEWPORT_QUERY = "(min-width: 1024px) and (max-height: 860px)";
const APP_VERSION_LABEL = "v0.3.0";

export default function SignInPage() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [compactHeroViewport, setCompactHeroViewport] = useState(false);
  const desktopLayoutClassName = showLogin
    ? "lg:grid-cols-[minmax(0,1.12fr)_minmax(29rem,0.78fr)]"
    : "lg:grid-cols-[minmax(0,1fr)_minmax(0,0fr)]";
  const introHeroMediaScale = compactHeroViewport ? 0.88 : 0.82;
  const introHeroMediaY = compactHeroViewport ? -88 : 0;

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

  useEffect(() => {
    const mediaQuery = window.matchMedia(COMPACT_HERO_VIEWPORT_QUERY);
    const syncCompactViewport = () => setCompactHeroViewport(mediaQuery.matches);

    syncCompactViewport();
    mediaQuery.addEventListener("change", syncCompactViewport);
    return () => mediaQuery.removeEventListener("change", syncCompactViewport);
  }, []);

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
      <header className="absolute left-6 right-6 top-5 z-40 flex h-14 items-start justify-between border-b border-zinc-200/90 pb-4 sm:left-8 sm:right-8 sm:top-7">
        <div>
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-lg font-medium tracking-wide text-zinc-950">
              supernizo
            </span>
            <span
              className="text-[1rem] font-normal leading-none tracking-wide text-zinc-700"
              style={{ fontFamily: '"Bungee Hairline", sans-serif' }}
            >
              Lite
            </span>
          </div>
          <span className="mt-0.5 block text-[9px] font-light tracking-[0.22em] text-zinc-400">
            {APP_VERSION_LABEL}
          </span>
        </div>
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
                opacity: showLogin ? 0 : 1,
                scale: showLogin ? 0.96 : 1,
                y: showLogin ? -18 : 0,
              }}
              transition={{ duration: showLogin ? 0.42 : 0.8, ease: "easeOut" }}
              className="max-w-4xl"
            >
              <h1 className="text-[clamp(2.75rem,5vw,5.25rem)] font-light leading-[0.9] tracking-[-0.065em] text-zinc-950">
                {HERO_TITLE}
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-[clamp(1.1rem,1.65vw,1.55rem)] font-light leading-tight tracking-[-0.025em] text-zinc-700">
                {HERO_TAGLINE}
              </p>
              <div className="mx-auto mt-6 max-w-2xl text-sm font-light leading-7 text-zinc-500 sm:text-base">
                <p>{HERO_DESCRIPTION}</p>
              </div>
            </motion.div>
          </div>

          <motion.div
            initial={false}
            animate={{
              opacity: showLogin ? 1 : 0,
              y: showLogin ? 0 : 18,
            }}
            transition={{ duration: 0.55, delay: showLogin ? 0.48 : 0, ease: "easeOut" }}
            className="pointer-events-none absolute inset-x-0 top-28 z-30 hidden px-8 text-center sm:top-32 lg:block"
          >
            <h1 className="mx-auto max-w-2xl text-[clamp(2.5rem,4.8vw,5rem)] font-light leading-[0.9] tracking-tighter text-zinc-950">
              {HERO_TITLE}
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[clamp(1.05rem,1.55vw,1.45rem)] font-light leading-tight tracking-[-0.025em] text-zinc-700">
              {HERO_TAGLINE}
            </p>
          </motion.div>

          <motion.div
            aria-hidden="true"
            animate={{
              scale: showLogin ? 0.96 : introHeroMediaScale,
              y: showLogin ? 0 : introHeroMediaY,
              opacity: 1,
            }}
            transition={HERO_MEDIA_TRANSITION}
            className="pointer-events-none absolute inset-0 z-10 origin-bottom overflow-hidden"
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

          <motion.div
            aria-hidden="true"
            animate={{
              opacity: showLogin ? [0.34, 0.72, 0.42] : [0.28, 0.62, 0.36],
              scaleY: [0.88, 1.12, 0.94],
            }}
            transition={{
              opacity: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
              scaleY: { duration: 3.4, repeat: Infinity, ease: "easeInOut" },
            }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] h-[48vh] origin-bottom bg-[linear-gradient(90deg,transparent_0%,rgba(37,99,235,0.08)_10%,rgba(37,99,235,0.25)_34%,rgba(14,165,233,0.24)_52%,rgba(99,102,241,0.12)_78%,transparent_100%)] blur-3xl"
          />
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
          className="absolute inset-x-4 bottom-5 z-30 mx-auto max-w-md rounded-2xl border border-zinc-200 bg-white/94 p-6 text-zinc-950 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78)] backdrop-blur-xl sm:bottom-8 sm:p-8 lg:static lg:mx-0 lg:flex lg:h-full lg:max-w-none lg:flex-col lg:items-center lg:justify-center lg:rounded-none lg:border-0 lg:bg-transparent lg:px-12 lg:shadow-none"
        >
          <motion.div
            initial={false}
            animate={{
              opacity: showLogin ? 1 : 0,
              y: showLogin ? 0 : 16,
            }}
            transition={{ duration: 0.55, delay: showLogin ? 0.42 : 0, ease: "easeOut" }}
            className="hidden w-full max-w-md pb-7 text-center lg:block"
          >
            <p className="mx-auto text-sm font-light leading-6 text-zinc-500">
              {HERO_DESCRIPTION}
            </p>
          </motion.div>

          <div className="w-full max-w-md overflow-hidden rounded-2xl border border-zinc-200 bg-white/88 p-8 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.78),inset_0_1px_0_rgba(255,255,255,0.95)] transition-all">
            <div className="mb-8 border-b border-zinc-100 pb-6 text-left">
              <h2 className="text-4xl font-light leading-none tracking-tighter text-zinc-950">
                Sign in
              </h2>
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
                  placeholder="supernizo ID"
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
                  placeholder="Access key"
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

            </form>
          </div>
        </motion.section>
      </main>

    </div>
  );
}
