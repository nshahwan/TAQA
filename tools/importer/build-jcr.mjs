/* eslint-disable */
/**
 * Build AEM xwalk JCR XML from a decorated EDS block-table .plain.html file.
 *
 * Pipeline: block-table HTML -> mdast (default content via hast->mdast, blocks
 * as gridTable nodes carrying <!--field:x--> hints) -> gridtable markdown ->
 * @adobe/helix-md2jcr -> JCR XML. (html2md flattens block tables, so we build
 * the gridtables ourselves and reuse md2jcr, which is the proven mapper.)
 *
 * Usage: node tools/importer/build-jcr.mjs <plain.html> <out.jcr.xml>
 */
import fs from 'node:fs';

const NM = '/home/node/.excat-marketplaces/excat-marketplace/excat/skills/excat-content-import/scripts/node_modules';
const { JSDOM } = await import('/home/node/.excat-marketplaces/excat-marketplace/excat/tools/excatops-mcp/node_modules/jsdom/lib/api.js');
const { fromHtml } = await import(`${NM}/hast-util-from-html/index.js`);
const { toMdast } = await import(`${NM}/hast-util-to-mdast/index.js`);
const { toMarkdown } = await import(`${NM}/mdast-util-to-markdown/index.js`);
const { gridTablesToMarkdown } = await import(`${NM}/@adobe/mdast-util-gridtables/src/index.js`);
const md2jcr = (await import(`${NM}/@adobe/helix-md2jcr/src/md2jcr/index.js`)).default;

const [, , inFile, outFile] = process.argv;
const html = fs.readFileSync(inFile, 'utf8');
const doc = new JSDOM(`<body>${html}</body>`).window.document;

// EDS block names present in this project (kebab). Anything else in a section
// is default content.
const BLOCK_CLASSES = [
  'hero-support', 'carousel-quicklink', 'columns-appbanner', 'carousel-tips',
  'accordion-faq', 'cards-support', 'section-metadata', 'metadata',
];
const titleCase = (name) => name.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ');

// Convert a DOM element's innerHTML to mdast content nodes.
function htmlToMdast(el) {
  const hast = fromHtml(el.innerHTML, { fragment: true });
  const md = toMdast(hast);
  return md.children || [];
}

// Build a gridTable mdast node for one EDS block.
function blockToGridTable(blockEl, blockName) {
  const rows = [...blockEl.children];
  // header row: single cell with the block's title (title-cased class name)
  const headerCell = {
    type: 'gtCell',
    children: [{ type: 'paragraph', children: [{ type: 'text', value: titleCase(blockName) }] }],
  };
  const header = {
    type: 'gtHeader',
    children: [{ type: 'gtRow', children: [headerCell] }],
  };
  // Section Metadata / page Metadata are key/value tables: md2jcr matches the
  // first-column key against the model field NAME case-sensitively (e.g.
  // `style`), but the authored table uses the label case (`Style`). Lowercase
  // the key cell for these so `Style` -> `style` maps correctly.
  const isMetaTable = blockName === 'section-metadata' || blockName === 'metadata';

  const bodyRows = rows.map((row) => {
    const cells = [...row.children].map((cell, cellIdx) => {
      // preserve any leading <!--field:x--> comment as an html node (md2jcr
      // reads it to map the cell to a model field). Clone the cell and remove
      // comment nodes before HTML->mdast so the hint isn't duplicated.
      const nodes = [];
      cell.childNodes.forEach((n) => {
        if (n.nodeType === 8) nodes.push({ type: 'html', value: `<!--${n.nodeValue.trim()}-->` });
      });
      const clone = cell.cloneNode(true);
      [...clone.childNodes].forEach((n) => { if (n.nodeType === 8) n.remove(); });
      if (isMetaTable && cellIdx === 0) {
        clone.textContent = clone.textContent.trim().toLowerCase();
      }
      const contentNodes = htmlToMdast(clone);
      return { type: 'gtCell', children: [...nodes, ...contentNodes] };
    });
    return { type: 'gtRow', children: cells };
  });
  return {
    type: 'gridTable',
    children: [header, { type: 'gtBody', children: bodyRows }],
  };
}

// Walk sections. Serialize each top-level node on its own, then join with
// blank lines and EDS section breaks (`---`). Serializing per-node and joining
// with explicit "\n\n" avoids mdast-util-to-markdown gluing a gridtable's
// closing fence to the next node (thematicBreak `***`, default content, or the
// next table) on one line, which breaks gridtable parsing.
const serialize = (node) => toMarkdown(
  { type: 'root', children: [node] },
  { extensions: [gridTablesToMarkdown()] },
).trim();

const bodyChildren = [...doc.body.children];
const sectionChunks = [];
bodyChildren.forEach((section) => {
  const pieces = [];
  [...section.children].forEach((node) => {
    const cls = (node.getAttribute('class') || '').split(/\s+/);
    const blockName = BLOCK_CLASSES.find((b) => cls.includes(b));
    if (blockName) {
      pieces.push(serialize(blockToGridTable(node, blockName)));
    } else {
      // default content wrapper: serialize each child mdast node
      htmlToMdast(node).forEach((n) => pieces.push(serialize(n)));
    }
  });
  sectionChunks.push(pieces.join('\n\n'));
});
// EDS separates sections with a `---` thematic break on its own line.
const md = sectionChunks.join('\n\n---\n\n') + '\n';
fs.writeFileSync(outFile.replace(/\.xml$/, '.md'), md);

const models = JSON.parse(fs.readFileSync('component-models.json', 'utf8'));
const definition = JSON.parse(fs.readFileSync('component-definition.json', 'utf8'));
const filters = JSON.parse(fs.readFileSync('component-filters.json', 'utf8'));
const jcr = await md2jcr(md, { models, definition, filters });
fs.writeFileSync(outFile, jcr);
console.log('md length:', md.length, '| gridtables:', (md.match(/^\+-/gm) || []).length);
console.log('JCR length:', jcr.length);
