"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createLinkedInPage } from "@/lib/linkedinPagesApi";
import { linkedInPageError, type LinkedInPage } from "@/lib/linkedinPages";

export function AddLinkedInPageDialog({ onClose, onSaved }: {
  onClose: () => void;
  onSaved: (page: LinkedInPage) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    nameRef.current?.focus();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!name.trim()) { setError("Page name is required."); return; }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const page = await createLinkedInPage({ name: name.trim(), url: url.trim() });
      onSaved(page);
      onClose();
    } catch (error) {
      setError(linkedInPageError(error));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="add-linkedin-page-title"
      aria-describedby="add-linkedin-page-description"
      onCancel={(event) => { event.preventDefault(); if (!inFlight.current) onClose(); }}
      className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-6 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/35 backdrop:backdrop-blur-[2px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 id="add-linkedin-page-title" className="text-xl font-semibold">Add LinkedIn page</h2>
          <p id="add-linkedin-page-description" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Add a page to your LinkedIn lead workspace.</p>
        </div>
        <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} aria-label="Close add page">
          <X className="size-4" aria-hidden="true" />
        </Button>
      </div>
      <form onSubmit={handleSubmit} aria-busy={saving} className="mt-6 space-y-5">
        <div className="space-y-2">
          <label htmlFor="linkedin-page-name" className="text-sm font-medium">Page name</label>
          <Input ref={nameRef} id="linkedin-page-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={255} required disabled={saving} />
        </div>
        <div className="space-y-2">
          <label htmlFor="linkedin-page-url" className="text-sm font-medium">LinkedIn page URL</label>
          <Input id="linkedin-page-url" type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://www.linkedin.com/showcase/your-page/" maxLength={2048} required disabled={saving} aria-describedby="linkedin-page-url-hint" />
          <p id="linkedin-page-url-hint" className="text-sm text-zinc-500 dark:text-zinc-400">Use a LinkedIn company or showcase page URL.</p>
        </div>
        {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
        <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-700">
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
            {saving ? "Adding page…" : "Add Page"}
          </Button>
        </div>
      </form>
    </dialog>
  );
}
