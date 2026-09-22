import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Energy-saving-tips promo carousel: one tile visible at a time, each tile an
 * icon + heading + short description + LEARN MORE link, with dot pagination.
 * Expected authored structure: one row per tip (icon image + text/link content).
 */

function showSlide(block, slideIndex = 0) {
  const slides = block.querySelectorAll('.carousel-tips-slide');
  let realIndex = slideIndex < 0 ? slides.length - 1 : slideIndex;
  if (slideIndex >= slides.length) realIndex = 0;
  const activeSlide = slides[realIndex];

  block.dataset.activeSlide = realIndex;
  block.querySelector('.carousel-tips-slides').scrollTo({
    top: 0,
    left: activeSlide.offsetLeft,
    behavior: 'smooth',
  });

  const indicators = block.querySelectorAll('.carousel-tips-slide-indicator button');
  indicators.forEach((btn, idx) => {
    if (idx === realIndex) btn.setAttribute('disabled', 'true');
    else btn.removeAttribute('disabled');
  });
}

function bindEvents(block) {
  const indicators = block.querySelector('.carousel-tips-slide-indicators');
  if (!indicators) return;
  indicators.querySelectorAll('button').forEach((button) => {
    button.addEventListener('click', (e) => {
      showSlide(block, parseInt(e.currentTarget.parentElement.dataset.targetSlide, 10));
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const idx = parseInt(entry.target.dataset.slideIndex, 10);
        block.dataset.activeSlide = idx;
        block.querySelectorAll('.carousel-tips-slide-indicator button').forEach((btn, i) => {
          if (i === idx) btn.setAttribute('disabled', 'true');
          else btn.removeAttribute('disabled');
        });
      }
    });
  }, { threshold: 0.5 });
  block.querySelectorAll('.carousel-tips-slide').forEach((slide) => observer.observe(slide));
}

let carouselId = 0;
export default function decorate(block) {
  carouselId += 1;
  block.setAttribute('id', `carousel-tips-${carouselId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = [...block.children];

  // A leading row with no image is the eyebrow ("ENERGY SAVING TIPS") — render
  // it as a heading inside the carousel panel, above the slides, rather than as
  // a slide.
  let eyebrow;
  if (rows.length && !rows[0].querySelector('picture, img')) {
    const eyebrowRow = rows.shift();
    const text = eyebrowRow.textContent.trim();
    if (text) {
      eyebrow = document.createElement('p');
      eyebrow.classList.add('carousel-tips-eyebrow');
      eyebrow.textContent = text;
    }
    eyebrowRow.remove();
  }

  const isSingleSlide = rows.length < 2;

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('carousel-tips-slides');

  let slideIndicators;
  if (!isSingleSlide) {
    const nav = document.createElement('nav');
    nav.setAttribute('aria-label', 'Carousel Slide Controls');
    slideIndicators = document.createElement('ol');
    slideIndicators.classList.add('carousel-tips-slide-indicators');
    nav.append(slideIndicators);
    block.append(nav);
  }

  rows.forEach((row, idx) => {
    const slide = document.createElement('li');
    slide.dataset.slideIndex = idx;
    slide.classList.add('carousel-tips-slide');
    moveInstrumentation(row, slide);
    while (row.firstElementChild) {
      const cell = row.firstElementChild;
      if (cell.children.length === 1 && cell.querySelector('picture')) {
        cell.className = 'carousel-tips-slide-icon';
      } else {
        cell.className = 'carousel-tips-slide-content';
      }
      slide.append(cell);
    }
    slidesWrapper.append(slide);

    if (slideIndicators) {
      const indicator = document.createElement('li');
      indicator.classList.add('carousel-tips-slide-indicator');
      indicator.dataset.targetSlide = idx;
      indicator.innerHTML = `<button type="button" aria-label="Show Slide ${idx + 1} of ${rows.length}"></button>`;
      slideIndicators.append(indicator);
    }
    row.remove();
  });

  slidesWrapper.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [{ width: '150' }]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });

  block.prepend(slidesWrapper);

  // the eyebrow heading sits at the very top of the carousel panel
  if (eyebrow) block.prepend(eyebrow);

  if (!isSingleSlide) bindEvents(block);
}
