import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

export default function decorate(block) {
  /* change to ul, li */
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((div) => {
      if (div.children.length === 1 && div.querySelector('picture')) div.className = 'cards-quicklink-card-image';
      else div.className = 'cards-quicklink-card-body';
    });
    ul.append(li);
  });
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width: '750' }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.textContent = '';

  // Horizontal-scroll carousel track (matches the source "Find your solution"
  // slider: cards in one scrolling row with prev/next arrow controls).
  ul.classList.add('cards-quicklink-track');
  const viewport = document.createElement('div');
  viewport.className = 'cards-quicklink-viewport';
  viewport.append(ul);

  // Prev / next arrow buttons.
  const controls = document.createElement('div');
  controls.className = 'cards-quicklink-controls';
  const prev = document.createElement('button');
  prev.type = 'button';
  prev.className = 'cards-quicklink-arrow cards-quicklink-arrow-prev';
  prev.setAttribute('aria-label', 'Previous');
  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'cards-quicklink-arrow cards-quicklink-arrow-next';
  next.setAttribute('aria-label', 'Next');
  controls.append(prev, next);

  const scrollByCards = (dir) => {
    const card = ul.querySelector('li');
    const gap = parseInt(getComputedStyle(ul).columnGap || '24', 10) || 24;
    const step = card ? card.getBoundingClientRect().width + gap : 320;
    ul.scrollBy({ left: dir * step, behavior: 'smooth' });
  };
  prev.addEventListener('click', () => scrollByCards(-1));
  next.addEventListener('click', () => scrollByCards(1));

  // Disable arrows at the track ends.
  const updateArrows = () => {
    const maxScroll = ul.scrollWidth - ul.clientWidth - 1;
    prev.disabled = ul.scrollLeft <= 0;
    next.disabled = ul.scrollLeft >= maxScroll;
  };
  ul.addEventListener('scroll', updateArrows, { passive: true });
  window.addEventListener('resize', updateArrows);
  block.append(controls, viewport);
  updateArrows();
}
