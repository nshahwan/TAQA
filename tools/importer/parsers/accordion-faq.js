/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "accordion-faq" holds items
 * "accordion-faq-item" (blocks/accordion-faq/_accordion-faq.json).
 * Item model fields (authoritative for this variant):
 *   - question (text)     -> the question label      (cell 0, hinted)
 *   - answer   (richtext) -> the answer body         (cell 1)
 *   - category (text)     -> optional category name  (cell 2)
 * The block JS (blocks/accordion-faq/accordion-faq.js) reads three cells per
 * row (question / answer / category), so all three columns are emitted.
 * ONE ROW PER question. The SPA loads answer bodies lazily, so the scraped
 * source exposes only the question labels; answer and category cells are
 * emitted empty (no field hint on empty cells per xwalk hinting rules).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
export default function parse(element, { document }) {
  const questionEls = Array.from(
    element.querySelectorAll("[class*='faqsection_question'], [class*='faqContainer'] [class*='question']"),
  );

  // Empty-block guard
  if (!questionEls.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  questionEls.forEach((q) => {
    // The question text lives in the bold paragraph; the trailing "+" span is
    // block chrome and must not be emitted.
    const label = q.querySelector("p[class*='bold'], span p, p");
    const questionText = (label ? label.textContent : q.textContent).replace(/\+\s*$/, '').trim();
    if (!questionText) return;

    const questionEl = document.createElement('p');
    questionEl.textContent = questionText;

    // cell 0: question (hinted) | cell 1: answer (empty) | cell 2: category (empty)
    cells.push([
      [document.createComment(' field:question '), questionEl],
      '',
      '',
    ]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });

  // Hoist the section default content out of the block container so it survives
  // adjacent to the accordion: the "LOOKING FOR ANSWERS ?" heading + intro
  // paragraph, and the category filter tab row (All / All About Metering /
  // Disconnecting Your Supply / Emergencies / All about Moving Out) as a list.
  const defaultNodes = [];
  const header = element.querySelector("[class*='faqsection_header']");
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

  // The intro paragraph lives in a sibling subheader container, not inside the
  // header — capture it too so it survives as default content.
  const subHeader = element.querySelector("[class*='faqsection_subHeader']");
  if (subHeader) {
    subHeader.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  const filters = Array.from(element.querySelectorAll("[class*='faqsection_filterButton']"))
    .map((f) => f.textContent.trim())
    .filter(Boolean);
  if (filters.length) {
    const ul = document.createElement('ul');
    filters.forEach((label) => {
      const li = document.createElement('li');
      li.textContent = label;
      ul.append(li);
    });
    defaultNodes.push(ul);
  }

  element.replaceWith(...defaultNodes, block);
}
