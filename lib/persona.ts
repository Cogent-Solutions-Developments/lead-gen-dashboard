export type Persona = "sales" | "delegate-sales" | "delegates" | "production" | "ceo";

const STORAGE_KEY = "persona";

export function getStoredPersona(): Persona | null {
  if (typeof window === "undefined") return null;
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (value === "sales" || value === "delegate-sales" || value === "delegates" || value === "production" || value === "ceo") return value;
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

export function clearPersona() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent("persona-change"));
}

export function onPersonaChange(cb: (persona: Persona) => void) {
  if (typeof window === "undefined") return () => {};

  const handler = (event: Event) => {
    const detail = (event as CustomEvent).detail as Persona | undefined;
    if (detail === "sales" || detail === "delegate-sales" || detail === "delegates" || detail === "production" || detail === "ceo") {
      cb(detail);
    } else {
      cb(getPersona());
    }
  };

  window.addEventListener("persona-change", handler);
  return () => window.removeEventListener("persona-change", handler);
}
