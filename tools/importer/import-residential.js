/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import heroResidentialParser from './parsers/hero-residential.js';
import cardsUspOverlayParser from './parsers/cards-usp-overlay.js';
import cardsNewsParser from './parsers/cards-news.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/taqa-cleanup.js';
import sectionsTransformer from './transformers/taqa-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'residential',
  description: "Residential overview landing page: a navy spotlight hero, a 'New brand-same exceptional service' intro with three tall image USP tiles, an app-download promo band, and an Announcements news carousel.",
  urls: [
    'https://taqadistribution.com/addc/en-us/residential/overview',
  ],
  blocks: [
    { name: 'hero-residential', instances: ["div[class*='imageTextSpotlight_detailsContainer']"] },
    { name: 'cards-usp-overlay', instances: ["div[class*='featuresCarousel_carousel']:not([class*='indicators'])"] },
    { name: 'cards-news', instances: ["div[class*='customCarousel_container']"] },
  ],
  sections: [
    { id: 'rc2', name: 'Hero', selector: ["div[class*='imageTextSpotlight_detailsContainer']"], style: null, blocks: ['hero-residential'], defaultContent: [] },
    { id: 'rc3', name: 'New Brand', selector: ["div[class*='featuresCarousel_sectionheaderunit']"], style: null, blocks: ['cards-usp-overlay'], defaultContent: ["div[class*='featuresCarousel_featuresCarouselText']"] },
    { id: 'rc4', name: 'App Promo', selector: ["div[class*='downloadApp_appsectioncontainer']"], style: null, blocks: [], defaultContent: ["div[class*='downloadApp_appcontent']"] },
    { id: 'rc5', name: 'Announcements', selector: ["div[class*='customCarousel_container']"], style: null, blocks: ['cards-news'], defaultContent: ["div[class*='customCarousel_leftHeaderContainer']"] },
  ],
};

// PARSER REGISTRY
const parsers = {
  'hero-residential': heroResidentialParser,
  'cards-usp-overlay': cardsUspOverlayParser,
  'cards-news': cardsNewsParser,
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
