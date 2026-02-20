"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/Sidebar";
import { hasPersona, onPersonaChange } from "@/lib/persona";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isChooser = pathname === "/" || pathname === "/choose-persona";

  const [ready, setReady] = useState(false);
  const [selected, setSelected] = useState<boolean | null>(null);

  useEffect(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const update = () => setSelected(hasPersona());
    update();

    const unsubscribe = onPersonaChange(() => update());

    const onStorage = (event: StorageEvent) => {
      if (event.key === "persona") update();
    };

    window.addEventListener("storage", onStorage);

    return () => {
      unsubscribe();
      window.removeEventListener("storage", onStorage);
    };
  }, [ready]);

  useEffect(() => {
    if (!ready || selected === null) return;
    if (isChooser) return;
    if (!selected) router.replace("/");
  }, [ready, selected, isChooser, router]);

  if (!ready || selected === null) return null;

  if (isChooser) {
    return <main className="min-h-screen ">{children}</main>;
  }

  if (!selected) return null;

  return (
    <>
      <Sidebar />
      <main className="ml-72 min-h-screen p-6">{children}</main>
    </>
  );
}
