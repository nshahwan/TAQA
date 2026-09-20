/* eslint-disable */
/* global WebImporter */

/**
 * Transformer: nileair.com section breaks + section metadata.
 *
 * Both templates (home-landing: 8 sections, content-page: 6 sections) define
 * 2+ sections in page-templates.json, so section markup is required. This
 * transformer is template-agnostic: it reads `payload.template.sections` and,
 * for each section, uses the section's `selector` (from page-templates.json,
 * itself derived from the captured DOM) to locate the section element under
 * `main`.
 *
 * Processing runs in reverse order so inserting nodes doesn't shift the
 * positions of sections still to be processed:
 *   - For each section that has a `style`, append a Section Metadata block
 *     (WebImporter.Blocks.createBlock) after the section element.
 *   - For each non-first section, insert an <hr> before the section element to
 *     create the section break.
 *
 * Runs in afterTransform only (block parsing must be complete first).
 */
const TransformHook = { beforeTransform: 'beforeTransform', afterTransform: 'afterTransform' };

export default function transform(hookName, element, payload) {
  if (hookName !== TransformHook.afterTransform) return;

  const template = payload && payload.template;
  const sections = template && Array.isArray(template.sections) ? template.sections : [];
  if (sections.length < 2) return;

  const doc = element.ownerDocument;

  // Reverse order: mutations don't disturb positions of not-yet-processed sections.
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const section = sections[i];
    if (!section || !section.selector) continue;

    const sectionEl = element.querySelector(section.selector);
    if (!sectionEl) continue;

    // Section Metadata block for sections that declare a style.
    if (section.style) {
      const meta = WebImporter.Blocks.createBlock(doc, {
        name: 'Section Metadata',
        cells: { style: section.style },
      });
      if (sectionEl.nextSibling) {
        sectionEl.parentNode.insertBefore(meta, sectionEl.nextSibling);
      } else {
        sectionEl.parentNode.appendChild(meta);
      }
    }

    // Section break before every section except the first.
    if (i > 0) {
      const hr = doc.createElement('hr');
      sectionEl.parentNode.insertBefore(hr, sectionEl);
    }
  }
}
