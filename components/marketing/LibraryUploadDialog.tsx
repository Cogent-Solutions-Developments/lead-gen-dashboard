"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { X } from "lucide-react";
import { toast } from "sonner";
import { marketing, type TaskUploadResult } from "./api";
import styles from "./marketing.module.css";
const message = (error: unknown) => error instanceof Error ? error.message : "Upload failed. Please retry.";
const sizeLabel = (size: number) => size < 1024 * 1024 ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;

export function LibraryUploadDialog({
  category,
  eventId,
  eventName,
  initialTitle,
  task,
  onClose,
  onUploaded,
}: {
  category: "agenda" | "materials";
  eventId: string;
  eventName: string;
  initialTitle: string;
  task?: { requestId: string; taskId: string; version: number; note: string };
  onClose: () => void;
  onUploaded: (result?: TaskUploadResult) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const uploadId = useRef(crypto.randomUUID());
  const [file, setFile] = useState<File | null>(null);
  const [acceptWarning, setAcceptWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const recommended = category === "agenda" ? 3 : 5;
  const tooLarge = !!file && file.size > 10 * 1024 * 1024;
  const invalidPdf =
    !!file &&
    category === "agenda" &&
    !file.name.toLowerCase().endsWith(".pdf");
  const warning = !!file && file.size > recommended * 1024 * 1024;
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || busy || tooLarge || invalidPdf || (warning && !acceptWarning))
      return;
    const form = new FormData(event.currentTarget);
    if (!String(form.get("title") || "").trim()) {
      setError("Enter a material title.");
      return;
    }
    form.set("eventId", eventId);
    form.set("category", category);
    form.set("file", file);
    form.set("acceptWarning", String(acceptWarning));
    setBusy(true);
    setError("");
    try {
      if (task) {
        form.set("version", String(task.version));
        form.set("uploadId", uploadId.current);
        form.set("note", task.note);
        const result = await marketing<TaskUploadResult>(`/requests/${task.requestId}/tasks/${task.taskId}/upload`, "POST", form);
        toast.success(category === "agenda" ? "Agenda uploaded · task completed" : "Material uploaded · task completed");
        onUploaded(result);
      } else {
        await marketing("/library", "POST", form);
        toast.success(category === "agenda" ? "Agenda uploaded" : "Draft uploaded for manager release");
        onUploaded();
      }
    } catch (err) {
      setError(message(err));
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className={styles.libraryDialog}
      aria-labelledby="library-upload-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className={styles.taskHeading}>
        <h2 id="library-upload-title">
          Upload {category === "agenda" ? "agenda" : "marketing material"}{task ? " & complete task" : ""}
        </h2>
        <button
          type="button"
          aria-label="Close upload"
          disabled={busy}
          onClick={onClose}
        >
          <X size={18} />
        </button>
      </div>
      <p>{eventName}</p>
      <form onSubmit={submit}>
        <label>
          Title
          <input
            name="title"
            required
            maxLength={200}
            defaultValue={initialTitle}
            readOnly={category === "agenda" || (!!initialTitle && !task)}
            onChange={() => { uploadId.current = crypto.randomUUID(); }}
            placeholder="e.g. Sponsor brochure"
          />
        </label>
        {!initialTitle && (
          <p>
            Use an existing title to add a version to that material’s history.
          </p>
        )}
        <label className={styles.upload}>
          Select file
          <input
            type="file"
            required
            accept={category === "agenda" ? ".pdf,application/pdf" : undefined}
            onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              uploadId.current = crypto.randomUUID();
              setAcceptWarning(false);
              setError("");
            }}
            disabled={busy}
          />
        </label>
        <p>
          {category === "agenda"
            ? "PDF only."
            : "Documents and creative files."}{" "}
          Recommended: {recommended}MB or below. Maximum: 10MB.
        </p>
        {file && (
          <p>
            {file.name} · {sizeLabel(file.size)}
          </p>
        )}
        {tooLarge && (
          <p role="alert" className={styles.error}>
            Maximum file size is 10MB. Choose a smaller file.
          </p>
        )}
        {invalidPdf && (
          <p role="alert" className={styles.error}>
            Agenda files must be PDFs.
          </p>
        )}
        {warning && !tooLarge && (
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={acceptWarning}
              onChange={(event) => setAcceptWarning(event.target.checked)}
              disabled={busy}
            />
            This file exceeds the recommended {recommended}MB. Upload anyway.
          </label>
        )}
        {task && <p className={styles.notice}>This upload is saved to this event’s {category === "agenda" ? "Agenda" : "Marketing Materials"} library and completes this task automatically.</p>}
        <p className={styles.notice}>
          {category === "agenda" ? "This agenda will be available to everyone with access to this event as soon as the upload finishes. Previous versions remain in the upload history." : "Uploads are saved as drafts. A Marketing Manager releases each version for other departments."}
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.actions}>
          <button type="button" disabled={busy} onClick={onClose}>
            Cancel
          </button>
          <button
            className={styles.primary}
            disabled={
              busy ||
              !file ||
              tooLarge ||
              invalidPdf ||
              (warning && !acceptWarning)
            }
          >
            {busy ? "Uploading…" : task ? "Upload & complete" : category === "agenda" ? "Upload agenda" : "Upload draft"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
