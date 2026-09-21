/* eslint-disable */
/* global WebImporter */
/**
 * Parser for app-promo. Base: app-promo (custom block, not in library).
 * Source: help-and-support template — .app-promo.block
 * Generated: 2026-09-21
 *
 * app-promo model: simple block, single richtext field `text` → 1 column.
 *   Row 1: block name.
 *   Row 2: one cell holding ALL the authored content (richtext):
 *          eyebrow lines (POWERING / COMMUNITIES), the app-features headline
 *          and "TAKE CONTROL…" title, the "Upgrade to a new experience" line,
 *          and the two app-store badge links (each wrapping a <picture>/<img>).
 *
 * TAQA DOM: content is loose default content inside .app-promo > div > div —
 * several <p>/<hN> lines tagged app-promo-eyebrow / app-promo-title, plus a
 * <p class="app-promo-badges"> containing the App Store and Play Store <a> links.
 */
export default function parse(element, { document }) {
  // Inner content wrapper (auto-block structure: block > div > div).
  const inner = element.querySelector(':scope > div > div') || element;

  // The badge links (each wraps an <img>) — the app-store CTAs.
  const badgeLinks = Array.from(inner.querySelectorAll('a')).filter((a) => a.querySelector('img'));

  // Text lines: every direct child that has text and is not a badge/image wrapper.
  const textNodes = Array.from(inner.children).filter(
    (el) => el.textContent.trim() && !el.querySelector('img'),
  );

  // Empty-block guard.
  if (textNodes.length === 0 && badgeLinks.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  // Single content cell (richtext `text` field): text lines first, badges last.
  const contentCell = [];
  textNodes.forEach((el) => contentCell.push(el));

  if (badgeLinks.length) {
    const badges = document.createElement('p');
    badgeLinks.forEach((a) => badges.append(a));
    contentCell.push(badges);
  }

  // 1-column block: one row, one cell holding all content.
  const cells = [[contentCell]];

  const block = WebImporter.Blocks.createBlock(document, { name: 'app-promo', cells });
  element.replaceWith(block);
}
