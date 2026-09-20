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

  // tools/importer/import-residential.js
  var import_residential_exports = {};
  __export(import_residential_exports, {
    default: () => import_residential_default
  });

  // tools/importer/parsers/hero-residential.js
  function parse(element, { document }) {
    const scope = element.closest("div[class*='imageTextSpotlight_container']") || element.parentElement || element;
    const imgContainer = scope.querySelector("div[class*='imageTextSpotlight_imageContainer']");
    const bgImage = (imgContainer || scope).querySelector("img");
    const desktop = element.querySelector("[class*='displayHeadersDesktop']");
    const headingScope = desktop || element;
    const headings = [...headingScope.querySelectorAll("h1, h2, h3, h4")];
    const cells = [];
    if (bgImage) cells.push([bgImage]);
    const contentCell = [];
    const headingTexts = new Set(headings.map((h) => h.textContent.trim()));
    const walker = document.createTreeWalker(
      element,
      4
      /* SHOW_TEXT */
    );
    let eyebrowText = "";
    while (walker.nextNode()) {
      const t = walker.currentNode.textContent.trim();
      if (t && !headingTexts.has(t)) {
        eyebrowText = t;
        break;
      }
    }
    if (eyebrowText) {
      const eyebrow = document.createElement("p");
      eyebrow.textContent = eyebrowText;
      contentCell.push(eyebrow);
    }
    headings.forEach((h, i) => {
      const tag = i === 0 ? "h1" : "h2";
      const heading = document.createElement(tag);
      heading.textContent = h.textContent.trim();
      contentCell.push(heading);
    });
    const seen = /* @__PURE__ */ new Set();
    [...element.querySelectorAll("a[href]")].forEach((a) => {
      const href = a.getAttribute("href");
      if (!href || seen.has(href)) return;
      seen.add(href);
      const span = a.querySelector("span");
      const label = (span ? span.textContent : a.textContent).trim().split("\n")[0].trim();
      const link = document.createElement("a");
      link.href = a.href;
      link.textContent = label;
      contentCell.push(link);
    });
    cells.push([contentCell]);
    const block = WebImporter.Blocks.createBlock(document, { name: "hero-residential", cells });
    (scope && scope.parentNode ? scope : element).replaceWith(block);
  }

  // tools/importer/parsers/cards-usp-overlay.js
  function parse2(element, { document }) {
    const items = [...element.querySelectorAll("li")].filter((li) => li.querySelector("img"));
    if (!items.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = items.map((li) => {
      const img = li.querySelector("img");
      const textCell = document.createElement("div");
      [...li.querySelectorAll("p")].forEach((p) => {
        const line = document.createElement("p");
        line.textContent = p.textContent.trim();
        if (line.textContent) textCell.append(line);
      });
      if (!textCell.children.length && (img == null ? void 0 : img.alt)) {
        const p = document.createElement("p");
        p.textContent = img.alt.trim();
        textCell.append(p);
      }
      return [img, textCell];
    });
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-usp-overlay", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-news.js
  function parse3(element, { document }) {
    let cards = Array.from(element.querySelectorAll("a.news-card, .news-card"));
    if (cards.length === 0) {
      cards = Array.from(element.querySelectorAll("li")).filter((li) => li.querySelector("img"));
    }
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
      paragraphs.forEach((p) => {
        const text = p.textContent.trim();
        if (!text) return;
        const el = document.createElement("p");
        el.textContent = text;
        contentCell.push(el);
      });
      if (href && !card.matches("a[href]")) {
        const readMore = card.querySelector("a[href]");
        const label = readMore && readMore.textContent.trim().split("\n")[0].trim() || "Read more";
        const cta = document.createElement("p");
        const a = document.createElement("a");
        a.setAttribute("href", href);
        a.textContent = label || "Read more";
        cta.append(a);
        contentCell.push(cta);
      }
      cells.push([image || "", contentCell]);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-news", cells });
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

  // tools/importer/import-residential.js
  var PAGE_TEMPLATE = {
    name: "residential",
    description: "Residential overview landing page: a navy spotlight hero, a 'New brand-same exceptional service' intro with three tall image USP tiles, an app-download promo band, and an Announcements news carousel.",
    urls: [
      "https://taqadistribution.com/addc/en-us/residential/overview"
    ],
    blocks: [
      { name: "hero-residential", instances: ["div[class*='imageTextSpotlight_detailsContainer']"] },
      { name: "cards-usp-overlay", instances: ["div[class*='featuresCarousel_carousel']:not([class*='indicators'])"] },
      { name: "cards-news", instances: ["div[class*='customCarousel_container']"] }
    ],
    sections: [
      { id: "rc2", name: "Hero", selector: ["div[class*='imageTextSpotlight_detailsContainer']"], style: null, blocks: ["hero-residential"], defaultContent: [] },
      { id: "rc3", name: "New Brand", selector: ["div[class*='featuresCarousel_sectionheaderunit']"], style: null, blocks: ["cards-usp-overlay"], defaultContent: ["div[class*='featuresCarousel_featuresCarouselText']"] },
      { id: "rc4", name: "App Promo", selector: ["div[class*='downloadApp_appsectioncontainer']"], style: null, blocks: [], defaultContent: ["div[class*='downloadApp_appcontent']"] },
      { id: "rc5", name: "Announcements", selector: ["div[class*='customCarousel_container']"], style: null, blocks: ["cards-news"], defaultContent: ["div[class*='customCarousel_leftHeaderContainer']"] }
    ]
  };
  var parsers = {
    "hero-residential": parse,
    "cards-usp-overlay": parse2,
    "cards-news": parse3
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
  var import_residential_default = {
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
  return __toCommonJS(import_residential_exports);
})();
