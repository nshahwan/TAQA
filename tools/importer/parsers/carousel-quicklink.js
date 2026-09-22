/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-quicklink. Base: carousel. NEW block.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "carousel-quicklink" holds items
 * "carousel-quicklink-item" (blocks/carousel-quicklink/_carousel-quicklink.json).
 * Per the container convention: row 1 = block name, each subsequent row = one
 * slide/item. Item model fields:
 *   - link     (aem-content) -> the <a href> target
 *   - linkText (text)        -> the card title (collapsed into the link's text)
 * ONE ROW PER quicklink card. Each card in the source is:
 *   <li><a href="..."><span ...title...>TITLE</span><span ...icon...><img base64></span></a></li>
 * The base64 arrow-icon <img> is block chrome (re-added by block JS) and is NOT
 * emitted as content.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
export default function parse(element, { document }) {
  // Collect the quick-link cards. Prefer the <li> items inside the slides
  // container; fall back to any anchor containing a title span.
  let anchors = Array.from(
    element.querySelectorAll("ul[class*='slidesContainer'] > li a[href], [class*='slidesContainer'] li a[href]"),
  );
  if (!anchors.length) {
    anchors = Array.from(element.querySelectorAll("a[href]")).filter((a) =>
      a.querySelector("[class*='findYourSolutionCard_title'], [class*='title']"),
    );
  }

  // Empty-block guard
  if (!anchors.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  anchors.forEach((a) => {
    // Card title text
    const titleEl = a.querySelector("[class*='findYourSolutionCard_title'], p[class*='title'], [class*='title']");
    const titleText = (titleEl ? titleEl.textContent : a.textContent).trim();
    const href = (a.getAttribute('href') || '').trim();

    // Build a clean anchor carrying href + the title as its text.
    // linkText is a collapsed field (Text suffix) -> it becomes the anchor's
    // text, so only the `link` field needs a hint comment.
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = titleText;

    // One row per card, single cell hinted with the item's `link` field.
    cells.push([[document.createComment(' field:link '), link]]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-quicklink', cells });

  // Hoist the section default content ("FIND YOUR SOLUTION" heading + intro
  // paragraph) out of the block container so it survives as default content
  // adjacent to the block. The right-header container holds only carousel
  // arrow chrome, so it is intentionally not hoisted.
  const defaultNodes = [];
  const header = element.querySelector("[class*='leftHeaderContainer']");
  if (header) {
    const h = header.querySelector('h1, h2, h3, h4, h5, h6');
    if (h) {
      const heading = document.createElement('h2');
      heading.textContent = h.textContent.trim();
      defaultNodes.push(heading);
    }
    header.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  element.replaceWith(...defaultNodes, block);
}
