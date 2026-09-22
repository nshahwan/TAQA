/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-tips. Base: carousel.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "carousel-tips" holds items
 * "carousel-tips-slide" (blocks/carousel-tips/_carousel-tips.json).
 * Slide model fields (authoritative for this variant):
 *   - image (reference) -> the tip image        (image cell)
 *   - text  (richtext)  -> heading + description + LEARN MORE link (text cell)
 * Container convention: row 1 = block name; each subsequent row = one slide
 * with an image cell followed by a text cell.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
export default function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    return [document.createComment(` field:${name} `), ...present];
  };

  const cards = Array.from(element.querySelectorAll("[class*='tipCard']"));

  // Empty-block guard
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector('img');
    const textContainer = card.querySelector("[class*='textContainer']");
    const heading = textContainer ? textContainer.querySelector('p:first-child') : null;
    const description = textContainer
      ? textContainer.querySelector('p:nth-child(2)')
      : null;
    const learnMore = card.querySelector("a[class*='learnMore'], a[href]");

    // Normalize the LEARN MORE link: unwrap the inner <span> so md keeps text.
    let linkEl = null;
    if (learnMore) {
      linkEl = document.createElement('a');
      linkEl.setAttribute('href', (learnMore.getAttribute('href') || '').trim());
      linkEl.textContent = learnMore.textContent.trim();
    }

    cells.push([
      fieldCell('image', image),
      fieldCell('text', heading, description, linkEl),
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-tips', cells });

  // Hoist the "ENERGY SAVING TIPS" eyebrow/header out of the block container so
  // it survives as default content adjacent to the carousel.
  const defaultNodes = [];
  const header = element.querySelector("[class*='tipsCarousel_header']");
  if (header) {
    const text = header.textContent.trim();
    if (text) {
      const heading = document.createElement('h3');
      heading.textContent = text;
      defaultNodes.push(heading);
    }
  }

  element.replaceWith(...defaultNodes, block);
}
