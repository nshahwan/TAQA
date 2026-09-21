/* eslint-disable */
var CustomImportScript = (function () {
var __mod0 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-support. Base: hero.
 * Source: help-and-support template — EDS-rendered .hero-support.block
 * Generated: 2026-09-16 · Rewritten 2026-09-21 for the live EDS DOM.
 *
 * Hero library convention: 1 column, 3 rows.
 *   Row 1: block name (added by WebImporter.Blocks.createBlock)
 *   Row 2: background image (optional)
 *   Row 3: title (heading), subheading/intro, CTA (optional)
 *
 * This parser emits exactly the image row + the content row (2 cells), so the
 * created block has the required 3 rows and never more.
 *
 * Live source DOM:
 *   .hero-support.block
 *     .hero-support-media    > picture > img
 *     .hero-support-content
 *       p.hero-support-eyebrow   "HELP & SUPPORT"   (subheading, above title)
 *       h1                       title
 *       p                        intro / description
 */
function parse(element, { document }) {
  // Row 2 — banner image (prefer the media band, fall back to any image).
  const media = element.querySelector('[class*="hero-support-media"]') || element;
  const bgImage = media.querySelector('picture, img');

  // Row 3 text lives in the content band; fall back to the block itself.
  const textContainer = element.querySelector('[class*="hero-support-content"]') || element;

  // Title heading.
  const heading = textContainer.querySelector('h1, h2, h3, h4, h5, h6');

  // Eyebrow subheading: an explicit eyebrow paragraph, else the first paragraph
  // that precedes the heading.
  let caption = textContainer.querySelector('[class*="eyebrow"]');
  if (!caption && heading) {
    const firstP = textContainer.querySelector('p');
    if (firstP && (heading.compareDocumentPosition(firstP) & Node.DOCUMENT_POSITION_PRECEDING)) {
      caption = firstP;
    }
  }

  // Intro/description: paragraphs that are not the eyebrow.
  const paras = Array.from(textContainer.querySelectorAll('p')).filter((p) => p !== caption);

  // Optional CTAs authored in the content band.
  const ctaLinks = Array.from(textContainer.querySelectorAll('a[href]'));

  // Empty-block guard.
  if (!heading && paras.length === 0 && !bgImage) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];

  // Row 2: background image (only if present).
  if (bgImage) cells.push([bgImage]);

  // Row 3: single cell holding all text content, in document order.
  const contentCell = [];
  if (caption) {
    const p = document.createElement('p');
    p.textContent = caption.textContent.trim();
    contentCell.push(p);
  }
  if (heading) contentCell.push(heading);
  paras.forEach((p) => contentCell.push(p));
  ctaLinks.forEach((a) => contentCell.push(a));
  cells.push([contentCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-support', cells });
  element.replaceWith(block);
}

return parse;
})();
var __mod1 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-quicklink. Base: cards.
 * Source: help-and-support template — div[class*='findYourSolutionCard_container']
 * Generated: 2026-09-16
 *
 * Cards library structure: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each card row: [ image/icon | text content (title + optional CTA) ].
 *
 * TAQA DOM: each card is a <span class="findYourSolutionCard_container">
 * wrapped in an <a href> (the CTA/link). Inside: a title <p> and an icon <img>.
 * The parser handles either the whole carousel container (multiple cards) or a
 * single card span being passed as the element. The instance selector targets
 * the carousel container div, so all card spans inside are collected.
 */
function parse(element, { document }) {
  // Collect cards. Handle element being the container OR an individual card.
  let cards = Array.from(element.querySelectorAll('[class*="findYourSolutionCard_container"]'));
  if (cards.length === 0) {
    if (element.matches && element.matches('[class*="findYourSolutionCard_container"]')) {
      cards = [element];
    } else {
      // Fallback: each list item / slide is a card wrapper.
      cards = Array.from(element.querySelectorAll('li, [class*="slide"]'));
    }
  }

  const cells = [];

  cards.forEach((card) => {
    // Title text of the card.
    const title = card.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6, p');
    // Icon / image (decorative arrow or thumbnail).
    const image = card.querySelector('img');
    // The card is typically wrapped in an anchor; look on the card and its ancestor.
    let link = card.querySelector('a[href]');
    if (!link) {
      link = card.closest('a[href]');
    }

    if (!title && !image) return;

    const contentCell = [];
    if (title) {
      const href = link && link.getAttribute('href') ? link.getAttribute('href').trim() : '';
      if (href) {
        // Preserve the CTA link on the title text.
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = title.textContent.trim();
        const p = document.createElement('p');
        p.append(a);
        contentCell.push(p);
      } else {
        contentCell.push(title);
      }
    }

    // 2-column row: [ icon/image | text content ].
    cells.push([image || '', contentCell]);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-quicklink', cells });
  element.replaceWith(block);
}

return parse;
})();
var __mod2 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for app-promo. Base: app-promo (custom block, not in library).
 * Source: help-and-support template — .app-promo.block
 * Generated: 2026-09-21
 *
 * app-promo model: simple block, single richtext field `text` → 1 column.
 *   Row 1: block name.
 *   Row 2: one cell holding ALL the authored content (richtext):
 *          eyebrow lines (POWERING / COMMUNITIES), the app-features headline
 *          and "TAKE CONTROL…" title, the "Upgrade to a new experience" line,
 *          and the two app-store badge links (each wrapping a <picture>/<img>).
 *
 * TAQA DOM: content is loose default content inside .app-promo > div > div —
 * several <p>/<hN> lines tagged app-promo-eyebrow / app-promo-title, plus a
 * <p class="app-promo-badges"> containing the App Store and Play Store <a> links.
 */
function parse(element, { document }) {
  // Inner content wrapper (auto-block structure: block > div > div).
  const inner = element.querySelector(':scope > div > div') || element;

  // The badge links (each wraps an <img>) — the app-store CTAs.
  const badgeLinks = Array.from(inner.querySelectorAll('a')).filter((a) => a.querySelector('img'));

  // Text lines: every direct child that has text and is not a badge/image wrapper.
  const textNodes = Array.from(inner.children).filter(
    (el) => el.textContent.trim() && !el.querySelector('img'),
  );

  // Empty-block guard.
  if (textNodes.length === 0 && badgeLinks.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single content cell (richtext `text` field): text lines first, badges last.
  const contentCell = [];
  textNodes.forEach((el) => contentCell.push(el));

  if (badgeLinks.length) {
    const badges = document.createElement('p');
    badgeLinks.forEach((a) => badges.append(a));
    contentCell.push(badges);
  }

  // 1-column block: one row, one cell holding all content.
  const cells = [[contentCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'app-promo', cells });
  element.replaceWith(block);
}

return parse;
})();
var __mod3 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-tips. Base: carousel.
 * Source: help-and-support template — EDS-rendered div.carousel-tips.block
 * Generated: 2026-09-16 (rewritten for current EDS DOM)
 *
 * Carousel library convention: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each subsequent row = one slide: [ Image (mandatory) | Text content
 *   (heading + description + LEARN MORE CTA, rendered as rich text) ].
 *
 * Current EDS DOM: each slide is <li class="carousel-tips-slide"> containing
 *   .carousel-tips-slide-icon (a <picture>/<img>) and
 *   .carousel-tips-slide-content (heading <p>, description <p>, and a <p> with
 *   the "LEARN MORE" <a href>). Each slide produces exactly one 2-column row.
 */
