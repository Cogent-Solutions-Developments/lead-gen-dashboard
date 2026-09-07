"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { isInquiryDeleteConfirmed } from "@/lib/eventSubmissionDeletion";
import type { EventSubmission } from "@/lib/eventSubmissionsApi";

export function DeleteEventInquiryDialog({
  submission, contactLabel, submittedLabel, busy, error, onCancel, onConfirm,
}: {
  submission: EventSubmission;
  contactLabel: string;
  submittedLabel: string;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: (confirmation: string) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [confirmation, setConfirmation] = useState("");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    dialog.showModal();
    // Native modal focus containment; default focus is the safe Cancel action.
    cancelRef.current?.focus();
    return () => dialog.close();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="delete-inquiry-title"
      aria-describedby="delete-inquiry-description"
      aria-busy={busy}
      onCancel={(event) => { event.preventDefault(); if (!busy) onCancel(); }}
      className="admin-modal-panel fixed inset-0 m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-2xl border border-zinc-300 bg-white p-6 text-zinc-900 shadow-xl backdrop:bg-blue-950/35 backdrop:backdrop-blur-[2px]"
    >
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-600"><Trash2 className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-red-600">Delete event inquiry</p>
          <h2 id="delete-inquiry-title" className="mt-2 text-xl font-semibold">Remove this inquiry?</h2>
          <p id="delete-inquiry-description" className="mt-3 text-sm leading-6 text-zinc-600">This removes only this inquiry from all inquiry lists. The event and campaign leads are not deleted. The record is retained for recovery, and you can Undo after deletion.</p>
        </div>
      </div>
      <dl className="mt-5 space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm">
        <div><dt className="text-xs font-semibold text-zinc-500">Contact</dt><dd className="mt-1 break-words font-semibold">{contactLabel}</dd>{submission.contact.workEmail ? <dd className="mt-1 break-words text-xs text-zinc-500">{submission.contact.workEmail}</dd> : null}</div>
        <div><dt className="text-xs font-semibold text-zinc-500">Event</dt><dd className="mt-1 break-words">{submission.event.eventName}</dd></div>
        <div className="flex flex-wrap gap-x-6 gap-y-3"><div><dt className="text-xs font-semibold text-zinc-500">Form</dt><dd className="mt-1">{submission.submissionType === "registration" ? "Registration" : "Sponsor"}</dd></div><div><dt className="text-xs font-semibold text-zinc-500">Submitted</dt><dd className="mt-1">{submittedLabel}</dd></div></div>
      </dl>
      <div className="mt-5">
        <label htmlFor="delete-inquiry-confirmation" className="text-sm font-medium text-zinc-700">Type <strong>DELETE</strong> to confirm</label>
        <input id="delete-inquiry-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={busy} autoComplete="off" spellCheck={false} maxLength={20} aria-describedby="delete-inquiry-help" className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 disabled:opacity-60" />
        <p id="delete-inquiry-help" className="mt-2 text-xs text-zinc-500">Review the contact and event above before continuing.</p>
      </div>
      {error ? <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</p> : null}
      <div className="mt-6 flex justify-end gap-2">
        <Button ref={cancelRef} type="button" variant="outline" disabled={busy} onClick={onCancel} className="h-10 border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50">Cancel</Button>
        <Button type="button" disabled={busy || !isInquiryDeleteConfirmed(confirmation)} onClick={() => onConfirm(confirmation)} className="h-10 bg-red-600 text-white hover:bg-red-700 disabled:opacity-50">
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}{busy ? "Deleting..." : "Delete inquiry"}
        </Button>
      </div>
    </dialog>
  );
}
