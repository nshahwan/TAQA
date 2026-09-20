/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-hero. Base: carousel.
 * Source: https://www.nileair.com/ (div.slider_area.owl-carousel)
 * Structure (library convention): 2 columns per row.
 *   Row 1: block name.
 *   Each slide row: [image | text content (title + description + optional CTA)].
 * Note: source slides use CSS background images (max-bg/responsive-bg) with no <img>,
 * so the image cell is left empty; text content is extracted from .slider_text.
 */
export default function parse(element, { document }) {
  // Each slide is a .sing_slider. owl-carousel may wrap/clone slides in
  // .owl-stage-outer/.owl-item, and clones carry .cloned — exclude those.
  let slides = Array.from(element.querySelectorAll('.sing_slider'))
    .filter((s) => !s.closest('.cloned'));
  // Fallback: if no .sing_slider found, use the slider_text wrappers' parents.
  if (slides.length === 0) {
    slides = Array.from(element.querySelectorAll('.slider_text')).map((t) => t.parentElement);
  }

  const cells = [];

  slides.forEach((slide) => {
    const textWrap = slide.querySelector('.slider_text') || slide;
    const title = textWrap.querySelector('h1, h2, h3');
    const description = textWrap.querySelector('p');
    const cta = textWrap.querySelector('a.btn, a[href]');

    // Skip slides that carry no usable content.
    if (!title && !description && !cta) return;

    // Optional background image (none in source, but handle variations).
    const bgImage = slide.querySelector('img');

    const contentCell = [];
    if (title) contentCell.push(title);
    if (description) contentCell.push(description);
    if (cta) contentCell.push(cta);

    // 2-column row: [image | text content].
    cells.push([bgImage || '', contentCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-hero', cells });
  element.replaceWith(block);
}
