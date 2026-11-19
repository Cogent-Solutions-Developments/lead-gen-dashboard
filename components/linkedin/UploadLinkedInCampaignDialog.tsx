"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { linkedInPageError, type LinkedInCampaign, type LinkedInPage } from "@/lib/linkedinPages";
import { uploadLinkedInCampaign } from "@/lib/linkedinPagesApi";

export function UploadLinkedInCampaignDialog({ page, onClose, onSaved }: {
  page: LinkedInPage;
  onClose: () => void;
  onSaved: (campaign: LinkedInCampaign) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previous = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    nameRef.current?.focus();
    return () => { dialog?.close(); previous?.focus(); };
  }, []);

  function selectFile(candidate: File | null) {
    setError(null);
    if (candidate && (!/\.(csv|xlsx)$/i.test(candidate.name) || candidate.size === 0 || candidate.size > 20 * 1024 * 1024)) {
      setFile(null);
      setError("Choose a non-empty CSV or XLSX file up to 20 MB.");
      return;
    }
    setFile(candidate);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    if (!name.trim() || !file) { setError("Enter a campaign name and choose a lead sheet."); return; }
    inFlight.current = true;
    setSaving(true);
    setError(null);
    try {
      const campaign = await uploadLinkedInCampaign(page.id, name.trim(), file);
      onSaved(campaign);
      onClose();
    } catch (error) {
      setError(linkedInPageError(error));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  }

  return <dialog ref={dialogRef} aria-labelledby="upload-linkedin-campaign-title" aria-describedby="upload-linkedin-campaign-description" onCancel={(event) => { event.preventDefault(); if (!inFlight.current) onClose(); }} className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%-2rem)] max-w-xl overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-6 text-zinc-900 shadow-2xl backdrop:bg-zinc-950/35 backdrop:backdrop-blur-[2px] dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100">
    <div className="flex items-start justify-between gap-4">
      <div><h2 id="upload-linkedin-campaign-title" className="text-xl font-semibold">Upload Campaign</h2><p id="upload-linkedin-campaign-description" className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">Upload leads for {page.name}.</p></div>
      <Button type="button" variant="ghost" size="icon" onClick={onClose} disabled={saving} aria-label="Close campaign upload"><X className="size-4" aria-hidden="true" /></Button>
    </div>
    <form onSubmit={submit} aria-busy={saving} className="mt-6 space-y-5">
      <div className="space-y-2"><label htmlFor="linkedin-campaign-name" className="text-sm font-medium">Campaign name</label><Input ref={nameRef} id="linkedin-campaign-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. November LinkedIn leads" maxLength={255} required disabled={saving} /></div>
      <div className="space-y-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50/60 p-5 dark:border-zinc-700 dark:bg-zinc-950/30">
        <label htmlFor="linkedin-campaign-file" className="flex items-center gap-2 text-sm font-medium"><UploadCloud className="size-5 text-blue-600" aria-hidden="true" />Lead sheet</label>
        <Input id="linkedin-campaign-file" type="file" accept=".csv,.xlsx" onChange={(event) => selectFile(event.target.files?.[0] ?? null)} required disabled={saving} aria-describedby="linkedin-campaign-file-hint" className="h-auto py-2" />
        <p id="linkedin-campaign-file-hint" className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">CSV or XLSX, up to 20 MB. Include a full name or first and last names, plus an email or phone number. Company and job title are optional.</p>
        {file && <p className="break-all text-sm text-zinc-600 dark:text-zinc-300">{file.name}</p>}
      </div>
      {error && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5 dark:border-zinc-700"><Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <UploadCloud className="size-4" aria-hidden="true" />}{saving ? "Uploading…" : "Upload Campaign"}</Button></div>
    </form>
  </dialog>;
}
