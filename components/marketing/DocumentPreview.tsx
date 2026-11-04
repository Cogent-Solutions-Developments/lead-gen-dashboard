"use client";
import { useEffect, useRef, useState } from "react";
import { Download, ExternalLink, RefreshCw, X } from "lucide-react";
import { documentBlob, download, previewUrl, marketing, type Asset } from "./api";
import styles from "./marketing.module.css";

function previewKind(filename: string) {
  const extension = filename.split(".").pop()?.toLowerCase();
  if (extension === "pdf") return "pdf";
  if (["docx", "xlsx", "xlsm", "xltx", "pptx", "odt", "ods"].includes(extension || "")) return "office";
  if (["mp4", "webm", "ogg", "mp3", "wav", "m4a"].includes(extension || "")) return "media";
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "svg", "ico"].includes(extension || ""))
    return "image";
  if (["txt", "csv", "json", "md", "log", "xml", "html", "css"].includes(extension || "")) return "text";
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
          <h2>{asset.category === "materials" ? asset.title : filename}</h2>
          {asset.category === "materials" && <small>{filename}</small>}
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
            Download this file to open it in its application.
          </p>
        </div>
      ) : (
        <>
          <div className={styles.previewRetry}>
            <button onClick={() => setAttempt((value) => value + 1)}>
              <RefreshCw size={14} /> Reload preview
            </button>
          </div>
          {kind === "office" ? <OfficePreview key={attempt} asset={asset} /> : kind === "pdf" ? (
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
  kind: "image" | "text" | "media";
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
              : extension === "svg" ? "image/svg+xml" : kind === "media" ? ({mp4: "video/mp4", webm: "video/webm", ogg: "audio/ogg", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4"}[extension || ""] || "application/octet-stream") : `image/${extension}`;
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
      ) : kind === "media" ? (
        /\.(mp4|webm)$/i.test(filename) ? <video controls src={content} aria-label={filename} /> : <audio controls src={content} aria-label={filename} />
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

type OfficeData = { kind: string; limited: boolean; sections: { name: string; blocks: {text?: string; rows?: string[][]}[] }[] };
function OfficePreview({ asset }: { asset: Asset }) {
  const [data, setData] = useState<OfficeData | null>(null);
  const [error, setError] = useState("");
  const [section, setSection] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    marketing<OfficeData>(`/library/${encodeURIComponent(asset.id)}/content`, "GET", undefined, controller.signal)
      .then(result => { if (!controller.signal.aborted) setData(result); })
      .catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [asset.id]);
  if (error) return <p role="alert" className={styles.error}>{error}</p>;
  if (!data) return <p role="status">Opening document...</p>;
  return <div className={styles.officePreview}>
    <small>Content preview · Download for original formatting. Spreadsheets show up to 200 rows and 30 columns per sheet.</small>
    {data.sections.length > 1 && <div className={styles.officeTabs} aria-label="Document sections">
      {data.sections.map((item, index) => <button key={index} aria-pressed={section === index} onClick={() => setSection(index)}>{item.name}</button>)}
    </div>}
    {data.sections[section]?.blocks.map((block, index) => block.rows ? <table key={index} aria-label={data.sections[section].name}><tbody>
      {block.rows.map((row, rowIndex) => <tr key={rowIndex}>{row.map((cell, col) => <td key={col}>{cell}</td>)}</tr>)}
    </tbody></table> : <p key={index}>{block.text}</p>)}
    {!data.sections.length && <p>No preview content. Download the original file to open it.</p>}
  </div>;
}