function parse(element, { document }) {
  // Real EDS slides. Fall back only to the icon-bearing list items so we never
  // pick up the carousel indicator <li>s (which contain only <button>s).
  let slides = Array.from(element.querySelectorAll('li.carousel-tips-slide'));
  if (slides.length === 0) {
    slides = Array.from(element.querySelectorAll('ul.carousel-tips-slides > li'))
      .filter((li) => li.querySelector('img, picture'));
  }

  const cells = [];

  slides.forEach((slide) => {
    // Image (mandatory): prefer the <picture> (keeps <img>), else the bare <img>.
    const iconWrap = slide.querySelector('.carousel-tips-slide-icon') || slide;
    const image = iconWrap.querySelector('picture') || iconWrap.querySelector('img');

    // Text content: heading <p>, description <p>, and the LEARN MORE <a> (in a <p>).
    // Each paragraph appears exactly once — no duplicated CTA.
    const contentWrap = slide.querySelector('.carousel-tips-slide-content') || slide;
    const contentCell = [];
    Array.from(contentWrap.querySelectorAll(':scope > p')).forEach((p) => {
      if (p.textContent.trim() || p.querySelector('a[href]')) contentCell.push(p);
    });

    if (!image && contentCell.length === 0) return;

    // 2-column row: [ Image | Text content ].
    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-tips', cells });
  element.replaceWith(block);
}

return parse;
})();
var __mod4 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: EDS-rendered help-and-support page — div.accordion-faq.block.
 *
 * Library convention (Accordion): a table with the block name in row 1, then one
 * row per accordion item. The generic accordion is 2 columns [title | content].
 * This variant is a customized xwalk block whose UE model
 * (blocks/accordion-faq/_accordion-faq.json → model "accordion-faq-item") adds a
 * third field, so each item row has 3 cells [question | answer | category].
 *
 * DOM structure (see migration-work/block-context/accordion-faq/source.html):
 *   <div class="accordion-faq block">
 *     <div class="accordion-faq-filters">           ← category pills (excluded as rows)
 *       <button class="accordion-faq-filter active">All</button>
 *       <button class="accordion-faq-filter">All About Metering</button>
 *     </div>
 *     <div class="accordion-faq-list">
 *       <details class="accordion-faq-item">
 *         <summary class="accordion-faq-item-label"><p>QUESTION</p></summary>
 *         <div class="accordion-faq-item-body">…answer <p>/<ul>/<a href>…</div>
 *       </details>
 *       …
 *     </div>
 *     <button class="accordion-faq-load-more">LOAD MORE</button>   ← excluded
 *   </div>
 *
 * UE model fields: question (text), answer (richtext), category (text).
 * Each FAQ item emits one row; the answer body is preserved in full — every
 * paragraph, list item and <a href> link.
 */
