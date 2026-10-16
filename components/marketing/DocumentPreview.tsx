"use client";
import { useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
import { documentBlob, download, previewRequest, type Asset } from "./api";
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
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [width, setWidth] = useState(800);
  const [rendering, setRendering] = useState(true);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let disposed = false;
    let task: import("pdfjs-dist").PDFDocumentLoadingTask | undefined;
    async function open() {
      const renderer = await import("pdfjs-dist");
      if (disposed) return;
      const assets = `/marketing-pdf/${renderer.version}/`;
      renderer.GlobalWorkerOptions.workerSrc = `${assets}pdf.worker.min.mjs`;
      task = renderer.getDocument({
        ...previewRequest(path),
        rangeChunkSize: 256 * 1024,
        disableAutoFetch: true,
        disableStream: true,
        cMapUrl: `${assets}cmaps/`,
        standardFontDataUrl: `${assets}standard_fonts/`,
        wasmUrl: `${assets}wasm/`,
      });
      task.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
        if (!disposed && total)
          setProgress(Math.min(99, Math.round((loaded / total) * 100)));
      };
      const document = await task.promise;
      if (!disposed) setPdf(document);
    }
    void open().catch(() => {
      if (!disposed)
        setError(
          "Unable to load this PDF. Reload the preview or download the file.",
        );
    });
    return () => {
      disposed = true;
      void task?.destroy().catch(() => {});
    };
  }, [path]);
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const available = entries[0]?.contentRect.width;
      if (available) setWidth(Math.max(200, available - 32));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!pdf) return;
    let disposed = false;
    let task: RenderTask | undefined;
    async function renderPage() {
      setRendering(true);
      setError("");
      const documentPage = await pdf!.getPage(page);
      if (disposed) return;
      const natural = documentPage.getViewport({ scale: 1 });
      const viewport = documentPage.getViewport({
        scale: (width / natural.width) * zoom,
      });
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      // A fresh canvas avoids overlapping render tasks when users turn pages quickly.
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      canvas.setAttribute("role", "img");
      canvas.setAttribute(
        "aria-label",
        `${filename}, page ${page} of ${pdf!.numPages}`,
      );
      task = documentPage.render({
        canvas,
        viewport,
        transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0],
      });
      await task.promise;
      if (!disposed) {
        host.current?.replaceChildren(canvas);
        setRendering(false);
      }
    }
    void renderPage().catch(() => {
      if (!disposed) {
        setError(
          "This page could not be rendered. Try another page or reload the preview.",
        );
        setRendering(false);
      }
    });
    return () => {
      disposed = true;
      task?.cancel();
    };
  }, [pdf, page, width, zoom, filename]);
  return (
    <>
      <div className={styles.pdfToolbar}>
        <button
          aria-label="Previous PDF page"
          disabled={!pdf || page <= 1}
          onClick={() => setPage((value) => value - 1)}
        >
          <ChevronLeft size={18} />
        </button>
        <span>
          Page {page} of {pdf?.numPages || "…"}
        </span>
        <button
          aria-label="Next PDF page"
          disabled={!pdf || page >= pdf.numPages}
          onClick={() => setPage((value) => value + 1)}
        >
          <ChevronRight size={18} />
        </button>
        <button
          aria-label="Zoom out"
          disabled={zoom <= 0.5}
          onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
        >
          <ZoomOut size={18} />
        </button>
        <button onClick={() => setZoom(1)}>Fit width</button>
        <button
          aria-label="Zoom in"
          disabled={zoom >= 2}
          onClick={() => setZoom((value) => Math.min(2, value + 0.25))}
        >
          <ZoomIn size={18} />
        </button>
      </div>
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : (
        (!pdf || rendering) && (
          <p role="status" className={styles.previewStatus}>
            {pdf
              ? "Rendering page…"
              : `Loading preview${progress ? ` · ${progress}%` : "…"}`}
          </p>
        )
      )}
      <div
        ref={host}
        className={styles.pdfCanvas}
        aria-busy={!error && (!pdf || rendering)}
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
