/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-newsletter. Base: columns.
 * Source: https://www.nileair.com/ (div.newsletter-area)
 * Natural grouping: 2 columns — [content (title + description) | signup form].
 * Structure (library convention): first row = block name; content rows share the same column count.
 */
export default function parse(element, { document }) {
  const content = element.querySelector('.newsletter-content') || element;
  const title = content.querySelector('h1, h2, h3, .title');
  const description = content.querySelector('p');

  const form = element.querySelector('.newsletter-form') || element.querySelector('form');

  const contentCell = [];
  if (title) contentCell.push(title);
  if (description) contentCell.push(description);

  const formCell = [];
  if (form) {
    formCell.push(form);
  } else {
    // Fallback: capture the individual field/button if the form wrapper is absent.
    const input = element.querySelector('input');
    const button = element.querySelector('button');
    if (input) formCell.push(input);
    if (button) formCell.push(button);
  }

  if (contentCell.length === 0 && formCell.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  // 2-column content row: [content | form].
  cells.push([contentCell, formCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-newsletter', cells });
  element.replaceWith(block);
}
