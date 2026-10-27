import ExcelJS from "exceljs";
import type { Cell, CellValue, Worksheet } from "exceljs";
import type { StatusOutreachReport } from "./statusOutreachReport";
import { attachStatusOutreachCharts, statusChartLayout } from "./statusOutreachCharts";

const colors = { ink: "FF17233D", muted: "FF64748B", accent: "FF6356B5", line: "FFDCE3EE", white: "FFFFFFFF",
  green: "FF16634B", greenFill: "FFE5F4EC", amber: "FF8A4B08", amberFill: "FFFFF0D6", blue: "FF2455A4", blueFill: "FFEAF1FF", greyFill: "FFF1F4F8" };
const dateFormat = "dd mmm yyyy";
const timeFormat = "dd mmm yyyy hh:mm";
const fill = (argb: string) => ({ type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } });

function setCell(sheet: Worksheet, address: string, value: CellValue, bold = false) {
  const cell = sheet.getCell(address);
  cell.value = value;
  cell.font = { name: "Arial", size: 11, color: { argb: colors.ink }, bold };
  cell.alignment = { vertical: "middle", horizontal: typeof value === "number" ? "right" : "left" };
  return cell;
}

function title(sheet: Worksheet, address: string, text: string) {
  const cell = setCell(sheet, address, text, true);
  cell.font = { ...cell.font, size: 16 };
}

