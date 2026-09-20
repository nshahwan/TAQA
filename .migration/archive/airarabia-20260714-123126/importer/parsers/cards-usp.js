/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-usp.
 * Base block: cards (variant: "Cards")
 * Source: https://www.airarabia.com/en/plan/flying-with-us/flying-with-convenience
 * Generated for the "plan-landing" template (project type: da).
 *
 * Structure (per library-description.txt — "Cards"):
 *   2 columns, multiple rows. First row = block name.
 *   Each subsequent row = one card:
 *     - Cell 1: Image or Icon (mandatory) — from div.promo-image img
 *     - Cell 2: Text content — Title (heading, from div.promo-title),
 *               Description (from div.promo-text), optional CTA (from div.promo-link a).
 *
 * Used for: check-in options, onboard comfort features (no link), and bottom CTA cards.
 * The CTA link is optional and only emitted when present.
 */
export default function parse(element, { document }) {
  const cards = element.querySelectorAll('.card-promo');

  const cells = [];

  cards.forEach((card) => {
    const image = card.querySelector('.promo-image img, img');
    const titleEl = card.querySelector('.promo-title, [class*="title"]');
    const descEl = card.querySelector('.promo-text, [class*="details"], [class*="text"]');
    const linkEl = card.querySelector('.promo-link a, a[href]');

    // Cell 1: image.
    const imageCell = image || '';

    // Cell 2: title (as heading) + description + optional CTA.
    const textCell = [];

    const titleText = titleEl && titleEl.textContent.trim();
    if (titleText) {
      const heading = document.createElement('h3');
      heading.textContent = titleText;
      textCell.push(heading);
    }

    const descText = descEl && descEl.textContent.trim();
    if (descText) {
      const p = document.createElement('p');
      p.textContent = descText;
      textCell.push(p);
    }

    // Optional CTA link (present for check-in and bottom CTA cards; absent for comfort cards).
    if (linkEl && linkEl.getAttribute('href')) {
      textCell.push(linkEl);
    }

    // Only emit a row if there is meaningful content.
    if (image || textCell.length) {
      cells.push([imageCell, textCell]); // 2-column row
    }
  });

  // Empty-block guard.
  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-usp', cells });
  element.replaceWith(block);
}
