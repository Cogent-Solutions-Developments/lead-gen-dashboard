"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  Check,
  ChevronDown,
  Download,
  Eye,
  File,
  FileArchive,
  FileAudio,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  HardDrive,
  History,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Upload,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import {
  marketing,
  download,
  formatDate,
  canUploadLibrary,
  canDeleteLibrary,
  type Asset,
  type Context,
} from "./api";
import { DocumentPreview } from "./DocumentPreview";
import { LibraryUploadDialog } from "./LibraryUploadDialog";
import styles from "./marketing.module.css";

type Props = {
  context: Context;
  eventId: string;
  category: "agenda" | "materials";
  eventControl?: ReactNode;
};
type LibraryData = {
  items: Asset[];
  legacyNotes?: { id: string; title: string; text: string; note: string }[];
};
type FileGroup = "documents" | "spreadsheets" | "images" | "media" | "other";
type FileFilter = FileGroup | "all";

const fileFilters: { key: FileFilter; label: string }[] = [
  { key: "all", label: "All files" },
  { key: "documents", label: "Documents" },
  { key: "spreadsheets", label: "Spreadsheets" },
  { key: "images", label: "Images" },
  { key: "media", label: "Media" },
  { key: "other", label: "Other files" },
];
const assetKey = (asset: Asset) => `${asset.source}:${asset.id}`;
const message = (error: unknown) =>
  error instanceof Error ? error.message : "Something went wrong. Please try again.";
const sizeLabel = (size?: number | null) =>
  size == null ? "Size unavailable" : size < 1024 * 1024
    ? `${Math.ceil(size / 1024)} KB` : `${(size / 1024 / 1024).toFixed(1)} MB`;
const sourceLabel = (asset: Asset) =>
  asset.source === "event_documents" ? "Event Document Library" : "Marketing library";

function describeFile(asset: Asset) {
  const name = asset.fileName || asset.title;
  const extension = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  const label = extension && extension.length <= 6 ? extension.toUpperCase() : "FILE";
  if (["xlsx", "xls", "xlsm", "xltx", "csv", "ods"].includes(extension))
    return { label, kind: "spreadsheet", group: "spreadsheets" as FileGroup, Icon: FileSpreadsheet };
  if (["png", "jpg", "jpeg", "webp", "gif", "avif", "svg", "bmp", "tiff", "ico"].includes(extension))
    return { label, kind: "image", group: "images" as FileGroup, Icon: ImageIcon };
  if (["mp4", "webm", "mov", "avi"].includes(extension))
    return { label, kind: "media", group: "media" as FileGroup, Icon: FileVideo };
  if (["mp3", "wav", "ogg", "m4a"].includes(extension))
    return { label, kind: "media", group: "media" as FileGroup, Icon: FileAudio };
  if (["zip", "rar", "7z", "gz"].includes(extension))
    return { label, kind: "archive", group: "other" as FileGroup, Icon: FileArchive };
  if (["pdf", "doc", "docx", "ppt", "pptx", "odt", "txt", "md", "json", "xml", "html"].includes(extension))
    return { label, kind: extension === "pdf" ? "pdf" : "document", group: "documents" as FileGroup, Icon: FileText };
  return { label, kind: "file", group: "other" as FileGroup, Icon: File };
}

function FileMark({ asset, large = false }: { asset: Asset; large?: boolean }) {
  const { Icon, kind, label } = describeFile(asset);
  return (
    <span className={large ? styles.fileMarkLarge : styles.fileMark} data-kind={kind} aria-hidden="true">
      <Icon size={large ? 42 : 23} strokeWidth={1.5} />
      {large && <span>{label}</span>}
    </span>
  );
}

function DownloadAction({ asset, busy, pending, onDownload, label }: {
  asset: Asset;
  busy: boolean;
  pending: boolean;
  onDownload: (asset: Asset) => Promise<void>;
  label?: string;
}) {
  return (
    <button
      disabled={busy}
      aria-label={pending ? `Downloading ${asset.fileName || asset.title}` : label}
      aria-busy={pending}
      onClick={() => void onDownload(asset)}
    >
      {pending ? <Loader2 size={16} className={styles.librarySpinner} /> : <Download size={16} />}
      {pending ? "Downloading..." : "Download"}
    </button>
  );
}