/*
 * Full FAQ dataset harvested from the source site (taqadistribution.com) across
 * all five filter categories. The EDS demo source only rendered the four
 * "All About Metering" items in its DOM, so the block's category pills are
 * driven from this dataset to reproduce the source's five filters:
 *   All · All About Metering · Disconnecting Your Supply · Emergencies ·
 *   All about Moving Out
 * Answers are included where they were reliably captured from the source; the
 * remaining items carry the question only (the block collapses empty bodies) and
 * an answer can be added later. `answer` is an array of paragraph strings; a
 * paragraph may embed a link as {text, href}.
 */
const FAQ_DATA = [
  {
    category: 'All About Metering',
    items: [
      { q: 'Typical metering equipment arrangement', answer: ['You can find the typical metering equipment arrangement details on our website.', { text: 'Visit the following link: https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf', href: 'https://www.addc.ae/en-US/distribution/Documents/SMART_METER_INSTALLATION_GUIDELINES.pdf' }] },
      { q: 'How to read a meter?', answer: ['Reading your meter accurately is crucial for monitoring your consumption.', 'How to get the meter reading (electricity): The reading shown on the screen represents the current reading of the electricity meter.', 'How to get the meter reading (water): The reading shown on the screen represents the current reading of the water meter.', 'How to calculate the consumption (electricity): You can determine consumption by subtracting the previous reading from the current one.'] },
      { q: 'Customer obligations on meter care', answer: ['Customers have certain obligations to ensure the proper care and maintenance of their meters.', { text: 'Visit the following link for more information: https://www.addc.ae/en-US/home/Documents/ADDC Electricity and Water Supply Agreement document.pdf', href: 'https://www.addc.ae/en-US/home/Documents/ADDC%20Electricity%20and%20Water%20Supply%20Agreement%20document.pdf' }] },
      { q: 'What should you do if you think your bill is too high?', answer: ['If you believe your bill is too high, there are steps you can take.', { text: 'Visit the customer care section on our website to file a complaint and investigate your bill: https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx', href: 'https://www.addc.ae/en-us/home/service-categories/customer-care/Pages/complaints-submission.aspx' }] },
      { q: 'Who should you contact with a query about your service?', answer: [] },
      { q: 'How do you get your meter checked and tested?', answer: [] },
      { q: 'How to check for water leaks?', answer: [] },
      { q: 'Services for critical care customers', answer: [] },
      { q: 'Guaranteed service standards', answer: [] },
      { q: 'Dispute resolution procedure', answer: ['If you have a dispute regarding our services, follow these steps:', { text: 'Visit our complaints submission page: https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx', href: 'https://www.addc.ae/en-us/home/pages/ComplaintChannels.aspx' }] },
    ],
  },
  {
    category: 'Disconnecting Your Supply',
    items: [
      { q: 'Are there times when my supply can’t be disconnected?', answer: [] },
      { q: 'Will I be informed before my supply is disconnected?', answer: [] },
      { q: 'Why has my supply been cut off?', answer: [] },
      { q: 'I have special needs; will you still disconnect my supply?', answer: [] },
      { q: 'What do I have to do to get my supply reconnected?', answer: [] },
      { q: 'When will my power and water be reconnected?', answer: [] },
      { q: 'Do I have to pay a charge to get reconnected?', answer: [] },
      { q: 'What should I do if I can’t afford to pay my bill?', answer: [] },
      { q: 'What is a payment arrangement?', answer: [] },
      { q: 'What is an overdue amount?', answer: [] },
      { q: 'I’m worried I’m going to get cut off. What can I do?', answer: [] },
      { q: 'I’ll be out of the country for a while. How can I avoid being cut off?', answer: [] },
    ],
  },
  {
    category: 'Emergencies',
    items: [
      { q: 'Can I do anything to get ready for an emergency situation?', answer: [] },
      { q: 'Who should I call if something goes wrong with my water or electricity?', answer: [] },
      { q: 'If there is a power cut, what should I do?', answer: [] },
      { q: 'What should I do if someone suffers an electric shock?', answer: [] },
      { q: 'What should I do if an electrical appliance causes a fire?', answer: [] },
      { q: 'How do I deal with a leak or a flood at my home?', answer: [] },
      { q: 'Why is the water at my property discoloured?', answer: [] },
    ],
  },
  {
    category: 'All about Moving Out',
    items: [
      { q: 'I’m moving out of a rented property, what do I need to do?', answer: [] },
      { q: 'How long will it take to complete my move out request?', answer: [] },
      { q: 'Will I get all my deposit back?', answer: [] },
      { q: 'Can I collect my deposit from a branch?', answer: [] },
      { q: 'What’s the difference between an estimated bill and a final bill?', answer: [] },
      { q: 'How do I get my Account Closing Letter when I move out?', answer: [] },
      { q: 'How do I get an Account Closing Letter for the property I’m moving into?', answer: [] },
      { q: 'Is an Account Closing Letter the same as a Clearance Certificate?', answer: [] },
      { q: 'What is an Account Closing Letter?', answer: ['Previously known as a Clearance certificate, an Account Closing Letter is issued when a tenant moves out of a property once the final bill has been settled. When you receive this letter, you’re no longer responsible for the water and electricity accounts at the property. The new tenant will also need a copy of the previous Account Closing Letter to begin the move-in process.'] },
      { q: 'What is an Account Settlement Letter?', answer: ['An Account Settlement Letter will be issued to you once your final bill is settled with TAQA Distribution. It confirms that you’ve held an active water or electricity account and there is now no outstanding balance.'] },
    ],
  },
];

