import {
  fetchEventSubmissions,
  fetchEventSubmission,
  type EventSubmission,
  type EventSubmissionFilters,
  type JsonValue,
} from "@/lib/eventSubmissionsApi";

export const EVENT_INQUIRY_EXPORT_HEADERS = [
  "Company",
  "Full Name",
  "Job Title",
  "Telephone Number",
  "Mobile",
  "Email",
  "Company Web URL",
  "LinkedIn Profile URL",
  "comments",
] as const;

const XLSX_MEDIA_TYPE = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const EXPORT_PAGE_SIZE = 200;

type ExportRow = readonly string[];

function escapeXml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function displayValue(value: JsonValue | undefined): string {
  if (value == null) return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map(displayValue).filter(Boolean).join(", ");
  for (const key of ["label", "title", "name", "display", "value"]) {
    const candidate = value[key];
    if (typeof candidate === "string" || typeof candidate === "number") return String(candidate);
  }
  return "";
}

type FormEntry = { key: string; value: string };

function normalizeKey(value: string) {
  return value.replace(/[^a-z0-9]+/gi, "").toLowerCase();
}

function formEntries(formData: Record<string, JsonValue> | undefined) {
  const entries: FormEntry[] = [];
  const visit = (value: JsonValue, key: string) => {
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, key));
      return;
    }
    if (value && typeof value === "object") {
      const summary = displayValue(value);
      if (summary) entries.push({ key, value: summary });
      Object.entries(value).forEach(([childKey, childValue]) => visit(childValue, childKey));
      return;
    }
    const text = displayValue(value);
    if (text) entries.push({ key, value: text });
  };
  Object.entries(formData || {}).forEach(([key, value]) => visit(value, key));
  return entries;
}

function formValue(entries: readonly FormEntry[], aliases: readonly string[]) {
  const normalizedAliases = aliases.map(normalizeKey);
  const genericAliases = new Set(["company", "title", "phone", "email", "name", "mobile", "linkedin", "website", "domain", "telephone"]);
  return entries.find((entry) => normalizedAliases.includes(normalizeKey(entry.key)))?.value
    || entries.find((entry) => normalizedAliases.some((alias) => !genericAliases.has(alias) && alias.length > 4 && normalizeKey(entry.key).includes(alias)))?.value
    || "";
}

function contactName(submission: EventSubmission, entries: readonly FormEntry[]) {
  const directName = [submission.contact.firstName, submission.contact.lastName].filter(Boolean).join(" ").trim();
  if (directName) return directName;
  const fallbackName = formValue(entries, ["fullName", "contactName", "personName", "name"]);
  const fallbackParts = [formValue(entries, ["firstName"]), formValue(entries, ["lastName"])].filter(Boolean).join(" ").trim();
  return fallbackName || fallbackParts || submission.contact.workEmail || "";
}

export function eventSubmissionExportRows(submissions: readonly EventSubmission[]): ExportRow[] {
  return submissions.map((submission) => {
    const entries = formEntries(submission.formData);
    const company = submission.contact.company || formValue(entries, ["companyName", "company", "organization", "organisation", "employer", "firm"]);
    const jobTitle = submission.contact.jobTitle || formValue(entries, ["jobTitle", "employeeTitle", "designation", "position", "title"]);
    const email = submission.contact.workEmail || formValue(entries, ["workEmail", "businessEmail", "emailAddress", "contactEmail", "email"]);
    const mobile = submission.contact.mobileNumber || formValue(entries, ["mobileNumber", "mobile", "phoneNumber", "phone", "contactNumber", "whatsapp"]);
    const telephone = formValue(entries, ["telephoneNumber", "telephone", "landline", "officePhone"]);
    const companyUrl = formValue(entries, ["companyWebUrl", "companyWebsiteUrl", "companyUrl", "companyWebsite", "websiteUrl", "website", "homepage", "domain"]);
    const linkedinUrl = formValue(entries, ["linkedinProfileUrl", "linkedinUrl", "linkedinProfile", "linkedin"]);
    return [company, contactName(submission, entries), jobTitle, telephone, mobile, email, companyUrl, linkedinUrl, ""];
  });
}

