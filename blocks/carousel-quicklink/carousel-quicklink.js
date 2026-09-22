import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Quick-link carousel ("FIND YOUR SOLUTION").
 *
 * A horizontal, arrow/dot-navigated set of linked quick-link cards. Each card is
 * a single link: a short bold title plus a trailing redirect arrow icon — no
 * image, no description. Several cards are visible at once and the track
 * scroll-snaps horizontally.
 *
 * Expected authored structure: one row per quick-link, each row a single cell
 * containing an anchor whose text is the card title.
 */

// trailing redirect / open-in arrow appended to every card
const ARROW_ICON = `<svg class="carousel-quicklink-arrow" viewBox="0 0 30 30" aria-hidden="true" focusable="false">
  <path fill="currentColor" fill-rule="evenodd" d="M26.125 10c0-.621-.504-1.125-1.125-1.125H11.25c-4.013 0-7.34 3.193-7.375 7.169V22.5a1.125 1.125 0 0 0 2.25 0v-6.394c0-2.713 2.284-4.981 5.125-4.981H25c.621 0 1.125-.504 1.125-1.125" clip-rule="evenodd"/>
  <path fill="currentColor" fill-rule="evenodd" d="M25.796 10.796c.439-.44.439-1.152 0-1.591l-5.06-5.06a1.125 1.125 0 0 0-1.591 1.59L23.409 10l-4.264 4.265a1.125 1.125 0 0 0 1.59 1.59z" clip-rule="evenodd"/>
</svg>`;

function updateDots(block) {
  const slides = [...block.querySelectorAll('.carousel-quicklink-slide')];
  const track = block.querySelector('.carousel-quicklink-slides');
  const dots = [...block.querySelectorAll('.carousel-quicklink-dot')];
  if (!dots.length || !slides.length) return;
  // mark the dot for the left-most fully visible slide as active
  const { scrollLeft } = track;
  let activeIndex = 0;
  slides.forEach((slide, idx) => {
    if (slide.offsetLeft - track.offsetLeft <= scrollLeft + 1) activeIndex = idx;
  });
  dots.forEach((dot, idx) => dot.classList.toggle('active', idx === activeIndex));
}

function scrollByPage(block, direction) {
  const track = block.querySelector('.carousel-quicklink-slides');
  const slide = block.querySelector('.carousel-quicklink-slide');
  if (!track || !slide) return;
  const step = slide.getBoundingClientRect().width + 16;
  track.scrollBy({ left: direction * step, behavior: 'smooth' });
}

function scrollToSlide(block, index) {
  const track = block.querySelector('.carousel-quicklink-slides');
  const slides = block.querySelectorAll('.carousel-quicklink-slide');
  if (!track || !slides[index]) return;
  track.scrollTo({ left: slides[index].offsetLeft - track.offsetLeft, behavior: 'smooth' });
}

export default function decorate(block) {
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const rows = [...block.children];

  const track = document.createElement('ul');
  track.classList.add('carousel-quicklink-slides');

  rows.forEach((row) => {
    const slide = document.createElement('li');
    slide.classList.add('carousel-quicklink-slide');
    moveInstrumentation(row, slide);

    // the authored cell holds a single link (title text)
    const link = row.querySelector('a');
    if (link) {
      link.classList.add('carousel-quicklink-link');
      const title = document.createElement('span');
      title.classList.add('carousel-quicklink-title');
      // preserve the link's text as the card title
      title.textContent = link.textContent.trim();
      link.textContent = '';
      link.append(title);
      link.insertAdjacentHTML('beforeend', ARROW_ICON);
      slide.append(link);
    } else {
      // graceful fallback: keep whatever content the author provided
      while (row.firstChild) slide.append(row.firstChild);
    }
    track.append(slide);
    row.remove();
  });

  block.append(track);

  const isSingle = rows.length < 2;
  if (!isSingle) {
    // prev / next arrow controls
    const controls = document.createElement('div');
    controls.classList.add('carousel-quicklink-controls');
    const prev = document.createElement('button');
    prev.type = 'button';
    prev.classList.add('carousel-quicklink-nav', 'carousel-quicklink-prev');
    prev.setAttribute('aria-label', 'Previous');
    prev.textContent = '←';
    const next = document.createElement('button');
    next.type = 'button';
    next.classList.add('carousel-quicklink-nav', 'carousel-quicklink-next');
    next.setAttribute('aria-label', 'Next');
    next.textContent = '→';
    prev.addEventListener('click', () => scrollByPage(block, -1));
    next.addEventListener('click', () => scrollByPage(block, 1));
    controls.append(prev, next);
    block.append(controls);

    // dot pagination
    const dots = document.createElement('ol');
    dots.classList.add('carousel-quicklink-dots');
    rows.forEach((_, idx) => {
      const dot = document.createElement('li');
      const dotBtn = document.createElement('button');
      dotBtn.type = 'button';
      dotBtn.classList.add('carousel-quicklink-dot');
      dotBtn.setAttribute('aria-label', `Go to item ${idx + 1}`);
      if (idx === 0) dotBtn.classList.add('active');
      dotBtn.addEventListener('click', () => scrollToSlide(block, idx));
      dot.append(dotBtn);
      dots.append(dot);
    });
    block.append(dots);

    track.addEventListener('scroll', () => updateDots(block), { passive: true });
  }
}
