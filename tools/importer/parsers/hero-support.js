/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-support. Base: hero.
 * Source: help-and-support template — EDS-rendered .hero-support.block
 * Generated: 2026-09-16 · Rewritten 2026-09-21 for the live EDS DOM.
 *
 * Hero library convention: 1 column, 3 rows.
 *   Row 1: block name (added by WebImporter.Blocks.createBlock)
 *   Row 2: background image (optional)
 *   Row 3: title (heading), subheading/intro, CTA (optional)
 *
 * This parser emits exactly the image row + the content row (2 cells), so the
 * created block has the required 3 rows and never more.
 *
 * Live source DOM:
 *   .hero-support.block
 *     .hero-support-media    > picture > img
 *     .hero-support-content
 *       p.hero-support-eyebrow   "HELP & SUPPORT"   (subheading, above title)
 *       h1                       title
 *       p                        intro / description
 */
export default function parse(element, { document }) {
  // Row 2 — banner image (prefer the media band, fall back to any image).
  const media = element.querySelector('[class*="hero-support-media"]') || element;
  const bgImage = media.querySelector('picture, img');

  // Row 3 text lives in the content band; fall back to the block itself.
  const textContainer = element.querySelector('[class*="hero-support-content"]') || element;

  // Title heading.
  const heading = textContainer.querySelector('h1, h2, h3, h4, h5, h6');

  // Eyebrow subheading: an explicit eyebrow paragraph, else the first paragraph
  // that precedes the heading.
  let caption = textContainer.querySelector('[class*="eyebrow"]');
  if (!caption && heading) {
    const firstP = textContainer.querySelector('p');
    if (firstP && (heading.compareDocumentPosition(firstP) & Node.DOCUMENT_POSITION_PRECEDING)) {
      caption = firstP;
    }
  }

  // Intro/description: paragraphs that are not the eyebrow.
  const paras = Array.from(textContainer.querySelectorAll('p')).filter((p) => p !== caption);

  // Optional CTAs authored in the content band.
  const ctaLinks = Array.from(textContainer.querySelectorAll('a[href]'));

  // Empty-block guard.
  if (!heading && paras.length === 0 && !bgImage) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background image (only if present).
  if (bgImage) cells.push([bgImage]);

  // Row 3: single cell holding all text content, in document order.
  const contentCell = [];
  if (caption) {
    const p = document.createElement('p');
    p.textContent = caption.textContent.trim();
    contentCell.push(p);
  }
  if (heading) contentCell.push(heading);
  paras.forEach((p) => contentCell.push(p));
  ctaLinks.forEach((a) => contentCell.push(a));
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-support', cells });
  element.replaceWith(block);
}
