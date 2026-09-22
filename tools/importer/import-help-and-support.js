/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroSupportParser from './parsers/hero-support.js';
import carouselQuicklinkParser from './parsers/carousel-quicklink.js';
import columnsAppbannerParser from './parsers/columns-appbanner.js';
import carouselTipsParser from './parsers/carousel-tips.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import cardsSupportParser from './parsers/cards-support.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/taqa-cleanup.js';
import sectionsTransformer from './transformers/taqa-sections.js';

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
  'hero-support': heroSupportParser,
  'carousel-quicklink': carouselQuicklinkParser,
  'columns-appbanner': columnsAppbannerParser,
  'carousel-tips': carouselTipsParser,
  'accordion-faq': accordionFaqParser,
  'cards-support': cardsSupportParser,
};

// TRANSFORMER REGISTRY - cleanup first, then sections (template has 5 sections)
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
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

export default {
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
};
