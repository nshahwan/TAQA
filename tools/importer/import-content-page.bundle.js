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

  // tools/importer/import-content-page.js
  var import_content_page_exports = {};
  __export(import_content_page_exports, {
    default: () => import_content_page_default
  });

  // tools/importer/parsers/accordion-faq.js
  function parse(element, { document }) {
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

  // tools/importer/parsers/form-contact.js
  function parse2(element, { document }) {
    const form = element.matches("form") ? element : element.querySelector("form");
    const scope = form || element;
    const cells = [];
    const action = form ? form.getAttribute("action") : null;
    if (action) {
      cells.push(["Action", action, "", "", ""]);
    }
    const fieldType = (control) => {
      const tag = control.tagName.toLowerCase();
      if (tag === "textarea") return "textarea";
      if (tag === "select") return "select";
      const t = (control.getAttribute("type") || "text").toLowerCase();
      if (t === "email") return "email";
      if (t === "tel" || control.getAttribute("name") === "phone") return "tel";
      return t || "text";
    };
    const controls = Array.from(scope.querySelectorAll("input, select, textarea")).filter((c) => (c.getAttribute("type") || "").toLowerCase() !== "hidden");
    controls.forEach((control) => {
      const type = fieldType(control);
      const name = control.getAttribute("name") || "";
      const wrapper = control.closest(".mb-3, .col-md-6, div") || scope;
      const labelEl = wrapper.querySelector("label") || scope.querySelector(`label[for="${control.id}"]`);
      const label = labelEl ? labelEl.textContent.trim() : "";
      let placeholderOrOptions = "";
      if (type === "select") {
        placeholderOrOptions = Array.from(control.querySelectorAll("option")).map((o) => o.textContent.trim()).filter(Boolean).join("; ");
      } else {
        placeholderOrOptions = control.getAttribute("placeholder") || "";
      }
      const required = control.hasAttribute("required") ? "true" : "";
      if (type && name) {
        cells.push([type, name, label, placeholderOrOptions, required]);
      }
    });
    const submit = scope.querySelector('button[type="submit"], button, input[type="submit"]');
    if (submit) {
      const text = submit.tagName.toLowerCase() === "input" ? submit.getAttribute("value") || "Send" : submit.textContent.trim() || "Send";
      cells.push(["submit", text, "", "", ""]);
    }
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, { name: "form-contact", cells });
    element.replaceWith(block);
  }

  // tools/importer/parsers/table.js
  function parse3(element, { document }) {
    const table = element.matches("table") ? element : element.querySelector("table");
    if (!table) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const cells = [];
    table.querySelectorAll("tr").forEach((tr) => {
      const rowCells = [...tr.children].map((cell) => cell.textContent.trim());
      if (rowCells.some((t) => t)) cells.push(rowCells);
    });
    if (cells.length === 0) {
      element.replaceWith(...element.childNodes);
      return;
    }
    const block = WebImporter.Blocks.createBlock(document, {
      name: "table",
      variants: ["striped"],
      cells
    });
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

  // tools/importer/import-content-page.js
  var PAGE_TEMPLATE = {
    name: "content-page",
    description: "Interior content page: breadcrumbs, page title, rich-text sections (some with cover image), optional data table, one or more accordion/FAQ sections, optional contact form.",
    urls: [
      "https://www.nileair.com/travelling-pets",
      "https://www.nileair.com/baggage-allowance",
      "https://www.nileair.com/nileair-holidays"
    ],
    blocks: [
      { name: "accordion-faq", instances: ["div.faq-box-area", "#pets", "#travelling-with-pets-faqs", "#baggage-allowance-faqs", "#why-choose-nile-air-holidays", "#nileair-holidays-faqs"] },
      { name: "form-contact", instances: ["#contact-us"] },
      { name: "table", instances: ["div.pr-area-table table", "#layout-content table"] }
    ],
    sections: [
      { id: "rc4c1", name: "Breadcrumb / page title", selector: "#layout-content > div.bread-crumbs", style: null, blocks: [], defaultContent: ["#layout-content > div.bread-crumbs"] },
      { id: "rc4c2", name: "Intro rich-text with cover image", selector: "#layout-content > div.page-wrapper:nth-of-type(2)", style: null, blocks: [], defaultContent: ["#layout-content > div.page-wrapper:nth-of-type(2) .about-content"] },
      { id: "rc4c3", name: "Rich-text / data table", selector: "#layout-content > div.page-wrapper:nth-of-type(3)", style: null, blocks: [], defaultContent: ["#layout-content > div.page-wrapper:nth-of-type(3)"] },
      { id: "rc4c4", name: "Accordion section", selector: "#layout-content > div.page-wrapper:nth-of-type(4)", style: null, blocks: ["accordion-faq"], defaultContent: ["#layout-content > div.page-wrapper:nth-of-type(4) .about-content"] },
      { id: "rc4c5", name: "Contact form", selector: "#layout-content > div.page-wrapper:nth-of-type(5)", style: null, blocks: ["form-contact"], defaultContent: [] },
      { id: "rc4c6", name: "FAQ accordion", selector: "#layout-content > div.page-wrapper:nth-of-type(6)", style: null, blocks: ["accordion-faq"], defaultContent: ["#layout-content > div.page-wrapper:nth-of-type(6) .about-content"] }
    ]
  };
  var parsers = {
    "accordion-faq": parse,
    "form-contact": parse2,
    table: parse3
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
  var import_content_page_default = {
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
  return __toCommonJS(import_content_page_exports);
})();