function columnName(index: number) {
  let value = index + 1;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function xmlCell(reference: string, value: string, style?: number) {
  if (!value) return "";
  const styleAttribute = style === undefined ? "" : ` s="${style}"`;
  return `<c r="${reference}" t="inlineStr"${styleAttribute}><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
}

function worksheetXml(rows: readonly ExportRow[]) {
  const allRows: readonly ExportRow[] = [EVENT_INQUIRY_EXPORT_HEADERS, ...rows];
  const lastRow = Math.max(1, allRows.length);
  const cells = allRows.map((row, rowIndex) => {
    const cellsForRow = row.map((value, columnIndex) =>
      xmlCell(`${columnName(columnIndex)}${rowIndex + 1}`, value, rowIndex === 0 ? 1 : undefined)
    ).join("");
    return `<row r="${rowIndex + 1}">${cellsForRow}</row>`;
  }).join("");

  const widths = [24, 24, 24, 20, 20, 30, 28, 30, 68];
  const columns = widths.map((width, index) => `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`).join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <sheetPr><outlinePr summaryBelow="1" summaryRight="1"/><pageSetUpPr/></sheetPr>
  <dimension ref="A1:I${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A2" sqref="A2"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${columns}</cols>
  <sheetData>${cells}</sheetData>
  <autoFilter ref="A1:I${lastRow}"/>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.3" footer="0.3"/>
</worksheet>`;
}

const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`;

const WORKBOOK_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView/></bookViews>
  <sheets><sheet name="Leads" sheetId="1" r:id="rId1"/></sheets>
</workbook>`;

const WORKBOOK_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>
  <fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="D9EAF7"/><bgColor indexed="64"/></patternFill></fill></fills>
  <borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top/><bottom style="thin"><color rgb="B7CFE0"/></bottom><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf></cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeUint16(view: DataView, offset: number, value: number) {
  view.setUint16(offset, value, true);
}

function writeUint32(view: DataView, offset: number, value: number) {
  view.setUint32(offset, value, true);
}

function zipStore(files: readonly { name: string; content: string }[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const file of files) {
    const name = encoder.encode(file.name);
    const content = encoder.encode(file.content);
    const crc = crc32(content);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    writeUint32(localView, 0, 0x04034b50);
    writeUint16(localView, 4, 20);
    writeUint16(localView, 6, 0);
    writeUint16(localView, 8, 0);
    writeUint16(localView, 10, 0);
    writeUint16(localView, 12, 0);
    writeUint32(localView, 14, crc);
    writeUint32(localView, 18, content.length);
    writeUint32(localView, 22, content.length);
    writeUint16(localView, 26, name.length);
    writeUint16(localView, 28, 0);
    localHeader.set(name, 30);
    localParts.push(localHeader, content);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    writeUint32(centralView, 0, 0x02014b50);
    writeUint16(centralView, 4, 20);
    writeUint16(centralView, 6, 20);
    writeUint16(centralView, 8, 0);
    writeUint16(centralView, 10, 0);
    writeUint16(centralView, 12, 0);
    writeUint16(centralView, 14, 0);
    writeUint32(centralView, 16, crc);
    writeUint32(centralView, 20, content.length);
    writeUint32(centralView, 24, content.length);
    writeUint16(centralView, 28, name.length);
    writeUint16(centralView, 30, 0);
    writeUint16(centralView, 32, 0);
    writeUint16(centralView, 34, 0);
    writeUint16(centralView, 36, 0);
    writeUint32(centralView, 38, 0);
    writeUint32(centralView, 42, localOffset);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + content.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const localSize = localParts.reduce((total, part) => total + part.length, 0);
  const endRecord = new Uint8Array(22);
  const endView = new DataView(endRecord.buffer);
  writeUint32(endView, 0, 0x06054b50);
  writeUint16(endView, 4, 0);
  writeUint16(endView, 6, 0);
  writeUint16(endView, 8, files.length);
  writeUint16(endView, 10, files.length);
  writeUint32(endView, 12, centralSize);
  writeUint32(endView, 16, localSize);
  writeUint16(endView, 20, 0);

  const bytes = new ArrayBuffer(localSize + centralSize + endRecord.length);
  const output = new Uint8Array(bytes);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, endRecord]) {
    output.set(part, cursor);
    cursor += part.length;
  }
  return new Blob([bytes], { type: XLSX_MEDIA_TYPE });
}

export function buildEventSubmissionsXlsx(submissions: readonly EventSubmission[]) {
  return zipStore([
    { name: "[Content_Types].xml", content: CONTENT_TYPES_XML },
    { name: "_rels/.rels", content: ROOT_RELS_XML },
    { name: "xl/workbook.xml", content: WORKBOOK_XML },
    { name: "xl/_rels/workbook.xml.rels", content: WORKBOOK_RELS_XML },
    { name: "xl/styles.xml", content: STYLES_XML },
    { name: "xl/worksheets/sheet1.xml", content: worksheetXml(eventSubmissionExportRows(submissions)) },
  ]);
}

async function loadSubmissionDetails(submissions: readonly EventSubmission[], signal?: AbortSignal) {
  const detailed = [...submissions];
  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < submissions.length) {
      const index = nextIndex;
      nextIndex += 1;
      try {
        detailed[index] = await fetchEventSubmission(submissions[index].id, signal);
      } catch {
        // Preserve the list record when a detail request fails so one incomplete record does not cancel the export.
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(6, submissions.length) }, () => worker()));
  return detailed;
}

function exportFileName(filters: EventSubmissionFilters, count: number) {
  const eventSlug = filters.eventName?.trim()
    ? filters.eventName.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase()
    : "filtered";
  return `event-inquiries-${eventSlug}-${count}-${new Date().toISOString().slice(0, 10)}.xlsx`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 500);
}

export async function downloadFilteredEventSubmissions(filters: EventSubmissionFilters, signal?: AbortSignal) {
  const submissions: EventSubmission[] = [];
  let offset = 0;

  while (true) {
    const response = await fetchEventSubmissions({
      ...filters,
      sortBy: "submittedAt",
      sortOrder: "desc",
      limit: EXPORT_PAGE_SIZE,
      offset,
    }, signal);
    submissions.push(...response.items);
    if (!response.pagination.hasMore || response.items.length === 0) break;
    offset += response.items.length;
    if (offset >= response.pagination.total) break;
  }

  if (!submissions.length) return 0;
  const detailedSubmissions = await loadSubmissionDetails(submissions, signal);
  downloadBlob(buildEventSubmissionsXlsx(detailedSubmissions), exportFileName(filters, detailedSubmissions.length));
  return detailedSubmissions.length;
}
