import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * loads and decorates the cards-support block
 * @param {Element} block The block element
 *
 * Expected authored structure (one row per support option):
 *   Cell A: icon image (optional — may be empty when the source uses icon fonts)
 *   Cell B: title (heading, optionally linked) + one-line description
 */
export default function decorate(block) {
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      const hasImage = div.querySelector('picture, img');
      if (hasImage) {
        div.className = 'cards-support-card-icon';
      } else if (div.children.length === 0 && div.textContent.trim() === '') {
        // empty icon cell (no icon authored) — drop it
        div.remove();
      } else {
        div.className = 'cards-support-card-body';
      }
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '150' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
  block.textContent = '';
  block.append(ul);
}
