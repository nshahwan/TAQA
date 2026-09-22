/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com) site-wide cleanup.
 *
 * Source is a React/Next.js SPA with hashed CSS-module class names
 * (e.g. header_header__9OzUC). The live-rendered DOM hash suffixes differ from
 * cleaned.html, so all class-based removal selectors use substring/attribute
 * matching [class*='...'].
 *
 * All selectors verified against migration-work/cleaned.html.
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.beforeTransform) {
    // OneTrust cookie consent widgets (found: #onetrust-consent-sdk, #onetrust-banner-sdk,
    // #onetrust-pc-sdk, .onetrust-pc-dark-filter)
    // Empty SPA host / infrastructure nodes (found: .dameg-shadow-root-host,
    // next-route-announcer, #modalRoot)
    WebImporter.DOMUtils.remove(element, [
      '#onetrust-consent-sdk',
      '#onetrust-banner-sdk',
      '#onetrust-pc-sdk',
      '.onetrust-pc-dark-filter',
      '.dameg-shadow-root-host',
      'next-route-announcer',
      '#modalRoot',
    ]);
  }

  if (hookName === TransformHook.afterTransform) {
    // Remove non-content chrome and structural/non-content nodes.
    // Class selectors use [class*='...'] because CSS-module hash suffixes are
    // volatile between the captured DOM and the live render.
    WebImporter.DOMUtils.remove(element, [
      // Skip link
      'a[href="#main-content"]',
      // Header + top nav bar (found: header_header__, header_navigationbar__SYK)
      "[class*='header_header']",
      "[class*='header_navigationbar']",
      'header',
      // Primary navigation, desktop AND mobile
      // (found: primaryNavigation_container__NM_X, primaryNavigationMobile_container__fMcyp,
      //  primaryNavigationMobile_mainContainer__aRwkP)
      "[class*='primaryNavigation_container']",
      "[class*='primaryNavigationMobile_container']",
      "[class*='primaryNavigationMobile_mainContainer']",
      // Mega-menu dropdown panels (found: dropdown_dropdown__)
      "[class*='dropdown_dropdown']",
      // Global footer (found: footer_footer__Im)
      "[class*='footer_footer']",
      // DAMEG accessibility widget (found: .dameg-shadow-root-host, .damegCursor, .damegReadingLine)
      '.dameg-shadow-root-host',
      '.damegCursor',
      '.damegReadingLine',
      // Mobile-only duplicate copies rendered alongside desktop layout
      // (found: tipCarouselMobile__oR, weAreHereToHelpMobile__oOO, primaryNavigationMobile_*)
      "[class*='tipCarouselMobile']",
      "[class*='weAreHereToHelpMobile']",
      "[class*='primaryNavigationMobile']",
      // Structural / non-content nodes
      'script',
      'style',
      'noscript',
      'iframe',
      'link',
    ]);

    // Strip AOS scroll-animation artifacts so they don't leak into the import.
    // (found: aos-init, aos-animate classes; data-aos-delay/duration/easing attributes)
    element.querySelectorAll('.aos-init, .aos-animate, [data-aos], [data-aos-delay], [data-aos-duration], [data-aos-easing]').forEach((el) => {
      el.classList.remove('aos-init', 'aos-animate');
      [...el.attributes].forEach((attr) => {
        if (attr.name === 'data-aos' || attr.name.startsWith('data-aos-')) {
          el.removeAttribute(attr.name);
        }
      });
    });
  }
}
