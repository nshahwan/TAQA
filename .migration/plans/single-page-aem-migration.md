# flyadeal Search Flight — Single Page Migration to AEM

## Overview

| Field | Value |
|-------|-------|
| **Goal** | Migrate a page to AEM Edge Delivery Services |
| **Source URL** | https://www.flyadeal.com/en/search-flight |
| **Project type** | Document Authoring (`da`) — reused from prior work (`.migration/project.json`) |
| **Mode** | Single Page |
| **New site** | ⚠️ flyadeal is a **different domain** than the prior Air Arabia work |

This plan migrates the flyadeal "Search Flight" page end-to-end (content → blocks → optional design), following the same proven single-page workflow.

## Important considerations for this specific page

- **New source site (flyadeal.com):** Prior Air Arabia infrastructure (`airarabia-cleanup`/`airarabia-sections` transformers, brand tokens, header/footer) is **site-specific and won't apply**. This migration needs its own template, parsers, and transformers. I'll confirm whether flyadeal is also behind a bot-blocking firewall during Site Analysis; if so, I'll use the authenticated full-browser session as before.
- **"Search Flight" is likely a booking/search page** — it probably centers on an interactive flight-search **form/widget** (origin, destination, dates, passengers). Interactive booking widgets usually can't be migrated as static content; that portion is typically captured as a placeholder/embed or left for a functional integration. I'll assess this in Page Analysis and flag exactly what's static content vs. app widget.
- A **forms migration plugin** is available if the page contains a genuine HTML form we want converted to an Adaptive Form — I'll only raise this if analysis shows it's warranted.

## Migration Steps

1. **Project setup (reuse/confirm)** — Confirm `.migration/project.json` (type `da`); reconfirm block library. No re-detection expected.
2. **Site analysis** — Load the URL (full-browser session if firewalled), extract structural skeleton, create a new `flyadeal-search` (or similar) template in `tools/importer/page-templates.json`.
3. **Page analysis** — Produce artifacts in `migration-work/` (metadata, cleaned HTML, screenshot, images, page structure, authoring decisions). Classify each section: default content, block, or interactive widget (search form).
4. **Block mapping** — Populate the template's `blocks[]`/`sections[]` with DOM selectors and section styles.
5. **Import infrastructure** — Generate flyadeal-specific parsers + a cleanup/sections transformer (skip Dynamic Media steps unless DM URLs are present).
6. **Content import** — Generate the import script, bundle, run the bulk import → `content/*.plain.html`.
7. **Preview & verify** — Check the rendered page at the local preview (`/content/...`), compare to the source, fix parser/transformer issues.
8. **(Optional) Design migration** — Extract flyadeal brand tokens and style any new block variants, then visually verify.

## Checklist

- [ ] Confirm/reuse project setup (`.migration/project.json`)
- [ ] Site analysis — new flyadeal template skeleton + `visual-trees.json`
- [ ] Page analysis — artifacts in `migration-work/` (flag search widget vs. static content)
- [ ] Block mapping — populate `blocks[]`/`sections[]`
- [ ] Import infrastructure — flyadeal parsers + transformers
- [ ] Content import — import script + bulk import → `content/*.plain.html`
- [ ] Preview & verify rendered content against the source
- [ ] (Optional) Design migration for new blocks

## Notes

- **Execution requires Execute mode** — approving this plan switches modes so I can run the steps.
- **Migration-work will be overwritten:** the `migration-work/` artifacts currently hold the Air Arabia page; they'll be regenerated for flyadeal. The prior Air Arabia page/blocks/header/footer stay intact.
- **Reused conventions:** content served under `/content`; `content/` is git-excluded (only `blocks/`, `styles/`, `head.html` travel via git); Document Authoring flattens nested wrapper `<div>`s, so block JS should rebuild structure from semantic content.
- **Still pending (separate):** the Air Arabia **handover PDF** was requested earlier and not yet generated — available whenever you want it.
