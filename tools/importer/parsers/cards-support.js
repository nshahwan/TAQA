/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-support. Base: cards.
 * Source: help-and-support template — .cards-support.block
 * Generated: 2026-09-21
 *
 * Cards library convention: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each card row: [ image/icon | rich text (heading + description + CTA) ].
 *   An image or text cell may be empty, but the empty cell must still exist.
 *
 * EDS-rendered DOM: the block is a <div class="cards-support block"> containing a
 * <ul>. Each <li> is a card with:
 *   - .cards-support-card-icon > picture/img  (the card icon)
 *   - .cards-support-card-body > h6 > a[href] (the CTA-linked heading)
 *   - .cards-support-card-body > p            (the description)
 * 4 cards: CHAT WITH US, CONNECT VIA VIDEO, CALL US: 8002332, FIND A LOCATION.
 * The heading's <a href> is the CTA and must be preserved.
 */
export default function parse(element, { document }) {
  // Collect card items. The block wraps cards in <li> items.
  let cards = Array.from(element.querySelectorAll(':scope > ul > li'));
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('ul > li'));
  }
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('li'));
  }

  const cells = [];

  cards.forEach((card) => {
    // Icon: prefer the <picture>, fall back to the <img>.
    const iconContainer = card.querySelector('[class*="card-icon"]') || card;
    const image = iconContainer.querySelector('picture') || iconContainer.querySelector('img');

    // Body: heading (with CTA link) + description.
    const body = card.querySelector('[class*="card-body"]') || card;
    const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
    const description = body.querySelector('p');

    if (!image && !heading && !description) return;

    const contentCell = [];

    if (heading) {
      // Preserve the CTA link on the heading.
      const link = heading.querySelector('a[href]');
      const href = link && link.getAttribute('href') ? link.getAttribute('href').trim() : '';
      const text = heading.textContent.trim();
      const h = document.createElement(/^H[1-6]$/.test(heading.tagName) ? heading.tagName : 'h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = text;
        h.append(a);
      } else {
        h.textContent = text;
      }
      contentCell.push(h);
    }

    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      contentCell.push(p);
    }

    // 2-column row: [ icon image | rich text content ]. Empty cell kept if absent.
    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-support', cells });
  element.replaceWith(block);
}
