import { cp, mkdir, readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
const require = createRequire(import.meta.url);
const root = dirname(require.resolve("pdfjs-dist/package.json"));
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const destination = join(process.cwd(), "public", "marketing-pdf", version);
await mkdir(destination, { recursive: true });
await cp(join(root, "build/pdf.worker.min.mjs"), join(destination, "pdf.worker.min.mjs"));
for (const folder of ["cmaps", "standard_fonts", "wasm"]) {
  await cp(join(root, folder), join(destination, folder), { recursive: true });
}

await cp(join(root, "LICENSE"), join(destination, "LICENSE"));
