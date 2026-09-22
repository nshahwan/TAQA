(function () {
  var WebImporter = window.WebImporter;
  var __mod_0 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for hero-support. Base: hero.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk simple block. Model fields (blocks/hero-support/_hero-support.json):
 *   - image (reference)  -> row 2 (banner image)
 *   - text  (richtext)   -> row 3 (eyebrow + heading + intro)
 * Library convention: Hero has 1 column, up to 3 rows (name, image, text).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  // build a cell whose first node is a field-name hint comment (xwalk hinting)
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    if (!present.length) return '';
    return [document.createComment(` field:${name} `), ...present];
  };

  // Banner image (row 2)
  const image = element.querySelector("img[class*='imagesframe'], img");

  // Text content (row 3): eyebrow, heading, intro paragraph
  const eyebrow = element.querySelector("p[class*='headerFrame_title'], [class*='textContainer'] p[class*='caption']");
  const heading = element.querySelector("h1[class*='headerFrame_subtitle'], h1, h2");
  const intro = element.querySelector("p[class*='headerFrame_text'], [class*='textContainer'] p[class*='body']");

  // Empty-block guard
  if (!image && !heading && !intro) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  const imageCell = fieldCell('image', image);
  if (imageCell) cells.push([imageCell]);
  const textCell = fieldCell('text', eyebrow, heading, intro);
  if (textCell) cells.push([textCell]);

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero-support', cells });
  element.replaceWith(block);
}

})();
  var __mod_1 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-quicklink. Base: carousel. NEW block.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "carousel-quicklink" holds items
 * "carousel-quicklink-item" (blocks/carousel-quicklink/_carousel-quicklink.json).
 * Per the container convention: row 1 = block name, each subsequent row = one
 * slide/item. Item model fields:
 *   - link     (aem-content) -> the <a href> target
 *   - linkText (text)        -> the card title (collapsed into the link's text)
 * ONE ROW PER quicklink card. Each card in the source is:
 *   <li><a href="..."><span ...title...>TITLE</span><span ...icon...><img base64></span></a></li>
 * The base64 arrow-icon <img> is block chrome (re-added by block JS) and is NOT
 * emitted as content.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  // Collect the quick-link cards. Prefer the <li> items inside the slides
  // container; fall back to any anchor containing a title span.
  let anchors = Array.from(
    element.querySelectorAll("ul[class*='slidesContainer'] > li a[href], [class*='slidesContainer'] li a[href]"),
  );
  if (!anchors.length) {
    anchors = Array.from(element.querySelectorAll("a[href]")).filter((a) =>
      a.querySelector("[class*='findYourSolutionCard_title'], [class*='title']"),
    );
  }

  // Empty-block guard
  if (!anchors.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  anchors.forEach((a) => {
    // Card title text
    const titleEl = a.querySelector("[class*='findYourSolutionCard_title'], p[class*='title'], [class*='title']");
    const titleText = (titleEl ? titleEl.textContent : a.textContent).trim();
    const href = (a.getAttribute('href') || '').trim();

    // Build a clean anchor carrying href + the title as its text.
    // linkText is a collapsed field (Text suffix) -> it becomes the anchor's
    // text, so only the `link` field needs a hint comment.
    const link = document.createElement('a');
    link.setAttribute('href', href);
    link.textContent = titleText;

    // One row per card, single cell hinted with the item's `link` field.
    cells.push([[document.createComment(' field:link '), link]]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-quicklink', cells });

  // Hoist the section default content ("FIND YOUR SOLUTION" heading + intro
  // paragraph) out of the block container so it survives as default content
  // adjacent to the block. The right-header container holds only carousel
  // arrow chrome, so it is intentionally not hoisted.
  const defaultNodes = [];
  const header = element.querySelector("[class*='leftHeaderContainer']");
  if (header) {
    const h = header.querySelector('h1, h2, h3, h4, h5, h6');
    if (h) {
      const heading = document.createElement('h2');
      heading.textContent = h.textContent.trim();
      defaultNodes.push(heading);
    }
    header.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  element.replaceWith(...defaultNodes, block);
}

})();
  var __mod_2 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for columns-appbanner. Base: columns.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk COLUMNS block. Per hinting rules, columns blocks do NOT carry
 * field-name hint comments — cells hold plain default content, and the second
 * row holds one cell per column.
 * The app-download promo is authored as a single content column: tagline,
 * headings, intro line, and the App Store / Play Store download links (anchors
 * wrapping store-badge images).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const content = element.querySelector("[class*='appcontent'], [class*='parentAppContent'], [class*='appsection']") || element;

  // Collect the promo content in document order: tagline lines, headings,
  // body copy, and the app-store download links.
  const columnNodes = [];
  const tagline = content.querySelector("[class*='tagline']:not([class*='midtagline'])");
  if (tagline) columnNodes.push(tagline);

  content
    .querySelectorAll("[class*='midtagline'] h6, [class*='midtagline'] h5, h6, h5")
    .forEach((h) => {
      if (!columnNodes.includes(h)) columnNodes.push(h);
    });

  // Intro / body line (a body paragraph that is not inside the tagline block).
  content.querySelectorAll('p').forEach((p) => {
    if (p.closest("[class*='tagline']")) return;
    const cls = p.className || '';
    if (/body6|body4|body5/.test(cls) && p.textContent.trim()) {
      if (!columnNodes.some((n) => n.contains(p))) columnNodes.push(p);
    }
  });

  // App-store download links (anchors with hrefs and a badge image).
  const appLinks = Array.from(content.querySelectorAll("[class*='applinks'] a[href], a[class*='applink'][href]"));
  appLinks.forEach((a) => columnNodes.push(a));

  // Empty-block guard
  if (!columnNodes.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // One content row. Columns blocks carry no field hints — the row's cells are
  // the columns; here the promo is a single content column.
  const cells = [[columnNodes]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'columns-appbanner', cells });
  element.replaceWith(block);
}

})();
  var __mod_3 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for carousel-tips. Base: carousel.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "carousel-tips" holds items
 * "carousel-tips-slide" (blocks/carousel-tips/_carousel-tips.json).
 * Slide model fields (authoritative for this variant):
 *   - image (reference) -> the tip image        (image cell)
 *   - text  (richtext)  -> heading + description + LEARN MORE link (text cell)
 * Container convention: row 1 = block name; each subsequent row = one slide
 * with an image cell followed by a text cell.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    return [document.createComment(` field:${name} `), ...present];
  };

  const cards = Array.from(element.querySelectorAll("[class*='tipCard']"));

  // Empty-block guard
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector('img');
    const textContainer = card.querySelector("[class*='textContainer']");
    const heading = textContainer ? textContainer.querySelector('p:first-child') : null;
    const description = textContainer
      ? textContainer.querySelector('p:nth-child(2)')
      : null;
    const learnMore = card.querySelector("a[class*='learnMore'], a[href]");

    // Normalize the LEARN MORE link: unwrap the inner <span> so md keeps text.
    let linkEl = null;
    if (learnMore) {
      linkEl = document.createElement('a');
      linkEl.setAttribute('href', (learnMore.getAttribute('href') || '').trim());
      linkEl.textContent = learnMore.textContent.trim();
    }

    cells.push([
      fieldCell('image', image),
      fieldCell('text', heading, description, linkEl),
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel-tips', cells });

  // Hoist the "ENERGY SAVING TIPS" eyebrow/header out of the block container so
  // it survives as default content adjacent to the carousel.
  const defaultNodes = [];
  const header = element.querySelector("[class*='tipsCarousel_header']");
  if (header) {
    const text = header.textContent.trim();
    if (text) {
      const heading = document.createElement('h3');
      heading.textContent = text;
      defaultNodes.push(heading);
    }
  }

  element.replaceWith(...defaultNodes, block);
}

})();
  var __mod_4 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for accordion-faq. Base: accordion.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "accordion-faq" holds items
 * "accordion-faq-item" (blocks/accordion-faq/_accordion-faq.json).
 * Item model fields (authoritative for this variant):
 *   - question (text)     -> the question label      (cell 0, hinted)
 *   - answer   (richtext) -> the answer body         (cell 1)
 *   - category (text)     -> optional category name  (cell 2)
 * The block JS (blocks/accordion-faq/accordion-faq.js) reads three cells per
 * row (question / answer / category), so all three columns are emitted.
 * ONE ROW PER question. The SPA loads answer bodies lazily, so the scraped
 * source exposes only the question labels; answer and category cells are
 * emitted empty (no field hint on empty cells per xwalk hinting rules).
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const questionEls = Array.from(
    element.querySelectorAll("[class*='faqsection_question'], [class*='faqContainer'] [class*='question']"),
  );

  // Empty-block guard
  if (!questionEls.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  questionEls.forEach((q) => {
    // The question text lives in the bold paragraph; the trailing "+" span is
    // block chrome and must not be emitted.
    const label = q.querySelector("p[class*='bold'], span p, p");
    const questionText = (label ? label.textContent : q.textContent).replace(/\+\s*$/, '').trim();
    if (!questionText) return;

    const questionEl = document.createElement('p');
    questionEl.textContent = questionText;

    // cell 0: question (hinted) | cell 1: answer (empty) | cell 2: category (empty)
    cells.push([
      [document.createComment(' field:question '), questionEl],
      '',
      '',
    ]);
  });

  if (!cells.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion-faq', cells });

  // Hoist the section default content out of the block container so it survives
  // adjacent to the accordion: the "LOOKING FOR ANSWERS ?" heading + intro
  // paragraph, and the category filter tab row (All / All About Metering /
  // Disconnecting Your Supply / Emergencies / All about Moving Out) as a list.
  const defaultNodes = [];
  const header = element.querySelector("[class*='faqsection_header']");
  if (header) {
    const h = header.querySelector('h1, h2, h3, h4, h5, h6');
    if (h) {
      const heading = document.createElement('h2');
      heading.textContent = h.textContent.trim();
      defaultNodes.push(heading);
    }
    header.querySelectorAll('p').forEach((p) => {
      const text = p.textContent.trim();
      if (text) {
        const para = document.createElement('p');
        para.textContent = text;
        defaultNodes.push(para);
      }
    });
  }

  const filters = Array.from(element.querySelectorAll("[class*='faqsection_filterButton']"))
    .map((f) => f.textContent.trim())
    .filter(Boolean);
  if (filters.length) {
    const ul = document.createElement('ul');
    filters.forEach((label) => {
      const li = document.createElement('li');
      li.textContent = label;
      ul.append(li);
    });
    defaultNodes.push(ul);
  }

  element.replaceWith(...defaultNodes, block);
}

})();
  var __mod_5 = (function () {
/* eslint-disable */
/* global WebImporter */
/**
 * Parser for cards-support. Base: cards.
 * Source: https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services
 * xwalk REPEATING/container block. Filter "cards-support" holds items
 * "cards-support-card" (blocks/cards-support/_cards-support.json).
 * Card model fields (authoritative for this variant):
 *   - image (reference) -> the card icon        (cell 0, hinted)
 *   - text  (richtext)  -> title + description  (cell 1, hinted)
 * Convention: each row = one card; cell 0 = image/icon, cell 1 = rich text
 * (heading + description + optional CTA). An empty image cell must still be
 * included. ONE ROW PER support card.
 * The whole source card is an anchor; its href is preserved by wrapping the
 * title heading in a link so the CTA target survives into the text richtext.
 * Source is a React/Next.js SPA with hashed CSS-module class names, so all
 * selectors use [class*='...'] substrings with tag fallbacks.
 */
return function parse(element, { document }) {
  const fieldCell = (name, ...nodes) => {
    const present = nodes.filter(Boolean);
    if (!present.length) return '';
    return [document.createComment(` field:${name} `), ...present];
  };

  const cards = Array.from(element.querySelectorAll("a[class*='supportOption_supportDiv'], [class*='subContainer'] > a[href]"));

  // Empty-block guard
  if (!cards.length) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const cells = [];
  cards.forEach((card) => {
    const image = card.querySelector("[class*='iconContainer'] img, img");
    const href = (card.getAttribute('href') || '').trim();

    // Title (h6) — wrap in an anchor so the card's link target is preserved.
    const titleEl = card.querySelector("[class*='supportText'] h6, h6");
    let titleNode = null;
    if (titleEl) {
      const h = document.createElement('h3');
      if (href) {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = titleEl.textContent.trim();
        h.append(a);
      } else {
        h.textContent = titleEl.textContent.trim();
      }
      titleNode = h;
    }

    // Description — the body paragraph (skip the empty subHeader wrappers).
    let descNode = null;
    const descP = Array.from(card.querySelectorAll("[class*='supportText'] p"))
      .find((p) => p.textContent.trim());
    if (descP) {
      descNode = document.createElement('p');
      descNode.textContent = descP.textContent.trim();
    }

    // cell 0: image (hinted, empty cell allowed) | cell 1: text (hinted)
    cells.push([
      fieldCell('image', image),
      fieldCell('text', titleNode, descNode),
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards-support', cells });
  element.replaceWith(block);
}

})();
  var __mod_6 = (function () {
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com) site-wide cleanup.
 *
 * Source is a React/Next.js SPA with hashed CSS-module class names
 * (e.g. header_header__9OzUC). The live-rendered DOM hash suffixes differ from
 * cleaned.html, so all class-based removal selectors use substring/attribute
 * matching [class*='...'].
 *
 * All selectors verified against migration-work/cleaned.html.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

return function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // OneTrust cookie consent widgets (found: #onetrust-consent-sdk, #onetrust-banner-sdk,
    // #onetrust-pc-sdk, .onetrust-pc-dark-filter)
    // Empty SPA host / infrastructure nodes (found: .dameg-shadow-root-host,
    // next-route-announcer, #modalRoot)
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '.onetrust-pc-dark-filter',
      '.dameg-shadow-root-host',
      'next-route-announcer',
      '#modalRoot',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Remove non-content chrome and structural/non-content nodes.
    // Class selectors use [class*='...'] because CSS-module hash suffixes are
    // volatile between the captured DOM and the live render.
    WebImporter.DOMUtils.remove(element, [
      // Skip link
      'a[href="#main-content"]',
      // Header + top nav bar (found: header_header__, header_navigationbar__SYK)
      "[class*='header_header']",
      "[class*='header_navigationbar']",
      'header',
      // Primary navigation, desktop AND mobile
      // (found: primaryNavigation_container__NM_X, primaryNavigationMobile_container__fMcyp,
      //  primaryNavigationMobile_mainContainer__aRwkP)
      "[class*='primaryNavigation_container']",
      "[class*='primaryNavigationMobile_container']",
      "[class*='primaryNavigationMobile_mainContainer']",
      // Mega-menu dropdown panels (found: dropdown_dropdown__)
      "[class*='dropdown_dropdown']",
      // Global footer (found: footer_footer__Im)
      "[class*='footer_footer']",
      // DAMEG accessibility widget (found: .dameg-shadow-root-host, .damegCursor, .damegReadingLine)
      '.dameg-shadow-root-host',
      '.damegCursor',
      '.damegReadingLine',
      // Mobile-only duplicate copies rendered alongside desktop layout
      // (found: tipCarouselMobile__oR, weAreHereToHelpMobile__oOO, primaryNavigationMobile_*)
      "[class*='tipCarouselMobile']",
      "[class*='weAreHereToHelpMobile']",
      "[class*='primaryNavigationMobile']",
      // Structural / non-content nodes
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
    ]);

    // Strip AOS scroll-animation artifacts so they don't leak into the import.
    // (found: aos-init, aos-animate classes; data-aos-delay/duration/easing attributes)
    element.querySelectorAll('.aos-init, .aos-animate, [data-aos], [data-aos-delay], [data-aos-duration], [data-aos-easing]').forEach((el) => {
      el.classList.remove('aos-init', 'aos-animate');
      [...el.attributes].forEach((attr) => {
        if (attr.name === 'data-aos' || attr.name.startsWith('data-aos-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }
}

})();
  var __mod_7 = (function () {
/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com) section breaks + Section Metadata.
 *
 * Inserts <hr> section breaks between the template's sections and appends a
 * Section Metadata block (key "Style") for each section that declares a style.
 * For the help-and-support template, the rc6 "Customer Support" section has
 * style "dark".
 *
 * Section list and styles are read from payload.template.sections; each section
 * is matched by its selector array (first matching selector wins). Selectors are
 * CSS-module substring matches ([class*='...']) because the SPA's hashed class
 * suffixes are volatile between the captured DOM and the live render.
 *
 * Both hooks are used deliberately: block parsers run between beforeTransform
 * and afterTransform and replace section container elements, so <hr> breaks are
 * inserted in beforeTransform (while every section element still exists) with a
 * marker attribute, and Section Metadata is anchored to that marker in
 * afterTransform.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order, first match wins.
function querySection(root, selectors) {
  for (const sel of selectors || []) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

return function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break, no metadata
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker) the original element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { Style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}

})();
/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS







// TRANSFORMER IMPORTS



// PAGE TEMPLATE CONFIGURATION - embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'help-and-support',
  description: 'Help & Support interior page: hero, quick-link carousel, app-promo + tips, FAQ + help panel, dark support bar.',
  urls: [
    'https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services',
  ],
  blocks: [
    {
      name: 'hero-support',
      instances: ["div[class*='headerFrame_herosection']"],
    },
    {
      name: 'carousel-quicklink',
      instances: ["div[class*='customCarousel_container']"],
    },
    {
      name: 'columns-appbanner',
      instances: [
        "div[class*='downloadAppHelpSupport_appSectionContainer']",
        "div[class*='downloadApp_appsectioncontainer']",
      ],
    },
    {
      name: 'carousel-tips',
      instances: ["div[class*='tipsCarousel_container']"],
    },
    {
      name: 'accordion-faq',
      instances: ["div[class*='faqsection_container']"],
    },
    {
      name: 'cards-support',
      instances: ["div[class*='customerSupport_container']"],
    },
  ],
  sections: [
    {
      id: 'rc2',
      name: 'Hero',
      selector: ["div[class*='headerFrame_herosection']"],
      style: null,
      blocks: ['hero-support'],
      defaultContent: [],
    },
    {
      id: 'rc3',
      name: 'Find Your Solution',
      selector: ["div[class*='customCarousel_container']"],
      style: null,
      blocks: ['carousel-quicklink'],
      defaultContent: ["div[class*='customCarousel_leftHeaderContainer']"],
    },
    {
      id: 'rc4',
      name: 'App Promo And Tips',
      selector: ["div[class*='solutionsCarousel_appsectioncontainer']"],
      style: null,
      blocks: ['columns-appbanner', 'carousel-tips'],
      defaultContent: [],
    },
    {
      id: 'rc5',
      name: 'Looking For Answers',
      selector: ["div[class*='faqPanel_container']"],
      style: null,
      blocks: ['accordion-faq'],
      defaultContent: [
        "div[class*='faqsection_header']",
        "div[class*='faqPanel_weAreHereToHelp']:not([class*='Mobile'])",
      ],
    },
    {
      id: 'rc6',
      name: 'Customer Support',
      selector: ["div[class*='customerSupport_container']"],
      style: 'dark',
      blocks: ['cards-support'],
      defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-support': __mod_0,
  'carousel-quicklink': __mod_1,
  'columns-appbanner': __mod_2,
  'carousel-tips': __mod_3,
  'accordion-faq': __mod_4,
  'cards-support': __mod_5,
};

// TRANSFORMER REGISTRY - cleanup first, then sections (template has 5 sections)
const transformers = [
  __mod_6,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [__mod_7] : []),
];

/**
 * Execute all page transformers for a specific hook.
 */
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

/**
 * Find all blocks on the page based on the embedded template configuration.
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    blockDef.instances.forEach((selector) => {
      const elements = document.querySelectorAll(selector);
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
        pageBlocks.push({
          name: blockDef.name,
          selector,
          element,
          section: blockDef.section || null,
        });
      });
    });
  });
  console.log(`Found ${pageBlocks.length} block instances on page`);
  return pageBlocks;
}

window.CustomImportScript = { default: {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform cleanup
    executeTransformers('beforeTransform', main, payload);

    // 2. discover blocks
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. parse each block (skip elements already replaced)
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

    // 4. afterTransform (final cleanup + section breaks/metadata)
    executeTransformers('afterTransform', main, payload);

    // 5. WebImporter built-in rules
    const hr = document.createElement('hr');
    main.appendChild(hr);
    WebImporter.rules.createMetadata(main, document);
    WebImporter.rules.transformBackgroundImages(main, document);
    WebImporter.rules.adjustImageUrls(main, url, params.originalURL);

    // 6. Path: this single source page IS the site index (main page).
    //    Always emit /index — never the deep source path, never empty.
    const path = WebImporter.FileUtils.sanitizePath('/index');

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
} };

})();
