export type DiffPart = { text: string; changed: boolean };
export function wordDiff(before: string, after: string): { before: DiffPart[]; after: DiffPart[] } {
  if (before === after) return { before: [{ text: before, changed: false }], after: [{ text: after, changed: false }] };
  const tokens = (text: string) => text.match(/\s+|[\p{L}\p{N}_]+|[^\s\p{L}\p{N}_]/gu) || [];
  const left = tokens(before), right = tokens(after);
  let prefix = 0, suffix = 0;
  while (prefix < left.length && prefix < right.length && left[prefix] === right[prefix]) prefix++;
  while (suffix < left.length - prefix && suffix < right.length - prefix && left[left.length - suffix - 1] === right[right.length - suffix - 1]) suffix++;
  const a = left.slice(prefix, left.length - suffix), b = right.slice(prefix, right.length - suffix);
  const result: { before: DiffPart[]; after: DiffPart[] } = { before: [], after: [] };
  function append(side: DiffPart[], text: string, changed: boolean) {
    if (!text) return;
    const last = side.at(-1);
    if (last?.changed === changed) last.text += text;
    else side.push({ text, changed });
  }
  const commonStart = left.slice(0, prefix).join("");
  append(result.before, commonStart, false); append(result.after, commonStart, false);
  // Bound work for long biographies; retain exact text and common edges.
  if (a.length * b.length > 60000) {
    append(result.before, a.join(""), true); append(result.after, b.join(""), true);
  } else {
    const width = b.length + 1;
    const table = new Uint16Array((a.length + 1) * width);
    for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--)
      table[i * width + j] = a[i] === b[j] ? 1 + table[(i + 1) * width + j + 1] : Math.max(table[(i + 1) * width + j], table[i * width + j + 1]);
    let i = 0, j = 0;
    while (i < a.length || j < b.length) {
      if (i < a.length && j < b.length && a[i] === b[j]) {
        append(result.before, a[i], false); append(result.after, b[j], false); i++; j++;
      } else if (i < a.length && (j === b.length || table[(i + 1) * width + j] >= table[i * width + j + 1])) {
        append(result.before, a[i++], true);
      } else append(result.after, b[j++], true);
    }
  }
  const commonEnd = suffix ? left.slice(left.length - suffix).join("") : "";
  append(result.before, commonEnd, false); append(result.after, commonEnd, false);
  return result;
}
