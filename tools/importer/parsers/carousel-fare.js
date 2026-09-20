/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-fare. Base: carousel.
 * Source: https://www.nileair.com/ (div.promotions_area .promotions_slide)
 * Structure (library convention): 2 columns per row.
 *   Row 1: block name.
 *   Each slide row: [image | text content (title + fare label + price)].
 */
export default function parse(element, { document }) {
  // element is the .promotions_slide carousel. Slides are .sing_promt.
  // owl-carousel may clone slides at runtime — exclude .cloned.
  let slides = Array.from(element.querySelectorAll('.sing_promt'))
    .filter((s) => !s.closest('.cloned'));
  if (slides.length === 0) {
    slides = Array.from(element.querySelectorAll(':scope > div'));
  }

  const cells = [];

  slides.forEach((slide) => {
    const image = slide.querySelector('.sing_promt_img img, img');
    const textWrap = slide.querySelector('.sing_promt_text') || slide;
    const title = textWrap.querySelector('h1, h2, h3, h4');
    const price = textWrap.querySelector('p');
    // The fare label was a <span> in the source, but html2md preprocessing
    // (removeSpans) unwraps classless spans into bare text nodes before this
    // parser runs. Recover the label from the direct text-node children of
    // textWrap (the text sitting between the heading and the price).
    let labelText = '';
    textWrap.childNodes.forEach((node) => {
      if (node.nodeType === 3 && node.textContent.trim()) {
        labelText = node.textContent.trim();
      }
    });

    if (!image && !title && !labelText && !price) return;

    const contentCell = [];
    if (title) contentCell.push(title);
    // Emit the recovered label as its own <p> so it persists through markdown.
    if (labelText) {
      const labelP = document.createElement('p');
      labelP.textContent = labelText;
      contentCell.push(labelP);
    }
    if (price) contentCell.push(price);

    // 2-column row: [image | text content].
    cells.push([image || '', contentCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-fare', cells });
  element.replaceWith(block);
}
