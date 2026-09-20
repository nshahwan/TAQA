/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-quicklink. Base: cards.
 * Source: help-and-support template — div[class*='findYourSolutionCard_container']
 * Generated: 2026-09-16
 *
 * Cards library structure: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each card row: [ image/icon | text content (title + optional CTA) ].
 *
 * TAQA DOM: each card is a <span class="findYourSolutionCard_container">
 * wrapped in an <a href> (the CTA/link). Inside: a title <p> and an icon <img>.
 * The parser handles either the whole carousel container (multiple cards) or a
 * single card span being passed as the element. The instance selector targets
 * the carousel container div, so all card spans inside are collected.
 */
export default function parse(element, { document }) {
  // Collect cards. Handle element being the container OR an individual card.
  let cards = Array.from(element.querySelectorAll('[class*="findYourSolutionCard_container"]'));
  if (cards.length === 0) {
    if (element.matches && element.matches('[class*="findYourSolutionCard_container"]')) {
      cards = [element];
    } else {
      // Fallback: each list item / slide is a card wrapper.
      cards = Array.from(element.querySelectorAll('li, [class*="slide"]'));
    }
  }

  const cells = [];

  cards.forEach((card) => {
    // Title text of the card.
    const title = card.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6, p');
    // Icon / image (decorative arrow or thumbnail).
    const image = card.querySelector('img');
    // The card is typically wrapped in an anchor; look on the card and its ancestor.
    let link = card.querySelector('a[href]');
    if (!link) {
      link = card.closest('a[href]');
    }

    if (!title && !image) return;

    const contentCell = [];
    if (title) {
      const href = link && link.getAttribute('href') ? link.getAttribute('href').trim() : '';
      if (href) {
        // Preserve the CTA link on the title text.
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = title.textContent.trim();
        const p = document.createElement('p');
        p.append(a);
        contentCell.push(p);
      } else {
        contentCell.push(title);
      }
    }

    // 2-column row: [ icon/image | text content ].
    cells.push([image || '', contentCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-quicklink', cells });
  element.replaceWith(block);
}
