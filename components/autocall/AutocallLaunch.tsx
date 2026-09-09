"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { authorizeAutocall, fetchCurrentAuthUser } from "@/lib/auth";
import { autocallBaseUrl, canAccessAutocall } from "@/lib/autocall-access";
import { appendAutocallTarget, autocallTargetFromSearchParams } from "@/lib/autocall-deep-link";

type AutocallLaunchProps = Readonly<{
  allowLocalHttp?: boolean;
  baseUrl: string;
  portal: string;
}>;

export function AutocallLaunch({ baseUrl, portal, allowLocalHttp = false }: AutocallLaunchProps) {
  const started = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const launch = async () => {
      const user = await fetchCurrentAuthUser();
      if (!canAccessAutocall(user)) {
        throw new Error("Autocall access has not been assigned. Contact your administrator.");
      }
      const base = autocallBaseUrl(baseUrl, allowLocalHttp);
      const params = new URL(window.location.href).searchParams;
      const challenge = params.get("challenge");
      const state = params.get("state");
      const target = autocallTargetFromSearchParams(params);
      window.history.replaceState(null, "", window.location.pathname);
      if (!challenge && !state) {
        const start = new URL(`${base.href.replace(/\/$/, "")}/sso/start`);
        start.searchParams.set("portal", portal);
        window.location.replace(appendAutocallTarget(start, target).href);
        return;
      }
      if (
        !/^[A-Za-z0-9_-]{43}$/.test(challenge ?? "") ||
        !/^[A-Za-z0-9_-]{43}$/.test(state ?? "")
      ) {
        throw new Error("This sign-in link has expired. Select Autocall again.");
      }
      const validChallenge = challenge as string;
      const validState = state as string;
      const result = await authorizeAutocall(validChallenge);
      const callback = new URL(`${base.href.replace(/\/$/, "")}/sso/callback`);
      if (result.callbackUrl !== callback.href || !/^[A-Za-z0-9_-]{43}$/.test(result.code)) {
        throw new Error("Autocall sign-in configuration does not match.");
      }
      callback.searchParams.set("code", result.code);
      callback.searchParams.set("state", validState);
      appendAutocallTarget(callback, target);
      window.location.replace(callback.href);
    };

    void launch().catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : "Unable to open Autocall. Try again.");
    });
  }, [allowLocalHttp, attempt, baseUrl, portal]);

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#071019] px-5 py-8">
      <Image
        alt=""
        className="object-cover opacity-25"
        fill
        priority
        sizes="100vw"
        src="/autocall-loading-background.webp"
      />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_5%,rgba(35,119,153,0.38),transparent_35%)]" />
      <section className="relative grid w-full max-w-sm place-items-center rounded-[1.75rem] border border-slate-200/35 bg-[#0d1c26]/75 px-8 py-10 text-center shadow-2xl shadow-black/60 backdrop-blur-xl">
        <div className="relative h-14 w-56">
          <Image
            alt="Supernizo Autocall"
            className="object-contain"
            fill
            priority
            sizes="224px"
            src="/autocall-loading-logo.png"
          />
        </div>
        {error ? (
          <div className="mt-6 grid gap-3">
            <h1 className="text-xl font-semibold text-white">Unable to open Autocall</h1>
            <p className="text-sm text-slate-300" role="status">
              {error}
            </p>
            <button
              className="mx-auto text-sm font-semibold text-sky-300 underline underline-offset-4 hover:text-sky-200"
              onClick={() => {
                started.current = false;
                setError("");
                setAttempt((value) => value + 1);
              }}
              type="button"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="relative mt-5 h-40 w-40">
              <Image
                alt="Loading"
                className="object-contain"
                fill
                priority
                sizes="160px"
                src="/autocall-loading-animation.svg"
                unoptimized
              />
            </div>
            <p className="mt-1 text-sm font-medium text-slate-300">Preparing your workspace…</p>
          </>
        )}
      </section>
    </main>
  );
}
