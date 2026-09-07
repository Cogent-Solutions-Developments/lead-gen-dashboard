"use client";

import { useEffect, useRef, useState } from "react";
import { authorizeAutocall, fetchCurrentAuthUser } from "@/lib/auth";
import { autocallBaseUrl, canAccessAutocall } from "@/lib/autocall-access";

export function AutocallLaunch({ baseUrl, portal }: { baseUrl: string; portal: string }) {
  const started = useRef(false);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const launch = async () => {
      const user = await fetchCurrentAuthUser();
      if (!canAccessAutocall(user)) throw new Error("Autocall access has not been assigned. Contact your administrator.");
      const base = autocallBaseUrl(baseUrl);
      const params = new URL(window.location.href).searchParams;
      const challenge = params.get("challenge");
      const state = params.get("state");
      window.history.replaceState(null, "", window.location.pathname);
      if (!challenge && !state) {
        window.location.replace(`${base.href.replace(/\/$/, "")}/sso/start?portal=${portal}`);
        return;
      }
      if (!/^[A-Za-z0-9_-]{43}$/.test(challenge ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(state ?? "")) {
        throw new Error("This sign-in link has expired. Select Autocall again.");
      }
      const result = await authorizeAutocall(challenge!);
      const callback = new URL(`${base.href.replace(/\/$/, "")}/sso/callback`);
      if (result.callbackUrl !== callback.href || !/^[A-Za-z0-9_-]{43}$/.test(result.code)) {
        throw new Error("Autocall sign-in configuration does not match.");
      }
      callback.searchParams.set("code", result.code);
      callback.searchParams.set("state", state!);
      window.location.replace(callback.href);
    };
    void launch().catch((reason: unknown) => setError(reason instanceof Error ? reason.message : "Unable to open Autocall. Try again."));
  }, [baseUrl, portal, attempt]);
  return <section className="mx-auto grid min-h-[60vh] max-w-lg place-content-center gap-4 p-6 text-center">
    <h1 className="text-2xl font-semibold">{error ? "Unable to open Autocall" : "Opening Autocall…"}</h1>
    <p role="status" className="text-sm opacity-75">{error || "Checking your Supernizo access."}</p>
    {error ? <button type="button" onClick={() => { started.current = false; setError(""); setAttempt((value) => value + 1); }} className="underline">Try again</button> : null}
  </section>;
}
