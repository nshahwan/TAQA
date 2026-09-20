/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-promo.
 * Base block: columns (variant: "Columns")
 * Source: https://www.airarabia.com/en/plan/flying-with-us/flying-with-convenience
 * Generated for the "plan-landing" template (project type: da).
 *
 * Structure (per library-description.txt — "Columns"):
 *   Multiple columns; first row = block name.
 *   This promo is a single horizontal row with two columns:
 *     - Cell 1: icon image + H3 heading + supporting paragraphs (left group)
 *     - Cell 2: "Book Now" CTA link (right group)
 *
 * Source is an inline-styled <section> with two flex groups inside a rich-text
 * component. We rely on structural queries (img/h3/p and the CTA anchor) rather
 * than the inline styles.
 */
export default function parse(element, { document }) {
  // The CTA anchor is the trailing link; identify it first so we can exclude it
  // from the left/content column.
  const links = Array.from(element.querySelectorAll('a[href]'));
  const ctaLink = links.length ? links[links.length - 1] : null;

  const icon = element.querySelector('img');
  const heading = element.querySelector('h1, h2, h3, h4');
  // Paragraphs that belong to the content group (exclude any inside the CTA, none expected).
  const paragraphs = Array.from(element.querySelectorAll('p')).filter(
    (p) => !ctaLink || !ctaLink.contains(p),
  );

  // Left column: icon + heading + paragraphs.
  const contentCell = [];
  if (icon) contentCell.push(icon);
  if (heading) contentCell.push(heading);
  paragraphs.forEach((p) => contentCell.push(p));

  // Right column: CTA link.
  const ctaCell = ctaLink || '';

  // Empty-block guard: nothing meaningful to render.
  if (!contentCell.length && !ctaLink) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [
    [contentCell, ctaCell], // single 2-column row
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-promo', cells });
  element.replaceWith(block);
}
