import { moveInstrumentation } from '../../scripts/scripts.js';
/*
 * Accordion FAQ Block
 * Collapsible question/answer list with optional category filter pills and
 * "LOAD MORE" pagination.
 *
 * Authored structure (one row per question):
 *   cell 0: question label
 *   cell 1: answer body
 *   cell 2: (optional) category name — when present on any row, a filter bar
 *           of "All" + each unique category is rendered above the list.
 */

const PAGE_SIZE = 4;

export default function decorate(block) {
  // Build the <details> items from the authored rows.
  const items = [...block.children].map((row) => {
    const label = row.children[0];
    const bodyCell = row.children[1];
    const categoryCell = row.children[2];
    const category = categoryCell ? categoryCell.textContent.trim() : '';

    const summary = document.createElement('summary');
    summary.className = 'accordion-faq-item-label';
    if (label) summary.append(...label.childNodes);

    const body = bodyCell || document.createElement('div');
    body.className = 'accordion-faq-item-body';

    const details = document.createElement('details');
    details.className = 'accordion-faq-item';
    if (category) details.dataset.category = category;
    details.append(summary, body);
    moveInstrumentation(row, details);
    return details;
  });

  block.textContent = '';

  // Distinct category tabs, preserving authored order. Each row is tagged with
  // exactly one category (the source shows an independent question set per tab,
  // e.g. an "All" tab plus topic tabs), so the tabs ARE the categories — we do
  // not synthesise an extra "show everything" pill.
  const categories = [];
  items.forEach((it) => {
    const c = it.dataset.category;
    if (c && !categories.includes(c)) categories.push(c);
  });
  // Default to the "All" tab when present, otherwise the first category.
  let activeCategory = categories.includes('All') ? 'All' : (categories[0] || '');
  let visibleCount = PAGE_SIZE;

  const list = document.createElement('div');
  list.className = 'accordion-faq-list';
  items.forEach((it) => list.append(it));

  const loadMore = document.createElement('button');
  loadMore.type = 'button';
  loadMore.className = 'accordion-faq-load-more';
  loadMore.textContent = 'LOAD MORE';

  const render = () => {
    const matches = items.filter((it) => it.dataset.category === activeCategory);
    items.forEach((it) => { it.hidden = true; it.open = false; });
    matches.slice(0, visibleCount).forEach((it) => { it.hidden = false; });
    loadMore.hidden = matches.length <= visibleCount;
  };

  loadMore.addEventListener('click', () => {
    visibleCount += PAGE_SIZE;
    render();
  });

  // Category filter pills — one per distinct category tab.
  if (categories.length) {
    const filters = document.createElement('div');
    filters.className = 'accordion-faq-filters';

    const makePill = (labelText, value) => {
      const pill = document.createElement('button');
      pill.type = 'button';
      pill.className = 'accordion-faq-filter';
      pill.textContent = labelText;
      if (value === activeCategory) pill.classList.add('active');
      pill.addEventListener('click', () => {
        activeCategory = value;
        visibleCount = PAGE_SIZE;
        [...filters.children].forEach((c) => c.classList.remove('active'));
        pill.classList.add('active');
        render();
      });
      return pill;
    };

    categories.forEach((c) => filters.append(makePill(c, c)));
    block.append(filters);
  }

  block.append(list, loadMore);
  render();
}
