/*
 * Form Contact Block
 * Renders a simple authored contact form from a block table.
 *
 * Authoring model (one field per row, first row = block name):
 *   | Form Contact                                                |
 *   | Action    | https://example.com/api/submit                 |
 *   | text      | name    | Name              | Your name  | true |
 *   | select    | subject | Why contact us?   | Select Subject; Option A; Option B | true |
 *   | email     | email   | Email             | email@domain.com | true |
 *   | tel       | phone   | Mobile number     | Mobile number | true |
 *   | textarea  | message | Message           |            | true |
 *   | submit    | Send                                             |
 *
 * Columns per field row: type | name | label | placeholder/options | required
 */

function createField(type, name, labelText, placeholderOrOptions, required) {
  const wrapper = document.createElement('div');
  wrapper.className = 'form-contact-field';

  if (labelText) {
    const label = document.createElement('label');
    label.className = 'form-contact-label';
    label.setAttribute('for', name);
    label.textContent = labelText;
    wrapper.append(label);
  }

  let control;
  if (type === 'textarea') {
    control = document.createElement('textarea');
    control.rows = 3;
    if (placeholderOrOptions) control.placeholder = placeholderOrOptions;
  } else if (type === 'select') {
    control = document.createElement('select');
    const options = (placeholderOrOptions || '').split(';').map((o) => o.trim()).filter(Boolean);
    options.forEach((opt, i) => {
      const optionEl = document.createElement('option');
      // first option acts as the empty placeholder value
      optionEl.value = i === 0 ? '' : opt;
      optionEl.textContent = opt;
      control.append(optionEl);
    });
  } else {
    control = document.createElement('input');
    control.type = type || 'text';
    if (placeholderOrOptions) control.placeholder = placeholderOrOptions;
  }

  control.id = name;
  control.name = name;
  control.className = 'form-contact-control';
  if (required) control.setAttribute('required', '');

  wrapper.append(control);
  return wrapper;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const form = document.createElement('form');
  form.className = 'form-contact-form';
  form.setAttribute('novalidate', '');

  const rows = [...block.children];
  rows.forEach((row) => {
    const cells = [...row.children].map((c) => c.textContent.trim());
    const type = (cells[0] || '').toLowerCase();

    if (type === 'action') {
      // second cell holds the submit URL
      if (cells[1]) form.setAttribute('action', cells[1]);
      form.setAttribute('method', 'post');
      return;
    }

    if (type === 'submit') {
      const button = document.createElement('button');
      button.type = 'submit';
      button.className = 'form-contact-submit button';
      button.textContent = cells[1] || 'Send';
      form.append(button);
      return;
    }

    const [, name, labelText, placeholderOrOptions, requiredRaw] = cells;
    const required = /^(true|yes|required)$/i.test(requiredRaw || '');
    if (type && name) {
      form.append(createField(type, name, labelText, placeholderOrOptions, required));
    }
  });

  const message = document.createElement('div');
  message.className = 'form-contact-message';
  message.setAttribute('aria-live', 'polite');

  form.addEventListener('submit', (e) => {
    if (!form.checkValidity()) {
      e.preventDefault();
      form.reportValidity();
    }
  });

  block.textContent = '';
  block.append(form, message);
}
