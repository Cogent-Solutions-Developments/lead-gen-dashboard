import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(path.join(root, "app/admin/lead-requests/page.tsx"), "utf8");

test("admin lead-request details use the specified compact two-column row order", () => {
  assert.match(page, /grid grid-cols-1 gap-4[^"]*sm:grid-cols-2/);
  assert.match(
    page,
    /label="Leads per company"[\s\S]*?label="Location"[\s\S]*?label="Company list"[\s\S]*?label="Target designation"/,
  );
  assert.match(page, /sm:col-span-2[\s\S]*?label="ICP"/);
  assert.match(page, /long \? "max-h-52" : "max-h-28"/);
  assert.doesNotMatch(page, /min-h-36/);
  assert.match(page, /grid min-w-0 items-start gap-5/);
  assert.match(page, /label="Target designation"[\s\S]*?long/);
  assert.match(page, /label="Company list"[\s\S]*?long/);
  assert.match(page, /label="ICP"[\s\S]*?long/);
  assert.match(page, /overflow-y-auto/);
  assert.match(page, /whitespace-pre-wrap break-words/);
  assert.match(page, /scrollbar-modern/);
  assert.match(page, /tabIndex=\{0\}/);
  assert.match(page, /flex h-full min-w-0 flex-col/);
  assert.match(page, /relative mt-2 min-h-0 flex-1/);
  assert.match(page, /className="h-full sm:col-span-2"/);
});

test("copyable lead-request details provide copy feedback", () => {
  assert.match(page, /async function writeClipboardText/);
  assert.match(page, /navigator\.clipboard\?\.writeText/);
  assert.match(page, /document\.execCommand\("copy"\)/);
  assert.match(page, /onClick=\{\(\) => void copyDetail\(\)\}/);
  assert.match(page, /h-8 w-8/);
  assert.match(page, /absolute right-3 top-2/);
  assert.match(page, /py-2 pl-3 text-sm/);
  assert.doesNotMatch(page, /flex items-center justify-between gap-3/);
  assert.match(page, /title=\{copied \? `\$\{label\} copied` : `Copy \$\{label\}`\}/);
  assert.doesNotMatch(page, /<span>\{copied \? "Copied" : "Copy"\}<\/span>/);
  assert.match(page, /toast\.success\(`\$\{label\} copied`\)/);
});

test("uploaded campaign and completed details remain read-only without copy actions", () => {
  assert.match(page, /copyable = true/);
  assert.match(page, /copyable \? "pr-14" : "pr-3"/);
  assert.match(page, /label="Uploaded campaign"[^>]*copyable=\{false\}/);
  assert.match(page, /label="Completed"[^>]*copyable=\{false\}/);
  assert.match(page, /\{copyable \? \(/);
});