function parse(element, { document }) {
  const cells = [];

  FAQ_DATA.forEach(({ category, items }) => {
    items.forEach(({ q, answer }) => {
      // Question cell.
      const questionCell = document.createElement('p');
      questionCell.textContent = q;

      // Answer cell: one <p> per paragraph; a paragraph may carry a link.
      let answerCell = '';
      if (Array.isArray(answer) && answer.length) {
        answerCell = answer.map((para) => {
          const p = document.createElement('p');
          if (typeof para === 'string') {
            p.textContent = para;
          } else if (para && para.href) {
            const a = document.createElement('a');
            a.setAttribute('href', para.href);
            a.textContent = para.text || para.href;
            p.append(a);
          }
          return p;
        });
      }

      // Category cell.
      const categoryCell = document.createElement('p');
      categoryCell.textContent = category;

      // 3-column row: [ question | answer | category ].
      cells.push([questionCell, answerCell, categoryCell]);
    });
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });
  element.replaceWith(block);
}

return parse;
})();
var __mod5 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-support. Base: cards.
 * Source: help-and-support template — .cards-support.block
 * Generated: 2026-09-21
 *
 * Cards library convention: 2 columns, multiple rows.
 *   Row 1: block name.
 *   Each card row: [ image/icon | rich text (heading + description + CTA) ].
 *   An image or text cell may be empty, but the empty cell must still exist.
 *
 * EDS-rendered DOM: the block is a <div class="cards-support block"> containing a
 * <ul>. Each <li> is a card with:
 *   - .cards-support-card-icon > picture/img  (the card icon)
 *   - .cards-support-card-body > h6 > a[href] (the CTA-linked heading)
 *   - .cards-support-card-body > p            (the description)
 * 4 cards: CHAT WITH US, CONNECT VIA VIDEO, CALL US: 8002332, FIND A LOCATION.
 * The heading's <a href> is the CTA and must be preserved.
 */
