/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-appbanner. Base: columns.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk COLUMNS block. Per hinting rules, columns blocks do NOT carry
 * field-name hint comments — cells hold plain default content, and the second
 * row holds one cell per column.
 * The app-download promo is authored as a single content column: tagline,
 * headings, intro line, and the App Store / Play Store download links (anchors
 * wrapping store-badge images).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
export default function parse(element, { document }) {
  const content = element.querySelector("[class*='appcontent'], [class*='parentAppContent'], [class*='appsection']") || element;

  // Collect the promo content in document order: tagline lines, headings,
  // body copy, and the app-store download links.
  const columnNodes = [];
  const tagline = content.querySelector("[class*='tagline']:not([class*='midtagline'])");
  if (tagline) columnNodes.push(tagline);

  content
    .querySelectorAll("[class*='midtagline'] h6, [class*='midtagline'] h5, h6, h5")
    .forEach((h) => {
      if (!columnNodes.includes(h)) columnNodes.push(h);
    });

  // Intro / body line (a body paragraph that is not inside the tagline block).
  content.querySelectorAll('p').forEach((p) => {
    if (p.closest("[class*='tagline']")) return;
    const cls = p.className || '';
    if (/body6|body4|body5/.test(cls) && p.textContent.trim()) {
      if (!columnNodes.some((n) => n.contains(p))) columnNodes.push(p);
    }
  });

  // App-store download links (anchors with hrefs and a badge image).
  const appLinks = Array.from(content.querySelectorAll("[class*='applinks'] a[href], a[class*='applink'][href]"));
  appLinks.forEach((a) => columnNodes.push(a));

  // Empty-block guard
  if (!columnNodes.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One content row. Columns blocks carry no field hints — the row's cells are
  // the columns; here the promo is a single content column.
  const cells = [[columnNodes]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-appbanner', cells });
  element.replaceWith(block);
}
