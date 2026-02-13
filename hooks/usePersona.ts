"use client";

import { useCallback, useEffect, useState } from "react";
import { getPersona, onPersonaChange, setPersona as setStoredPersona, type Persona } from "@/lib/persona";

export function usePersona() {
  const [persona, setPersonaState] = useState<Persona>(() => getPersona());

  useEffect(() => {
    setPersonaState(getPersona());

    const unsubscribe = onPersonaChange((next) => {
      setPersonaState(next);
    });

    const onStorage = (event: StorageEvent) => {
      if (event.key === "persona") {
        setPersonaState(getPersona());
      }
    };

    if (typeof window !== "undefined") {
      window.addEventListener("storage", onStorage);
    }

    return () => {
      unsubscribe();
      if (typeof window !== "undefined") {
        window.removeEventListener("storage", onStorage);
      }
    };
  }, []);

  const setPersona = useCallback((next: Persona) => {
    setStoredPersona(next);
    setPersonaState(next);
  }, []);

  return { persona, setPersona };
}
