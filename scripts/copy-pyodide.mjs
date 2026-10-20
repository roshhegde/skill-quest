// Copies the Pyodide runtime from node_modules into public/ so the core
// interpreter is served by our own site. Extra packages (micropip, moto, ...)
// are fetched from the Pyodide CDN at runtime.
import { cpSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const FILES = [
  "pyodide.mjs",
  "pyodide.asm.mjs",
  "pyodide.asm.wasm",
  "python_stdlib.zip",
  "pyodide-lock.json",
];
const src = join("node_modules", "pyodide");
const dest = join("public", "pyodide");
mkdirSync(dest, { recursive: true });
for (const file of FILES) cpSync(join(src, file), join(dest, file));
console.log(`Copied ${FILES.length} Pyodide files to ${dest}`);
