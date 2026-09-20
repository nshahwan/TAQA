import { createOptimizedPicture } from '../../scripts/aem.js';

/**
 * loads and decorates the hero-residential block
 * @param {Element} block The hero-residential block element
 *
 * Expected authored structure (rows):
 *   Row 1: banner image
 *   Row 2: eyebrow text, two-line heading, CTA links (default content)
 *
 * Renders a navy spotlight band: text content on the left over a navy-to-clear
 * gradient, with the banner photo bleeding in from the right.
 */
export default function decorate(block) {
  const rows = [...block.children];

  const mediaRow = rows.find((row) => row.querySelector('picture, img'));
  const contentRows = rows.filter((row) => row !== mediaRow);

  // Banner media band.
  if (mediaRow) {
    const media = document.createElement('div');
    media.className = 'hero-residential-media';
    const picture = mediaRow.querySelector('picture');
    const img = mediaRow.querySelector('img');
    if (picture) {
      media.append(picture);
    } else if (img) {
      media.append(createOptimizedPicture(img.src, img.alt, true));
    }
    // This banner is the LCP element — hint the browser to fetch it first.
    const heroImg = media.querySelector('img');
    if (heroImg) {
      heroImg.setAttribute('fetchpriority', 'high');
      heroImg.setAttribute('loading', 'eager');
    }
    block.prepend(media);
    mediaRow.remove();
  }

  // Content band (eyebrow / heading / CTAs).
  const content = document.createElement('div');
  content.className = 'hero-residential-content';
  contentRows.forEach((row) => {
    const cells = [...row.children];
    const source = cells.length === 1 ? cells[0] : row;
    [...source.childNodes].forEach((node) => content.append(node));
    row.remove();
  });

  // The first paragraph before the heading is the eyebrow.
  const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
  const firstPara = content.querySelector('p');
  if (heading && firstPara) {
    const order = [...content.children];
    if (order.indexOf(firstPara) < order.indexOf(heading)) {
      firstPara.classList.add('hero-residential-eyebrow');
    }
  }

  // Group the CTA links into an actions row.
  const links = [...content.querySelectorAll('a')];
  if (links.length) {
    const actions = document.createElement('div');
    actions.className = 'hero-residential-actions';
    links.forEach((a) => {
      const p = a.closest('p');
      actions.append(a);
      if (p && p !== actions && !p.textContent.trim() && !p.querySelector('img')) p.remove();
    });
    content.append(actions);
  }

  block.append(content);
}
