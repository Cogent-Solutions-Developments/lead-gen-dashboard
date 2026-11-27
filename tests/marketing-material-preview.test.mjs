import { test } from "node:test";
import assert from "node:assert/strict";
import { parseCsv, populatedColumns, columnLabel } from "../components/marketing/material-preview-data.ts";
test("quoted CSV preserves commas, multiline cells and escaped quotes", () => {
  assert.deepEqual(parseCsv('\uFEFFName,Notes\r\n"Doe, Alice","Said ""hello""\nand left"\r\n').rows, [["Name", "Notes"], ["Doe, Alice", 'Said "hello"\nand left']]);
});
test("blank columns preserve original labels", () => {
  assert.deepEqual(populatedColumns([["Name", "", "Role", ""], ["Alice", "", "Manager", ""]]), [0, 2]);
  assert.deepEqual([0, 25, 26, 29].map(columnLabel), ["A", "Z", "AA", "AD"]);
});
test("partial CSV records are omitted from truncated previews", () => {
  assert.deepEqual(parseCsv("Name,Role\nAlice,Manager\nBob,Devel", true), {rows: [["Name", "Role"], ["Alice", "Manager"]], limited: true});
});
test("CSV preview bounds work and expose truncation", () => {
  const data="Name\n"+Array.from({length:6000}, (_,i)=>`Person ${i}\n`).join("");
  assert.equal(parseCsv(data).rows.length,5001);
  assert.equal(parseCsv(data).limited,true);
});
