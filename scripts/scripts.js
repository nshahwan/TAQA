import {
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
  buildBlock,
  readBlockConfig,
  toClassName,
  toCamelCase,
} from './aem.js';

if (window.trustedTypes && window.trustedTypes.createPolicy) {
  const innerTT = window.trustedTypes.createPolicy('tt-inner', {
    createHTML: (s) => s, // avoid stack overflow
  });

  window.trustedTypes.createPolicy('default', {
    createHTML: (input, type, sink) => {
      let processedInput = input;
      if (/srcdoc\s*=/i.test(processedInput)) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('iframe[srcdoc]').forEach((el) => el.removeAttribute('srcdoc'));
        processedInput = doc.body.innerHTML;
      }
      if (sink.includes('createContextualFragment') || sink.includes('Document write')) {
        const doc = new DOMParser().parseFromString(innerTT.createHTML(processedInput), 'text/html');
        doc.querySelectorAll('script').forEach((el) => el.remove());
        processedInput = doc.body.innerHTML;
      }
      return processedInput;
    },
    createScriptURL: (input) => input,
    createScript: (input) => input,
  });
}

/**
 * Moves all the attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 * @param {string[]} [attributes] optional list of attribute names to move
 */
export function moveAttributes(from, to, attributes) {
  let attrs = attributes;
  if (!attrs) {
    attrs = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attrs.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move Universal Editor instrumentation attributes from one element to another.
 * Blocks that restructure their DOM must call this so authored items stay editable.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Turns `/widgets/...` links into widget blocks.
 * @param {Element} main The container element
 */
function buildWidgetAutoBlocks(main) {
  const widgetLinks = [...main.querySelectorAll('a[href*="/widgets/"]')];
  widgetLinks.forEach((link) => {
    if (link.closest('.widget')) return;
    const newLink = link.cloneNode(true);
    const widgetBlock = buildBlock('widget', { elems: [newLink] });
    const p = link.closest('p');
    if (
      p
      && p.querySelectorAll('a').length === 1
      && p.querySelector('a') === link
      && p.textContent.trim() === link.textContent.trim()
    ) {
      p.replaceWith(widgetBlock);
    } else {
      link.replaceWith(widgetBlock);
    }
  });
}

/**
 * Interior content pages open with a page title + banner image. Match the
 * source design by turning that opening section into a navy "page-hero" band
 * with the title on the left and the banner image blended into the navy on the
 * right. Runs before decorateSections so it operates on the raw section divs.
 * @param {Element} main The container element
 */
function buildPageHero(main) {
  if (main !== document.querySelector('main')) return;
  const sections = [...main.querySelectorAll(':scope > div')];
  // Interior page-title section = a plain default-content section (single
  // heading + banner image, no authored block). This deliberately excludes
  // the homepage, whose opening section is a carousel-hero block (a div with a
  // block class and multiple headings) — turning that into a page-hero band
  // was a regression.
  // The title section is the first plain default-content section whose only
  // heading is the page title. It may or may not include a banner image.
  const first = sections[0];
  if (!first) return;
  const headings = first.querySelectorAll('h1, h2, h3, h4');
  const isPlain = !first.querySelector('div[class]'); // no authored block
  if (!isPlain || headings.length !== 1) return;
  const titleSection = first;

  // If the title section includes a thin decorative banner strip, the source
  // tucks it into the top-right corner of the navy band; keep only the first
  // such image. A separate full-width cover (alt="cover") image, if any, stays
  // in its own section below to render as a normal full-bleed banner.
  const pictures = [...titleSection.querySelectorAll('picture')];
  if (pictures.length > 1) {
    pictures.slice(1).forEach((pic) => (pic.closest('p') || pic).remove());
  }

  titleSection.classList.add('page-hero');
}

/**
 * The Help & Support "Looking for answers" section is a two-column layout on the
 * source: the FAQ accordion fills a wide left column, while the energy-saving-tips
 * carousel and the "We are here to help" link panel stack in a narrow right column.
 * The imported section is a flat list of default-content + block wrappers; group
 * them into .faq-col-main (accordion + its intro) and .faq-col-side (everything
 * after the accordion) so CSS can lay them out side by side. Runs after
 * decorateSections, so it matches the wrapped block wrappers.
 * @param {Element} main The container element
 */
function buildFaqTwoColumn(main) {
  if (main !== document.querySelector('main')) return;
  main.querySelectorAll(':scope > .section').forEach((section) => {
    // Runs after decorateBlocks, so the per-block `<name>-wrapper` classes are
    // present. Grouping must happen after block decoration — wrapping earlier
    // would make the column wrappers look like blocks to decorateBlocks
    // (`div.section > div > div`).
    const accordion = section.querySelector(':scope > .accordion-faq-wrapper');
    // The side column is whatever follows the accordion in the section — the
    // energy-tips carousel and/or the "We are here to help" link panel. Fire as
    // long as the accordion has at least one following sibling to place beside it.
    if (!accordion) return;
    if (section.querySelector(':scope > .faq-col-main')) return;
    const children = [...section.children];
    const accordionIdx = children.indexOf(accordion);
    if (accordionIdx === children.length - 1) return; // nothing after the accordion

    const mainCol = document.createElement('div');
    mainCol.className = 'faq-col-main';
    const sideCol = document.createElement('div');
    sideCol.className = 'faq-col-side';

    children.forEach((child, i) => {
      (i <= accordionIdx ? mainCol : sideCol).append(child);
    });

    section.append(mainCol, sideCol);
    section.classList.add('faq-two-column');
  });
}

/**
 * Residential help-and-support pages carry an app-download promo authored as
 * loose default content: a "POWERING" + "COMMUNITIES" eyebrow, an <h6>/<h5>
 * headline, an "Upgrade to a new experience" line, and the two app-store badge
 * links. Wrap that run of sibling nodes into an `app-promo` block so it renders
 * as the source's teal-gradient card. Runs before decorateSections so it
 * operates on the raw section divs.
 * @param {Element} main The container element
 */
function buildAppPromo(main) {
  if (main !== document.querySelector('main')) return;
  // The eyebrow is a "POWERING" node immediately followed by "COMMUNITIES".
  // The help-and-support template authors these as <p>; the residential
  // overview authors them as <h5> — accept either.
  const eyebrow = [...main.querySelectorAll('p, h1, h2, h3, h4, h5, h6')].find(
    (el) => el.textContent.trim() === 'POWERING'
      && el.nextElementSibling?.textContent.trim() === 'COMMUNITIES',
  );
  if (!eyebrow || eyebrow.closest('.app-promo')) return;

  // Gather the eyebrow and following siblings up to and including the badges
  // paragraph (the <p> that holds the app-store image links).
  const nodes = [];
  let node = eyebrow;
  while (node) {
    nodes.push(node);
    const isBadges = node.tagName === 'P' && node.querySelector('a img');
    if (isBadges) break;
    node = node.nextElementSibling;
  }
  if (!nodes.length) return;

  const block = buildBlock('app-promo', { elems: nodes.map((n) => n.cloneNode(true)) });
  nodes[0].replaceWith(block);
  nodes.slice(1).forEach((n) => n.remove());
}

/**
 * On residential help-and-support pages the app-promo card sits beside the
 * energy-saving-tips carousel (its "ENERGY SAVING TIPS" heading + carousel) as
 * a two-column row. The imported section is a flat list of wrappers; group the
 * app-promo into a left column and the tips heading + carousel into a right
 * column so CSS can lay them side by side. Runs after decorateBlocks so the
 * per-block `<name>-wrapper` classes exist.
 * @param {Element} main The container element
 */
function buildAppPromoRow(main) {
  if (main !== document.querySelector('main')) return;
  main.querySelectorAll(':scope > .section').forEach((section) => {
    const appPromo = section.querySelector(':scope > .app-promo-wrapper');
    const carousel = section.querySelector(':scope > .carousel-tips-wrapper');
    if (!appPromo || !carousel) return;
    if (section.querySelector(':scope > .app-promo-row')) return;

    const row = document.createElement('div');
    row.className = 'app-promo-row';
    const sideCol = document.createElement('div');
    sideCol.className = 'app-promo-tips';

    // Everything from the app-promo up to and including the carousel forms the
    // row: app-promo on the left, the tips heading + carousel on the right.
    const children = [...section.children];
    const start = children.indexOf(appPromo);
    const end = children.indexOf(carousel);
    section.insertBefore(row, appPromo);
    children.slice(start, end + 1).forEach((child) => {
      if (child === appPromo) row.append(child);
      else sideCol.append(child);
    });
    row.append(sideCol);
  });
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks(main) {
  try {
    buildPageHero(main);
    buildAppPromo(main);
    // auto load `*/fragments/*` references
    const fragments = [...main.querySelectorAll('a[href*="/fragments/"]')].filter((f) => !f.closest('.fragment'));
    if (fragments.length > 0) {
      // eslint-disable-next-line import/no-cycle
      import('../blocks/fragment/fragment.js').then(({ loadFragment }) => {
        fragments.forEach(async (fragment) => {
          try {
            const { pathname } = new URL(fragment.href);
            const frag = await loadFragment(pathname);
            fragment.parentElement.replaceWith(...frag.children);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error('Fragment loading failed', error);
          }
        });
      });
    }
    buildWidgetAutoBlocks(main);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Applies `.section-metadata` block config (e.g. style="dark") to its section.
 * This project's aem.js ships a trimmed decorateSections that does not handle
 * section metadata, so we process it here — reading the config, adding the
 * style classes / data attributes to the section, and removing the block so it
 * is not treated as a loadable block. Must run after decorateSections (which
 * wraps the block) and before decorateBlocks (which would try to load it).
 * @param {Element} main The container element
 */
function decorateSectionMetadata(main) {
  main.querySelectorAll(':scope > .section').forEach((section) => {
    const sectionMeta = section.querySelector('div.section-metadata');
    if (!sectionMeta) return;
    const meta = readBlockConfig(sectionMeta);
    Object.keys(meta).forEach((key) => {
      if (key === 'style') {
        meta.style.split(',').map((style) => toClassName(style.trim()))
          .forEach((style) => section.classList.add(style));
      } else {
        section.dataset[toCamelCase(key)] = meta[key];
      }
    });
    (sectionMeta.parentElement || sectionMeta).remove();
  });
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateSectionMetadata(main);
  decorateBlocks(main);
  buildAppPromoRow(main);
  buildFaqTwoColumn(main);
  decorateButtons(main);
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = 'en';
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
