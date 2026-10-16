"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  Download,
  FileText,
  History,
  RefreshCw,
  Upload,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  marketing,
  download,
  formatDate,
  type Asset,
  type Context,
} from "./api";
import styles from "./marketing.module.css";

type Props = {
  context: Context;
  eventId: string;
  category: "agenda" | "materials";
};
type LibraryData = {
  items: Asset[];
  legacyNotes?: { id: string; title: string; text: string; note: string }[];
};
const message = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
const sizeLabel = (size?: number | null) =>
  size == null
    ? "Size unavailable"
    : size < 1024 * 1024
      ? `${Math.ceil(size / 1024)} KB`
      : `${(size / 1024 / 1024).toFixed(1)} MB`;
const sourceLabel = (asset: Asset) =>
  asset.source === "event_documents"
    ? "Event Document Library"
    : "Marketing library";

export function Library(props: Props) {
  return <EventLibrary key={`${props.eventId}:${props.category}`} {...props} />;
}

function EventLibrary({ context, eventId, category }: Props) {
  const [data, setData] = useState<LibraryData>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadTitle, setUploadTitle] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const request = useRef<AbortController | null>(null);
  const title = category === "agenda" ? "Agenda" : "Marketing materials";
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setLoading(true);
    setError("");
    try {
      const result = await marketing<LibraryData>(
        `/library?eventId=${eventId}&category=${category}`,
        "GET",
        undefined,
        controller.signal,
      );
      if (!controller.signal.aborted) setData(result);
    } catch (err) {
      if (!controller.signal.aborted) setError(message(err));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [eventId, category]);
  useEffect(() => {
    if (eventId) void load();
    return () => request.current?.abort();
  }, [eventId, load]);
  async function release(asset: Asset) {
    setBusy(true);
    setError("");
    try {
      await marketing(`/library/${asset.id}/release`, "POST");
      toast.success("Version released");
      await load();
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  async function downloadFile(asset: Asset) {
    setBusy(true);
    setError("");
    try {
      await download(asset.downloadUrl, asset.fileName || asset.title);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
    }
  }
  const latest = data.items.filter((a) => a.isLatest);
  const drafts = data.items.filter((a) => a.status === "draft");
  const filtered = data.items.filter((a) =>
    `${a.title} ${a.fileName || ""} ${a.createdByName || ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const lastPage = Math.max(0, Math.ceil(filtered.length / 8) - 1);
  const currentPage = Math.min(page, lastPage);
  const actions = {
    busy,
    onDownload: downloadFile,
    onRelease: context.manager ? release : undefined,
    onReplace: context.canUpload ? setUploadTitle : undefined,
  };
  if (!eventId)
    return (
      <div className={styles.empty}>
        Select an event to view its {title.toLowerCase()}.
      </div>
    );
  return (
    <section aria-label={`${title} library`}>
      <div className={styles.sectionHeading}>
        <div>
          <h2>{title} library</h2>
          <p>Current files, review drafts and upload history for this event.</p>
        </div>
        <div className={styles.actions}>
          <button
            disabled={loading || busy}
            onClick={() => void load()}
            aria-label="Refresh library"
          >
            <RefreshCw size={16} /> Refresh
          </button>
          {context.canUpload && (
            <button
              className={styles.primary}
              onClick={() =>
                setUploadTitle(category === "agenda" ? "Agenda" : "")
              }
            >
              <Upload size={16} /> Upload{" "}
              {category === "agenda" ? "new version" : "material"}
            </button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading && <p role="status">Loading library…</p>}
      <section className={styles.panel} aria-label="Latest published versions">
        <div className={styles.taskHeading}>
          <h2>
            <FileText size={18} />{" "}
            {category === "agenda" ? "Latest agenda" : "Latest materials"}
          </h2>
          <span className={styles.badge}>
            {latest.length} current {latest.length === 1 ? "file" : "files"}
          </span>
        </div>
        {!loading && !latest.length && (
          <div className={styles.empty}>
            <FileText size={24} />
            <p>
              {drafts.length
                ? "No published version yet. Drafts are awaiting manager release."
                : "No files have been published for this event yet."}
            </p>
          </div>
        )}
        <div className={styles.libraryGrid}>
          {latest.map((asset) => (
            <AssetCard
              key={`${asset.source}:${asset.id}`}
              asset={asset}
              {...actions}
            />
          ))}
        </div>
      </section>
      {drafts.length > 0 && (
        <section className={styles.panel} aria-label="Drafts awaiting release">
          <h2>Awaiting manager release · {drafts.length}</h2>
          <p>
            Published files stay available until a manager releases a
            replacement.
          </p>
          <div className={styles.libraryGrid}>
            {drafts.map((asset) => (
              <AssetCard
                key={asset.id}
                asset={asset}
                {...actions}
                onReplace={undefined}
              />
            ))}
          </div>
        </section>
      )}
      <section className={styles.panel} aria-label="Upload history">
        <div className={styles.sectionHeading}>
          <div>
            <h2>
              <History size={18} /> Upload history
            </h2>
            <p>
              {data.items.length} uploaded{" "}
              {data.items.length === 1 ? "version" : "versions"} · newest
              uploads first
            </p>
          </div>
          <label className={styles.librarySearch}>
            Search history
            <input
              type="search"
              value={search}
              placeholder="Filename, title or uploader"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
            />
          </label>
        </div>
        {!loading && !filtered.length && (
          <p>
            {search
              ? "No versions match your search."
              : "Upload history will appear here."}
          </p>
        )}
        <ol className={styles.libraryHistory}>
          {filtered.slice(currentPage * 8, currentPage * 8 + 8).map((asset) => (
            <li key={`${asset.source}:${asset.id}`}>
              <AssetCard asset={asset} {...actions} onReplace={undefined} />
            </li>
          ))}
        </ol>
        {filtered.length > 8 && (
          <div className={styles.pagination}>
            <span>
              Page {currentPage + 1} of {lastPage + 1}
            </span>
            <div>
              <button
                disabled={currentPage === 0}
                onClick={() => setPage(currentPage - 1)}
              >
                Newer
              </button>
              <button
                disabled={currentPage === lastPage}
                onClick={() => setPage(currentPage + 1)}
              >
                Older
              </button>
            </div>
          </div>
        )}
      </section>
      {data.legacyNotes?.map((note) => (
        <details className={styles.panel} key={note.id}>
          <summary>{note.title} · Guideline</summary>
          <p className={styles.prewrap}>{note.text}</p>
          {note.note && <p>{note.note}</p>}
        </details>
      ))}
      {uploadTitle !== null && (
        <UploadDialog
          category={category}
          eventId={eventId}
          eventName={
            context.events.find((event) => event.id === eventId)?.name ||
            "Selected event"
          }
          initialTitle={uploadTitle}
          onClose={() => setUploadTitle(null)}
          onUploaded={() => {
            setUploadTitle(null);
            void load();
          }}
        />
      )}
    </section>
  );
}

function AssetCard({
  asset,
  busy,
  onDownload,
  onRelease,
  onReplace,
}: {
  asset: Asset;
  busy: boolean;
  onDownload: (asset: Asset) => Promise<void>;
  onRelease?: (asset: Asset) => Promise<void>;
  onReplace?: (title: string) => void;
}) {
  const status = asset.isLatest
    ? "Latest"
    : asset.status === "draft"
      ? "Draft"
      : "Previous version";
  return (
    <article className={styles.libraryFile}>
      <div className={styles.taskHeading}>
        <h3>{asset.fileName || asset.title}</h3>
        <span
          className={styles.badge}
          data-status={
            asset.isLatest
              ? "released"
              : asset.status === "draft"
                ? "review"
                : "superseded"
          }
        >
          {status}
        </span>
      </div>
      <p>
        {asset.title} · {sourceLabel(asset)} · v{asset.version} ·{" "}
        {sizeLabel(asset.sizeBytes)}
      </p>
      <p>
        Uploaded {formatDate(asset.createdAt)} by{" "}
        {asset.createdByName || "Former user"}
      </p>
      {asset.releasedAt && asset.source !== "event_documents" && (
        <small>
          Released {formatDate(asset.releasedAt)}
          {asset.releasedByName ? ` by ${asset.releasedByName}` : ""}
        </small>
      )}
      <div className={styles.actions}>
        <button disabled={busy} onClick={() => void onDownload(asset)}>
          <Download size={15} /> Download
        </button>
        {onReplace && (
          <button onClick={() => onReplace(asset.title)}>
            <Upload size={15} /> Upload new version
          </button>
        )}
        {onRelease && asset.status === "draft" && (
          <button
            className={styles.primary}
            disabled={busy}
            onClick={() => void onRelease(asset)}
          >
            Release this version
          </button>
        )}
      </div>
    </article>
  );
}

function UploadDialog({
  category,
  eventId,
  eventName,
  initialTitle,
  onClose,
  onUploaded,
}: {
  category: Props["category"];
  eventId: string;
  eventName: string;
  initialTitle: string;
  onClose: () => void;
  onUploaded: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
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
      await marketing("/library", "POST", form);
      toast.success("Draft uploaded for manager release");
      onUploaded();
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
          Upload {category === "agenda" ? "agenda" : "marketing material"}
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
            readOnly={!!initialTitle}
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
        <p className={styles.notice}>
          Uploads are saved as drafts. A Marketing Manager releases each version
          for other departments.
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
            {busy ? "Uploading…" : "Upload draft"}
          </button>
        </div>
      </form>
    </dialog>
  );
}
