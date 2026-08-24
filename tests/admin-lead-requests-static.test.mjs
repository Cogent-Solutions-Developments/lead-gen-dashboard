import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(path.join(root, "app/admin/lead-requests/page.tsx"), "utf8");

test("admin lead-request details use full-width rows with taller bounded long content", () => {
  assert.match(page, /grid grid-cols-1 gap-5/);
  assert.doesNotMatch(page, /sm:grid-cols-2/);
  assert.match(page, /long \? "min-h-36 max-h-72" : "max-h-36"/);
  assert.match(page, /label="Target designation"[\s\S]*?long/);
  assert.match(page, /label="Company list"[\s\S]*?long/);
  assert.match(page, /label="ICP"[\s\S]*?long/);
  assert.match(page, /overflow-y-auto/);
  assert.match(page, /whitespace-pre-wrap break-words/);
  assert.match(page, /scrollbar-modern/);
  assert.match(page, /tabIndex=\{0\}/);
});

test("every rendered lead-request detail provides copy feedback", () => {
  assert.match(page, /async function writeClipboardText/);
  assert.match(page, /navigator\.clipboard\?\.writeText/);
  assert.match(page, /document\.execCommand\("copy"\)/);
  assert.match(page, /onClick=\{\(\) => void copyDetail\(\)\}/);
  assert.match(page, /h-8 w-8/);
  assert.match(page, /title=\{copied \? `\$\{label\} copied` : `Copy \$\{label\}`\}/);
  assert.doesNotMatch(page, /<span>\{copied \? "Copied" : "Copy"\}<\/span>/);
  assert.match(page, /toast\.success\(`\$\{label\} copied`\)/);
});
