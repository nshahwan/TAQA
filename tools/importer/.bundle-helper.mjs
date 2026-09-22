/* eslint-disable */
/**
 * Repo-local manual bundler (esbuild replacement — the esbuild native binary
 * segfaults in this environment). Concatenates an import script's ESM parser +
 * transformer imports into a single IIFE that exposes
 * `window.CustomImportScript.default`, matching what run-bulk-import.js expects.
 *
 * Usage: node tools/importer/.bundle-helper.mjs tools/importer/import-<template>.js
 * Output: tools/importer/import-<template>.bundle.js
 *
 * Strategy: resolve every relative import (parsers/*, transformers/*),
 * strip its own import lines + `export default`, wrap each module body in a
 * factory that returns its default export, then wire the registries by
 * replacing the entry file's import identifiers with the factory results.
 * All modules are inlined; no runtime module resolution is needed.
 */
import fs from 'node:fs';
import path from 'node:path';

const entry = process.argv[2];
if (!entry) {
  console.error('Usage: node .bundle-helper.mjs <import-script.js>');
  process.exit(1);
}

const entryDir = path.dirname(entry);
const entrySrc = fs.readFileSync(entry, 'utf8');

// Collect relative imports: `import name from './rel/path.js';`
const importRe = /import\s+(\w+)\s+from\s+['"](\.[^'"]+)['"];?/g;
const modules = [];
let m;
while ((m = importRe.exec(entrySrc)) !== null) {
  modules.push({ ident: m[1], rel: m[2] });
}

// Turn one imported module into an IIFE factory expression returning its default.
function moduleFactory(relPath) {
  const abs = path.resolve(entryDir, relPath);
  let src = fs.readFileSync(abs, 'utf8');
  // Strip any of its own relative imports (none expected in leaf parsers, but be safe)
  src = src.replace(/import\s+\w+\s+from\s+['"][^'"]+['"];?/g, '');
  // Convert `export default function name(...)` / `export default function(...)`
  // and `export default <expr>;` into a returned value.
  // Handle: export default function foo(...) { ... }
  src = src.replace(/export\s+default\s+function\s+(\w+)?/, (mm, name) => {
    return `return function ${name || ''}`;
  });
  // Handle: export default <identifier or object>;  (fallback if not a function)
  src = src.replace(/export\s+default\s+/, 'return ');
  return `(function () {\n${src}\n})()`;
}

// Build the bundle: define each module's default as a const, then inline the
// entry file with its imports removed and its default export attached to window.
let out = '(function () {\n';
out += '  var WebImporter = window.WebImporter;\n';

const identMap = {};
modules.forEach((mod, i) => {
  const varName = `__mod_${i}`;
  identMap[mod.ident] = varName;
  out += `  var ${varName} = ${moduleFactory(mod.rel)};\n`;
});

// Entry body: strip its imports, replace `export default` with assignment.
let body = entrySrc.replace(importRe, '');
// Replace the imported identifiers used in the registries with the module vars.
Object.entries(identMap).forEach(([ident, varName]) => {
  // word-boundary replace of the identifier
  body = body.replace(new RegExp(`\\b${ident}\\b`, 'g'), varName);
});
body = body.replace(/export\s+default\s+/, 'window.CustomImportScript = { default: ');
// close the { default: ... } wrapper. The entry's default export is an object
// literal ending in `};` — append the extra closer so we produce
// `window.CustomImportScript = { default: {...} };`
body = body.replace(/\};\s*$/, '} };\n');

out += body + '\n})();\n';

const outPath = entry.replace(/\.js$/, '.bundle.js');
fs.writeFileSync(outPath, out);
console.log('Bundled ->', outPath, `(${modules.length} modules inlined)`);
