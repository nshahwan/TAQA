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

  // tools/importer/import-help-and-support.js
  var import_help_and_support_exports = {};
  __export(import_help_and_support_exports, {
    default: () => import_help_and_support_default
  });

  // tools/importer/parsers/hero-support.js
  function parse(element, { document }) {
    const bgImage = element.querySelector('img[class*="imagesframe"], img');
    const textContainer = element.querySelector('[class*="textContainer"]') || element;
    const caption = textContainer.querySelector('[class*="title"]:not(h1):not(h2):not(h3)');
    const heading = textContainer.querySelector('h1, h2, [class*="subtitle"]');
    const description = textContainer.querySelector('[class*="text"]:not([class*="subtitle"]):not([class*="title"])');
    const ctaLinks = Array.from(textContainer.querySelectorAll("a[href]"));
    if (!heading && !description && !bgImage) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    if (bgImage) cells.push([bgImage]);
    const contentCell = [];
    if (caption) contentCell.push(caption);
    if (heading) contentCell.push(heading);
    if (description) contentCell.push(description);
    contentCell.push(...ctaLinks);
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-support", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-quicklink.js
  function parse2(element, { document }) {
    let cards = Array.from(element.querySelectorAll('[class*="findYourSolutionCard_container"]'));
    if (cards.length === 0) {
      if (element.matches && element.matches('[class*="findYourSolutionCard_container"]')) {
        cards = [element];
      } else {
        cards = Array.from(element.querySelectorAll('li, [class*="slide"]'));
      }
    }
    const cells = [];
    cards.forEach((card) => {
      const title = card.querySelector('[class*="title"], h1, h2, h3, h4, h5, h6, p');
      const image = card.querySelector("img");
      let link = card.querySelector("a[href]");
      if (!link) {
        link = card.closest("a[href]");
      }
      if (!title && !image) return;
      const contentCell = [];
      if (title) {
        const href = link && link.getAttribute("href") ? link.getAttribute("href").trim() : "";
        if (href) {
          const a = document.createElement("a");
          a.setAttribute("href", href);
          a.textContent = title.textContent.trim();
          const p = document.createElement("p");
          p.append(a);
          contentCell.push(p);
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

  // tools/importer/parsers/accordion-faq.js
  function parse3(element, { document }) {
    let items = Array.from(element.querySelectorAll('[class*="faqsection_question"]'));
    if (items.length === 0) {
      items = Array.from(element.querySelectorAll('[class*="question"], [class*="accordion"] [class*="item"]'));
    }
    const cells = [];
    items.forEach((item) => {
      const label = item.querySelector("p, h1, h2, h3, h4, h5, h6, span > p");
      let answer = item.querySelector('[class*="faqsection_answer"], [class*="answer"], [class*="collapse"], [class*="faqContent"]');
      if (!answer && item.nextElementSibling && item.nextElementSibling.matches && item.nextElementSibling.matches('[class*="answer"], [class*="collapse"], [class*="faqContent"]')) {
        answer = item.nextElementSibling;
      }
      if (!label && !answer) return;
      let titleCell = "";
      if (label) {
        const p = document.createElement("p");
        p.textContent = label.textContent.trim();
        titleCell = p;
      }
      let contentCell = "";
      if (answer) {
        const children = Array.from(answer.children);
        contentCell = children.length ? children : [answer];
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

  // tools/importer/parsers/carousel-tips.js
  function parse4(element, { document }) {
    let slides = Array.from(element.querySelectorAll('[class*="tipsCarousel_tipCard"]'));
    if (slides.length === 0) {
      slides = Array.from(element.querySelectorAll('[class*="tipCard"], [class*="slide"], li'));
    }
    const cells = [];
    slides.forEach((slide) => {
      const image = slide.querySelector("img");
      const textContainer = slide.querySelector('[class*="textContainer"]') || slide;
      const paragraphs = Array.from(textContainer.querySelectorAll("p"));
      const cta = slide.querySelector("a[href]");
      if (!image && paragraphs.length === 0 && !cta) return;
      const contentCell = [];
      paragraphs.forEach((p) => contentCell.push(p));
      if (cta) {
        const href = cta.getAttribute("href") ? cta.getAttribute("href").trim() : "";
        if (href) {
          const a = document.createElement("a");
          a.setAttribute("href", href);
          a.textContent = cta.textContent.trim();
          contentCell.push(a);
        }
      }
      cells.push([image || "", contentCell.length ? contentCell : ""]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "carousel-tips", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-support.js
  function parse5(element, { document }) {
    let cards = Array.from(element.querySelectorAll('[class*="supportOption_supportDiv"]'));
    if (cards.length === 0) {
      cards = Array.from(element.querySelectorAll('a[class*="support"], :scope > a[href]'));
    }
    const cells = [];
    cards.forEach((card) => {
      const image = card.querySelector("img");
      const title = card.querySelector("h1, h2, h3, h4, h5, h6");
      const descContainer = card.querySelector('[class*="supportSubHeader"]');
      const description = descContainer ? descContainer.querySelector("p") || descContainer : card.querySelector('[class*="supportText"] p');
      const href = card.matches("a[href]") ? card.getAttribute("href") : card.querySelector("a[href]") && card.querySelector("a[href]").getAttribute("href");
      if (!image && !title && !description) return;
      const contentCell = [];
      if (title) {
        const cleanTitle = title.textContent.trim();
        if (href && href.trim()) {
          const a = document.createElement("a");
          a.setAttribute("href", href.trim());
          a.textContent = cleanTitle;
          const h = document.createElement(title.tagName.match(/^H[1-6]$/) ? title.tagName : "h3");
          h.append(a);
          contentCell.push(h);
        } else {
          contentCell.push(title);
        }
      }
      if (description) {
        const p = document.createElement("p");
        p.textContent = description.textContent.trim();
        contentCell.push(p);
      }
      cells.push([image || "", contentCell.length ? contentCell : ""]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-support", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/taqa-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "#onetrust-consent-sdk",
        ".onetrust-pc-dark-filter",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        // Empty SPA host nodes / overlays that carry no authorable content.
        ".dameg-shadow-root-host",
        "next-route-announcer",
        "#modalRoot"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        'a[href="#main-content"]',
        "header",
        "[class*='header_header']",
        "[class*='header_navigationbar']",
        "[class*='primaryNavigation_container']",
        "[class*='primaryNavigationMobile_container']",
        "[class*='primaryNavigationMobile_mainContainer']",
        "[class*='dropdown_dropdown']",
        "[class*='footer_footer']",
        ".dameg-shadow-root-host",
        ".damegCursor",
        ".damegReadingLine",
        // Mobile-only duplicates of desktop content (the responsive layout
        // renders both a desktop and a mobile copy of the tips carousel and the
        // "We are here to help" panel). Drop the mobile copies so each block and
        // its content are imported once.
        "[class*='tipCarouselMobile']",
        "[class*='weAreHereToHelpMobile']"
      ]);
      WebImporter.DOMUtils.remove(element, [
        "script",
        "style",
        "noscript",
        "iframe",
        "link"
      ]);
      element.querySelectorAll(".aos-init, .aos-animate, [data-aos]").forEach((el) => {
        el.classList.remove("aos-init", "aos-animate");
        el.removeAttribute("data-aos");
        el.removeAttribute("data-aos-easing");
        el.removeAttribute("data-aos-duration");
        el.removeAttribute("data-aos-delay");
      });
    }
  }

  // tools/importer/transformers/taqa-sections.js
  var SECTION_MARKER_ATTR = "data-excat-section-id";
  function querySection(root, selectors) {
    const list = Array.isArray(selectors) ? selectors : [selectors];
    for (const sel of list) {
      if (!sel) continue;
      const el = root.querySelector(sel);
      if (el) return el;
    }
    return null;
  }
  function transform2(hookName, element, payload) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];
    if (sections.length < 2) return;
    const doc = element.ownerDocument;
    if (hookName === "beforeTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section || !section.selector) continue;
        if (i === 0 && !section.style) continue;
        const sectionEl = querySection(element, section.selector);
        if (!sectionEl) continue;
        const hr = doc.createElement("hr");
        if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
        sectionEl.before(hr);
      }
    }
    if (hookName === "afterTransform") {
      for (let i = sections.length - 1; i >= 0; i -= 1) {
        const section = sections[i];
        if (!section || !section.style) continue;
        const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
        const anchor = marker || querySection(element, section.selector);
        if (!anchor) continue;
        const metadataBlock = WebImporter.Blocks.createBlock(doc, {
          name: "Section Metadata",
          cells: { style: section.style }
        });
        anchor.after(metadataBlock);
        if (marker) {
          marker.removeAttribute(SECTION_MARKER_ATTR);
          if (i === 0) marker.remove();
        }
      }
    }
  }

  // tools/importer/import-help-and-support.js
  var PAGE_TEMPLATE = {
    name: "help-and-support",
    description: "Help & Support interior page: an angled photographic page-intro hero, a 'Find Your Solution' section with quick-link certificate tiles, a 'Looking For Answers' section with an FAQ accordion plus an energy-saving-tips promo carousel and a help link panel, and a dark customer-support section with icon cards.",
    urls: [
      "https://taqadistribution.com/addc/en-us/business/help-and-support/certificates",
      "https://taqadistribution.com/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services"
    ],
    blocks: [
      { name: "hero-support", instances: ["div[class*='headerFrame_herosection']"] },
      { name: "cards-quicklink", instances: ["div[class*='customCarousel_container']"] },
      { name: "accordion-faq", instances: ["div[class*='faqsection_faqContainer']"] },
      { name: "carousel-tips", instances: ["div[class*='tipsCarousel_carousel']"] },
      { name: "cards-support", instances: ["div[class*='customerSupport_subContainer']"] }
    ],
    sections: [
      { id: "rc2", name: "Hero", selector: ["div[class*='headerFrame_herosection']"], style: null, blocks: ["hero-support"], defaultContent: [] },
      { id: "rc3", name: "Find Your Solution", selector: ["div[class*='customCarousel_container']"], style: null, blocks: ["cards-quicklink"], defaultContent: ["div[class*='customCarousel_leftHeaderContainer']"] },
      { id: "rc4", name: "Looking For Answers", selector: ["div[class*='faqPanel_container']"], style: null, blocks: ["accordion-faq", "carousel-tips"], defaultContent: ["div[class*='faqsection_header']", "div[class*='faqPanel_quickLinkPanel']"] },
      { id: "rc5", name: "Customer Support", selector: ["div[class*='customerSupport_container']"], style: "dark", blocks: ["cards-support"], defaultContent: [] }
    ]
  };
  var parsers = {
    "hero-support": parse,
    "cards-quicklink": parse2,
    "accordion-faq": parse3,
    "carousel-tips": parse4,
    "cards-support": parse5
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
        elements.forEach((element) => {
          if (pageBlocks.some((b) => b.element === element)) return;
          pageBlocks.push({ name: blockDef.name, selector, element, section: blockDef.section || null });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_help_and_support_default = {
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
  return __toCommonJS(import_help_and_support_exports);
})();
