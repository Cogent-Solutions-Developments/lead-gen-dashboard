import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const page = fs.readFileSync(path.join(root, "app/admin/lead-requests/page.tsx"), "utf8");

test("admin lead-request details stay bounded and independently scrollable", () => {
  assert.match(page, /max-h-48 overflow-y-auto/);
  assert.match(page, /whitespace-pre-wrap break-words/);
  assert.match(page, /scrollbar-modern/);
  assert.match(page, /tabIndex=\{0\}/);
});

test("every rendered lead-request detail provides copy feedback", () => {
  assert.match(page, /async function writeClipboardText/);
  assert.match(page, /navigator\.clipboard\?\.writeText/);
  assert.match(page, /document\.execCommand\("copy"\)/);
  assert.match(page, /onClick=\{\(\) => void copyDetail\(\)\}/);
  assert.match(page, /copied \? "Copied" : "Copy"/);
  assert.match(page, /toast\.success\(`\$\{label\} copied`\)/);
});
