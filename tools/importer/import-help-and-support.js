/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroSupportParser from './parsers/hero-support.js';
import cardsQuicklinkParser from './parsers/cards-quicklink.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import carouselTipsParser from './parsers/carousel-tips.js';
import cardsSupportParser from './parsers/cards-support.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/taqa-cleanup.js';
import sectionsTransformer from './transformers/taqa-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'help-and-support',
  description: "Help & Support interior page: an angled photographic page-intro hero, a 'Find Your Solution' section with quick-link certificate tiles, a 'Looking For Answers' section with an FAQ accordion plus an energy-saving-tips promo carousel and a help link panel, and a dark customer-support section with icon cards.",
  urls: [
    'https://taqadistribution.com/addc/en-us/business/help-and-support/certificates',
    'https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services',
  ],
  blocks: [
    { name: 'hero-support', instances: ["div[class*='headerFrame_herosection']"] },
    { name: 'cards-quicklink', instances: ["div[class*='customCarousel_container']"] },
    { name: 'accordion-faq', instances: ["div[class*='faqsection_faqContainer']"] },
    { name: 'carousel-tips', instances: ["div[class*='tipsCarousel_carousel']"] },
    { name: 'cards-support', instances: ["div[class*='customerSupport_subContainer']"] },
  ],
  sections: [
    { id: 'rc2', name: 'Hero', selector: ["div[class*='headerFrame_herosection']"], style: null, blocks: ['hero-support'], defaultContent: [] },
    { id: 'rc3', name: 'Find Your Solution', selector: ["div[class*='customCarousel_container']"], style: null, blocks: ['cards-quicklink'], defaultContent: ["div[class*='customCarousel_leftHeaderContainer']"] },
    { id: 'rc4', name: 'Looking For Answers', selector: ["div[class*='faqPanel_container']"], style: null, blocks: ['accordion-faq', 'carousel-tips'], defaultContent: ["div[class*='faqsection_header']", "div[class*='faqPanel_quickLinkPanel']"] },
    { id: 'rc5', name: 'Customer Support', selector: ["div[class*='customerSupport_container']"], style: 'dark', blocks: ['cards-support'], defaultContent: [] },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-support': heroSupportParser,
  'cards-quicklink': cardsQuicklinkParser,
  'accordion-faq': accordionFaqParser,
  'carousel-tips': carouselTipsParser,
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

    const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, '').replace(/\.html$/, '');
    const path = WebImporter.FileUtils.sanitizePath(rawPath || '/index');

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