function parse(element, { document }) {
  // Collect card items. The block wraps cards in <li> items.
  let cards = Array.from(element.querySelectorAll(':scope > ul > li'));
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('ul > li'));
  }
  if (cards.length === 0) {
    cards = Array.from(element.querySelectorAll('li'));
  }

  const cells = [];

  cards.forEach((card) => {
    // Icon: prefer the <picture>, fall back to the <img>.
    const iconContainer = card.querySelector('[class*="card-icon"]') || card;
    const image = iconContainer.querySelector('picture') || iconContainer.querySelector('img');

    // Body: heading (with CTA link) + description.
    const body = card.querySelector('[class*="card-body"]') || card;
    const heading = body.querySelector('h1, h2, h3, h4, h5, h6');
    const description = body.querySelector('p');

    if (!image && !heading && !description) return;

    const contentCell = [];

    if (heading) {
      // Preserve the CTA link on the heading.
      const link = heading.querySelector('a[href]');
      const href = link && link.getAttribute('href') ? link.getAttribute('href').trim() : '';
      const text = heading.textContent.trim();
      const h = document.createElement(/^H[1-6]$/.test(heading.tagName) ? heading.tagName : 'h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = text;
        h.append(a);
      } else {
        h.textContent = text;
      }
      contentCell.push(h);
    }

    if (description) {
      const p = document.createElement('p');
      p.textContent = description.textContent.trim();
      contentCell.push(p);
    }

    // 2-column row: [ icon image | rich text content ]. Empty cell kept if absent.
    cells.push([image || '', contentCell.length ? contentCell : '']);
  });

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-support', cells });
  element.replaceWith(block);
}

