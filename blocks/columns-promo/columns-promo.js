export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-promo-${cols.length}-cols`);

  // In the content cell, group the heading + paragraphs into a text wrapper
  // so the icon can sit beside the text block (source layout).
  const contentCell = cols[0];
  if (contentCell) {
    // The icon is a <p> containing a <picture>
    const iconP = [...contentCell.children].find(
      (el) => el.tagName === 'P' && el.querySelector('picture'),
    );
    if (iconP) {
      iconP.classList.add('columns-promo-icon');
    }

    // Wrap remaining (non-icon) children into a text container
    const textNodes = [...contentCell.children].filter((el) => el !== iconP);
    if (textNodes.length) {
      const textWrap = document.createElement('div');
      textWrap.className = 'columns-promo-text';
      contentCell.insertBefore(textWrap, textNodes[0]);
      textNodes.forEach((n) => textWrap.appendChild(n));
    }
  }
}
