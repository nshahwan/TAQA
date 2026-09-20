/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-tips. Base: carousel.
 * Source: help-and-support template — div[class*='tipsCarousel_carousel']
 * Generated: 2026-09-16
 *
 * Carousel library structure: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each slide row: [ image (only) | text content (title, description, CTA) ].
 *
 * TAQA DOM: each slide is <div class="tipsCarousel_tipCard"> containing an
 * <img>, a text container (two <p>: title + description) and a "LEARN MORE"
 * <a> button (CTA, text wrapped in a <span>).
 */
export default function parse(element, { document }) {
  // Slides.
  let slides = Array.from(element.querySelectorAll('[class*="tipsCarousel_tipCard"]'));
  if (slides.length === 0) {
    slides = Array.from(element.querySelectorAll('[class*="tipCard"], [class*="slide"], li'));
  }

  const cells = [];

  slides.forEach((slide) => {
    const image = slide.querySelector('img');

    // Text container paragraphs: title then description.
    const textContainer = slide.querySelector('[class*="textContainer"]') || slide;
    const paragraphs = Array.from(textContainer.querySelectorAll('p'));

    // CTA link (LEARN MORE). href may carry leading/trailing whitespace.
    const cta = slide.querySelector('a[href]');

    if (!image && paragraphs.length === 0 && !cta) return;

    const contentCell = [];
    paragraphs.forEach((p) => contentCell.push(p));

    if (cta) {
      const href = cta.getAttribute('href') ? cta.getAttribute('href').trim() : '';
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = cta.textContent.trim();
        contentCell.push(a);
      }
    }

    // 2-column row: [ image | text content ].
    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-tips', cells });
  element.replaceWith(block);
}