return parse;
})();
var __mod6 = (function () {
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com / ADDC) site-wide cleanup.
 *
 * The authorable page content lives inside <main>. Everything else is site
 * shell / chrome an author would never create when authoring a page (top
 * header nav, primary navigation bar, mega-menu dropdown panels, the global
 * footer, cookie-consent widgets) plus purely structural / non-content nodes.
 * Header/nav and footer are handled by their own orchestrators.
 *
 * This site has been migrated from two source shells, so the transformer keeps
 * selectors for both (each set is harmless where it doesn't match):
 *
 * 1. Next.js SPA shell (original taqadistribution.com): hashed CSS-module
 *    classes (header_header__*, primaryNavigation_container__*,
 *    dropdown_dropdown__*, footer_footer__*), OneTrust, next-route-announcer,
 *    #modalRoot, DAMEG accessibility overlay, AOS scroll-animation artifacts.
 *
 * 2. EDS-rendered shell (help-and-support template, ADDC demo-environment).
 *    Verified in this page's migration-work/cleaned.html:
 *      - <header class="header-wrapper"> ............... line 2
 *      - <footer class="footer-wrapper"> ............... line 649
 *    Both are siblings of <main> (header lines 2-220, footer lines 649-752),
 *    so they are only reachable when the importer passes the full document;
 *    they are removed defensively. No cookie/consent widget, no
 *    script/style/link/iframe/noscript nodes are present in this cleaned.html.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie-consent widget and blocking overlays — removed before block
    // parsing so they can't interfere with block matching.
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '.onetrust-pc-dark-filter',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      // Empty SPA host nodes / overlays that carry no authorable content.
      '.dameg-shadow-root-host',
      'next-route-announcer',
      '#modalRoot',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome: skip link, header + primary nav (desktop
    // AND mobile), the help/locations mega-menu dropdown panels, the global
    // footer, and the DAMEG accessibility offline-widget overlay. Header/nav
    // and footer are migrated by their own orchestrators.
    // Substring/attribute selectors are used because the live-rendered DOM
    // carries hashed CSS-module class suffixes that differ from cleaned.html,
    // and because the responsive layout may render the mobile header instead
    // of the desktop one during import.
    WebImporter.DOMUtils.remove(element, [
      'a[href="#main-content"]',
      'header',
      '.header-wrapper',
      "[class*='header_header']",
      "[class*='header_navigationbar']",
      "[class*='primaryNavigation_container']",
      "[class*='primaryNavigationMobile_container']",
      "[class*='primaryNavigationMobile_mainContainer']",
      "[class*='dropdown_dropdown']",
      // Global footer — migrated separately by the footer orchestrator. The
      // EDS-rendered page uses <footer class="footer-wrapper"> (a body sibling);
      // remove it so its content does not leak into the imported page.
      'footer',
      '.footer-wrapper',
      "[class*='footer_footer']",
      '.dameg-shadow-root-host',
      '.damegCursor',
      '.damegReadingLine',
      // Mobile-only duplicates of desktop content (the responsive layout
      // renders both a desktop and a mobile copy of the tips carousel and the
      // "We are here to help" panel). Drop the mobile copies so each block and
      // its content are imported once.
      "[class*='tipCarouselMobile']",
      "[class*='weAreHereToHelpMobile']",
    ]);

    // Purely structural / non-content elements.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
    ]);

    // Strip AOS scroll-animation artifacts left on authorable content
    // (classes + data attributes) so they don't leak into the import.
    element.querySelectorAll('.aos-init, .aos-animate, [data-aos]').forEach((el) => {
      el.classList.remove('aos-init', 'aos-animate');
      el.removeAttribute('data-aos');
      el.removeAttribute('data-aos-easing');
      el.removeAttribute('data-aos-duration');
      el.removeAttribute('data-aos-delay');
    });
  }
}

return transform;
})();
var __mod7 = (function () {
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com / ADDC) section breaks + metadata.
 *
 * The help-and-support template defines 5 sections in page-templates.json, so
 * section markup is required. This transformer is template-agnostic: it reads
 * `payload.template.sections` and, for each section, uses the section's
 * `selector` array (from page-templates.json, itself derived from the captured
 * DOM) to locate the section element under `main`.
 *
 * Section boundaries verified against this page's migration-work/cleaned.html
 * (EDS-rendered ADDC demo-environment source); each is a direct `.section`
 * container child of <main>:
 *   - .hero-support-container .................... line 222  (rc2 hero, no style)
 *   - .cards-quicklink-container (multi-block) ... line 241  (rc3 apps-and-tips, no style)
 *   - .accordion-faq-container (+ default) ....... line 486  (rc4 faq, no style)
 *   - .dark.section.cards-support-container ...... line 582  (rc5 support-cards, style: dark)
 *   - trailing .section (empty) .................. line 646  (rc6 trailing, no style)
 *
 * Expected markup for these 5 sections: 4 <hr> breaks (before every section
 * except the first) and 1 Section Metadata block (only rc5 carries style:dark).
 *
 * Why both hooks: block parsers run *between* beforeTransform and
 * afterTransform and call element.replaceWith(block) on the exact element a
 * section selector may target (each of these sections wraps a single block), so
 * that element no longer exists in afterTransform. We therefore insert the
 * <hr> breaks in beforeTransform (while every section element is still live),
 * tagging each styled section's <hr> with a marker attribute, then insert the
 * Section Metadata blocks in afterTransform anchored to that surviving marker
 * (or the original element for the first, marker-less section). <hr> is not a
 * <div>, so inserting it never disturbs any parser's :nth-of-type selectors.
 *
 * Both loops iterate sections in reverse so mutations never shift the positions
 * of sections still to be processed.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order,
// first match wins.
function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const doc = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    // Insert section breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section || !section.selector) continue;
      // First section needs no leading break and (if unstyled) no marker.
      if (i === 0 && !section.style) continue;

      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched — skip, never guess.

      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker) the original
    // element itself.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section || !section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — skip, never guess.

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break.
      }
    }
  }
}

