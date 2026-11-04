"use client";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  Download,
  Eye,
  FileText,
  History,
  RefreshCw,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import {
  marketing,
  download,
  formatDate,
  canUploadLibrary,
  type Asset,
  type Context,
} from "./api";
import styles from "./marketing.module.css";
import { DocumentPreview } from "./DocumentPreview";
import { LibraryUploadDialog } from "./LibraryUploadDialog";

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

function availableAgendas(items: Asset[]): Asset[] {
  const latest = items.reduce<Asset | undefined>((current, item) => {
    if (!current) return item;
    const difference = Date.parse(item.createdAt) - Date.parse(current.createdAt);
    return difference > 0 || (difference === 0 && item.id > current.id) ? item : current;
  }, undefined);
  return items.map(item => ({ ...item, isLatest: item === latest, status: item === latest ? "released" : "superseded" }));
}

export function Library(props: Props) {
  return <EventLibrary key={`${props.eventId}:${props.category}`} {...props} />;
}

function EventLibrary({ context, eventId, category }: Props) {
  const canUpload = canUploadLibrary(context);
  const [data, setData] = useState<LibraryData>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploadTitle, setUploadTitle] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<Asset | null>(null);
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
  const items = category === "agenda" ? availableAgendas(data.items) : data.items;
  const latest = items.filter((a) => a.isLatest);
  const pageSize = 10;
  const lastPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  if (!eventId)
    return (
      <div className={styles.empty}>
        Select an event to view its {title.toLowerCase()}.
      </div>
    );
  return (
    <section aria-label={`${title} library`}>
      <div className={styles.libraryToolbar}>
        <button disabled={loading || busy} onClick={() => void load()} aria-label="Refresh library"><RefreshCw size={16} /> Refresh</button>
        {canUpload && <button className={styles.primary} onClick={() => setUploadTitle(category === "agenda" ? "Agenda" : "")}>
          <Upload size={16} /> {category === "agenda" ? "Upload new version" : "Upload material"}
        </button>}
      </div>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      {loading && <p role="status">Loading library…</p>}
      {category === "agenda" ? <div className={styles.agendaLayout}>
        <section className={styles.agendaHero} aria-label="Latest agenda">
          <div className={styles.agendaHeroLabel}><FileText size={22} /><h2>Latest agenda</h2></div>
          {!loading && !latest.length && <p>No agenda has been uploaded for this event yet.</p>}
          {latest.map(asset => <div className={styles.agendaHeroContent} key={`${asset.source}:${asset.id}`}>
            <div><h3>{asset.fileName || asset.title}</h3><p>v{asset.version} · {sizeLabel(asset.sizeBytes)} · {formatDate(asset.createdAt)}</p>
              <span>{asset.createdByName || "Former user"}</span></div>
            <div className={styles.actions}>
              <button className={styles.primary} onClick={() => setPreview(asset)}><Eye size={17} /> View agenda</button>
              <button disabled={busy} onClick={() => void downloadFile(asset)}><Download size={16} /> Download</button>
            </div>
          </div>)}
        </section>
        <section className={styles.agendaTimelineSection} aria-label="Upload history">
          <h2><History size={16} /> Upload history</h2>
          <ol className={styles.agendaTimeline}>
            {items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(asset => <li key={`${asset.source}:${asset.id}`}>
              <details className={styles.agendaTimelineEntry}>
                <summary><span className={styles.timelineVersion}>v{asset.version}</span><span className={styles.timelineName}>{asset.fileName || asset.title}</span>
                  <time dateTime={asset.createdAt}>{formatDate(asset.createdAt)}</time>{asset.isLatest && <span className={styles.badge}>Latest</span>}
                </summary>
                <div className={styles.timelineDetails}>
                  <dl><div><dt>Uploaded by</dt><dd>{asset.createdByName || "Former user"}</dd></div>
                    <div><dt>Size</dt><dd>{sizeLabel(asset.sizeBytes)}</dd></div>
                    <div><dt>Title</dt><dd>{asset.title}</dd></div>
                    <div><dt>Source</dt><dd>{sourceLabel(asset)}</dd></div>
                    <div><dt>Status</dt><dd>{asset.isLatest ? "Latest" : "Previous version"}</dd></div></dl>
                  <div className={styles.actions}>
                    <button aria-label={`View ${asset.fileName || asset.title}, version ${asset.version}`} onClick={() => setPreview(asset)}><Eye size={15} /> View</button>
                    <button disabled={busy} onClick={() => void downloadFile(asset)}><Download size={15} /> Download</button>
                  </div>
                </div>
              </details>
            </li>)}
          </ol>
        </section>
      </div> : <section aria-label="Event materials" className={styles.materialsSection}>
        <h2>Event materials</h2>
        {!loading && !items.length && <p>No materials uploaded for this event.</p>}
        {items.length > 0 && <div className={styles.agendaTableScroll} role="region" aria-label="Event materials list" tabIndex={0}>
          <table className={`${styles.agendaTable} ${styles.materialsTable}`} aria-label="Event materials">
            <thead><tr>{["Title", "Uploaded by", "Date", "Size", "Actions"].map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
            <tbody>{items.slice(currentPage * pageSize, (currentPage + 1) * pageSize).map(asset => <tr key={`${asset.source}:${asset.id}`}>
              <td><strong>{asset.title}</strong><small>{asset.fileName || asset.title}</small>{asset.status === "draft" && <span className={styles.badge}>Draft</span>}</td>
              <td>{asset.createdByName || "Former user"}</td>
              <td><time dateTime={asset.createdAt}>{formatDate(asset.createdAt)}</time></td><td>{sizeLabel(asset.sizeBytes)}</td>
              <td><div className={styles.actions}>
                <button aria-label={`View ${asset.title}`} onClick={() => setPreview(asset)}><Eye size={15} /> View</button>
                <button aria-label={`Download ${asset.title}`} disabled={busy} onClick={() => void downloadFile(asset)}><Download size={15} /> Download</button>
                {canUpload && <button aria-label={`Upload new version of ${asset.title}`} onClick={() => setUploadTitle(asset.title)}><Upload size={15} /> Upload new version</button>}
                {context.manager && asset.status === "draft" && <button className={styles.primary} disabled={busy} onClick={() => void release(asset)}>Release this version</button>}
              </div></td>
            </tr>)}</tbody>
          </table>
        </div>}
      </section>}
      {items.length > pageSize && <div className={styles.pagination}>
        <span role="status">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, items.length)} of {items.length} · Page {currentPage + 1} of {lastPage + 1}</span>
        <div><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
          <button disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button></div>
      </div>}
      {preview && (
        <DocumentPreview
          key={preview.id}
          asset={preview}
          onClose={() => setPreview(null)}
        />
      )}
      {data.legacyNotes?.map((note) => (
        <details className={styles.panel} key={note.id}>
          <summary>{note.title} · Guideline</summary>
          <p className={styles.prewrap}>{note.text}</p>
          {note.note && <p>{note.note}</p>}
        </details>
      ))}
      {canUpload && uploadTitle !== null && (
        <LibraryUploadDialog
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
