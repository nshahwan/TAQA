# TAQA Help & Support — Content Ingest Hand-off

This package contains everything needed to ingest the migrated **Help & Support**
page (and its nav + footer) into the **AEM Cloud Service author instance** for
this xwalk / Universal Editor project, so it can be previewed and published.

The **code** side (blocks, scripts, styles) is already committed to `main` and
live on the preview environment — this hand-off is only for the **content**
ingest, which requires direct access to the AEM author instance.

---

## ⚠️ Known symptom: `index` missing from "Create content package"

The publishing UI's **"Create content package"** dialog lists only `addc`,
`footer`, and `nav` — **`index` does not appear**, so the migrated home page
cannot be selected/published.

**Why:** the dialog reads its page list from the **AEM sync backend**, which was
only populated for pages registered by an earlier authenticated content-sync
(`addc` = the first import of this page at its deep path; plus `footer`/`nav`).
The corrected, final page is `content/index.plain.html`, but it was written
locally and **never registered with the backend**. Editing the local
`content-sync.json` record does not propagate to the backend — registration only
happens through the authenticated content-sync run.

**Also note — `addc` is stale:** the file
`content/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services.plain.html`
is the **first-import version** (before parser fixes, the footer-leak fix, and
the 5-category FAQ). Do **not** publish `addc` as-is; the correct content is in
`content/index.plain.html`.

**Fix (run with author/sync access):**
1. Point the content-sync tool at this `content/` directory and run it. The
   local `content-sync.json` already lists `index.plain.html` with its current
   hash, so the sync will register the home page with the backend.
2. Delete the stale deep-path file so it stops appearing as `addc`:
   `content/addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services.plain.html`
   (deletions under `content/` were blocked in the migration environment).
3. Reopen "Create content package" — `index` now appears; `addc` is gone.
4. Select `index` (+ `footer`, `nav`) → Preview & Publish.

Map `index` to the site home: `/content/TAQA/en` → webPath `/` (see paths.json).

---

## Why this hand-off exists

- **Project type:** `xwalk` (Universal Editor). Content lives as JCR nodes in the
  AEM Cloud Service **author instance**
  (`author-p208666-e2179906.adobeaemcloud.com`), authored via Universal Editor —
  not as `.plain.html`/`.md` files served directly.
- The migration produced validated **decorated HTML** (`content/*.plain.html`),
  but converting that to **block-preserving JCR** and writing it into the author
  instance needs the **server-side xwalk import tooling** + authenticated author
  access. Those aren't available from the migration environment (the injected
  `admin.hlx.page` / `da.live` credentials do **not** cover the `adobeaemcloud.com`
  author host).
- A local dry-run confirmed the offline `html → md → md2jcr` path **flattens the
  blocks** (0 block components). So this package hands the validated inputs to
  someone/something with author access to complete the ingest correctly.

---

## Package contents

```
handoff/
├── README.md                      ← this file
├── content/
│   ├── index.plain.html           ← the main page (all 6 blocks, decorated EDS DOM)
│   ├── nav.plain.html             ← header/navigation fragment
│   ├── footer.plain.html          ← footer fragment
│   └── images/                    ← all 16 local assets (logo, badges, tip + support icons)
└── models/
    ├── _hero-support.json         ← per-block UE models (definitions + models + filters)
    ├── _cards-quicklink.json
    ├── _app-promo.json
    ├── _carousel-tips.json
    ├── _accordion-faq.json
    ├── _cards-support.json
    ├── component-models.json      ← merged UE models (build:json output)
    ├── component-definition.json  ← merged UE component definitions
    └── component-filters.json     ← merged UE filters
```

## Target

- **Org / Site / Branch:** `nshahwan` / `TAQA` / `main`
- **AEM author instance:** `author-p208666-e2179906.adobeaemcloud.com`
- **AEM site path:** `/content/TAQA`
- **Page path:** map `index.plain.html` → the site's home/index page
  (webPath `/`, resourcePath `/index`).
- **Preview after ingest:** `https://main--taqa--nshahwan.aem.page/`
- **Publish target:** `https://main--taqa--nshahwan.aem.live/`

---

## Blocks on the page (in order)

| # | Block (template name) | Model | Notes |
|---|---|---|---|
| 1 | Hero Support | `hero-support` | image + richtext (eyebrow, H1, intro) |
| 2 | Cards Quicklink | `cards-quicklink` (item `cards-quicklink-card`) | 6 quick-link cards; renders as horizontal carousel |
| 3 | App Promo | `app-promo` | teal→green gradient band + app-store badges |
| 4 | Carousel Tips | `carousel-tips` (item `carousel-tips-slide`) | 7 energy-saving-tip slides |
| 5 | Accordion Faq | `accordion-faq` (item `accordion-faq-item`) | **5 categories**, 39 Q&A items (question/answer/category) |
| 6 | Cards Support | `cards-support` (item `cards-support-card`) | 4 support cards on dark section (`Section Metadata: style=dark`) |

The FAQ section also carries default content: the "LOOKING FOR ANSWERS?" intro
(left column) and the "WE ARE HERE TO HELP" link panel (right column).

---

## How to complete the ingest (author-side)

Use whichever xwalk import path your team runs against the author instance:

### Option A — Universal Editor import tooling (recommended)
1. Point the AEM xwalk import tool at `content/index.plain.html` (+ `nav`, `footer`),
   supplying the models in `models/` so blocks are recognised.
2. Upload the assets in `content/images/` to the DAM under
   `/content/dam/TAQA/help-and-support/` (or your convention), and update the
   image references if your tooling rewrites them.
3. Let the tool convert to JCR (`html2md` → `@adobe/helix-md2jcr`, using the
   per-block `_<name>.json` models) and write the pages under `/content/TAQA`.

### Option B — md2jcr + package upload
1. Generate block-table markdown for each page (the authored `+---+` gridtable
   form — the AEM import service does this from the source page structure).
2. `md2jcr <page>.md --ue-files models/` → JCR XML per page.
3. Build a JCR content package (`/content/TAQA/...` + DAM assets) and upload it to
   the author instance (`aem-import-helper aem upload --target <author> --token <IMS>`).

> ⚠️ Do **not** feed the decorated `index.plain.html` straight through the offline
> `html→md→md2jcr` path — it flattens the blocks. The blocks are preserved only via
> the author-side import service or from authored gridtable markdown.

---

## After ingest — preview & publish (these DO work with admin.hlx.page creds)

Once the page exists in the author instance:

```bash
# Preview
curl -X POST "https://admin.hlx.page/preview/nshahwan/TAQA/main/index"
# Verify
curl -s "https://admin.hlx.page/status/nshahwan/TAQA/main/index"   # preview.status 200, edit populated
# Publish to production
curl -X POST "https://admin.hlx.page/live/nshahwan/TAQA/main/index"
```

Preview URL: `https://main--taqa--nshahwan.aem.page/`
Live URL:    `https://main--taqa--nshahwan.aem.live/`

---

## Verification checklist (post-ingest)

- [ ] Page renders at the preview URL with all 6 blocks (not flat text)
- [ ] Quick-link cards show as a carousel with prev/next arrows
- [ ] Energy-tips carousel shows 7 slides with icons + LEARN MORE
- [ ] FAQ shows 5 category filter pills (All, All About Metering, Disconnecting
      Your Supply, Emergencies, All about Moving Out) and filters correctly
- [ ] Support cards render on the dark section
- [ ] Header drawer (hamburger) and footer (badges, gradient band, social chips)
      render correctly
- [ ] Images resolve (from DAM or local `images/`)
