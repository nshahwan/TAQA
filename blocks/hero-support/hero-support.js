import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * loads and decorates the hero-support block
 * @param {Element} block The block element
 *
 * Expected authored structure (rows):
 *   Row 1: banner image
 *   Row 2: eyebrow text, heading, intro paragraph (default content)
 */
export default function decorate(block) {
  const rows = [...block.children];

  // First row (if it contains an image) is the banner media.
  const mediaRow = rows.find((row) => row.querySelector('picture, img'));
  const contentRows = rows.filter((row) => row !== mediaRow);

  // Build the media band.
  if (mediaRow) {
    const media = document.createElement('div');
    media.className = 'hero-support-media';
    const picture = mediaRow.querySelector('picture');
    const img = mediaRow.querySelector('img');
    if (picture) {
      media.append(picture);
    } else if (img) {
      const optimized = createOptimizedPicture(img.src, img.alt, true);
      media.append(optimized);
    }
    block.prepend(media);
    mediaRow.remove();
  }

  // Build the content band (eyebrow / heading / intro).
  const content = document.createElement('div');
  content.className = 'hero-support-content';

  contentRows.forEach((row) => {
    // Unwrap single-cell rows so headings/paragraphs sit directly in the content band.
    const cells = [...row.children];
    const source = cells.length === 1 ? cells[0] : row;
    [...source.childNodes].forEach((node) => content.append(node));
    row.remove();
  });

  // Tag a short paragraph that appears before the heading as an eyebrow.
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  const firstPara = content.querySelector('p');
  if (heading && firstPara) {
    const orderedNodes = [...content.children];
    if (orderedNodes.indexOf(firstPara) < orderedNodes.indexOf(heading)) {
      firstPara.classList.add('hero-support-eyebrow');
    }
  }

  block.append(content);
}
