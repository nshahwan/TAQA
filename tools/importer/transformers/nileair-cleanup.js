/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: nileair.com site-wide cleanup.
 *
 * nileair.com is a JS-heavy SPA. The authorable main content lives in
 * `#layout-content` (a <section>). Everything else is site shell / chrome that
 * an author would never create when authoring a page and is handled by separate
 * orchestrators (header/nav, footer). This transformer removes that chrome plus
 * scripts/tracking/iframes and owl-carousel duplicate "cloned" slides so
 * carousels don't import duplicated slides.
 *
 * All selectors are from the captured full-page DOM of nileair.com (see the
 * site-specific cleanup context for this migration). The scraped cleaned.html
 * was already scoped to `#layout-content`, but the same chrome elements exist
 * on the live page these transformers run against.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie-consent banners/dialogs and blocking overlays / alerts.
    // Removed before block parsing so they can't interfere with matching.
    WebImporter.DOMUtils.remove(element, [
      '#cookie-consent-banner',
      '#cookie-consent-dialog',
      '#cookie-consent-scripts',
      '#alerts',
      // mobile off-canvas menu (duplicates header nav as a flat link dump);
      // handled by the header block, not page content.
      'div.offcanvas',
      'div.offcanvas-start',
    ]);

    // owl-carousel duplicates the first/last slides as `.owl-item.cloned` for
    // its infinite-loop effect. Remove them before parsing so the carousel
    // parsers don't import duplicated slides.
    WebImporter.DOMUtils.remove(element, ['div.owl-item.cloned']);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome (handled by separate orchestrators or purely
    // structural): header, flight-booking widget, social bar, footer, live
    // chat, reCAPTCHA, hidden file-upload form.
    WebImporter.DOMUtils.remove(element, [
      'body > header.header-area',
      'header.header-area',
      'body > div.header-bottom',
      'div.header-bottom',
      'body > div.social-section',
      'div.social-section',
      '#layout-footer',
      '#fileUploadForm',
      '[id*="livechat"]',
      '[class*="livechat"]',
      '[class*="live-chat"]',
      // Salesforce live-chat button ("Live chat: Agent Offline").
      '.embeddedServiceHelpButton',
      '[class*="embeddedService"]',
      // date-range-picker widgets (render stray "Cancel"/"Apply" text).
      'div.daterangepicker',
    ]);

    // Scripts, styles, tracking pixels, embeds and other non-content elements.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
      'img[width="1"]',
      'img[height="1"]',
      'img[src*="pixel"]',
    ]);
  }
}
