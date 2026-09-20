/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-support. Base: hero.
 * Source: help-and-support template — div[class*='headerFrame_herosection']
 * Generated: 2026-09-16
 *
 * Hero library structure: 1 column, 3 rows.
 *   Row 1: block name
 *   Row 2: background image (optional)
 *   Row 3: title (heading), subheading, CTA (optional)
 */
export default function parse(element, { document }) {
  // Background image (optional)
  const bgImage = element.querySelector('img[class*="imagesframe"], img');

  // Text content lives in the text container
  const textContainer = element.querySelector('[class*="textContainer"]') || element;

  // Eyebrow / caption (styled as small text above the heading)
  const caption = textContainer.querySelector('[class*="title"]:not(h1):not(h2):not(h3)');
  // Main heading
  const heading = textContainer.querySelector('h1, h2, [class*="subtitle"]');
  // Descriptive body text
  const description = textContainer.querySelector('[class*="text"]:not([class*="subtitle"]):not([class*="title"])');
  // Optional CTAs
  const ctaLinks = Array.from(textContainer.querySelectorAll('a[href]'));

  // Empty-block guard
  if (!heading && !description && !bgImage) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background image (only if present)
  if (bgImage) cells.push([bgImage]);

  // Row 3: single cell holding all text content
  const contentCell = [];
  if (caption) contentCell.push(caption);
  if (heading) contentCell.push(heading);
  if (description) contentCell.push(description);
  contentCell.push(...ctaLinks);
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-support', cells });
  element.replaceWith(block);
}
