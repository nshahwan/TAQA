/* eslint-disable */
/* global WebImporter */

// Output target: 'index' (site home) or 'deep' (original source path).
// Flip to 'deep' to regenerate the deep-path copy identical to index.
const OUTPUT_MODE = 'index';

// PARSER IMPORTS
import heroSupportParser from './parsers/hero-support.js';
import cardsQuicklinkParser from './parsers/cards-quicklink.js';
import appPromoParser from './parsers/app-promo.js';
import carouselTipsParser from './parsers/carousel-tips.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import cardsSupportParser from './parsers/cards-support.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/taqa-cleanup.js';
import sectionsTransformer from './transformers/taqa-sections.js';

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
  'hero-support': heroSupportParser,
  'cards-quicklink': cardsQuicklinkParser,
  'app-promo': appPromoParser,
  'carousel-tips': carouselTipsParser,
  'accordion-faq': accordionFaqParser,
  'cards-support': cardsSupportParser,
};

// TRANSFORMER REGISTRY
const transformers = [
  cleanupTransformer,
  ...(PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [sectionsTransformer] : []),
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

export default {
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
