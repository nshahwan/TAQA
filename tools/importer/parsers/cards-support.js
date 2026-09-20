/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-support. Base: cards.
 * Source: help-and-support template — div[class*='customerSupport_subContainer']
 * Generated: 2026-09-16
 *
 * Cards library structure: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each card row: [ image/icon | text content (title + description + CTA) ].
 *
 * TAQA DOM: each card is an <a class="supportOption_supportDiv" href> containing
 * an icon <img> (base64 SVG), a title <h6> and a description <p>. The card's own
 * href is the CTA (chat / video / tel / branch locator).
 */
export default function parse(element, { document }) {
  // Cards: the support option anchors.
  let cards = Array.from(element.querySelectorAll('[class*="supportOption_supportDiv"]'));
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('a[class*="support"], :scope > a[href]'));
  }

  const cells = [];

  cards.forEach((card) => {
    const image = card.querySelector('img');
    const title = card.querySelector('h1, h2, h3, h4, h5, h6');
    // Description paragraph (the innermost text <p>).
    const descContainer = card.querySelector('[class*="supportSubHeader"]');
    const description = descContainer
      ? (descContainer.querySelector('p') || descContainer)
      : card.querySelector('[class*="supportText"] p');

    // The anchor itself carries the CTA href.
    const href = card.matches('a[href]')
      ? card.getAttribute('href')
      : (card.querySelector('a[href]') && card.querySelector('a[href]').getAttribute('href'));

    if (!image && !title && !description) return;

    const contentCell = [];
    if (title) {
      const cleanTitle = title.textContent.trim();
      if (href && href.trim()) {
        // Preserve the CTA link on the title.
        const a = document.createElement('a');
        a.setAttribute('href', href.trim());
        a.textContent = cleanTitle;
        const h = document.createElement(title.tagName.match(/^H[1-6]$/) ? title.tagName : 'h3');
        h.append(a);
        contentCell.push(h);
      } else {
        contentCell.push(title);
      }
    }
    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      contentCell.push(p);
    }

    // 2-column row: [ icon/image | text content ].
    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-support', cells });
  element.replaceWith(block);
}
