import JSZip from "jszip";
import type { StatusOutreachReport } from "./statusOutreachReport";

const chartNs = "http://schemas.openxmlformats.org/drawingml/2006/chart";
const drawingNs = "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing";
const mainNs = "http://schemas.openxmlformats.org/drawingml/2006/main";
const relNs = "http://schemas.openxmlformats.org/officeDocument/2006/relationships";
const xml = (value: string | number) => String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[char]!);

export function statusChartLayout(statusCount: number) {
  return { chartBottom: 26, tableHeaderRow: 29, noteRow: 32 + statusCount };
}

function textStyle(size = 1000) {
  return `<c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="${size}"><a:solidFill><a:srgbClr val="475569"/></a:solidFill><a:latin typeface="Arial"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr>`;
}

function title(text: string, vertical = false) {
  return `<c:title><c:tx><c:rich><a:bodyPr${vertical ? ' rot="-5400000"' : ""}/><a:lstStyle/><a:p><a:r><a:rPr lang="en-US" sz="1200" b="1"><a:solidFill><a:srgbClr val="17233D"/></a:solidFill><a:latin typeface="Arial"/></a:rPr><a:t>${xml(text)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>`;
}

function strings(formula: string, values: string[]) {
  return `<c:strRef><c:f>${xml(formula)}</c:f><c:strCache><c:ptCount val="${values.length}"/>${values.map((value, i) => `<c:pt idx="${i}"><c:v>${xml(value)}</c:v></c:pt>`).join("")}</c:strCache></c:strRef>`;
}

function numbers(formula: string, values: number[]) {
  return `<c:numRef><c:f>${xml(formula)}</c:f><c:numCache><c:formatCode>0</c:formatCode><c:ptCount val="${values.length}"/>${values.map((value, i) => `<c:pt idx="${i}"><c:v>${value}</c:v></c:pt>`).join("")}</c:numCache></c:numRef>`;
}

function scale(maximum: number) {
  const step = Math.max(1, Math.ceil(maximum / 4));
  return { step, maximum: Math.max(step, Math.ceil((maximum + step * 0.25) / step) * step) };
}

function axes(maximum: number) {
  const ticks = scale(maximum);
  return `<c:catAx><c:axId val="1001"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/>${title("Lead status")}<c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="low"/>${textStyle()}<c:crossAx val="1002"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:tickLblSkip val="1"/></c:catAx>` +
    `<c:valAx><c:axId val="1002"/><c:scaling><c:orientation val="minMax"/><c:max val="${ticks.maximum}"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E8EDF4"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>${title("Number of leads", true)}<c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/>${textStyle()}<c:crossAx val="1001"/><c:crosses val="autoZero"/><c:crossBetween val="between"/><c:majorUnit val="${ticks.step}"/></c:valAx>`;
}

function capAxes(points: number, maximum: number) {
  return `<c:valAx><c:axId val="1003"/><c:scaling><c:orientation val="minMax"/><c:max val="${points + 0.5}"/><c:min val="0.5"/></c:scaling><c:delete val="1"/><c:axPos val="b"/><c:crossAx val="1004"/><c:crosses val="autoZero"/></c:valAx>` +
    `<c:valAx><c:axId val="1004"/><c:scaling><c:orientation val="minMax"/><c:max val="${scale(maximum).maximum}"/><c:min val="0"/></c:scaling><c:delete val="1"/><c:axPos val="l"/><c:crossAx val="1003"/><c:crosses val="autoZero"/></c:valAx>`;
}

