/* eslint-disable */
/* global WebImporter */
/**
 * Parser for form-contact. Base: form (custom — no library convention).
 * Source: https://www.nileair.com/travelling-pets (#contact-us)
 *
 * Authoring model expected by blocks/form-contact/form-contact.js:
 *   Row 1: block name
 *   Action | {form action url}
 *   {type} | {name} | {label} | {placeholder or ;-joined options} | {required}
 *   ...
 *   submit | {button text}
 *
 * Columns per field row: type | name | label | placeholder/options | required (5 cells).
 */
export default function parse(element, { document }) {
  // element is the <form id="contact-us"> (or a wrapper containing it).
  const form = element.matches('form') ? element : element.querySelector('form');
  const scope = form || element;

  const cells = [];

  // Action row (2 cells; padded to 5 for a consistent table width is not required
  // by the block, which reads cells positionally — keep it as authored: Action | url).
  const action = form ? form.getAttribute('action') : null;
  if (action) {
    cells.push(['Action', action, '', '', '']);
  }

  // Map an input/select/textarea to a normalized field type.
  const fieldType = (control) => {
    const tag = control.tagName.toLowerCase();
    if (tag === 'textarea') return 'textarea';
    if (tag === 'select') return 'select';
    const t = (control.getAttribute('type') || 'text').toLowerCase();
    if (t === 'email') return 'email';
    if (t === 'tel' || control.getAttribute('name') === 'phone') return 'tel';
    return t || 'text';
  };

  // Each field lives in a wrapper (.mb-3) with a label + control.
  const controls = Array.from(scope.querySelectorAll('input, select, textarea'))
    .filter((c) => (c.getAttribute('type') || '').toLowerCase() !== 'hidden');

  controls.forEach((control) => {
    const type = fieldType(control);
    const name = control.getAttribute('name') || '';
    // Label: nearest preceding label within the field wrapper.
    const wrapper = control.closest('.mb-3, .col-md-6, div') || scope;
    const labelEl = wrapper.querySelector('label') || scope.querySelector(`label[for="${control.id}"]`);
    const label = labelEl ? labelEl.textContent.trim() : '';

    let placeholderOrOptions = '';
    if (type === 'select') {
      // Join option texts with ';' — first option is the placeholder.
      placeholderOrOptions = Array.from(control.querySelectorAll('option'))
        .map((o) => o.textContent.trim())
        .filter(Boolean)
        .join('; ');
    } else {
      placeholderOrOptions = control.getAttribute('placeholder') || '';
    }

    const required = control.hasAttribute('required') ? 'true' : '';

    if (type && name) {
      cells.push([type, name, label, placeholderOrOptions, required]);
    }
  });

  // Submit button row.
  const submit = scope.querySelector('button[type="submit"], button, input[type="submit"]');
  if (submit) {
    const text = submit.tagName.toLowerCase() === 'input'
      ? (submit.getAttribute('value') || 'Send')
      : (submit.textContent.trim() || 'Send');
    cells.push(['submit', text, '', '', '']);
  }

  if (cells.length === 0) {
    element.replaceWith(...element.childNodes);
    return;
  }

  const block = WebImporter.Blocks.createBlock(document, { name: 'form-contact', cells });
  element.replaceWith(block);
}
