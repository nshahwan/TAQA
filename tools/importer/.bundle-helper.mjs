/*
 * Minimal manual bundler — emulates the esbuild IIFE bundle that
 * @adobe/aem-import-helper produces, for environments where the esbuild
 * native binary cannot run. Only valid because our import.js graph is shallow:
 * import.js imports parser/transformer modules that each have a single
 * `export default function` and NO further imports / npm deps.
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';

const entryPath = process.argv[2];
const entryDir = dirname(resolve(entryPath));

// Parse `import <ident> from '<rel>';` lines from a module's source.
function parseImports(src) {
  const re = /import\s+(\w+)\s+from\s+['"]([^'"]+)['"];?/g;
  const imports = [];
  let m;
  while ((m = re.exec(src)) !== null) {
    imports.push({ ident: m[1], rel: m[2] });
  }
  return imports;
}

let counter = 0;
const moduleVarByPath = new Map();

// Emit a module as `var __modN = (function(){ <body>; return <defaultName>; })();`
// Returns the generated var name. Recurses into that module's own imports first.
function emitModule(absPathNoExt) {
  const abs = absPathNoExt.endsWith('.js') ? absPathNoExt : `${absPathNoExt}.js`;
  if (moduleVarByPath.has(abs)) return { varName: moduleVarByPath.get(abs), code: '' };

  let src = readFileSync(abs, 'utf-8');
  const dir = dirname(abs);
  const imports = parseImports(src);

  // Recursively emit dependencies, remember their var names.
  let depCode = '';
  const identToVar = {};
  for (const imp of imports) {
    const depAbs = resolve(dir, imp.rel);
    const { varName, code } = emitModule(depAbs);
    depCode += code;
    identToVar[imp.ident] = varName;
  }

  // Strip import lines.
  src = src.replace(/import\s+\w+\s+from\s+['"][^'"]+['"];?\s*/g, '');
  // Replace imported identifiers with their bundled var names (word-boundary).
  for (const [ident, varName] of Object.entries(identToVar)) {
    src = src.replace(new RegExp(`\\b${ident}\\b`, 'g'), varName);
  }

  // Convert the default export into a returnable value.
  let returnExpr;
  const fnMatch = src.match(/export\s+default\s+function\s+(\w+)/);
  if (fnMatch) {
    returnExpr = fnMatch[1];
    src = src.replace(/export\s+default\s+function\s+(\w+)/, 'function $1');
  } else {
    // `export default <expr>;` (e.g. the entry's config object)
    src = src.replace(/export\s+default\s+/, 'var __default__ = ');
    returnExpr = '__default__';
  }

  const varName = `__mod${counter++}`;
  moduleVarByPath.set(abs, varName);
  const code = `${depCode}var ${varName} = (function () {\n${src}\nreturn ${returnExpr};\n})();\n`;
  return { varName, code };
}

const { varName: entryVar, code } = emitModule(resolve(entryPath));
const out = `/* eslint-disable */\nvar CustomImportScript = (function () {\n${code}\nreturn { default: ${entryVar} };\n})();\nif (typeof window !== 'undefined') window.CustomImportScript = CustomImportScript;\n`;

const outputPath = `${resolve(entryPath).replace(/\.[^/.]+$/, '')}.bundle.js`;
writeFileSync(outputPath, out);
console.log('Wrote', outputPath, out.length, 'bytes');
