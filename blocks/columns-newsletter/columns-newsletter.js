export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-newsletter-${cols.length}-cols`);

  // setup image columns
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-newsletter-img-col');
        }
      }
    });
  });

  // Presentational markup for the signup column.
  // The imported content renders the email field as a link ("Email Address")
  // followed by trailing text ("Subscribe!"). Mark these up so the field can be
  // styled as an input and the trailing label as the submit button.
  // This adds no form behavior — it only restructures for styling.
  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      const para = col.querySelector('p');
      const link = para && para.querySelector(':scope > a[href^="mailto:"]');
      if (!link) return;

      col.classList.add('columns-newsletter-form-col');
      para.classList.add('columns-newsletter-form');

      // Style the email link as the input field, using its text as the label.
      link.classList.add('columns-newsletter-field');

      // Wrap the trailing "Subscribe!" text node in a styleable button element.
      const trailing = [...para.childNodes]
        .find((n) => n.nodeType === Node.TEXT_NODE && n.textContent.trim());
      if (trailing) {
        const btn = document.createElement('span');
        btn.className = 'columns-newsletter-button';
        btn.textContent = trailing.textContent.trim();
        trailing.replaceWith(btn);
      }
    });
  });
}