function tableHeaders(sheet: Worksheet, row: number, start: number, end: number) {
  for (let column = start; column <= end; column++) {
    const cell = sheet.getCell(row, column);
    cell.fill = fill(colors.ink);
    cell.font = { name: "Arial", size: 11, bold: true, color: { argb: colors.white } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    if (column < end) cell.border = { right: { style: "thin", color: { argb: colors.white } } };
  }
}

function statusColors(sheet: Worksheet, ref: string, anchor: string) {
  const groups = [
    { values: ["Confirmed", "Completed", "Delivered", "Sent", "Opened", "Clicked", "Replied"], bg: colors.greenFill, fg: colors.green },
    { values: ["Attention", "Failed", "Blocked", "Bounced", "Needs checking", "Content failed"], bg: colors.amberFill, fg: colors.amber },
    { values: ["Interested", "Proposal Sent", "Active", "Content ready", "Awaiting confirmation", "Sending", "Preparing content"], bg: colors.blueFill, fg: colors.blue },
    { values: ["Paused", "Stopped", "Not Interested", "Unsubscribed"], bg: colors.greyFill, fg: colors.muted },
  ];
  sheet.addConditionalFormatting({ ref, rules: groups.map((group, index) => ({
    type: "expression" as const, priority: index + 1,
    formulae: [`OR(${group.values.map(value => `${anchor}="${value}"`).join(",")})`],
    style: { fill: fill(group.bg), font: { bold: true, color: { argb: group.fg } } },
  })) });
}

export function createStatusOutreachWorkbook(report: StatusOutreachReport) {
  if (!report.count) throw new Error("No leads match these filters.");
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Supernizo";
  workbook.title = "Status Outreach report";
  workbook.subject = "Filtered lead statuses and outreach";
  workbook.calcProperties.fullCalcOnLoad = true;
  const summary = workbook.addWorksheet("Summary", { properties: { tabColor: { argb: colors.accent } },
    views: [{ showGridLines: false, zoomScale: 90 }] });
  const leads = workbook.addWorksheet("Leads", { views: [{ state: "frozen", xSplit: 2, ySplit: 4,
    topLeftCell: "C5", activeCell: "A5", showGridLines: false, zoomScale: 90 }] });
  summary.columns = [{ width: 3 }, { width: 34 }, { width: 27 }, { width: 4 }, { width: 33 }, { width: 27 }, { width: 3 }];
  const widths = [20, 28, 28, 36, 18, 38, 26, 24, 24, 26, 28, 28, 56, 24, 24, 28, 28, 28, 28, 28, 28, 28, 48];
  leads.columns = widths.map(width => ({ width }));
  title(summary, "B2", "Status Outreach");
  setCell(summary, "B3", "Filtered lead report").font = { name: "Arial", size: 11, color: { argb: colors.muted } };
  for (let column = 2; column <= 6; column++) summary.getCell(4, column).border = { bottom: { style: "thin", color: { argb: colors.accent } } };
  const scope = report.summary;
  for (const [address, value] of [["B6", "From date"], ["E6", "To date"], ["B7", "Department"],
    ["B8", "Event"], ["B9", "Generated at"], ["E9", "Timezone"]] as const) {
    setCell(summary, address, value).font = { name: "Arial", size: 11, color: { argb: colors.muted } };
  }
  setCell(summary, "C6", scope.from).numFmt = dateFormat;
  setCell(summary, "F6", scope.to).numFmt = dateFormat;
  setCell(summary, "C7", scope.department);
  summary.mergeCells("C8:F8");
  setCell(summary, "C8", scope.event).alignment = { vertical: "middle", wrapText: true };
  summary.getRow(8).height = Math.min(90, Math.max(24, Math.ceil(scope.event.length / 85) * 18));
  setCell(summary, "C9", scope.generatedAt).numFmt = timeFormat;
  setCell(summary, "F9", scope.timezone);
  const last = report.count + 4;
  const range = (column: string) => `Leads!$${column}$5:$${column}$${last}`;
  const layout = statusChartLayout(scope.statuses.length);
  summary.addTable({ name: "WorkflowStatuses", ref: `B${layout.tableHeaderRow}`, headerRow: true, totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: [{ name: "Lead status", filterButton: false }, { name: "Matching leads", filterButton: false }],
    rows: scope.statuses.map(({ status, count }) => [status, { formula: `COUNTIF(${range("H")},"${status.replace(/"/g, '""').replace(/[~*?]/g, char => "~" + char)}")`, result: count }]) });
  tableHeaders(summary, layout.tableHeaderRow, 2, 3);
  statusColors(summary, `B${layout.tableHeaderRow + 1}:B${layout.tableHeaderRow + scope.statuses.length}`, `B${layout.tableHeaderRow + 1}`);
  const noteRow = layout.noteRow;
  summary.mergeCells(`B${noteRow}:F${noteRow + 1}`);
  setCell(summary, `B${noteRow}`, "Current lead counts by status for the selected dates, department, and event. Dates filter the latest lead status update. Email confirmation details are on Leads.")
    .alignment = { wrapText: true, vertical: "middle" };
  summary.mergeCells(`B${noteRow + 3}:F${noteRow + 3}`);
  setCell(summary, `B${noteRow + 3}`, "All timestamps use Sri Lanka time (UTC+05:30).").font = { name: "Arial", size: 11, italic: true, color: { argb: colors.muted } };

  title(leads, "A1", "Lead details");
  setCell(leads, "A2", "Use the column filters to explore these exported leads. Report scope and totals are on Summary.")
    .font = { name: "Arial", size: 11, color: { argb: colors.muted } };
  leads.addTable({ name: "StatusOutreachLeads", ref: "A4", headerRow: true, totalsRow: false,
    style: { theme: "TableStyleMedium2", showRowStripes: true },
    columns: report.headers.map(name => ({ name, filterButton: true })), rows: report.records });
  tableHeaders(leads, 4, 1, report.headers.length);
  leads.getRow(4).height = 44;
  leads.eachRow((row, rowNumber) => {
    if (rowNumber < 5) return;
    let lines = 1;
    row.eachCell((cell, column) => {
      cell.font = { name: "Arial", size: 11, color: { argb: colors.ink } };
      cell.alignment = { vertical: "top", wrapText: true, horizontal: typeof cell.value === "number" ? "right" : "left" };
      if (cell.value instanceof Date) cell.numFmt = timeFormat;
      if (column === 15) cell.numFmt = "#,##0";
      if (typeof cell.value === "string") lines = Math.max(lines, ...cell.value.split(/\r?\n/).map(line => Math.ceil(line.length / (widths[column - 1] - 3))));
    });
    row.height = Math.min(409, Math.max(30, lines * 16 + 8));
  });
  for (const column of ["H", "N", "P", "R", "T"]) statusColors(leads, `${column}5:${column}${last}`, `${column}5`);
  summary.eachRow(row => {
    row.height = Math.max(row.height ?? 24, 24);
    row.eachCell((cell: Cell) => {
      if (!cell.font?.name) cell.font = { name: "Arial", size: 11, color: { argb: colors.ink } };
      cell.alignment = { vertical: "middle", ...cell.alignment };
      if (cell.type === ExcelJS.ValueType.Formula) { cell.numFmt = "#,##0"; cell.alignment = { vertical: "middle", horizontal: "right" }; }
    });
  });
  summary.pageSetup = { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 1,
    printArea: `B2:F${noteRow + 3}` };
  return workbook;
}

export async function exportStatusOutreachWorkbook(report: StatusOutreachReport) {
  const workbook = createStatusOutreachWorkbook(report);
  return attachStatusOutreachCharts(new Uint8Array(await workbook.xlsx.writeBuffer()), report);
}
