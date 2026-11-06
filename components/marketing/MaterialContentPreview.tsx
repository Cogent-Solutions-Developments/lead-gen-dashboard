"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, FileText, ImageIcon, Search, Sheet, ZoomIn, ZoomOut } from "lucide-react";
import { documentBlob, marketing, type Asset } from "./api";
import { columnLabel, parseCsv, populatedColumns } from "./material-preview-data";
import styles from "./MaterialContentPreview.module.css";

type Block = { text?: string; rows?: string[][] };
type OfficeData = { kind?: string; limited?: boolean; sections: { name: string; blocks: Block[] }[] };
type Loaded = { type: "office"; data: OfficeData } | { type: "text"; text: string; limited: boolean } | { type: "url"; url: string };
type Kind = "office" | "text" | "image" | "media";

export function MaterialContentPreview({ asset, kind }: { asset: Asset; kind: Kind }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState("");
  const filename = asset.fileName || asset.title;
  const extension = filename.split(".").pop()?.toLowerCase() || "file";
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl = "";
    async function load() {
      try {
        if (kind === "office") {
          const data = await marketing<OfficeData>(`/library/${encodeURIComponent(asset.id)}/content`, "GET", undefined, controller.signal);
          if (!controller.signal.aborted) setLoaded({ type: "office", data });
        } else {
          const blob = await documentBlob(asset.downloadUrl, controller.signal);
          if (controller.signal.aborted) return;
          if (kind === "text") {
            const text = await blob.slice(0, 512 * 1024).text();
            if (!controller.signal.aborted) setLoaded({ type: "text", text, limited: blob.size > 512 * 1024 });
          } else {
            const types: Record<string, string> = { jpg: "image/jpeg", jpeg: "image/jpeg", svg: "image/svg+xml", mp4: "video/mp4", webm: "video/webm", ogg: "audio/ogg", mp3: "audio/mpeg", wav: "audio/wav", m4a: "audio/mp4" };
            objectUrl = URL.createObjectURL(new Blob([blob], { type: types[extension] || `image/${extension}` }));
            setLoaded({ type: "url", url: objectUrl });
          }
        }
      } catch (caught) {
        if (!controller.signal.aborted) setError(caught instanceof Error ? caught.message : "Unable to load preview. Reload or download the file.");
      }
    }
    void load();
    return () => { controller.abort(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [asset.id, asset.downloadUrl, extension, kind]);
  if (error) return <div className={styles.message} role="alert"><FileText size={28} /><p>{error}</p></div>;
  if (!loaded) return <div className={styles.message} role="status"><FileText size={28} /><p>Opening material…</p></div>;
  return <div className={styles.surface}>
    {loaded.type === "office" ? <OfficeContent data={loaded.data} title={asset.title} extension={extension} />
      : loaded.type === "text" ? <TextContent text={loaded.text} limited={loaded.limited} extension={extension} title={asset.title} />
      : <VisualContent url={loaded.url} filename={filename} kind={kind} extension={extension} />}
  </div>;
}

function OfficeContent({ data, title, extension }: { data: OfficeData; title: string; extension: string }) {
  const [section, setSection] = useState(0);
  const current = data.sections[section];
  const spreadsheet = data.kind === "spreadsheet" || ["xlsx", "xlsm", "xltx", "ods"].includes(extension);
  return <>
    <div className={styles.sectionBar}>
      <span className={styles.format}><Sheet size={16} />{spreadsheet ? "Workbook" : "Document"}<b>{extension}</b></span>
      <span className={styles.readOnly}>Read only</span>
    </div>
    {data.sections.length > 1 && <div className={styles.sheets} aria-label="Document sections">
      {data.sections.map((item, index) => <button key={index} aria-pressed={section === index} onClick={() => setSection(index)}><Sheet size={14} />{item.name}</button>)}
    </div>}
    {!current ? <div className={styles.message}>No preview content. Download the original file to open it.</div>
      : spreadsheet ? <DataGrid key={section} rows={current.blocks.flatMap(block => block.rows || [])} name={current.name} limited={Boolean(data.limited)} />
      : <div className={styles.documentScroll}><article className={styles.document} aria-label={title}>
        <div className={styles.documentMark}><FileText size={22} />{current.name}</div>
        {current.blocks.map((block, index) => block.rows ? <DataGrid key={index} rows={block.rows} name={`${current.name} table ${index + 1}`} limited={false} compact /> : <p key={index}>{block.text}</p>)}
        {data.limited && <small>Content preview · Download for original formatting and full content.</small>}
      </article></div>}
  </>;
}

function TextContent({ text, limited, extension, title }: { text: string; limited: boolean; extension: string; title: string }) {
  const csv = useMemo(() => extension === "csv" ? parseCsv(text, limited) : null, [extension, text, limited]);
  let formatted = text;
  if (extension === "json") { try { formatted = JSON.stringify(JSON.parse(text), null, 2); } catch { /* A partial document stays readable as text. */ } }
  if (csv) return <DataGrid rows={csv.rows} name={title} limited={csv.limited} />;
  return <>
    <div className={styles.sectionBar}><span className={styles.format}><FileText size={16} />Reading view<b>{extension}</b></span><span className={styles.readOnly}>Read only</span></div>
    <div className={styles.documentScroll}><article className={styles.document} aria-label={title}>
      {["json", "xml", "html", "css", "log"].includes(extension) ? <pre>{formatted || "Empty document"}</pre> : <div className={styles.prose}>{text || "Empty document"}</div>}
    </article></div>
    {limited && <small className={styles.note}>Showing the first 512 KB. Download for the complete file.</small>}
  </>;
}

function DataGrid({ rows, name, limited, compact = false }: { rows: string[][]; name: string; limited: boolean; compact?: boolean }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const columns = useMemo(() => populatedColumns(rows), [rows]);
  const records = useMemo(() => rows.slice(1).map((cells, index) => ({ cells, number: index + 2 })).filter(row => row.cells.some(cell => cell.trim())), [rows]);
  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return query ? records.filter(row => row.cells.some(cell => cell.toLocaleLowerCase().includes(query))) : records;
  }, [records, search]);
  const pages = Math.max(1, Math.ceil(filtered.length / 25));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 25, (currentPage + 1) * 25);
  const hiddenColumns = rows.some(row => row.length > columns.length);
  return <div className={styles.grid}>
    {(!compact || records.length > 25) && <div className={styles.toolbar}>
      <div className={styles.gridTitle}><span className={styles.gridIcon}><Sheet size={20} /></span><div><strong>{name}</strong><small>{records.length.toLocaleString()} rows <span>·</span> {columns.length} columns</small></div></div>
      <label className={styles.search}><Search size={16} /><input type="search" aria-label="Search preview" placeholder="Search all columns…" value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
    </div>}
    <div className={styles.gridScroll} tabIndex={0} role="region" aria-label={`${name} data`}>
      <table className={styles.dataTable} aria-label={name}>
        <thead><tr>{!compact && <th scope="col" className={styles.rowNumber}><span>#</span></th>}{columns.map(col => <th scope="col" key={col}>{!compact && <span className={styles.columnLetter}>{columnLabel(col)}</span>}<span>{rows[0]?.[col]?.trim() || `Column ${columnLabel(col)}`}</span></th>)}</tr></thead>
        <tbody>{visible.map(row => <tr key={row.number}>{!compact && <th scope="row" className={styles.rowNumber}><span>{row.number}</span></th>}{columns.map(col => <td key={col}><span>{row.cells[col] || <span className={styles.emptyCell}>—</span>}</span></td>)}</tr>)}</tbody>
      </table>
      {!visible.length && <div className={styles.message}><Search size={26} /><p>{search ? "No matching rows" : "No data rows"}</p>{search && <button onClick={() => { setSearch(""); setPage(0); }}>Clear search</button>}</div>}
    </div>
    {(!compact || pages > 1) && <footer className={styles.gridFooter}>
      <span role="status">{filtered.length ? `${currentPage * 25 + 1}–${Math.min((currentPage + 1) * 25, filtered.length)} of ${filtered.length.toLocaleString()} rows` : "0 rows"}</span>
      <div className={styles.pager}><button aria-label="Previous preview page" disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}><ChevronLeft size={16} /></button><span>{currentPage + 1} / {pages}</span><button aria-label="Next preview page" disabled={currentPage + 1 >= pages} onClick={() => setPage(currentPage + 1)}><ChevronRight size={16} /></button></div>
    </footer>}
    {(limited || hiddenColumns) && <small className={styles.note}>{limited && "Preview of available content. Download for the complete file. "}{hiddenColumns && "Blank columns hidden."}</small>}
  </div>;
}