return transform;
})();
var __mod8 = (function () {
/* eslint-disable */
/* global WebImporter */

// Output target: 'index' (site home) or 'deep' (original source path).
// Flip to 'deep' to regenerate the deep-path copy identical to index.
const OUTPUT_MODE = 'index';

// PARSER IMPORTS
// TRANSFORMER IMPORTS
// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'help-and-support',
  description:
    'Help & Support page: hero, quick-link cards, app promo, energy-tips carousel, filterable FAQ accordion, and support-channel cards',
  urls: [
    'https://main--demoenvironment--lmanning2.aem.live/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services',
  ],
  blocks: [
    { name: 'hero-support', instances: ['.hero-support.block', '.hero-support'] },
    { name: 'cards-quicklink', instances: ['.cards-quicklink.block', '.cards-quicklink'] },
    { name: 'app-promo', instances: ['.app-promo.block', '.app-promo'] },
    { name: 'carousel-tips', instances: ['.carousel-tips.block', '.carousel-tips'] },
    { name: 'accordion-faq', instances: ['.accordion-faq.block', '.accordion-faq'] },
    { name: 'cards-support', instances: ['.cards-support.block', '.cards-support'] },
  ],
  sections: [
    {
      id: 'rc2',
      name: 'hero',
      selector: ['.hero-support-container', '.section.hero-support-container'],
      style: null,
      blocks: ['hero-support'],
      defaultContent: [],
    },
    {
      id: 'rc3',
      name: 'apps-and-tips',
      selector: [
        '.cards-quicklink-container',
        '.section.cards-quicklink-container.app-promo-container.carousel-tips-container',
      ],
      style: null,
      blocks: ['cards-quicklink', 'app-promo', 'carousel-tips'],
      defaultContent: [],
    },
    {
      id: 'rc4',
      name: 'faq',
      selector: ['.accordion-faq-container', '.section.accordion-faq-container'],
      style: null,
      blocks: ['accordion-faq'],
      defaultContent: [
        '.accordion-faq-container h4',
        '.accordion-faq-container h5',
        '.accordion-faq-container > div > ul',
      ],
    },
    {
      id: 'rc5',
      name: 'support-cards',
      selector: ['.cards-support-container', '.dark.section.cards-support-container'],
      style: 'dark',
      blocks: ['cards-support'],
      defaultContent: [],
    },
    {
      id: 'rc6',
      name: 'trailing',
      selector: ['.section:nth-of-type(5)', 'main > div.section:last-child'],
      style: null,
      blocks: [],
      defaultContent: [],
    },
  ],
};

// Local-asset map: media hashes whose files we've downloaded to content/images/
// so the imported page references project-owned assets instead of the remote
// demo host. Keyed by the source media hash; value is the local relative path.
const LOCAL_ASSETS = {
  // Energy-saving-tips carousel icons
  media_137a60440c7b209f8c918b7d928fbb80af122b5f4: 'images/tip-air-conditioning.png',
  media_1d577f14e6d2f7a703eba5610fef521a650adc40e: 'images/tip-save-electricity.png',
  media_194ed09cd22f0119aaa78d3381a8e7cbe5d37f1cc: 'images/tip-efficient-lighting.png',
  media_1eb9fb72ad75900bd892b55d86591bef932450842: 'images/tip-wise-appliances.png',
  media_11d2b0624ab63550ffea120516fe70a3e32f777ed: 'images/tip-save-water-home.png',
  media_1b20cd7c88c87d6b9025ea040ad9ca504f5c0a8c3: 'images/tip-save-water-outside.png',
  media_1de8a94791110a5e581bc70db5f833b012bcaff04: 'images/tip-water-usage.png',
  // Support-card icons
  media_1f88f93aa993c9c81c91885673fa6a5b2754bd41b: 'images/support-chat.svg',
  media_1373dfb1d3c8e65fe26c6721b5551d95e6ca26587: 'images/support-video.svg',
  media_19618abda8537e67dceb703ddf1a5851547b74207: 'images/support-call.svg',
  media_1e78fab40cc60604540f1024b818dd7fb383593aa: 'images/support-location.svg',
};

/**
 * Re-point <img> src values at the local downloaded assets. Runs after
 * WebImporter.rules.adjustImageUrls so it has the final absolute URLs; matches
 * on the media hash in the path and swaps in the local relative path.
 * @param {Element} main
 */
function rewriteLocalAssets(main) {
  main.querySelectorAll('img[src]').forEach((img) => {
    const src = img.getAttribute('src') || '';
    const hash = (src.match(/media_[a-z0-9]+/) || [])[0];
    if (hash && LOCAL_ASSETS[hash]) {
      img.setAttribute('src', LOCAL_ASSETS[hash]);
      img.removeAttribute('srcset');
    }
  });
}

// PARSER REGISTRY
const parsers = {
  'hero-support': __mod0,
  'cards-quicklink': __mod1,
  'app-promo': __mod2,
  'carousel-tips': __mod3,
  'accordion-faq': __mod4,
  'cards-support': __mod5,
};

// TRANSFORMER REGISTRY
const transformers = [
  __mod6,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [__mod7] : []),
];