function availableAgendas(items: Asset[]): Asset[] {
  const latest = items.reduce<Asset | undefined>((current, item) => {
    if (!current) return item;
    const difference = Date.parse(item.createdAt) - Date.parse(current.createdAt);
    return difference > 0 || (difference === 0 && item.id > current.id) ? item : current;
  }, undefined);
  return items.map(item => ({
    ...item,
    isLatest: item === latest,
    status: item === latest ? "released" : "superseded",
  }));
}

export function Library(props: Props) {
  return <EventLibrary key={`${props.eventId}:${props.category}`} {...props} />;
}

function EventLibrary({ context, eventId, category, eventControl }: Props) {
  const canUpload = canUploadLibrary(context);
  const canDelete = canDeleteLibrary(context);
  const [data, setData] = useState<LibraryData>({ items: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [downloadKey, setDownloadKey] = useState("");
  const [uploadTitle, setUploadTitle] = useState<string | null>(null);
  const [filter, setFilter] = useState<FileFilter>("all");
  const [page, setPage] = useState(0);
  const [preview, setPreview] = useState<Asset | null>(null);
  const [deleting, setDeleting] = useState<Asset | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const deleteDialog = useRef<HTMLDialogElement>(null);
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
        `/library?eventId=${eventId}&category=${category}`, "GET", undefined, controller.signal,
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

  useEffect(() => {
    if (!deleting || !canDelete) return;
    const dialog = deleteDialog.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, [deleting, canDelete]);

  function askDelete(asset: Asset) {
    setDeleteError("");
    setDeleting(asset);
  }

  async function confirmDelete() {
    if (!deleting || !canDelete || busy) return;
    const asset = deleting;
    const path = asset.source === "event_documents"
      ? `/library/event-agendas/${encodeURIComponent(asset.id)}`
      : `/library/${encodeURIComponent(asset.id)}`;
    setBusy(true);
    setDeleteError("");
    try {
      await marketing(path, "DELETE");
      setData(current => ({ ...current, items: current.items.filter(item => assetKey(item) !== assetKey(asset)) }));
      setPreview(current => current && assetKey(current) === assetKey(asset) ? null : current);
      setDeleting(null);
      toast.success("File deleted from Marketing");
      await load();
    } catch (error) {
      setDeleteError(message(error));
    } finally {
      setBusy(false);
    }
  }

  async function downloadFile(asset: Asset) {
    setBusy(true);
    setDownloadKey(assetKey(asset));
    setError("");
    try {
      await download(asset.downloadUrl, asset.fileName || asset.title);
    } catch (err) {
      setError(message(err));
    } finally {
      setBusy(false);
      setDownloadKey("");
    }
  }

  const items = category === "agenda" ? availableAgendas(data.items) : data.items;
  const latest = items.filter(asset => asset.isLatest);
  const filters = fileFilters.filter(item => item.key === "all" || items.some(asset => describeFile(asset).group === item.key));
  const activeFilter = filters.some(item => item.key === filter) ? filter : "all";
  const visibleItems = category === "materials" && activeFilter !== "all"
    ? items.filter(asset => describeFile(asset).group === activeFilter) : items;
  const pageSize = 10;
  const lastPage = Math.max(0, Math.ceil(visibleItems.length / pageSize) - 1);
  const currentPage = Math.min(page, lastPage);
  const pageItems = visibleItems.slice(currentPage * pageSize, (currentPage + 1) * pageSize);

  if (!eventId) return <div className={styles.empty}>Select an event to view its {title.toLowerCase()}.</div>;

  return (
    <section className={styles.library} aria-label={`${title} library`} aria-busy={loading}>
      <div className={styles.libraryToolbar}>
        <div className={styles.libraryEventControl}>{eventControl}</div>
        <div className={styles.libraryToolbarActions}>
          <button disabled={loading || busy} onClick={() => void load()} aria-label="Refresh library" title="Refresh library">
            <RefreshCw size={16} className={loading ? styles.librarySpinner : undefined} /> Refresh
          </button>
          {canUpload && (
            <button className={styles.primary} onClick={() => setUploadTitle(category === "agenda" ? "Agenda" : "")}>
              <Upload size={16} /> {category === "agenda" ? "Upload new version" : "Upload material"}
            </button>
          )}
        </div>
      </div>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {loading && <p role="status" className={styles.libraryLoading}><Loader2 size={16} className={styles.librarySpinner} /> Loading library...</p>}

      {category === "agenda" ? (
        <div className={styles.agendaLayout}>
          <section className={styles.agendaHero} aria-label="Latest agenda">
            <header className={styles.agendaHeroHeader}>
              <h2>Latest agenda</h2>
              {latest.length > 0 && <span className={styles.currentVersion}><Check size={13} /> Current version</span>}
            </header>
            {!loading && !latest.length && (
              <div className={styles.libraryEmpty}><FileText size={32} strokeWidth={1.3} /><p>No agenda has been uploaded for this event yet.</p></div>
            )}
            {latest.map(asset => (
              <div className={styles.agendaHeroContent} key={assetKey(asset)}>
                <FileMark asset={asset} large />
                <div className={styles.agendaFileInfo}>
                  <h3>{asset.fileName || asset.title}</h3>
                  <div className={styles.agendaFileMeta}>
                    <span className={styles.versionTag}>v{asset.version}</span>
                    <span><HardDrive size={14} />{sizeLabel(asset.sizeBytes)}</span>
                    <time dateTime={asset.createdAt}><CalendarDays size={14} />{formatDate(asset.createdAt)}</time>
                  </div>
                  <div className={styles.fileUploader}>
                    <span className={styles.uploaderAvatar} aria-hidden="true">{(asset.createdByName || "?").trim().charAt(0).toUpperCase()}</span>
                    {asset.createdByName || "Former user"}
                  </div>
                </div>
                <div className={`${styles.actions} ${styles.agendaHeroActions}`}>
                  <button className={styles.primary} onClick={() => setPreview(asset)}><Eye size={17} /> View agenda <ArrowUpRight size={16} /></button>
                  <DownloadAction asset={asset} busy={busy} pending={downloadKey === assetKey(asset)} onDownload={downloadFile} />
                  {canDelete && <button className={styles.libraryDelete} disabled={busy} aria-label={`Delete ${asset.fileName || asset.title}`} onClick={() => askDelete(asset)}><Trash2 size={15} /> Delete</button>}
                </div>
              </div>
            ))}
          </section>

          <section className={styles.agendaTimelineSection} aria-label="Upload history">
            <header className={styles.librarySectionHeader}>
              <h2><History size={17} /> Upload history</h2>
              <span>{items.length} {items.length === 1 ? "version" : "versions"}</span>
            </header>
            <ol className={styles.agendaTimeline}>
              {pageItems.map(asset => (
                <li key={assetKey(asset)} data-current={asset.isLatest}>
                  <details className={styles.agendaTimelineEntry}>
                    <summary>
                      <span className={styles.timelineVersion}>v{asset.version}</span>
                      <span className={styles.timelineName}>{asset.fileName || asset.title}</span>
                      <time dateTime={asset.createdAt}>{formatDate(asset.createdAt)}</time>
                      {asset.isLatest && <span className={styles.timelineCurrent}>Latest</span>}
                      <ChevronDown size={16} className={styles.timelineChevron} />
                    </summary>
                    <div className={styles.timelineDetails}>
                      <dl>
                        <div><dt>Uploaded by</dt><dd>{asset.createdByName || "Former user"}</dd></div>
                        <div><dt>Size</dt><dd>{sizeLabel(asset.sizeBytes)}</dd></div>
                        <div><dt>Title</dt><dd>{asset.title}</dd></div>
                        <div><dt>Source</dt><dd>{sourceLabel(asset)}</dd></div>
                        <div><dt>Status</dt><dd>{asset.isLatest ? "Latest" : "Previous version"}</dd></div>
                      </dl>
                      <div className={styles.actions}>
                        <button aria-label={`View ${asset.fileName || asset.title}, version ${asset.version}`} onClick={() => setPreview(asset)}><Eye size={15} /> View</button>
                        <DownloadAction asset={asset} busy={busy} pending={downloadKey === assetKey(asset)} onDownload={downloadFile} />
                        {canDelete && <button className={styles.libraryDelete} disabled={busy} aria-label={`Delete ${asset.fileName || asset.title}, version ${asset.version}`} onClick={() => askDelete(asset)}><Trash2 size={15} /> Delete</button>}
                      </div>
                    </div>
                  </details>
                </li>
              ))}
            </ol>
          </section>
        </div>
      ) : (
        <section aria-label="Event materials" className={styles.materialsSection}>
          <header className={styles.librarySectionHeader}>
            <h2><FolderOpen size={21} /> Event materials <span className={styles.fileCount}>{items.length}</span></h2>
          </header>
          {filters.length > 2 && (
            <div className={styles.fileFilters} role="group" aria-label="Filter materials by file type">
              {filters.map(item => (
                <button key={item.key} aria-pressed={activeFilter === item.key} onClick={() => { setFilter(item.key); setPage(0); }}>
                  {item.label}<span>{item.key === "all" ? items.length : items.filter(asset => describeFile(asset).group === item.key).length}</span>
                </button>
              ))}
            </div>
          )}
          {!loading && !items.length && (
            <div className={styles.libraryEmpty}><FolderOpen size={36} strokeWidth={1.3} /><p>No materials uploaded for this event.</p></div>
          )}
          {visibleItems.length > 0 && (
            <div className={styles.agendaTableScroll} role="region" aria-label="Event materials list" tabIndex={0}>
              <table className={`${styles.agendaTable} ${styles.materialsTable}`} aria-label="Event materials">
                <thead><tr>{["Title", "Uploaded by", "Date", "Size", "Actions"].map(heading => <th scope="col" key={heading}>{heading}</th>)}</tr></thead>
                <tbody>
                  {pageItems.map(asset => (
                    <tr key={assetKey(asset)}>
                      <td>
                        <div className={styles.materialIdentity}>
                          <FileMark asset={asset} />
                          <div>
                            <button className={styles.materialTitle} aria-label={`Open ${asset.title}`} onClick={() => setPreview(asset)}><strong>{asset.title}</strong><ArrowUpRight size={14} /></button>
                            <small>{asset.fileName || asset.title}</small>
                          </div>
                        </div>
                      </td>
                      <td data-label="Uploaded by"><span className={styles.tableUploader}><span className={styles.uploaderAvatar} aria-hidden="true">{(asset.createdByName || "?").trim().charAt(0).toUpperCase()}</span>{asset.createdByName || "Former user"}</span></td>
                      <td data-label="Date"><time dateTime={asset.createdAt}>{formatDate(asset.createdAt)}</time></td>
                      <td data-label="Size"><span className={styles.fileSize}>{sizeLabel(asset.sizeBytes)}</span></td>
                      <td>
                        <div className={styles.actions}>
                          <button className={styles.materialView} aria-label={`View ${asset.title}`} onClick={() => setPreview(asset)}><Eye size={15} /> View</button>
                          <DownloadAction asset={asset} busy={busy} pending={downloadKey === assetKey(asset)} onDownload={downloadFile} label={`Download ${asset.title}`} />
                          {canDelete && <button className={styles.libraryDelete} disabled={busy} aria-label={`Delete ${asset.title}`} onClick={() => askDelete(asset)}><Trash2 size={15} /> Delete</button>}
                          {canUpload && <button aria-label={`Upload new version of ${asset.title}`} onClick={() => setUploadTitle(asset.title)}><Upload size={15} /> Upload new version</button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
      {visibleItems.length > pageSize && (
        <div className={styles.pagination}>
          <span role="status">{currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, visibleItems.length)} of {visibleItems.length} · Page {currentPage + 1} of {lastPage + 1}</span>
          <div>
            <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button>
            <button disabled={currentPage === lastPage} onClick={() => setPage(currentPage + 1)}>Next</button>
          </div>
        </div>
      )}
      {canDelete && deleting && (
        <dialog ref={deleteDialog} className={styles.libraryDialog} aria-labelledby="delete-library-title"
          onCancel={event => { event.preventDefault(); if (!busy) setDeleting(null); }}>
          <h2 id="delete-library-title">Delete file?</h2>
          <p className={styles.prewrap}>{deleting.fileName || deleting.title}</p>
          <p>This removes this file from Marketing. The deletion is recorded in the audit history.</p>
          {deleting.source === "event_documents" && <p>The original Admin document stays in the Event Document Library.</p>}
          {deleteError && <p role="alert" className={styles.error}>{deleteError}</p>}
          <div className={styles.actions}>
            <button disabled={busy} onClick={() => setDeleting(null)}>Cancel</button>
            <button className={styles.libraryDelete} disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? <Loader2 size={16} className={styles.librarySpinner} /> : <Trash2 size={16} />}
              {busy ? "Deleting..." : "Delete file"}
            </button>
          </div>
        </dialog>
      )}
      {preview && <DocumentPreview key={assetKey(preview)} asset={preview} onClose={() => setPreview(null)} />}
      {data.legacyNotes?.map(note => (
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
          eventName={context.events.find(event => event.id === eventId)?.name || "Selected event"}
          initialTitle={uploadTitle}
          onClose={() => setUploadTitle(null)}
          onUploaded={() => { setUploadTitle(null); void load(); }}
        />
      )}
    </section>
  );
}
