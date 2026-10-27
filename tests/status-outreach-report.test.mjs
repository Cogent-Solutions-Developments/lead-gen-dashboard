import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import ExcelJS from "exceljs";
import JSZip from "jszip";
import * as activity from "../lib/statusOutreachActivity.ts";

const mod = { exports: {} };
const code = ts.transpileModule(readFileSync(new URL("../lib/statusOutreachReport.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
runInNewContext(code, { module: mod, exports: mod.exports, Date, require: key => {
  assert.equal(key, "./statusOutreachActivity"); return activity;
} });
const { collectStatusOutreachReport, createStatusOutreachReport } = mod.exports;
const filters = { startDate: "2026-10-01", endDate: "2026-10-27", department: "sales", eventKey: "Summit & Forum" };
const lead = {
  id: "lead-1", name: 'Maya, "Silva"', company: "Example Labs", email: "maya@example.invalid", department: "sales",
  eventName: "Summit & Forum", eventKey: filters.eventKey, owner: "Priya", status: "proposal-sent", previousStatus: "first-call",
  actor: "Admin", updatedAt: "2026-10-26T18:30:00Z", previousAt: "2026-10-25T18:29:59Z", comment: 'First line\nSecond "line", café',
  deliveryState: "active", mail: { sent: 1, nextDueAt: "2026-10-29T10:00:00Z", reason: null,
    messages: [{ step: 1, status: "delivered", confirmedAt: "2026-10-25T12:00:00Z" }, { step: 2, status: "accepted", confirmedAt: null }] },
};

const chartsModule = { exports: {} };
const chartsCode = ts.transpileModule(readFileSync(new URL("../lib/statusOutreachCharts.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
runInNewContext(chartsCode, { module: chartsModule, exports: chartsModule.exports, Date, Uint8Array,
  require: key => { assert.equal(key, "jszip"); return JSZip; } });
const workbookModule = { exports: {} };
const workbookCode = ts.transpileModule(readFileSync(new URL("../lib/statusOutreachWorkbook.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
runInNewContext(workbookCode, { module: workbookModule, exports: workbookModule.exports, Date, Uint8Array,
  require: key => { if (key === "./statusOutreachCharts") return chartsModule.exports; assert.equal(key, "exceljs"); return ExcelJS; } });
const { exportStatusOutreachWorkbook } = workbookModule.exports;

test("report collects every page and retains applied filter scope", async () => {
  const items = Array.from({ length: 205 }, (_, i) => ({ ...lead, id: `lead-${i + 1}` }));
  const offsets = [];
  const rows = await collectStatusOutreachReport(filters, async path => {
    const query = new URLSearchParams(path.split("?")[1]);
    assert.equal(query.get("department"), "sales"); assert.equal(query.get("eventKey"), filters.eventKey);
    assert.equal(query.get("startDate"), filters.startDate); assert.equal(query.get("endDate"), filters.endDate);
    assert.equal(query.get("timezone"), "Asia/Colombo"); assert.equal(query.get("status"), null);
    const offset = Number(query.get("offset")); offsets.push(offset);
    return { items: items.slice(offset, offset + 100), total: 205, offset, limit: 100 };
  });
  assert.equal(rows.length, 205);
  assert.deepEqual(offsets, [0, 100, 200]);
  assert.equal(new Set(rows.map(row => row.id)).size, 205);
});

test("incomplete or changing pages fail instead of downloading a partial report", async () => {
  for (const second of [
    { items: [], total: 2, offset: 1 },
    { items: [lead], total: 2, offset: 1 },
    { items: [{ ...lead, id: "lead-2" }], total: 3, offset: 1 },
  ]) {
    let calls = 0;
    await assert.rejects(collectStatusOutreachReport(filters, async () => ++calls === 1
      ? { items: [lead], total: 2, offset: 0 } : second), /retry/);
  }
  const controller = new AbortController();
  await assert.rejects(collectStatusOutreachReport(filters, async () => {
    controller.abort(); return { items: [lead], total: 1, offset: 0 };
  }, controller.signal), { name: "AbortError" });
  assert.equal((await collectStatusOutreachReport(filters, async () => ({ items: [], total: 0, offset: 0 }))).length, 0);
});

test("Excel data keeps dates and counts typed and confirmation states accurate", () => {
  const report = createStatusOutreachReport([lead], filters, new Date("2026-10-27T12:00:00Z"));
  assert.equal(report.filename, "status-outreach_2026-10-01_to_2026-10-27.xlsx");
  const row = Object.fromEntries(report.headers.map((column, i) => [column, report.records[0][i]]));
  assert.equal(row.Name, lead.name); assert.equal(row["Latest comment"], lead.comment);
  assert.ok(row["Latest status update (Sri Lanka time)"] instanceof Date);
  assert.equal(row["Latest status update (Sri Lanka time)"].toISOString(), "2026-10-27T00:00:00.000Z");
  assert.equal(row["Email 1 confirmed at (Sri Lanka time)"].toISOString(), "2026-10-25T17:30:00.000Z");
  assert.equal(row["Email 2 status"], "Awaiting confirmation");
  assert.equal(row["Email 2 confirmed at (Sri Lanka time)"], null);
  assert.equal(row["Confirmed emails (lifetime)"], 1);
  assert.equal(report.summary.from.toISOString(), "2026-10-01T00:00:00.000Z");
  assert.equal(report.summary.generatedAt.toISOString(), "2026-10-27T17:30:00.000Z");
  assert.equal(createStatusOutreachReport([lead], filters).filename, "status-outreach_2026-10-01_to_2026-10-27.xlsx");
});

test("styled Excel round-trip preserves literal text, native tables, dates and panes", async () => {
  const text = '=SUM(A1) + "caf?",\nsecond line';
  const report = createStatusOutreachReport([{ ...lead, name: text, comment: text }], filters);
  const bytes = await exportStatusOutreachWorkbook(report);
  assert.equal(bytes[0], 0x50); assert.equal(bytes[1], 0x4b); // XLSX zip signature.
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(bytes);
  assert.deepEqual(workbook.worksheets.map(sheet => sheet.name), ["Summary", "Leads"]);
  const summary = workbook.getWorksheet("Summary"), details = workbook.getWorksheet("Leads");
  assert.equal(summary.getCell("C12").value, null);
  assert.equal(summary.getCell("C30").result, 1);
  assert.match(summary.getCell("C30").formula, /COUNTIF/);
  assert.equal(summary.getTable("OutreachSummary"), undefined);
  assert.ok(summary.getCell("C6").value instanceof Date);
  assert.equal(summary.getCell("F9").value, "Asia/Colombo");
  assert.equal(details.getCell("B5").value, text); assert.equal(details.getCell("B5").formula, undefined);
  assert.equal(details.getCell("M5").value, text);
  assert.ok(details.getCell("K5").value instanceof Date);
  assert.equal(details.getCell("O5").value, 1);
  assert.equal(details.getCell("A4").fill.fgColor.argb, "FF17233D");
  assert.equal(details.getCell("A4").font.color.argb, "FFFFFFFF");
  assert.ok(details.getTable("StatusOutreachLeads"));
  assert.ok(summary.getTable("WorkflowStatuses"));
  assert.equal(details.views[0].state, "frozen"); assert.equal(details.views[0].ySplit, 4); assert.equal(details.views[0].xSplit, 2);
  assert.equal(details.views[0].showGridLines, false);
});

test("summary reconciles to all exported filtered rows, including multiple pages", async () => {
  const items = Array.from({ length: 105 }, (_, i) => ({ ...lead, id: `lead-${i + 1}`,
    status: i < 60 ? "proposal-sent" : "first-call", deliveryState: i < 3 ? "attention" : i < 5 ? "paused" : "active" }));
  const rows = await collectStatusOutreachReport(filters, async path => {
    const offset = Number(new URLSearchParams(path.split("?")[1]).get("offset"));
    return { items: items.slice(offset, offset + 100), total: 105, offset, limit: 100 };
  });
  const report = createStatusOutreachReport(rows, filters);
  const summary = report.summary;
  assert.equal(report.records.length, 105); assert.equal(summary.total, 105);
  assert.equal(summary.statuses.reduce((sum, item) => sum + item.count, 0), summary.total);
  assert.equal(summary.statuses.find(item => item.status === "Proposal Sent").count, 60);
  assert.equal(summary.statuses.find(item => item.status === "First Call").count, 45);
  assert.equal(summary.confirmedEmails, 105); assert.equal(summary.awaitingConfirmation, 105);
  assert.equal(summary.scheduledLeads, 105); assert.equal(summary.needsAttention, 3); assert.equal(summary.pausedLeads, 2);
  assert.equal(summary.missingMailData, 0); assert.equal(summary.department, "Sales"); assert.equal(summary.event, "Summit & Forum");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await exportStatusOutreachWorkbook(report));
  assert.equal(workbook.getWorksheet("Leads").rowCount, 109);
  assert.equal(workbook.getWorksheet("Summary").getCell("C30").result + workbook.getWorksheet("Summary").getCell("C31").result, 105);
});

test("summary labels all-event scopes and missing mail data accurately", () => {
  const unfiltered = { ...filters, department: "", eventKey: "" };
  const report = createStatusOutreachReport([{ ...lead, mail: undefined }], unfiltered);
  assert.equal(report.summary.department, "All departments"); assert.equal(report.summary.event, "All events");
  assert.equal(report.summary.total, 1); assert.equal(report.summary.missingMailData, 1);
  assert.equal(report.records[0][14], null);
  assert.equal(createStatusOutreachReport([], unfiltered).summary.total, 0);
});


test("Excel has one vertical hatched status chart with purple caps and no line chart", async () => {
  const report = createStatusOutreachReport([lead], filters);
  const zip = await JSZip.loadAsync(await exportStatusOutreachWorkbook(report));
  const chartFiles = Object.keys(zip.files).filter(name => /^xl\/charts\/chart\d+\.xml$/.test(name));
  assert.deepEqual(chartFiles, ["xl/charts/chart1.xml"]);
  const chart = await zip.file(chartFiles[0]).async("string");
  assert.match(chart, /<c:barDir val="col"/);
  assert.match(chart, /<a:pattFill prst="ltUpDiag"/);
  assert.match(chart, /<c:tickLblPos val="low"/);
  assert.match(chart, /<a:t>Lead status<\/a:t>/);
  assert.match(chart, /<a:t>Number of leads<\/a:t>/);
  assert.match(chart, /<c:catAx>.*<c:delete val="0"/);
  assert.match(chart, /<c:showVal val="1"/);
  assert.match(chart, /<c:symbol val="dash"/);
  assert.match(chart, /8061D9/);
  assert.match(chart, /Summary!\$B\$30/);
  assert.doesNotMatch(chart, /<c:lineChart>/);
});

test("export follows workflow order and current filtered counts", () => {
  const rows = ["confirmed", "proposal-sent", "new", "first-call", "interested", "not-interested"].map((status, i) => ({ ...lead, id: String(i), status }));
  const report = createStatusOutreachReport(rows, filters);
  assert.equal(report.summary.statuses.map(item => item.status).join(","), "New,First Call,Interested,Proposal Sent,Confirmed,Not Interested");
  assert.equal(report.summary.statuses.reduce((sum, item) => sum + item.count, 0), rows.length);
});
