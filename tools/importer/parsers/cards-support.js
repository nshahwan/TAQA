/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-support. Base: cards.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "cards-support" holds items
 * "cards-support-card" (blocks/cards-support/_cards-support.json).
 * Card model fields (authoritative for this variant):
 *   - image (reference) -> the card icon        (cell 0, hinted)
 *   - text  (richtext)  -> title + description  (cell 1, hinted)
 * Convention: each row = one card; cell 0 = image/icon, cell 1 = rich text
 * (heading + description + optional CTA). An empty image cell must still be
 * included. ONE ROW PER support card.
 * The whole source card is an anchor; its href is preserved by wrapping the
 * title heading in a link so the CTA target survives into the text richtext.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
export default function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    if (!present.length) return '';
    return [document.createComment(` field:${name} `), ...present];
  };

  const cards = Array.from(element.querySelectorAll("a[class*='supportOption_supportDiv'], [class*='subContainer'] > a[href]"));

  // Empty-block guard
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector("[class*='iconContainer'] img, img");
    const href = (card.getAttribute('href') || '').trim();

    // Title (h6) — wrap in an anchor so the card's link target is preserved.
    const titleEl = card.querySelector("[class*='supportText'] h6, h6");
    let titleNode = null;
    if (titleEl) {
      const h = document.createElement('h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleEl.textContent.trim();
        h.append(a);
      } else {
        h.textContent = titleEl.textContent.trim();
      }
      titleNode = h;
    }

    // Description — the body paragraph (skip the empty subHeader wrappers).
    let descNode = null;
    const descP = Array.from(card.querySelectorAll("[class*='supportText'] p"))
      .find((p) => p.textContent.trim());
    if (descP) {
      descNode = document.createElement('p');
      descNode.textContent = descP.textContent.trim();
    }

    // cell 0: image (hinted, empty cell allowed) | cell 1: text (hinted)
    cells.push([
      fieldCell('image', image),
      fieldCell('text', titleNode, descNode),
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-support', cells });
  element.replaceWith(block);
}