function VisualContent({ url, filename, kind, extension }: { url: string; filename: string; kind: Kind; extension: string }) {
  const [zoom, setZoom] = useState(100);
  const [failed, setFailed] = useState(false);
  return <>
    <div className={styles.sectionBar}><span className={styles.format}><ImageIcon size={16} />{kind === "image" ? "Image preview" : "Media preview"}<b>{extension}</b></span>
      {kind === "image" && <div className={styles.zoom}><button aria-label="Zoom out" disabled={zoom <= 50} onClick={() => setZoom(value => value - 25)}><ZoomOut size={16} /></button><button aria-label="Reset image zoom" onClick={() => setZoom(100)}>{zoom}%</button><button aria-label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(value => value + 25)}><ZoomIn size={16} /></button></div>}
    </div>
    <div className={styles.visualStage}>
      {failed ? <p role="alert">This file cannot be displayed. Download the original to open it.</p> : kind === "image" ?
        // Authenticated private images are blob URLs, not public optimized images.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={filename} style={{ width: `${zoom}%` }} onError={() => setFailed(true)} />
        : ["mp4", "webm"].includes(extension) ? <video controls src={url} aria-label={filename} onError={() => setFailed(true)} /> : <audio controls src={url} aria-label={filename} onError={() => setFailed(true)} />}
    </div>
  </>;
}
