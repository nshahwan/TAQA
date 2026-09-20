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

  // tools/importer/import-plan-landing.js
  var import_plan_landing_exports = {};
  __export(import_plan_landing_exports, {
    default: () => import_plan_landing_default
  });

  // tools/importer/parsers/cards-fare.js
  function parse(element, { document }) {
    const cards = element.querySelectorAll(".card-promo");
    const cells = [];
    cards.forEach((card) => {
      const titleEl = card.querySelector('.promo-title, [class*="title"]');
      const descEl = card.querySelector('.promo-text, [class*="details"], [class*="text"]');
      const linkEl = card.querySelector(".promo-link a, a");
      const cellContent = [];
      const titleText = titleEl && titleEl.textContent.trim();
      if (titleText) {
        const heading = document.createElement("h3");
        heading.textContent = titleText;
        cellContent.push(heading);
      }
      const descText = descEl && descEl.textContent.trim();
      if (descText) {
        const p = document.createElement("p");
        p.textContent = descText;
        cellContent.push(p);
      }
      if (linkEl && linkEl.getAttribute("href")) {
        cellContent.push(linkEl);
      }
      if (cellContent.length) {
        cells.push([cellContent]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-fare", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/cards-usp.js
  function parse2(element, { document }) {
    const cards = element.querySelectorAll(".card-promo");
    const cells = [];
    cards.forEach((card) => {
      const image = card.querySelector(".promo-image img, img");
      const titleEl = card.querySelector('.promo-title, [class*="title"]');
      const descEl = card.querySelector('.promo-text, [class*="details"], [class*="text"]');
      const linkEl = card.querySelector(".promo-link a, a[href]");
      const imageCell = image || "";
      const textCell = [];
      const titleText = titleEl && titleEl.textContent.trim();
      if (titleText) {
        const heading = document.createElement("h3");
        heading.textContent = titleText;
        textCell.push(heading);
      }
      const descText = descEl && descEl.textContent.trim();
      if (descText) {
        const p = document.createElement("p");
        p.textContent = descText;
        textCell.push(p);
      }
      if (linkEl && linkEl.getAttribute("href")) {
        textCell.push(linkEl);
      }
      if (image || textCell.length) {
        cells.push([imageCell, textCell]);
      }
    });
    if (!cells.length) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "cards-usp", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/columns-promo.js
  function parse3(element, { document }) {
    const links = Array.from(element.querySelectorAll("a[href]"));
    const ctaLink = links.length ? links[links.length - 1] : null;
    const icon = element.querySelector("img");
    const heading = element.querySelector("h1, h2, h3, h4");
    const paragraphs = Array.from(element.querySelectorAll("p")).filter(
      (p) => !ctaLink || !ctaLink.contains(p)
    );
    const contentCell = [];
    if (icon) contentCell.push(icon);
    if (heading) contentCell.push(heading);
    paragraphs.forEach((p) => contentCell.push(p));
    const ctaCell = ctaLink || "";
    if (!contentCell.length && !ctaLink) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [
      [contentCell, ctaCell]
      // single 2-column row
    ];
    const block = WebImporter.Blocks.createBlock(document, { name: "columns-promo", cells });
    element.replaceWith(block);
  }

  // tools/importer/transformers/airarabia-cleanup.js
  var TransformHook = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function transform(hookName, element, payload) {
    if (hookName === TransformHook.beforeTransform) {
      WebImporter.DOMUtils.remove(element, [
        "script",
        "style",
        "noscript",
        "template"
      ]);
    }
    if (hookName === TransformHook.afterTransform) {
      WebImporter.DOMUtils.remove(element, [
        "header",
        "footer",
        "nav",
        '[class*="breadcrumb"]',
        '[id*="breadcrumb"]',
        "aside",
        "iframe",
        "link",
        "source",
        // Cookie-consent (OneTrust) SDK, banners, and preference center.
        "#onetrust-consent-sdk",
        "#onetrust-banner-sdk",
        "#onetrust-pc-sdk",
        '[class*="onetrust"]',
        '[class*="ot-sdk"]',
        // Tracking pixels / beacons left in the DOM.
        'img[src*="doubleclick.net"]',
        'img[src*="/pixel"]',
        // Chat widget shell and its leftover media/audio anchors.
        '[class*="sprinklr"]',
        'a[href*="sprinklr.com"]',
        'a[href$=".mp3"]'
      ]);
      element.querySelectorAll("*").forEach((el) => {
        el.removeAttribute("onclick");
        el.removeAttribute("data-track");
        el.removeAttribute("data-gtm");
      });
    }
  }

  // tools/importer/transformers/airarabia-sections.js
  var TransformHook2 = { beforeTransform: "beforeTransform", afterTransform: "afterTransform" };
  function selectorCandidates(selector) {
    if (!selector) return [];
    const candidates = [selector];
    const noInit = selector.replace(/\.initialized\b/g, "");
    if (noInit !== selector) candidates.push(noInit);
    const noNth = noInit.replace(/:nth-of-type\(\s*\d+\s*\)/g, "");
    if (noNth !== noInit) candidates.push(noNth);
    const lastSegment = noNth.split(">").pop().trim();
    if (lastSegment && candidates.indexOf(lastSegment) === -1) candidates.push(lastSegment);
    return candidates;
  }
  function transform2(hookName, element, payload) {
    if (hookName === TransformHook2.afterTransform) {
      const template = payload && payload.template;
      const sections = template && Array.isArray(template.sections) ? template.sections : [];
      if (sections.length > 1) {
        const doc = element.ownerDocument;
        const claimed = /* @__PURE__ */ new Set();
        const resolved = sections.map((section) => {
          const selectors = [];
          selectorCandidates(section.selector).forEach((s) => selectors.push(s));
          if (Array.isArray(section.defaultContent)) {
            section.defaultContent.forEach((dc) => {
              selectorCandidates(dc).forEach((s) => selectors.push(s));
            });
          }
          let el = null;
          for (let s = 0; s < selectors.length && !el; s += 1) {
            const matches = element.querySelectorAll(selectors[s]);
            for (let m = 0; m < matches.length; m += 1) {
              if (!claimed.has(matches[m])) {
                el = matches[m];
                break;
              }
            }
          }
          if (el) claimed.add(el);
          return { section, el };
        });
        for (let i = resolved.length - 1; i >= 0; i -= 1) {
          const { section, el } = resolved[i];
          if (el) {
            if (section.style) {
              const meta = WebImporter.Blocks.createBlock(doc, {
                name: "Section Metadata",
                cells: { style: section.style }
              });
              if (el.parentNode) {
                el.parentNode.insertBefore(meta, el.nextSibling);
              }
            }
            if (i > 0 && el.parentNode) {
              const hr = doc.createElement("hr");
              el.parentNode.insertBefore(hr, el);
            }
          }
        }
      }
    }
  }

  // tools/importer/import-plan-landing.js
  var PAGE_TEMPLATE = {
    name: "plan-landing",
    description: "Marketing landing page under /plan with a promo banner, page title, intro rich text, and multiple card grids (fare options, check-in options, onboard comfort features, a promo/CTA card, and a bottom CTA card row), plus site header and footer.",
    urls: [
      "https://www.airarabia.com/en/plan/flying-with-us/flying-with-convenience"
    ],
    blocks: [
      {
        name: "cards-fare",
        instances: ["div.component.snippet.col-lg-12.col-xl-12"]
      },
      {
        name: "cards-usp",
        instances: [
          "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(7)",
          "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(9)",
          "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.hide-all-mobile.container-fluid-grey.initialized"
        ]
      },
      {
        name: "columns-promo",
        instances: [
          "#content > div.component.container > div.component-content > div.row > div.component.rich-text.col-12:nth-of-type(10)"
        ]
      },
      {
        name: "section-cta-grey",
        instances: [
          "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.hide-all-mobile.container-fluid-grey.initialized"
        ],
        section: "grey"
      }
    ],
    sections: [
      {
        id: "rc2",
        name: "Promo banner",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.banner-promo.full-width-banner.col-12.col-lg-6.air-reward",
        style: null,
        blocks: [],
        defaultContent: ["div.component.banner-promo.full-width-banner"]
      },
      {
        id: "rc3",
        name: "Page title",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.title.col-12",
        style: null,
        blocks: [],
        defaultContent: ["div.component.title.col-12"]
      },
      {
        id: "rc4",
        name: "Intro",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.rich-text.col-12:nth-of-type(3)",
        style: null,
        blocks: [],
        defaultContent: ["div.component.rich-text.col-12:nth-of-type(3)"]
      },
      {
        id: "rc5",
        name: "Fare options",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-lg-12.col-xl-12.initialized",
        style: null,
        blocks: ["cards-fare"],
        defaultContent: []
      },
      {
        id: "rc6-8",
        name: "Check-in options",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(7)",
        style: null,
        blocks: ["cards-usp"],
        defaultContent: ["div.component.rich-text.col-12:nth-of-type(5)"]
      },
      {
        id: "rc9-10",
        name: "Comfort onboard",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.initialized:nth-of-type(9)",
        style: null,
        blocks: ["cards-usp"],
        defaultContent: ["div.component.rich-text.col-12:nth-of-type(8)"]
      },
      {
        id: "rc11",
        name: "Block Your Ticket promo",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.rich-text.col-12:nth-of-type(10)",
        style: null,
        blocks: ["columns-promo"],
        defaultContent: []
      },
      {
        id: "rc12-13",
        name: "Bottom CTA cards",
        selector: "#content > div.component.container > div.component-content > div.row > div.component.snippet.col-12.hide-all-mobile.container-fluid-grey.initialized",
        style: "grey",
        blocks: ["cards-usp"],
        defaultContent: []
      }
    ]
  };
  var parsers = {
    "cards-fare": parse,
    "cards-usp": parse2,
    "columns-promo": parse3
  };
  var transformers = [
    transform,
    ...PAGE_TEMPLATE.sections && PAGE_TEMPLATE.sections.length > 1 ? [transform2] : []
  ];
  function executeTransformers(hookName, element, payload) {
    const enhancedPayload = __spreadProps(__spreadValues({}, payload), {
      template: PAGE_TEMPLATE
    });
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
          pageBlocks.push({
            name: blockDef.name,
            selector,
            element,
            section: blockDef.section || null
          });
        });
      });
    });
    console.log(`Found ${pageBlocks.length} block instances on page`);
    return pageBlocks;
  }
  var import_plan_landing_default = {
    transform: (payload) => {
      const {
        document,
        url,
        html,
        params
      } = payload;
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
      const path = WebImporter.FileUtils.sanitizePath(
        new URL(params.originalURL).pathname.replace(/\/$/, "").replace(/\.html$/, "")
      );
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
  return __toCommonJS(import_plan_landing_exports);
})();
