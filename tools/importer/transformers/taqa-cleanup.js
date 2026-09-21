/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com / ADDC) site-wide cleanup.
 *
 * The authorable page content lives inside <main>. Everything else is site
 * shell / chrome an author would never create when authoring a page (top
 * header nav, primary navigation bar, mega-menu dropdown panels, the global
 * footer, cookie-consent widgets) plus purely structural / non-content nodes.
 * Header/nav and footer are handled by their own orchestrators.
 *
 * This site has been migrated from two source shells, so the transformer keeps
 * selectors for both (each set is harmless where it doesn't match):
 *
 * 1. Next.js SPA shell (original taqadistribution.com): hashed CSS-module
 *    classes (header_header__*, primaryNavigation_container__*,
 *    dropdown_dropdown__*, footer_footer__*), OneTrust, next-route-announcer,
 *    #modalRoot, DAMEG accessibility overlay, AOS scroll-animation artifacts.
 *
 * 2. EDS-rendered shell (help-and-support template, ADDC demo-environment).
 *    Verified in this page's migration-work/cleaned.html:
 *      - <header class="header-wrapper"> ............... line 2
 *      - <footer class="footer-wrapper"> ............... line 649
 *    Both are siblings of <main> (header lines 2-220, footer lines 649-752),
 *    so they are only reachable when the importer passes the full document;
 *    they are removed defensively. No cookie/consent widget, no
 *    script/style/link/iframe/noscript nodes are present in this cleaned.html.
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // Cookie-consent widget and blocking overlays — removed before block
    // parsing so they can't interfere with block matching.
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '.onetrust-pc-dark-filter',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      // Empty SPA host nodes / overlays that carry no authorable content.
      '.dameg-shadow-root-host',
      'next-route-announcer',
      '#modalRoot',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Non-authorable site chrome: skip link, header + primary nav (desktop
    // AND mobile), the help/locations mega-menu dropdown panels, the global
    // footer, and the DAMEG accessibility offline-widget overlay. Header/nav
    // and footer are migrated by their own orchestrators.
    // Substring/attribute selectors are used because the live-rendered DOM
    // carries hashed CSS-module class suffixes that differ from cleaned.html,
    // and because the responsive layout may render the mobile header instead
    // of the desktop one during import.
    WebImporter.DOMUtils.remove(element, [
      'a[href="#main-content"]',
      'header',
      '.header-wrapper',
      "[class*='header_header']",
      "[class*='header_navigationbar']",
      "[class*='primaryNavigation_container']",
      "[class*='primaryNavigationMobile_container']",
      "[class*='primaryNavigationMobile_mainContainer']",
      "[class*='dropdown_dropdown']",
      // Global footer — migrated separately by the footer orchestrator. The
      // EDS-rendered page uses <footer class="footer-wrapper"> (a body sibling);
      // remove it so its content does not leak into the imported page.
      'footer',
      '.footer-wrapper',
      "[class*='footer_footer']",
      '.dameg-shadow-root-host',
      '.damegCursor',
      '.damegReadingLine',
      // Mobile-only duplicates of desktop content (the responsive layout
      // renders both a desktop and a mobile copy of the tips carousel and the
      // "We are here to help" panel). Drop the mobile copies so each block and
      // its content are imported once.
      "[class*='tipCarouselMobile']",
      "[class*='weAreHereToHelpMobile']",
    ]);

    // Purely structural / non-content elements.
    WebImporter.DOMUtils.remove(element, [
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
    ]);

    // Strip AOS scroll-animation artifacts left on authorable content
    // (classes + data attributes) so they don't leak into the import.
    element.querySelectorAll('.aos-init, .aos-animate, [data-aos]').forEach((el) => {
      el.classList.remove('aos-init', 'aos-animate');
      el.removeAttribute('data-aos');
      el.removeAttribute('data-aos-easing');
      el.removeAttribute('data-aos-duration');
      el.removeAttribute('data-aos-delay');
    });
  }
}
