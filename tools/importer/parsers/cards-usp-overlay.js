/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-usp. Base: cards.
 * Source: residential template — div[class*='featuresCarousel_carousel']
 *
 * Cards library structure: 2 columns, multiple rows. First row is the block
 * name; each subsequent row is one card:
 *   Cell 1: image (mandatory)
 *   Cell 2: text content (the two-line label as paragraphs)
 *
 * The source renders three tall image tiles, each with a two-line white label
 * overlaid on the photo (e.g. "UNINTERRUPTED ENERGY" / "TO FUEL YOUR NEEDS").
 */
export default function parse(element, { document }) {
  const items = [...element.querySelectorAll('li')].filter((li) => li.querySelector('img'));
  if (!items.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = items.map((li) => {
    const img = li.querySelector('img');
    const textCell = document.createElement('div');
    [...li.querySelectorAll('p')].forEach((p) => {
      const line = document.createElement('p');
      line.textContent = p.textContent.trim();
      if (line.textContent) textCell.append(line);
    });
    if (!textCell.children.length && img?.alt) {
      const p = document.createElement('p');
      p.textContent = img.alt.trim();
      textCell.append(p);
    }
    return [img, textCell];
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-usp-overlay', cells });
  element.replaceWith(block);
}
