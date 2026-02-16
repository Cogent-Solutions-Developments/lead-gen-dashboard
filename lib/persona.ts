export type Persona = "sales" | "delegates";

const STORAGE_KEY = "persona";

export function getStoredPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === "sales" || value === "delegates") return value;
  return null;
}

export function hasPersona(): boolean {
  return getStoredPersona() !== null;
}

export function getPersona(): Persona {
  return getStoredPersona() ?? "sales";
}

export function setPersona(next: Persona) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, next);
  window.dispatchEvent(new CustomEvent("persona-change", { detail: next }));
}

export function onPersonaChange(cb: (persona: Persona) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as Persona | undefined;
    if (detail === "sales" || detail === "delegates") {
      cb(detail);
    } else {
      cb(getPersona());
    }
  };

  window.addEventListener("persona-change", handler);
  return () => window.removeEventListener("persona-change", handler);
}
