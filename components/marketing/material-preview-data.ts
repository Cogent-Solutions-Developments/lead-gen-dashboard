/** Bounded CSV parsing for a read-only preview. Never interpret cell contents. */
export function parseCsv(input: string, truncated = false) {
  const text = input.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", quoted = false, limited = truncated;
  const firstLine = text.split(/\r?\n/, 1)[0];
  const delimiter = !firstLine.includes(",") && firstLine.includes(";") ? ";" : ",";
  function finishRow() {
    row.push(cell);
    if (row.some(value => value.trim())) rows.push(row.slice(0, 100));
    if (row.length > 100) limited = true;
    row = []; cell = "";
  }
  for (let index = 0; index < text.length; index++) {
    const char = text[index];
    if (char === '"') {
      if (quoted && text[index + 1] === '"') { cell += '"'; index++; }
      else quoted = !quoted;
    } else if (char === delimiter && !quoted) { row.push(cell); cell = ""; }
    else if ((char === "\n" || char === "\r") && !quoted) {
      finishRow();
      if (char === "\r" && text[index + 1] === "\n") index++;
      if (rows.length >= 5001) { limited = index < text.length - 1 || limited; break; }
    } else cell += char;
  }
  if (rows.length < 5001 && !quoted && !truncated && (cell || row.length)) finishRow();
  if (quoted) limited = true;
  return { rows, limited };
}

export function columnLabel(index: number): string {
  let label = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26))
    label = String.fromCharCode(65 + (value - 1) % 26) + label;
  return label;
}

export function populatedColumns(rows: string[][]): number[] {
  const populated = new Set<number>();
  rows.forEach(row => row.forEach((cell, index) => { if (cell.trim()) populated.add(index); }));
  return [...populated].sort((a, b) => a - b);
}
