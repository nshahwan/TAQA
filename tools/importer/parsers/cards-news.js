/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-news. Base: cards.
 * Sources:
 *   - https://www.nileair.com/ (div.container.news-room): a.news-card links
 *     with .news-card-cover img + .news-card-content (h3, date p, description p).
 *   - taqadistribution.com residential (Announcements carousel): <li> tiles with
 *     a cover image, date + headline + summary paragraphs, and a Read more link.
 * The section title and any carousel controls are default content — excluded.
 * Structure (library convention): 2 columns per row [image | text content].
 *   Row 1: block name.
 */
export default function parse(element, { document }) {
  let cards = Array.from(element.querySelectorAll('a.news-card, .news-card'));
  // TAQA Announcements: each card is a list item containing an image + text.
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('li')).filter((li) => li.querySelector('img'));
  }

  const cells = [];

  cards.forEach((card) => {
    const image = card.querySelector('.news-card-cover img, img');
    const content = card.querySelector('.news-card-content') || card;
    const title = content.querySelector('h1, h2, h3, h4');
    const paragraphs = Array.from(content.querySelectorAll('p'));
    // The whole card is the link (Nile Air) or a "Read more" link inside (TAQA).
    const href = card.matches('a[href]') ? card.getAttribute('href')
      : (card.querySelector('a[href]') ? card.querySelector('a[href]').getAttribute('href') : null);

    if (!image && !title && paragraphs.length === 0) return;

    const contentCell = [];
    if (title) {
      if (href) {
        const link = document.createElement('a');
        link.setAttribute('href', href);
        link.textContent = title.textContent.trim();
        const heading = document.createElement(title.tagName.match(/^H[1-6]$/) ? title.tagName : 'h3');
        heading.append(link);
        contentCell.push(heading);
      } else {
        contentCell.push(title);
      }
    }
    paragraphs.forEach((p) => {
      const text = p.textContent.trim();
      if (!text) return;
      const el = document.createElement('p');
      el.textContent = text;
      contentCell.push(el);
    });
    // Preserve a "Read more" call-to-action when the card is not itself a link.
    if (href && !card.matches('a[href]')) {
      const readMore = card.querySelector('a[href]');
      const label = (readMore && readMore.textContent.trim().split('\n')[0].trim()) || 'Read more';
      const cta = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = label || 'Read more';
      cta.append(a);
      contentCell.push(cta);
    }

    // 2-column row: [image | text content].
    cells.push([image || '', contentCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-news', cells });
  element.replaceWith(block);
}
