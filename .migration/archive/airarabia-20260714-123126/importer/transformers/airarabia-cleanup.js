/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Air Arabia site-wide cleanup.
 *
 * Removes non-authorable site chrome and leftover non-content elements so the
 * import contains only page-level authorable content. This transformer is
 * source-site-specific and template-agnostic: it targets the standard Air Arabia
 * site shell (header/footer/nav/breadcrumb) that wraps every page on the live
 * source (documented in the plan-landing template description in
 * page-templates.json). The main authorable content of the migrated page is the
 * promo banner, page title, intro, and card grids captured in
 * migration-work/cleaned.html; none of that is touched here.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Remove overlays/consent/chat widgets and non-content scripting that could
    // interfere with block parsing. Broad script/style/noscript strip is safe
    // here as none of it is authorable content.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'template',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome: header, footer, and navigation are part of
    // the global site shell, not the page's authorable content.
    WebImporter.DOMUtils.remove(element, [
      'header',
      'footer',
      'nav',
      '[class*="breadcrumb"]',
      '[id*="breadcrumb"]',
      'aside',
      'iframe',
      'link',
      'source',
      // Cookie-consent (OneTrust) SDK, banners, and preference center.
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '[class*="onetrust"]',
      '[class*="ot-sdk"]',
      // Tracking pixels / beacons left in the DOM.
      'img[src*="doubleclick.net"]',
      'img[src*="/pixel"]',
      // Chat widget shell and its leftover media/audio anchors.
      '[class*="sprinklr"]',
      'a[href*="sprinklr.com"]',
      'a[href$=".mp3"]',
    ]);

    // Strip tracking / behavioral attributes left on retained content elements.
    element.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('onclick');
      el.removeAttribute('data-track');
      el.removeAttribute('data-gtm');
    });
  }
}
