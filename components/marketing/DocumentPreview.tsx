"use client";
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, RefreshCw, X } from "lucide-react";
import { documentBlob, download, previewUrl, type Asset } from "./api";
import styles from "./marketing.module.css";

function previewKind(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (["png", "jpg", "jpeg", "webp", "gif"].includes(extension || ""))
    return "image";
  if (["txt", "csv", "json", "md"].includes(extension || "")) return "text";
  return "unsupported";
}

export function DocumentPreview({
  asset,
  onClose,
}: {
  asset: Asset;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [downloadError, setDownloadError] = useState("");
  const [downloading, setDownloading] = useState(false);
  const filename = asset.fileName || asset.title;
  const kind = previewKind(filename);
  useEffect(() => {
    const node = dialog.current;
    node?.showModal();
    return () => node?.close();
  }, []);
  async function save() {
    setDownloading(true);
    setDownloadError("");
    try {
      await download(asset.downloadUrl, filename);
    } catch {
      setDownloadError("Download failed. Please try again.");
    } finally {
      setDownloading(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className={`${styles.libraryDialog} ${styles.documentPreview}`}
      aria-label={`Preview ${filename}`}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <header className={styles.previewHeader}>
        <div>
          <h2>{filename}</h2>
          <small>Version {asset.version}</small>
        </div>
        <div className={styles.actions}>
          <button onClick={() => void save()} disabled={downloading}>
            <Download size={16} />
            {downloading ? "Downloading…" : "Download"}
          </button>
          <button aria-label="Close preview" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
      </header>
      {downloadError && (
        <p className={styles.error} role="alert">
          {downloadError}
        </p>
      )}
      {kind === "unsupported" ? (
        <div className={styles.empty}>
          <p>
            This file type cannot be previewed in the browser. Download it to
            open in its application.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.previewRetry}>
            <button onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw size={14} /> Reload preview
            </button>
          </div>
          {kind === "pdf" ? (
            <PdfPreview
              key={attempt}
              path={asset.downloadUrl}
              filename={filename}
            />
          ) : (
            <FilePreview
              key={attempt}
              path={asset.downloadUrl}
              filename={filename}
              kind={kind}
            />
          )}
        </>
      )}
    </dialog>
  );
}

function PdfPreview({ path, filename }: { path: string; filename: string }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void previewUrl(path, controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setUrl(value);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Unable to open this PDF. Reload the preview or download the file.");
      });
    return () => controller.abort();
  }, [path]);
  if (error) return <p role="alert" className={styles.error}>{error}</p>;
  if (!url) return <p role="status">Opening PDF…</p>;
  return (
    <>
      <div className={styles.previewRetry}>
        <a href={url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} /> Open in browser tab
        </a>
      </div>
      <iframe
        className={styles.nativePdf}
        src={url}
        title={filename}
        referrerPolicy="no-referrer"
      />
    </>
  );
}

function FilePreview({
  path,
  filename,
  kind,
}: {
  path: string;
  filename: string;
  kind: "image" | "text";
}) {
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    let url = "";
    void documentBlob(path, controller.signal)
      .then(async (blob) => {
        if (controller.signal.aborted) return;
        if (kind === "text") {
          const text = await blob.slice(0, 512 * 1024).text();
          if (!controller.signal.aborted)
            setContent(text || "(Empty document)");
        } else {
          const extension = filename.split(".").pop()?.toLowerCase();
          const type =
            extension === "jpg" || extension === "jpeg"
              ? "image/jpeg"
              : `image/${extension}`;
          url = URL.createObjectURL(new Blob([blob], { type }));
          setContent(url);
        }
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError(
            "Unable to load this file. Reload the preview or download it.",
          );
      });
    return () => {
      controller.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, kind, filename]);
  return (
    <div className={styles.filePreview}>
      {error ? (
        <p role="alert">{error}</p>
      ) : !content ? (
        <p role="status">Loading preview…</p>
      ) : kind === "image" ? (
        // Uploaded raster files use authenticated blob URLs, not public image optimization.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={content}
          alt={filename}
          onError={() =>
            setError(
              "This image cannot be displayed. Download the file to open it.",
            )
          }
        />
      ) : (
        <>
          <small>Text preview · first 512KB</small>
          <pre>{content}</pre>
        </>
      )}
    </div>
  );
}
