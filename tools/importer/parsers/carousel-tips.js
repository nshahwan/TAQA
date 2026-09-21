/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-tips. Base: carousel.
 * Source: help-and-support template — EDS-rendered div.carousel-tips.block
 * Generated: 2026-09-16 (rewritten for current EDS DOM)
 *
 * Carousel library convention: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each subsequent row = one slide: [ Image (mandatory) | Text content
 *   (heading + description + LEARN MORE CTA, rendered as rich text) ].
 *
 * Current EDS DOM: each slide is <li class="carousel-tips-slide"> containing
 *   .carousel-tips-slide-icon (a <picture>/<img>) and
 *   .carousel-tips-slide-content (heading <p>, description <p>, and a <p> with
 *   the "LEARN MORE" <a href>). Each slide produces exactly one 2-column row.
 */
export default function parse(element, { document }) {
  // Real EDS slides. Fall back only to the icon-bearing list items so we never
  // pick up the carousel indicator <li>s (which contain only <button>s).
  let slides = Array.from(element.querySelectorAll('li.carousel-tips-slide'));
  if (slides.length === 0) {
    slides = Array.from(element.querySelectorAll('ul.carousel-tips-slides > li'))
      .filter((li) => li.querySelector('img, picture'));
  }

  const cells = [];

  slides.forEach((slide) => {
    // Image (mandatory): prefer the <picture> (keeps <img>), else the bare <img>.
    const iconWrap = slide.querySelector('.carousel-tips-slide-icon') || slide;
    const image = iconWrap.querySelector('picture') || iconWrap.querySelector('img');

    // Text content: heading <p>, description <p>, and the LEARN MORE <a> (in a <p>).
    // Each paragraph appears exactly once — no duplicated CTA.
    const contentWrap = slide.querySelector('.carousel-tips-slide-content') || slide;
    const contentCell = [];
    Array.from(contentWrap.querySelectorAll(':scope > p')).forEach((p) => {
      if (p.textContent.trim() || p.querySelector('a[href]')) contentCell.push(p);
    });

    if (!image && contentCell.length === 0) return;

    // 2-column row: [ Image | Text content ].
    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-tips', cells });
  element.replaceWith(block);
}
