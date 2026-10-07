"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import {
  marketing,
  download,
  formatDate,
  label,
  type Asset,
  type Context,
} from "./api";
import styles from "./marketing.module.css";

export function Library({
  context,
  eventId,
  category,
}: {
  context: Context;
  eventId: string;
  category: "agenda" | "materials";
}) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [legacyNotes, setLegacyNotes] = useState<
    { id: string; title: string; text: string; note: string }[]
  >([]);
  const [file, setFile] = useState<File | null>(null);
  const [acceptWarning, setAcceptWarning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [history, setHistory] = useState(false);
  const recommended = category === "agenda" ? 3 : 5;
  const canUpload = context.canUpload;
  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!eventId) return;
      const result = await marketing<{
        items: Asset[];
        legacyNotes?: {
          id: string;
          title: string;
          text: string;
          note: string;
        }[];
      }>(
        `/library?eventId=${eventId}&category=${category}`,
        "GET",
        undefined,
        signal,
      );
      setAssets(result.items);
      setLegacyNotes(result.legacyNotes || []);
    },
    [eventId, category],
  );
  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal).catch((err) => {
      if (!controller.signal.aborted) setError(err.message);
    });
    return () => controller.abort();
  }, [load]);
  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!file || !eventId) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Maximum file size is 10MB.");
      return;
    }
    const form = e.currentTarget;
    const data = new FormData(form);
    data.set("eventId", eventId);
    data.set("category", category);
    data.set("file", file);
    data.set("acceptWarning", String(acceptWarning));
    setBusy(true);
    setError("");
    try {
      await marketing("/library", "POST", data);
      await load();
      setFile(null);
      setShowUpload(false);
      form.reset();
      toast.success("Draft uploaded for manager release");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
    }
  }
  async function release(asset: Asset) {
    setBusy(true);
    try {
      await marketing(`/library/${asset.id}/release`, "POST");
      await load();
      toast.success("Version released");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Release failed");
    } finally {
      setBusy(false);
    }
  }
  if (!eventId)
    return (
      <div className={styles.empty}>
        Select an event to view its{" "}
        {category === "agenda" ? "agenda" : "marketing materials"}.
      </div>
    );
  return (
    <section className={styles.panel}>
      <h2>
        {category === "agenda"
          ? "Agenda library"
          : "Marketing materials library"}
      </h2>
      <p>
        Approved resources for your event. Browse current files or review
        previous versions.
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {canUpload && (
        <button
          className={styles.primary}
          onClick={() => setShowUpload((v) => !v)}
        >
          {showUpload ? "Close upload" : "Upload new version"}
        </button>
      )}
      {canUpload && showUpload && (
        <form onSubmit={upload} className={styles.upload}>
          <h3>Upload a new version</h3>
          <label>
            {category === "agenda"
              ? "Title"
              : "Material title (use the same title for a new version)"}
            <input
              name="title"
              required
              maxLength={200}
              defaultValue={category === "agenda" ? "Agenda" : ""}
              readOnly={category === "agenda"}
            />
          </label>
          <label>
            File
            <input
              type="file"
              required
              accept={
                category === "agenda" ? "application/pdf,.pdf" : undefined
              }
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setAcceptWarning(false);
              }}
            />
          </label>
          <p>
            {category === "agenda"
              ? "PDF only. "
              : "Document and creative files. "}
            Recommended: {recommended}MB or below. Maximum: 10MB.
          </p>
          {file && file.size > recommended * 1024 * 1024 && (
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={acceptWarning}
                onChange={(e) => setAcceptWarning(e.target.checked)}
              />
              This file exceeds the recommended size. Upload anyway.
            </label>
          )}
          <button
            className={styles.primary}
            disabled={
              busy ||
              !file ||
              file.size > 10 * 1024 * 1024 ||
              (file.size > recommended * 1024 * 1024 && !acceptWarning)
            }
          >
            {busy ? "Uploading…" : "Upload draft"}
          </button>
        </form>
      )}
      <label className={styles.check}>
        <input
          type="checkbox"
          checked={history}
          onChange={(e) => setHistory(e.target.checked)}
        />
        Show superseded versions
      </label>
      {!assets.length && <p>No files have been uploaded for this event.</p>}
      {legacyNotes.map((item) => (
        <article className={styles.task} key={item.id}>
          <h3>{item.title} · Legacy guideline</h3>
          <p className={styles.prewrap}>{item.text}</p>
          {item.note && <p>{item.note}</p>}
        </article>
      ))}
      {assets
        .filter((a) => history || a.status !== "superseded")
        .map((asset) => (
          <article className={styles.task} key={asset.id}>
            <div className={styles.taskHeading}>
              <h3>
                {asset.title} · v{asset.version}
              </h3>
              <span className={styles.badge} data-status={asset.status}>
                {label(asset.status)}
              </span>
            </div>
            <p>
              Uploaded {formatDate(asset.createdAt)} by{" "}
              {asset.createdByName || "Marketing"}
              {asset.releasedAt
                ? ` · Released ${formatDate(asset.releasedAt)}`
                : ""}
            </p>
            <div className={styles.actions}>
              <button
                onClick={() =>
                  download(
                    asset.downloadUrl,
                    category === "agenda"
                      ? `agenda-v${asset.version}.pdf`
                      : asset.fileName || asset.title,
                  ).catch((err) => setError(err.message))
                }
              >
                Download
              </button>
              {context.manager && asset.status === "draft" && (
                <button disabled={busy} onClick={() => void release(asset)}>
                  Release this version
                </button>
              )}
            </div>
          </article>
        ))}
    </section>
  );
}
