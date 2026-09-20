/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-fare.
 * Base block: cards (variant: "Cards (no images)")
 * Source: https://www.airarabia.com/en/plan/flying-with-us/flying-with-convenience
 * Generated for the "plan-landing" template (project type: da).
 *
 * Structure (per library-description.txt — "Cards (no images)"):
 *   1 column, multiple rows. First row = block name.
 *   Each subsequent row = one card in a single cell:
 *     - Heading (from div.promo-title)
 *     - Description (from div.promo-text)
 *     - optional CTA (from div.promo-link a) — source cards have no link
 */
export default function parse(element, { document }) {
  // Each fare card in the source is a .card-promo component.
  const cards = element.querySelectorAll('.card-promo');

  const cells = [];

  cards.forEach((card) => {
    const titleEl = card.querySelector('.promo-title, [class*="title"]');
    const descEl = card.querySelector('.promo-text, [class*="details"], [class*="text"]');
    const linkEl = card.querySelector('.promo-link a, a');

    const cellContent = [];

    // Title -> heading (Cards no-images expects the title styled as a heading).
    const titleText = titleEl && titleEl.textContent.trim();
    if (titleText) {
      const heading = document.createElement('h3');
      heading.textContent = titleText;
      cellContent.push(heading);
    }

    // Description -> paragraph.
    const descText = descEl && descEl.textContent.trim();
    if (descText) {
      const p = document.createElement('p');
      p.textContent = descText;
      cellContent.push(p);
    }

    // Optional CTA link (source fare cards have an empty .promo-link, so this is
    // typically skipped, but preserved for cross-page resilience).
    if (linkEl && linkEl.getAttribute('href')) {
      cellContent.push(linkEl);
    }

    // Only add a row if the card produced content.
    if (cellContent.length) {
      cells.push([cellContent]); // 1-column row: outer array = row, inner = single cell contents
    }
  });

  // Empty-block guard: no meaningful cards -> unwrap.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-fare', cells });
  element.replaceWith(block);
}
