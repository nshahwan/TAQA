/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: Air Arabia section breaks and section metadata.
 *
 * Runs only in afterTransform. Reads the sections defined on the matched
 * template in page-templates.json (payload.template.sections) and, for each
 * section (processed in reverse document order so earlier inserts do not
 * shift the positions of sections not yet handled):
 *   - inserts an <hr> before the section element for every non-first section,
 *     creating the EDS section break;
 *   - inserts a "Section Metadata" block after the section element when the
 *     section declares a `style`.
 *
 * Section selectors come from the captured DOM (page-templates.json sections),
 * not guessed. See migration-work/cleaned.html for the source structure.
 *
 * For the plan-landing template this yields 7 <hr> section breaks (8 sections,
 * no break before the first) and 1 Section Metadata block (only the bottom CTA
 * section "rc12-13" declares style: "grey").
 */

const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

/**
 * Build tolerant selector candidates from a template selector.
 *
 * The selectors in page-templates.json were captured against the analyzed DOM
 * and include two things that do NOT survive to the live server-rendered DOM
 * this transformer runs against:
 *   - the `.initialized` class, which is added by the site's client-side JS at
 *     runtime (absent on the server HTML the importer receives);
 *   - `:nth-of-type(N)` indices, computed against the analyzed component order,
 *     which drifts from the live order (extra link-list/row-splitter/etc.
 *     components are interspersed).
 * We therefore also emit a variant with those stripped so the selector still
 * matches. Candidates are returned most-specific first.
 */
function selectorCandidates(selector) {
  if (!selector) return [];
  const candidates = [selector];
  const noInit = selector.replace(/\.initialized\b/g, '');
  if (noInit !== selector) candidates.push(noInit);
  const noNth = noInit.replace(/:nth-of-type\(\s*\d+\s*\)/g, '');
  if (noNth !== noInit) candidates.push(noNth);
  // Also keep just the trailing compound selector (last combinator segment),
  // which targets the section's own component div without the fragile ancestor
  // chain (#content > ... > .row >).
  const lastSegment = noNth.split('>').pop().trim();
  if (lastSegment && candidates.indexOf(lastSegment) === -1) candidates.push(lastSegment);
  return candidates;
}

export default function transform(hookName, element, payload) {
  if (hookName === TransformHook.afterTransform) {
    const template = payload && payload.template;
    const sections = template && Array.isArray(template.sections) ? template.sections : [];

    if (sections.length > 1) {
      const doc = element.ownerDocument;
      // Track elements already claimed by an earlier section so ambiguous
      // selectors (e.g. several `rich-text col-12` or `snippet col-12`
      // components) each resolve to a distinct element in document order.
      const claimed = new Set();

      // Resolve each section, in document order, to its first UNCLAIMED matching
      // element within `main`. For each section we try, in order: the full
      // selector and its tolerant variants, then the defaultContent selectors
      // and their tolerant variants. The first candidate that matches an
      // element not yet claimed by another section wins.
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

      // Process in reverse so DOM insertions don't shift not-yet-handled sections.
      for (let i = resolved.length - 1; i >= 0; i -= 1) {
        const { section, el } = resolved[i];
        if (el) {
          // Section Metadata block (only when a style is declared).
          if (section.style) {
            const meta = WebImporter.Blocks.createBlock(doc, {
              name: 'Section Metadata',
              cells: { style: section.style },
            });
            if (el.parentNode) {
              el.parentNode.insertBefore(meta, el.nextSibling);
            }
          }

          // Section break before every non-first section.
          if (i > 0 && el.parentNode) {
            const hr = doc.createElement('hr');
            el.parentNode.insertBefore(hr, el);
          }
        }
      }
    }
  }
}
