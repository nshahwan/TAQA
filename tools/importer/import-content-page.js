/* eslint-disable */
/* global WebImporter */

// PARSER IMPORTS
import accordionFaqParser from './parsers/accordion-faq.js';
import formContactParser from './parsers/form-contact.js';
import tableParser from './parsers/table.js';

// TRANSFORMER IMPORTS
import cleanupTransformer from './transformers/nileair-cleanup.js';
import sectionsTransformer from './transformers/nileair-sections.js';

// PAGE TEMPLATE CONFIGURATION - Embedded from page-templates.json
const PAGE_TEMPLATE = {
  name: 'content-page',
  description: 'Interior content page: breadcrumbs, page title, rich-text sections (some with cover image), optional data table, one or more accordion/FAQ sections, optional contact form.',
  urls: [
    'https://www.nileair.com/travelling-pets',
    'https://www.nileair.com/baggage-allowance',
    'https://www.nileair.com/nileair-holidays',
  ],
  blocks: [
    { name: 'accordion-faq', instances: ['div.faq-box-area', '#pets', '#travelling-with-pets-faqs', '#baggage-allowance-faqs', '#why-choose-nile-air-holidays', '#nileair-holidays-faqs'] },
    { name: 'form-contact', instances: ['#contact-us'] },
    { name: 'table', instances: ['div.pr-area-table table', '#layout-content table'] },
  ],
  sections: [
    { id: 'rc4c1', name: 'Breadcrumb / page title', selector: '#layout-content > div.bread-crumbs', style: null, blocks: [], defaultContent: ['#layout-content > div.bread-crumbs'] },
    { id: 'rc4c2', name: 'Intro rich-text with cover image', selector: '#layout-content > div.page-wrapper:nth-of-type(2)', style: null, blocks: [], defaultContent: ['#layout-content > div.page-wrapper:nth-of-type(2) .about-content'] },
    { id: 'rc4c3', name: 'Rich-text / data table', selector: '#layout-content > div.page-wrapper:nth-of-type(3)', style: null, blocks: [], defaultContent: ['#layout-content > div.page-wrapper:nth-of-type(3)'] },
    { id: 'rc4c4', name: 'Accordion section', selector: '#layout-content > div.page-wrapper:nth-of-type(4)', style: null, blocks: ['accordion-faq'], defaultContent: ['#layout-content > div.page-wrapper:nth-of-type(4) .about-content'] },
    { id: 'rc4c5', name: 'Contact form', selector: '#layout-content > div.page-wrapper:nth-of-type(5)', style: null, blocks: ['form-contact'], defaultContent: [] },
    { id: 'rc4c6', name: 'FAQ accordion', selector: '#layout-content > div.page-wrapper:nth-of-type(6)', style: null, blocks: ['accordion-faq'], defaultContent: ['#layout-content > div.page-wrapper:nth-of-type(6) .about-content'] },
  ],
};

// PARSER REGISTRY
const parsers = {
  'accordion-faq': accordionFaqParser,
  'form-contact': formContactParser,
  table: tableParser,
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