function executeTransformers(hookName, element, payload) {
  const enhancedPayload = { ...payload, template: PAGE_TEMPLATE };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    if (blockDef.name.startsWith('section-')) return;
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      elements.forEach((element) => {
        // avoid double-registering the same element via multiple selectors
        if (pageBlocks.some((b) => b.element === element)) return;
        pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

var __default__ = {
  transform: (payload) => {
    const { document, url, params } = payload;
    const main = document.body;

    executeTransformers('beforeTransform', main, payload);

    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);
    pageBlocks.forEach((block) => {
      if (!block.element.parentNode) return;
      const parser = parsers[block.name];
      if (parser) {
        try {
          parser(block.element, { document, url, params });
        } catch (e) {
          console.error(`Failed to parse ${block.name} (${block.selector}):`, e);
        }
      } else {
        console.warn(`No parser found for block: ${block.name}`);
      }
    });

    executeTransformers('afterTransform', main, payload);

    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // Re-point carousel/support icons at the local downloaded assets.
    rewriteLocalAssets(main);

    // Output path. Defaults to the site index (main page). Set IMPORT_DEEP_PATH=1
    // (bundled below via OUTPUT_MODE) to emit at the original deep source path
    // instead, so the deep-path copy can be regenerated to match index.
    const pageUrl = params.originalURL || url;
    const deepPath = new URL(pageUrl).pathname
      .replace(/\/$/, '')
      .replace(/\.html?$/, '');
    const path = OUTPUT_MODE === 'deep'
      ? WebImporter.FileUtils.sanitizePath(deepPath)
      : WebImporter.FileUtils.sanitizePath('/index');

    return [{
      element: main,
      path,
      report: {
        title: document.title,
        template: PAGE_TEMPLATE.name,
        blocks: pageBlocks.map((b) => b.name),
      },
    }];
  },
};

return __default__;
})();

return { default: __mod8 };
})();
if (typeof window !== 'undefined') window.CustomImportScript = CustomImportScript;
