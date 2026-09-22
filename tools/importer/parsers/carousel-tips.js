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

  // Eyebrow ("ENERGY SAVING TIPS") lives inside the carousel container on the
  // source, above the slides. Emit it as the block's first row (a single
  // text-only cell, no image) so it renders inside the carousel panel. The
  // block JS treats a leading image-less row as the eyebrow, not a slide.
  const eyebrow = element.querySelector("[class*='tipsCarousel_header']");
  if (eyebrow && eyebrow.textContent.trim()) {
    const p = document.createElement('p');
    p.textContent = eyebrow.textContent.trim();
    cells.push(['', p]);
  }

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

  // The eyebrow ("ENERGY SAVING TIPS") is emitted as the block's first row
  // above (rendered inside the carousel panel by the block JS), so nothing is
  // hoisted out here.
  element.replaceWith(block);
}
