/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: taqa (taqadistribution.com) section breaks + Section Metadata.
 *
 * Inserts <hr> section breaks between the template's sections and appends a
 * Section Metadata block (key "Style") for each section that declares a style.
 * For the help-and-support template, the rc6 "Customer Support" section has
 * style "dark".
 *
 * Section list and styles are read from payload.template.sections; each section
 * is matched by its selector array (first matching selector wins). Selectors are
 * CSS-module substring matches ([class*='...']) because the SPA's hashed class
 * suffixes are volatile between the captured DOM and the live render.
 *
 * Both hooks are used deliberately: block parsers run between beforeTransform
 * and afterTransform and replace section container elements, so <hr> breaks are
 * inserted in beforeTransform (while every section element still exists) with a
 * marker attribute, and Section Metadata is anchored to that marker in
 * afterTransform.
 */

const SECTION_MARKER_ATTR = 'data-excat-section-id';

// section.selector is an array of candidate selectors — try each in order, first match wins.
function querySection(root, selectors) {
  for (const sel of selectors || []) {
    const el = root.querySelector(sel);
    if (el) return el;
  }
  return null;
}

export default function transform(hookName, element, payload) {
  const sections = (payload && payload.template && payload.template.sections) || [];

  if (hookName === 'beforeTransform') {
    // Insert breaks now, before parsers can replace any section element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (i === 0 && !section.style) continue; // first section: no leading break, no metadata
      const sectionEl = querySection(element, section.selector);
      if (!sectionEl) continue; // no selector matched on this page — skip, never guess

      const hr = document.createElement('hr');
      if (section.style) hr.setAttribute(SECTION_MARKER_ATTR, section.id);
      sectionEl.before(hr);
    }
  }

  if (hookName === 'afterTransform') {
    // Parsers have now run and may have replaced section elements. Anchor each
    // styled section's Section Metadata block to whichever still exists: the
    // marker <hr> placed above, or (first section, no marker) the original element.
    for (let i = sections.length - 1; i >= 0; i -= 1) {
      const section = sections[i];
      if (!section.style) continue;

      const marker = element.querySelector(`[${SECTION_MARKER_ATTR}="${section.id}"]`);
      const anchor = marker || querySection(element, section.selector);
      if (!anchor) continue; // neither survived — skip, never guess

      const metadataBlock = WebImporter.Blocks.createBlock(document, {
        name: 'Section Metadata',
        cells: { Style: section.style },
      });
      anchor.after(metadataBlock);

      if (marker) {
        marker.removeAttribute(SECTION_MARKER_ATTR);
        if (i === 0) marker.remove(); // section 0 never gets a real leading break
      }
    }
  }
}
