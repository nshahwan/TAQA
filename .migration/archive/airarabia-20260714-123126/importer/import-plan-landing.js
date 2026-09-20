/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import cardsFareParser from './parsers/cards-fare.js';
import cardsUspParser from './parsers/cards-usp.js';
import columnsPromoParser from './parsers/columns-promo.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/airarabia-cleanup.js';
import sectionsTransformer from './transformers/airarabia-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'plan-landing',
  description: 'Marketing landing page under /plan with a promo banner, page title, intro rich text, and multiple card grids (fare options, check-in options, onboard comfort features, a promo/CTA card, and a bottom CTA card row), plus site header and footer.',
  urls: [
    'https://www.airarabia.com/en/plan/flying-with-us/flying-with-convenience',
  ],
  blocks: [
    {
      name: 'cards-fare',
      instances: ['div.component.snippet.col-lg-12.col-xl-12'],
    },
    {
      name: 'cards-usp',
      instances: [
        '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(7)',
        '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(9)',
        '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.hide-all-mobile.container-fluid-grey.initialized',
      ],
    },
    {
      name: 'columns-promo',
      instances: [
        '#content > div.component.container > div.component-content > div.row > div.component.rich-text.col-12:nth-of-type(10)',
      ],
    },
    {
      name: 'section-cta-grey',
      instances: [
        '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.hide-all-mobile.container-fluid-grey.initialized',
      ],
      section: 'grey',
    },
  ],
  sections: [
    {
      id: 'rc2',
      name: 'Promo banner',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.banner-promo.full-width-banner.col-12.col-lg-6.air-reward',
      style: null,
      blocks: [],
      defaultContent: ['div.component.banner-promo.full-width-banner'],
    },
    {
      id: 'rc3',
      name: 'Page title',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.title.col-12',
      style: null,
      blocks: [],
      defaultContent: ['div.component.title.col-12'],
    },
    {
      id: 'rc4',
      name: 'Intro',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.rich-text.col-12:nth-of-type(3)',
      style: null,
      blocks: [],
      defaultContent: ['div.component.rich-text.col-12:nth-of-type(3)'],
    },
    {
      id: 'rc5',
      name: 'Fare options',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-lg-12.col-xl-12.initialized',
      style: null,
      blocks: ['cards-fare'],
      defaultContent: [],
    },
    {
      id: 'rc6-8',
      name: 'Check-in options',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(7)',
      style: null,
      blocks: ['cards-usp'],
      defaultContent: ['div.component.rich-text.col-12:nth-of-type(5)'],
    },
    {
      id: 'rc9-10',
      name: 'Comfort onboard',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(9)',
      style: null,
      blocks: ['cards-usp'],
      defaultContent: ['div.component.rich-text.col-12:nth-of-type(8)'],
    },
    {
      id: 'rc11',
      name: 'Block Your Ticket promo',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.rich-text.col-12:nth-of-type(10)',
      style: null,
      blocks: ['columns-promo'],
      defaultContent: [],
    },
    {
      id: 'rc12-13',
      name: 'Bottom CTA cards',
      selector: '#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.hide-all-mobile.container-fluid-grey.initialized',
      style: 'grey',
      blocks: ['cards-usp'],
      defaultContent: [],
    },
  ],
};

// PARSER REGISTRY
const parsers = {
  'cards-fare': cardsFareParser,
  'cards-usp': cardsUspParser,
  'columns-promo': columnsPromoParser,
};

// TRANSFORMER REGISTRY - section transformer runs after cleanup (afterTransform)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
];

/**
 * Execute all page transformers for a specific hook
 */
function executeTransformers(hookName, element, payload) {
  const enhancedPayload = {
    ...payload,
    template: PAGE_TEMPLATE,
  };
  transformers.forEach((transformerFn) => {
    try {
      transformerFn.call(null, hookName, element, enhancedPayload);
    } catch (e) {
      console.error(`Transformer failed at ${hookName}:`, e);
    }
  });
}

/**
 * Find all blocks on the page based on the embedded template configuration
 */
function findBlocksOnPage(document, template) {
  const pageBlocks = [];
  template.blocks.forEach((blockDef) => {
    // Skip section- pseudo-blocks (handled by section transformer, not parsers)
    if (blockDef.name.startsWith('section-')) return;
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

export default {
  transform: (payload) => {
    const {
      document, url, html, params,
    } = payload;

    const main = document.body;

    // 1. beforeTransform (initial cleanup)
    executeTransformers('beforeTransform', main, payload);

    // 2. Find blocks on page
    const pageBlocks = findBlocksOnPage(document, PAGE_TEMPLATE);

    // 3. Parse each block; skip elements already replaced by an earlier parser
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

    // 6. Generate sanitized path
    const path = WebImporter.FileUtils.sanitizePath(
      new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, ''),
    );

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