function chartSpace(body: string) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><c:chartSpace xmlns:c="${chartNs}" xmlns:a="${mainNs}" xmlns:r="${relNs}"><c:lang val="en-US"/><c:roundedCorners val="0"/>${body}<c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln><a:noFill/></a:ln></c:spPr></c:chartSpace>`;
}

function barChart(report: StatusOutreachReport) {
  const statuses = report.summary.statuses;
  const first = statusChartLayout(statuses.length).tableHeaderRow + 1;
  const last = first + statuses.length - 1;
  const counts = statuses.map(item => item.count);
  const maximum = Math.max(0, ...counts);
  const values = numbers(`Summary!$C$${first}:$C$${last}`, counts);
  const series = `<c:ser><c:idx val="0"/><c:order val="0"/><c:tx><c:v>Leads</c:v></c:tx><c:spPr><a:pattFill prst="ltUpDiag"><a:fgClr><a:srgbClr val="9A9FAE"/></a:fgClr><a:bgClr><a:srgbClr val="FFFFFF"/></a:bgClr></a:pattFill><a:ln><a:noFill/></a:ln></c:spPr>` +
    `<c:cat>${strings(`Summary!$B$${first}:$B$${last}`, statuses.map(item => item.status))}</c:cat><c:val>${values}</c:val></c:ser>`;
  // A marker-only overlay adds the short purple caps; it draws no connecting line.
  const caps = `<c:scatterChart><c:scatterStyle val="marker"/><c:varyColors val="0"/><c:ser><c:idx val="1"/><c:order val="1"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr><c:marker><c:symbol val="dash"/><c:size val="14"/><c:spPr><a:solidFill><a:srgbClr val="8061D9"/></a:solidFill><a:ln w="25400"><a:solidFill><a:srgbClr val="8061D9"/></a:solidFill></a:ln></c:spPr></c:marker><c:xVal><c:numLit><c:formatCode>0</c:formatCode><c:ptCount val="${statuses.length}"/>${statuses.map((_, i) => `<c:pt idx="${i}"><c:v>${i + 1}</c:v></c:pt>`).join("")}</c:numLit></c:xVal><c:yVal>${values}</c:yVal></c:ser><c:axId val="1003"/><c:axId val="1004"/></c:scatterChart>`;
  const labels = textStyle(1100).replace("475569", "17233D");
  return chartSpace(`<c:chart>${title("Leads by current status")}<c:plotArea><c:layout/><c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="0"/>${series}<c:dLbls>${labels}<c:dLblPos val="outEnd"/><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/></c:dLbls><c:gapWidth val="500"/><c:axId val="1001"/><c:axId val="1002"/></c:barChart>${caps}${axes(maximum)}${capAxes(statuses.length, maximum)}</c:plotArea><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart>`);
}

function anchor(id: number, name: string, fromCol: number, fromRow: number, toCol: number, toRow: number) {
  const marker = (tag: string, col: number, row: number) => `<xdr:${tag}><xdr:col>${col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:${tag}>`;
  return `<xdr:twoCellAnchor>${marker("from", fromCol, fromRow)}${marker("to", toCol, toRow)}<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${id + 1}" name="${name}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="${chartNs}"><c:chart xmlns:c="${chartNs}" r:id="rId${id}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`;
}

/** ExcelJS writes the workbook; these standard Open XML parts add native editable charts. */
export async function attachStatusOutreachCharts(bytes: Uint8Array, report: StatusOutreachReport) {
  const zip = await JSZip.loadAsync(bytes);
  if (zip.file("xl/drawings/drawing1.xml")) throw new Error("Report chart drawing already exists.");
  const layout = statusChartLayout(report.summary.statuses.length);
  const rel = (id: string, type: string, target: string) => `<Relationship Id="${id}" Type="${relNs}/${type}" Target="${target}"/>`;
  const sheetPath = "xl/worksheets/sheet1.xml";
  const sheet = await zip.file(sheetPath)!.async("string");
  const drawing = '<drawing r:id="rIdStatusCharts"/>';
  zip.file(sheetPath, sheet.includes("<tableParts") ? sheet.replace("<tableParts", drawing + "<tableParts") : sheet.replace("</worksheet>", drawing + "</worksheet>"));
  const relPath = "xl/worksheets/_rels/sheet1.xml.rels";
  const sheetRels = await zip.file(relPath)!.async("string");
  zip.file(relPath, sheetRels.replace("</Relationships>", rel("rIdStatusCharts", "drawing", "../drawings/drawing1.xml") + "</Relationships>"));
  zip.file("xl/drawings/drawing1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${drawingNs}" xmlns:a="${mainNs}" xmlns:r="${relNs}">${anchor(1, "Leads by current status", 1, 10, 6, layout.chartBottom)}</xdr:wsDr>`);
  zip.file("xl/drawings/_rels/drawing1.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${Array.from({ length: 1 }, (_, i) => rel(`rId${i + 1}`, "chart", `../charts/chart${i + 1}.xml`)).join("")}</Relationships>`);
  zip.file("xl/charts/chart1.xml", barChart(report));
  const types = await zip.file("[Content_Types].xml")!.async("string");
  const overrides = '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' +
    Array.from({ length: 1 }, (_, i) => `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`).join("");
  zip.file("[Content_Types].xml", types.replace("</Types>", overrides + "</Types>"));
  return new Uint8Array(await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 6 } }));
}
