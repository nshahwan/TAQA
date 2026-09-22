/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-support. Base: hero.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk simple block. Model fields (blocks/hero-support/_hero-support.json):
 *   - image (reference)  -> row 2 (banner image)
 *   - text  (richtext)   -> row 3 (eyebrow + heading + intro)
 * Library convention: Hero has 1 column, up to 3 rows (name, image, text).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
export default function parse(element, { document }) {
  // build a cell whose first node is a field-name hint comment (xwalk hinting)
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    if (!present.length) return '';
    return [document.createComment(` field:${name} `), ...present];
  };

  // Banner image (row 2)
  const image = element.querySelector("img[class*='imagesframe'], img");

  // Text content (row 3): eyebrow, heading, intro paragraph
  const eyebrow = element.querySelector("p[class*='headerFrame_title'], [class*='textContainer'] p[class*='caption']");
  const heading = element.querySelector("h1[class*='headerFrame_subtitle'], h1, h2");
  const intro = element.querySelector("p[class*='headerFrame_text'], [class*='textContainer'] p[class*='body']");

  // Empty-block guard
  if (!image && !heading && !intro) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  const imageCell = fieldCell('image', image);
  if (imageCell) cells.push([imageCell]);
  const textCell = fieldCell('text', eyebrow, heading, intro);
  if (textCell) cells.push([textCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-support', cells });
  element.replaceWith(block);
}
