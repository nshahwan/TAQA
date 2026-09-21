/* eslint-disable */
/* global WebImporter */

/**
 * Crosswalk (Universal Editor) import transform.
 *
 * Source = the already-migrated Edge Delivery pages served as `.plain.html`
 * (authored block structure, before client-side decoration). Because the
 * source site and this repo share the same blocks, the block DOM already maps
 * 1:1 to the component models in component-definition/models/filters.json — so
 * this transform is almost an identity: return the body, fix media URLs, and
 * synthesize page metadata (the `.plain.html` fragment has no <head>).
 */
export default {
  transform: (payload) => {
    const { document, params } = payload;
    const url = params.originalURL;
    const main = document.body;

    // Resolve EDS relative media URLs (./media_x.png) to absolute source URLs
    try {
      WebImporter.rules.adjustImageUrls(main, url, url);
    } catch (e) {
      // no-op — best effort
    }

    // Derive the AEM page path from the source URL (strip .plain.html).
    // The AEM site roots content at /content/taqa/en (see paths.json mapping
    // "/content/taqa/en:/"), so prefix the source pathname with /en. Combined
    // with siteName "taqa" the importer lands pages at /content/taqa/en/<path>,
    // which serves back at the original /addc/... URLs.
    const sourcePath = new URL(url).pathname
      .replace(/\.plain\.html$/, '')
      .replace(/\.html$/, '')
      .replace(/\/$/, '') || '/index';
    const path = `/en${sourcePath}`;

    // Title from the first heading (.plain.html has no <head> to read)
    const heading = main.querySelector('h1, h2');
    const title = heading ? heading.textContent.trim() : path.split('/').pop();

    const table = WebImporter.DOMUtils.createTable([
      ['Metadata'],
      ['Title', title],
    ], document);
    main.append(table);

    return [{
      element: main,
      path,
      report: { title },
    }];
  },
};
