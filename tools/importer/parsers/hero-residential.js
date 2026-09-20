/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-residential. Base: hero.
 * Source: residential template — the spotlight text container
 *   div[class*='imageTextSpotlight_detailsContainer']
 * plus its sibling banner image container
 *   div[class*='imageTextSpotlight_imageContainer'].
 *
 * The outer imageTextSpotlight_container is unwrapped by the site's
 * animate-on-scroll library after load, so we anchor on the (stable) details
 * container and reach out to the sibling image container.
 *
 * Hero library structure: 1 column, 3 rows.
 *   Row 1: block name (added by createBlock)
 *   Row 2: background image (optional)
 *   Row 3: eyebrow + heading(s) + CTA links
 */
export default function parse(element, { document }) {
  // The matched element is the details (text) container; the banner image is a
  // sibling image container within the same spotlight wrapper.
  const scope = element.closest("div[class*='imageTextSpotlight_container']") || element.parentElement || element;
  const imgContainer = scope.querySelector("div[class*='imageTextSpotlight_imageContainer']");
  const bgImage = (imgContainer || scope).querySelector('img');

  // Prefer the desktop header block; fall back to any headings in the details.
  const desktop = element.querySelector("[class*='displayHeadersDesktop']");
  const headingScope = desktop || element;
  const headings = [...headingScope.querySelectorAll('h1, h2, h3, h4')];

  const cells = [];
  if (bgImage) cells.push([bgImage]);

  const contentCell = [];
  // Eyebrow: the first meaningful bare text node in the details container
  // (e.g. "ROOTED IN THE UAE") that is not one of the headings.
  const headingTexts = new Set(headings.map((h) => h.textContent.trim()));
  const walker = document.createTreeWalker(element, 4 /* SHOW_TEXT */);
  let eyebrowText = '';
  while (walker.nextNode()) {
    const t = walker.currentNode.textContent.trim();
    if (t && !headingTexts.has(t)) { eyebrowText = t; break; }
  }
  if (eyebrowText) {
    const eyebrow = document.createElement('p');
    eyebrow.textContent = eyebrowText;
    contentCell.push(eyebrow);
  }
  // Promote the hero headings so the page has a single top-level <h1> (the
  // source uses <h3>, which leaves the page with no H1 and hurts SEO). The
  // first line becomes the H1; the second (if any) becomes an H2.
  headings.forEach((h, i) => {
    const tag = i === 0 ? 'h1' : 'h2';
    const heading = document.createElement(tag);
    heading.textContent = h.textContent.trim();
    contentCell.push(heading);
  });
  // CTA links (dedupe by href; the source duplicates the label in a hover
  // layer, so take the label from the link's first <span> when present).
  const seen = new Set();
  [...element.querySelectorAll('a[href]')].forEach((a) => {
    const href = a.getAttribute('href');
    if (!href || seen.has(href)) return;
    seen.add(href);
    const span = a.querySelector('span');
    const label = (span ? span.textContent : a.textContent).trim().split('\n')[0].trim();
    const link = document.createElement('a');
    link.href = a.href;
    link.textContent = label;
    contentCell.push(link);
  });
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-residential', cells });
  // Replace the whole spotlight wrapper when possible so no stray text remains.
  (scope && scope.parentNode ? scope : element).replaceWith(block);
}
