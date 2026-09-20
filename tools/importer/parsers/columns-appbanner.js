/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-appbanner. Base: columns.
 * Source: https://www.nileair.com/ (div.app-area.max-bg)
 * Natural grouping: 2 columns — [app image | content (tagline + title + app-store CTAs)].
 * Structure (library convention): first row = block name; content rows share the same column count.
 */
export default function parse(element, { document }) {
  const image = element.querySelector('img.app-hand, :scope > img');
  const content = element.querySelector('.app-content') || element;

  const tagline = content.querySelector('p');
  const title = content.querySelector('h1, h2, h3, .title');
  const download = content.querySelector('.app-download');
  // App-store / play-store badge links (each wraps an img).
  const ctaLinks = Array.from((download || content).querySelectorAll('a[href]'));

  const contentCell = [];
  if (tagline) contentCell.push(tagline);
  if (title) contentCell.push(title);
  if (download) {
    contentCell.push(download);
  } else {
    ctaLinks.forEach((a) => contentCell.push(a));
  }

  if (!image && contentCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  // 2-column content row: [image | content].
  cells.push([image || '', contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-appbanner', cells });
  element.replaceWith(block);
}
