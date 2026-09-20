/* eslint-disable */
var CustomImportScript = (() => {
  var __defProp = Object.defineProperty;
  var __defProps = Object.defineProperties;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __getOwnPropSymbols = Object.getOwnPropertySymbols;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __propIsEnum = Object.prototype.propertyIsEnumerable;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __spreadValues = (a, b) => {
    for (var prop in b || (b = {}))
      if (__hasOwnProp.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    if (__getOwnPropSymbols)
      for (var prop of __getOwnPropSymbols(b)) {
        if (__propIsEnum.call(b, prop))
          __defNormalProp(a, prop, b[prop]);
      }
    return a;
  };
  var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

  // tools/importer/import-home-landing.js
  var import_home_landing_exports = {};
  __export(import_home_landing_exports, {
    default: () => import_home_landing_default
  });

  // tools/importer/parsers/carousel-hero.js
  function parse(element, { document }) {
    let slides = Array.from(element.querySelectorAll(".sing_slider")).filter((s) => !s.closest(".cloned"));
    if (slides.length === 0) {
      slides = Array.from(element.querySelectorAll(".slider_text")).map((t) => t.parentElement);
    }
    const cells = [];
    slides.forEach((slide) => {
      const textWrap = slide.querySelector(".slider_text") || slide;
      const title = textWrap.querySelector("h1, h2, h3");
      const description = textWrap.querySelector("p");
      const cta = textWrap.querySelector("a.btn, a[href]");
      if (!title && !description && !cta) return;
      const bgImage = slide.querySelector("img");
      const contentCell = [];
      if (title) contentCell.push(title);
      if (description) contentCell.push(description);
      if (cta) contentCell.push(cta);
      cells.push([bgImage || "", contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-hero", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-quicklink.js
  function parse2(element, { document }) {
    let cards = Array.from(element.querySelectorAll(".single-feature, .single-choose"));
    if (cards.length === 0) {
      cards = Array.from(element.querySelectorAll(':scope > .col, :scope > [class*="col-"]'));
    }
    const cells = [];
    cards.forEach((card) => {
      const image = card.querySelector("img");
      const title = card.querySelector("h1, h2, h3, h4, h5, h6, .title");
      const cardLink = card.querySelector(":scope > a[href], a[href]");
      if (!image && !title) return;
      const contentCell = [];
      if (title) {
        const titleHasLink = title.querySelector("a[href]");
        if (!titleHasLink && cardLink && cardLink.getAttribute("href")) {
          const link = document.createElement("a");
          link.setAttribute("href", cardLink.getAttribute("href"));
          link.textContent = title.textContent.trim();
          const heading = document.createElement(title.tagName.match(/^H[1-6]$/) ? title.tagName : "h4");
          heading.append(link);
          contentCell.push(heading);
        } else {
          contentCell.push(title);
        }
      }
      cells.push([image || "", contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-quicklink", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/carousel-fare.js
  function parse3(element, { document }) {
    let slides = Array.from(element.querySelectorAll(".sing_promt")).filter((s) => !s.closest(".cloned"));
    if (slides.length === 0) {
      slides = Array.from(element.querySelectorAll(":scope > div"));
    }
    const cells = [];
    slides.forEach((slide) => {
      const image = slide.querySelector(".sing_promt_img img, img");
      const textWrap = slide.querySelector(".sing_promt_text") || slide;
      const title = textWrap.querySelector("h1, h2, h3, h4");
      const price = textWrap.querySelector("p");
      let labelText = "";
      textWrap.childNodes.forEach((node) => {
        if (node.nodeType === 3 && node.textContent.trim()) {
          labelText = node.textContent.trim();
        }
      });
      if (!image && !title && !labelText && !price) return;
      const contentCell = [];
      if (title) contentCell.push(title);
      if (labelText) {
        const labelP = document.createElement("p");
        labelP.textContent = labelText;
        contentCell.push(labelP);
      }
      if (price) contentCell.push(price);
      cells.push([image || "", contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-fare", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-news.js
  function parse4(element, { document }) {
    const cards = Array.from(element.querySelectorAll("a.news-card, .news-card"));
    const cells = [];
    cards.forEach((card) => {
      const image = card.querySelector(".news-card-cover img, img");
      const content = card.querySelector(".news-card-content") || card;
      const title = content.querySelector("h1, h2, h3, h4");
      const paragraphs = Array.from(content.querySelectorAll("p"));
      const href = card.matches("a[href]") ? card.getAttribute("href") : card.querySelector("a[href]") ? card.querySelector("a[href]").getAttribute("href") : null;
      if (!image && !title && paragraphs.length === 0) return;
      const contentCell = [];
      if (title) {
        if (href) {
          const link = document.createElement("a");
          link.setAttribute("href", href);
          link.textContent = title.textContent.trim();
          const heading = document.createElement(title.tagName.match(/^H[1-6]$/) ? title.tagName : "h3");
          heading.append(link);
          contentCell.push(heading);
        } else {
          contentCell.push(title);
        }
      }
      paragraphs.forEach((p) => contentCell.push(p));
      cells.push([image || "", contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-news", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-appbanner.js
  function parse5(element, { document }) {
    const image = element.querySelector("img.app-hand, :scope > img");
    const content = element.querySelector(".app-content") || element;
    const tagline = content.querySelector("p");
    const title = content.querySelector("h1, h2, h3, .title");
    const download = content.querySelector(".app-download");
    const ctaLinks = Array.from((download || content).querySelectorAll("a[href]"));
    const contentCell = [];
    if (tagline) contentCell.push(tagline);
    if (title) contentCell.push(title);
    if (download) {
      contentCell.push(download);
    } else {
      ctaLinks.forEach((a) => contentCell.push(a));
    }
    if (!image && contentCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cells.push([image || "", contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-appbanner", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/accordion-faq.js
  function parse6(element, { document }) {
    let items = Array.from(element.querySelectorAll(".card"));
    if (items.length === 0) {
      items = Array.from(element.querySelectorAll('.accordion-item, [class*="accordion"] > [class*="item"]'));
    }
    const cells = [];
    items.forEach((item) => {
      const header = item.querySelector('.card-header button, .card-header, button, .accordion-header, [class*="header"]');
      const body = item.querySelector(".card-body") || item.querySelector(".accordion-body") || item.querySelector(".collapse") || item.querySelector('[class*="body"]');
      if (!header && !body) return;
      let titleCell;
      if (header) {
        const label = document.createElement("p");
        label.textContent = header.textContent.trim();
        titleCell = label;
      } else {
        titleCell = "";
      }
      let contentCell;
      if (body) {
        const bodyChildren = Array.from(body.children).length ? Array.from(body.children) : [body];
        contentCell = bodyChildren;
      } else {
        contentCell = "";
      }
      cells.push([titleCell, contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "accordion-faq", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-newsletter.js
  function parse7(element, { document }) {
    const content = element.querySelector(".newsletter-content") || element;
    const title = content.querySelector("h1, h2, h3, .title");
    const description = content.querySelector("p");
    const form = element.querySelector(".newsletter-form") || element.querySelector("form");
    const contentCell = [];
    if (title) contentCell.push(title);
    if (description) contentCell.push(description);
    const formCell = [];
    if (form) {
      formCell.push(form);
    } else {
      const input = element.querySelector("input");
      const button = element.querySelector("button");
      if (input) formCell.push(input);
      if (button) formCell.push(button);
    }
    if (contentCell.length === 0 && formCell.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    cells.push([contentCell, formCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-newsletter", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/nileair-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#cookie-consent-banner",
        "#cookie-consent-dialog",
        "#cookie-consent-scripts",
        "#alerts",
        // mobile off-canvas menu (duplicates header nav as a flat link dump);
        // handled by the header block, not page content.
        "div.offcanvas",
        "div.offcanvas-start"
      ]);
      WebImporter.DOMUtils.remove(element, ["div.owl-item.cloned"]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "body > header.header-area",
        "header.header-area",
        "body > div.header-bottom",
        "div.header-bottom",
        "body > div.social-section",
        "div.social-section",
        "#layout-footer",
        "#fileUploadForm",
        '[id*="livechat"]',
        '[class*="livechat"]',
        '[class*="live-chat"]',
        // Salesforce live-chat button ("Live chat: Agent Offline").
        ".embeddedServiceHelpButton",
        '[class*="embeddedService"]',
        // date-range-picker widgets (render stray "Cancel"/"Apply" text).
        "div.daterangepicker"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "script",
        "style",
        "noscript",
        "iframe",
        "link",
        'img[width="1"]',
        'img[height="1"]',
        'img[src*="pixel"]'
      ]);
    }
  }

  // tools/importer/transformers/nileair-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform2(hookName, element, payload) {
    if (hookName !== TransformHook2.afterTransform) return;
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const doc = element.ownerDocument;
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section || !section.selector) continue;
      const sectionEl = element.querySelector(section.selector);
      if (!sectionEl) continue;
      if (section.style) {
        const meta = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        if (sectionEl.nextSibling) {
          sectionEl.parentNode.insertBefore(meta, sectionEl.nextSibling);
        } else {
          sectionEl.parentNode.appendChild(meta);
        }
      }
      if (i > 0) {
        const hr = doc.createElement("hr");
        sectionEl.parentNode.insertBefore(hr, sectionEl);
      }
    }
  }

  // tools/importer/import-home-landing.js
  var PAGE_TEMPLATE = {
    name: "home-landing",
    description: "Home landing page: hero carousel, quick-links strip, benefits grid, promotions carousel, news room, app-download banner, FAQ accordion, newsletter signup.",
    urls: [
      "https://www.nileair.com/"
    ],
    blocks: [
      { name: "carousel-hero", instances: ["div.slider_area.owl-carousel"] },
      { name: "cards-quicklink", instances: ["div.feature-area.demo_bg", "div.choose-area .row"] },
      { name: "carousel-fare", instances: ["div.promotions_area .promotions_slide"] },
      { name: "cards-news", instances: ["div.section-with-sidebar-content"] },
      { name: "columns-appbanner", instances: ["div.app-area.max-bg"] },
      { name: "accordion-faq", instances: ["div.faq-area.gray_bg"] },
      { name: "columns-newsletter", instances: ["div.newsletter-area"] },
      { name: "section-faq", instances: ["div.faq-area.gray_bg"], section: "grey" }
    ],
    sections: [
      { id: "rc4c1", name: "Hero image carousel", selector: "div.slider_area.owl-carousel", style: null, blocks: ["carousel-hero"], defaultContent: [] },
      { id: "rc4c2", name: "Quick-links feature strip", selector: "div.feature-area.demo_bg", style: null, blocks: ["cards-quicklink"], defaultContent: [] },
      { id: "rc4c3", name: "Why choose Nile Air benefits grid", selector: "div.choose-area.pb-4", style: null, blocks: ["cards-quicklink"], defaultContent: ["div.choose-area .section-title"] },
      { id: "rc4c4", name: "Promotions carousel", selector: "div.promotions_area", style: null, blocks: ["carousel-fare"], defaultContent: ["div.promotions_area h1", "div.promotions_area .more_btn"] },
      { id: "rc4c5", name: "News Room", selector: "div.container.news-room", style: null, blocks: ["cards-news"], defaultContent: ["div.news-room h1", "div.news-room .more_btn"] },
      { id: "rc4c6", name: "App-download banner", selector: "div.app-area.max-bg", style: null, blocks: ["columns-appbanner"], defaultContent: [] },
      { id: "rc4c7", name: "FAQ accordion", selector: "div.faq-area.gray_bg", style: "grey", blocks: ["accordion-faq"], defaultContent: ["div.faq-area h2"] },
      { id: "rc4c8", name: "Newsletter signup", selector: "div.newsletter-area", style: null, blocks: ["columns-newsletter"], defaultContent: ["div.newsletter-content"] }
    ]
  };
  var parsers = {
    "carousel-hero": parse,
    "cards-quicklink": parse2,
    "carousel-fare": parse3,
    "cards-news": parse4,
    "columns-appbanner": parse5,
    "accordion-faq": parse6,
    "columns-newsletter": parse7
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), { template: PAGE_TEMPLATE });
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
      if (blockDef.name.startsWith("section-")) return;
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
  var import_home_landing_default = {
    transform: (payload) => {
      const { document, url, params } = payload;
      const main = document.body;
      executeTransformers("beforeTransform", main, payload);
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
      executeTransformers("afterTransform", main, payload);
      const hr = document.createElement("hr");
      main.appendChild(hr);
      WebImporter.rules.createMetadata(main, document);
      WebImporter.rules.transformBackgroundImages(main, document);
      WebImporter.rules.adjustImageUrls(main, url, params.originalURL);
      const rawPath = new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "");
      const path = WebImporter.FileUtils.sanitizePath(rawPath || "/index");
      return [{
        element: main,
        path,
        report: {
          title: document.title,
          template: PAGE_TEMPLATE.name,
          blocks: pageBlocks.map((b) => b.name)
        }
      }];
    }
  };
  return __toCommonJS(import_home_landing_exports);
})();
