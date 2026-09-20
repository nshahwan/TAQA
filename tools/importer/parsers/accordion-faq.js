/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: help-and-support template — div[class*='faqsection_faqContainer']
 * Generated: 2026-09-16
 *
 * Accordion library structure: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each item row: [ title (question) | content (answer body) ].
 *
 * TAQA DOM: each FAQ item is a <div class="faqsection_question">. The visible
 * label is a <p> inside a <span>; a "+" toggle <span> follows. The answer body
 * may be a sibling element revealed on expand. A "LOAD MORE" button is excluded.
 */
export default function parse(element, { document }) {
  // Accordion items: the question wrappers.
  let items = Array.from(element.querySelectorAll('[class*="faqsection_question"]'));
  if (items.length === 0) {
    items = Array.from(element.querySelectorAll('[class*="question"], [class*="accordion"] [class*="item"]'));
  }

  const cells = [];

  items.forEach((item) => {
    // Question label — first text paragraph, ignoring the "+"/"-" toggle span.
    const label = item.querySelector('p, h1, h2, h3, h4, h5, h6, span > p');

    // Answer body: look for a nested answer container, or a following sibling.
    // NOTE: avoid matching typography classes like "typography--variant-body4"
    // on the question <p>; only match dedicated answer/collapse containers.
    let answer = item.querySelector('[class*="faqsection_answer"], [class*="answer"], [class*="collapse"], [class*="faqContent"]');
    if (!answer
      && item.nextElementSibling
      && item.nextElementSibling.matches
      && item.nextElementSibling.matches('[class*="answer"], [class*="collapse"], [class*="faqContent"]')) {
      answer = item.nextElementSibling;
    }

    if (!label && !answer) return;

    // Title cell: clean question text.
    let titleCell = '';
    if (label) {
      const p = document.createElement('p');
      p.textContent = label.textContent.trim();
      titleCell = p;
    }

    // Content cell: rich answer body if present, else empty (mandatory cell padded).
    let contentCell = '';
    if (answer) {
      const children = Array.from(answer.children);
      contentCell = children.length ? children : [answer];
    }

    // 2-column row: [ title | content ].
    cells.push([titleCell, contentCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}
