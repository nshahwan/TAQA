/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import carouselHeroParser from './parsers/carousel-hero.js';
import cardsQuicklinkParser from './parsers/cards-quicklink.js';
import carouselFareParser from './parsers/carousel-fare.js';
import cardsNewsParser from './parsers/cards-news.js';
import columnsAppbannerParser from './parsers/columns-appbanner.js';
import accordionFaqParser from './parsers/accordion-faq.js';
import columnsNewsletterParser from './parsers/columns-newsletter.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/nileair-cleanup.js';
import sectionsTransformer from './transformers/nileair-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'home-landing',
  description: 'Home landing page: hero carousel, quick-links strip, benefits grid, promotions carousel, news room, app-download banner, FAQ accordion, newsletter signup.',
  urls: [
    'https://www.nileair.com/',
  ],
  blocks: [
    { name: 'carousel-hero', instances: ['div.slider_area.owl-carousel'] },
    { name: 'cards-quicklink', instances: ['div.feature-area.demo_bg', 'div.choose-area .row'] },
    { name: 'carousel-fare', instances: ['div.promotions_area .promotions_slide'] },
    { name: 'cards-news', instances: ['div.section-with-sidebar-content'] },
    { name: 'columns-appbanner', instances: ['div.app-area.max-bg'] },
    { name: 'accordion-faq', instances: ['div.faq-area.gray_bg'] },
    { name: 'columns-newsletter', instances: ['div.newsletter-area'] },
    { name: 'section-faq', instances: ['div.faq-area.gray_bg'], section: 'grey' },
  ],
  sections: [
    { id: 'rc4c1', name: 'Hero image carousel', selector: 'div.slider_area.owl-carousel', style: null, blocks: ['carousel-hero'], defaultContent: [] },
    { id: 'rc4c2', name: 'Quick-links feature strip', selector: 'div.feature-area.demo_bg', style: null, blocks: ['cards-quicklink'], defaultContent: [] },
    { id: 'rc4c3', name: 'Why choose Nile Air benefits grid', selector: 'div.choose-area.pb-4', style: null, blocks: ['cards-quicklink'], defaultContent: ['div.choose-area .section-title'] },
    { id: 'rc4c4', name: 'Promotions carousel', selector: 'div.promotions_area', style: null, blocks: ['carousel-fare'], defaultContent: ['div.promotions_area h1', 'div.promotions_area .more_btn'] },
    { id: 'rc4c5', name: 'News Room', selector: 'div.container.news-room', style: null, blocks: ['cards-news'], defaultContent: ['div.news-room h1', 'div.news-room .more_btn'] },
    { id: 'rc4c6', name: 'App-download banner', selector: 'div.app-area.max-bg', style: null, blocks: ['columns-appbanner'], defaultContent: [] },
    { id: 'rc4c7', name: 'FAQ accordion', selector: 'div.faq-area.gray_bg', style: 'grey', blocks: ['accordion-faq'], defaultContent: ['div.faq-area h2'] },
    { id: 'rc4c8', name: 'Newsletter signup', selector: 'div.newsletter-area', style: null, blocks: ['columns-newsletter'], defaultContent: ['div.newsletter-content'] },
  ],
};

// PARSER REGISTRY
const parsers = {
  'carousel-hero': carouselHeroParser,
  'cards-quicklink': cardsQuicklinkParser,
  'carousel-fare': carouselFareParser,
  'cards-news': cardsNewsParser,
  'columns-appbanner': columnsAppbannerParser,
  'accordion-faq': accordionFaqParser,
  'columns-newsletter': columnsNewsletterParser,
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
      if (elements.length === 0) {
        console.warn(`Block "${blockDef.name}" selector not found: ${selector}`);
      }
      elements.forEach((element) => {
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
