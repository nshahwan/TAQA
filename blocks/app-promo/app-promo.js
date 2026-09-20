/**
 * App-promo band. The content is authored as loose default content
 * (POWERING / COMMUNITIES eyebrow, an app-features headline, "Upgrade to a new
 * experience", and the two app-store badges). scripts.js auto-blocks it; this
 * decorator tags each part by role — so styling is independent of whether the
 * source authored the lines as <p>, <strong>/<span>, or <h3>/<h5>/<h6> — and
 * groups the badge links into a single row.
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const inner = block.querySelector(':scope > div > div') || block;

  // 1. Group the app-store badge links (each wrapped in a <p>) into one row.
  const badgeLinks = [...inner.querySelectorAll('a')].filter((a) => a.querySelector('img'));
  let badges;
  if (badgeLinks.length) {
    badges = document.createElement('p');
    badges.className = 'app-promo-badges';
    badgeLinks.forEach((a) => {
      const p = a.closest('p');
      badges.append(a);
      if (p && p !== badges && !p.textContent.trim() && !p.querySelector('img')) p.remove();
    });
  }

  // 2. Tag the remaining text lines by role. The first two lines are the
  //    "POWERING" / "COMMUNITIES" eyebrow; the rest are the headline block.
  const textNodes = [...inner.children].filter(
    (el) => el !== badges && el.textContent.trim() && !el.querySelector('img'),
  );
  textNodes.forEach((el, i) => {
    if (i < 2) el.classList.add('app-promo-eyebrow');
    else el.classList.add('app-promo-title');
  });

  // 3. Append the badges last.
  if (badges) inner.append(badges);
}
