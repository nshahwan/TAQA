// media query match that indicates mobile/tablet width
const isDesktop = window.matchMedia('(min-width: 900px)');

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections);
      navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections);
      nav.querySelector('button').focus();
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleAllNavSections(navSections, false);
    } else if (!isDesktop.matches) {
      // eslint-disable-next-line no-use-before-define
      toggleMenu(nav, navSections, false);
    }
  }
}

/**
 * Returns the top-level <ul> within a container — the outermost list not nested
 * inside an <li>. Resilient to how the content source wraps lists.
 * @param {Element} container
 * @returns {HTMLUListElement|null}
 */
function getTopLevelList(container) {
  if (!container) return null;
  const lists = [...container.querySelectorAll('ul')];
  return lists.find((ul) => !ul.parentElement?.closest('li')) || lists[0] || null;
}

/**
 * Returns the direct <li> children of a container's top-level list.
 * @param {Element} container
 * @returns {HTMLLIElement[]}
 */
function getTopLevelItems(container) {
  const list = getTopLevelList(container);
  return list ? [...list.children].filter((el) => el.tagName === 'LI') : [];
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  getTopLevelItems(sections).forEach((section) => {
    section.setAttribute('aria-expanded', expanded);
  });
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  document.body.style.overflowY = (expanded || isDesktop.matches) ? '' : 'hidden';
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  toggleAllNavSections(navSections, expanded || isDesktop.matches ? 'false' : 'true');
  if (button) button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');

  if (!expanded || isDesktop.matches) {
    window.addEventListener('keydown', closeOnEscape);
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

/**
 * Fetch the nav fragment. Localhost / aem up serves it at /content/nav.plain.html;
 * DA/EDS production serves it at `${navPath}.plain.html`.
 * @param {string} navPath
 * @returns {Promise<string>}
 */
async function fetchNav(navPath) {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) {
    resp = await fetch(`${navPath}.plain.html`);
  }
  return resp.ok ? resp.text() : '';
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const navMeta = block.closest('.header-wrapper')?.dataset?.navPath;
  const navPath = navMeta || '/nav';
  const html = await fetchNav(navPath);

  const fragment = document.createElement('div');
  fragment.innerHTML = html;

  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  // Classify the top-level sections by CONTENT rather than by position, since
  // DA can drop/reorder wrapper divs. Brand = block whose only meaningful
  // content is a linked image; sections = the block with the most top-level
  // list items; tools = the remaining list block (Check in + language).
  const blocks = [...nav.children];
  const isBrandBlock = (el) => {
    const links = el.querySelectorAll('a');
    return el.querySelector('img') && links.length <= 1 && !el.querySelector('h1, h2, h3, h4, h5, h6');
  };
  const listItemCount = (el) => getTopLevelItems(el).length;
  // A block whose items open sub-menus is the main nav even when another block
  // has an equal (or greater) count of flat links (e.g. a utility bar).
  const submenuCount = (el) => getTopLevelItems(el)
    .filter((li) => li.querySelector(':scope > ul')).length;

  let navBrand = blocks.find(isBrandBlock);
  const remaining = blocks.filter((el) => el !== navBrand);
  remaining.sort((a, b) => {
    const bySub = submenuCount(b) - submenuCount(a);
    if (bySub !== 0) return bySub;
    return listItemCount(b) - listItemCount(a);
  });
  let navSections = remaining[0];
  const navTools = remaining.find((el) => el !== navSections && getTopLevelList(el));

  if (!navBrand) [navBrand] = blocks;
  if (!navSections) [, navSections] = blocks;

  if (navBrand) navBrand.classList.add('nav-brand');
  if (navSections) navSections.classList.add('nav-sections');
  if (navTools && navTools !== navSections) navTools.classList.add('nav-tools');

  const sectionsList = getTopLevelList(navSections);
  if (sectionsList) sectionsList.classList.add('nav-sections-list');
  const toolsList = navTools && navTools !== navSections ? getTopLevelList(navTools) : null;
  if (toolsList) toolsList.classList.add('nav-tools-list');

  // Tag the "Outages and Maintenance" utility item so CSS can pin it to the
  // left of the purple bar (the source keeps it opposite the other links).
  if (toolsList) {
    const outages = [...toolsList.children].find(
      (li) => /outages/i.test(li.textContent),
    );
    if (outages) outages.classList.add('nav-tools-outages');
  }

  // Highlight the top-level nav item matching the current page's section.
  // Pages under /help-and-support/ keep HELP & SUPPORT active.
  if (sectionsList) {
    const path = window.location.pathname;
    getTopLevelItems(navSections).forEach((li) => {
      const label = (li.querySelector(':scope > a, :scope > p')?.textContent || '').trim().toLowerCase();
      if (/help\s*&?\s*support/.test(label) && path.includes('/help-and-support/')) {
        li.classList.add('nav-active');
      }
    });
  }

  // Main nav items: mark items with a sub-menu as mega-menu triggers.
  if (navSections) {
    getTopLevelItems(navSections).forEach((navSection) => {
      const submenus = [...navSection.querySelectorAll(':scope > ul')];
      const submenu = submenus[0];
      if (submenu) {
        navSection.classList.add('nav-drop');
        submenu.classList.add('nav-mega');
        // Wrap the dropdown lists in a mega-panel with a "Select a category"
        // heading. The first <ul> is the category-tile grid; a second <ul> (if
        // present) is the promo CTA row.
        const panel = document.createElement('div');
        panel.className = 'nav-mega-panel';
        const heading = document.createElement('p');
        heading.className = 'nav-mega-heading';
        heading.textContent = 'Select a category for support';
        submenu.parentElement.insertBefore(panel, submenu);
        panel.append(heading);
        submenus.forEach((ul, i) => {
          panel.append(ul);
          ul.classList.add(i === 0 ? 'nav-mega-tiles' : 'nav-mega-cta');
        });
        // Normalize the promo CTA cards so their layout is resilient to how the
        // content source delivers the markup. Locally the card is
        // <strong>…</strong><span>…</span><img>, but Document Authoring strips
        // the <span> (leaving a bare text node) and wraps the arrow <img> in a
        // <picture>. The CSS grid targets a direct-child <img> and a <span>, so
        // rebuild that structure here.
        const cta = panel.querySelector('.nav-mega-cta');
        if (cta) {
          cta.querySelectorAll(':scope > li > a').forEach((cardLink) => {
            // Unwrap any <picture> around the arrow so the <img> is a direct
            // grid child again.
            cardLink.querySelectorAll('picture').forEach((pic) => {
              const pImg = pic.querySelector('img');
              if (pImg) pic.replaceWith(pImg);
              else pic.remove();
            });
            // Wrap the bare description text node(s) in a <span>.
            [...cardLink.childNodes].forEach((node) => {
              if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                const span = document.createElement('span');
                span.textContent = node.textContent.trim();
                node.replaceWith(span);
              }
            });
          });
        }
      }
      navSection.setAttribute('aria-expanded', 'false');
      navSection.addEventListener('click', (e) => {
        // Let real link clicks (leaf items) navigate; only toggle when clicking
        // the top-level trigger itself.
        const topLink = navSection.querySelector(':scope > a');
        if (topLink && topLink.contains(e.target) && topLink.getAttribute('href') !== '#!') return;
        if (submenu && (!topLink || topLink.getAttribute('href') === '#!')) {
          e.preventDefault();
        }
        if (!submenu) return;
        if (isDesktop.matches) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          toggleAllNavSections(navSections);
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        } else if (e.target.closest(':scope > a, :scope > p, :scope > .nav-drop-toggle')
          || e.target === navSection) {
          const expanded = navSection.getAttribute('aria-expanded') === 'true';
          navSection.setAttribute('aria-expanded', expanded ? 'false' : 'true');
        }
      });
    });

    // Desktop: open mega-menu on hover, with a short close delay so the pointer
    // can travel from the trigger to the panel without it snapping shut.
    let closeTimer;
    getTopLevelItems(navSections).forEach((navSection) => {
      navSection.addEventListener('mouseenter', () => {
        if (!isDesktop.matches || !navSection.classList.contains('nav-drop')) return;
        clearTimeout(closeTimer);
        // close any other open item, then open this one
        getTopLevelItems(navSections).forEach((s) => {
          if (s !== navSection) s.setAttribute('aria-expanded', 'false');
        });
        navSection.setAttribute('aria-expanded', 'true');
      });
      navSection.addEventListener('mouseleave', () => {
        if (!isDesktop.matches) return;
        clearTimeout(closeTimer);
        closeTimer = setTimeout(() => {
          navSection.setAttribute('aria-expanded', 'false');
        }, 200);
      });
    });
  }

  // Tools dropdown (language) — toggle open on click.
  if (navTools && navTools !== navSections) {
    const toolItems = getTopLevelItems(navTools);
    toolItems.forEach((item) => {
      if (!item.querySelector('ul')) return;
      item.classList.add('nav-tools-drop');
      item.setAttribute('aria-expanded', 'false');
      item.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const expanded = item.getAttribute('aria-expanded') === 'true';
        toolItems.forEach((i) => i.setAttribute('aria-expanded', 'false'));
        item.setAttribute('aria-expanded', expanded ? 'false' : 'true');
      });
    });
    document.addEventListener('click', (e) => {
      if (!navTools.contains(e.target)) {
        toolItems.forEach((i) => i.setAttribute('aria-expanded', 'false'));
      }
    });
  }

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => toggleMenu(nav, navSections));
  nav.prepend(hamburger);
  nav.setAttribute('aria-expanded', 'false');

  // set initial state and keep it correct across viewport changes
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => toggleMenu(nav, navSections, isDesktop.matches));

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);
  block.append(navWrapper);
}
