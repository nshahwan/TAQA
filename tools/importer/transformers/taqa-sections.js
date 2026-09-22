/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqadistribution.com section breaks + section metadata.
 *
 * The help-and-support template defines 4 sections in page-templates.json, so
 * section markup is required. This transformer is template-agnostic: it reads
 * `payload.template.sections` and, for each section, uses the section's
 * `selector` array (from page-templates.json, itself derived from the captured
 * DOM) to locate the section element under `main`.
 *
 * Section boundaries verified against migration-work/cleaned.html:
 *   - headerFrame_herosection ....... line 363  (rc2 Hero, no style)
 *   - customCarousel_container ...... line 371  (rc3 Find Your Solution, no style)
 *   - faqPanel_container ............ line 407  (rc4 Looking For Answers, no style)
 *   - customerSupport_container ..... line 701  (rc5 Customer Support, style: dark)
 *
 * Why both hooks: block parsers run *between* beforeTransform and
 * afterTransform and call element.replaceWith(block) on the exact element a
 * section selector may target (each of these sections wraps a single block), so
 * that element no longer exists in afterTransform. We therefore insert the
 * <hr> breaks in beforeTransform (while every section element is still live),
 * tagging each styled section's <hr> with a marker attribute, then insert the
 * Section Metadata blocks in afterTransform anchored to that surviving marker
 * (or the original element for the first, marker-less section). <hr> is not a
 * <div>, so inserting it never disturbs any parser's :nth-of-type selectors.
 *
 * Both loops iterate sections in reverse so mutations never shift the positions
 * of sections still to be processed.
 */
const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order,
// first match wins.
function querySection(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const doc = element.ownerDocument;

  if (hookName === 'beforeTransform') {
    // Insert section breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section || !section.selector) continue;
      // First section needs no leading break and (if unstyled) no marker.
      if (i === 0 && !section.style) continue;

      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched — skip, never guess.

      const hr = doc.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker) the original
    // element itself.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section || !section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — skip, never guess.

      const metadataBlock = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break.
      }
    }
  }
}
