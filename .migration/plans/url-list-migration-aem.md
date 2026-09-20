# URL List Migration to AEM

## Overview

| Field | Value |
|-------|-------|
| **Goal** | Migrate a list of URLs to AEM Edge Delivery Services |
| **Mode** | URL List (multi-page) |
| **Project type** | Document Authoring (`da`) — reused from prior work (`.migration/project.json`) |
| **Source URLs** | ⚠️ Awaiting — you chose to paste the list; please send the URLs |

This plan migrates a set of pages end-to-end. URLs are grouped into templates (structurally similar pages share one template), infrastructure is generated per template, and content is imported for all URLs.

## Prerequisites

- **The URL list** — you selected "I'll paste the URLs." Paste them comma- or line-separated. The migration can't start until they're provided.
- Existing project config is reused (`da` project, block library, dev server serving content under `/content`).

## Migration Steps

1. **Project setup (reuse/confirm)** — Confirm `.migration/project.json` (type `da`); reconfirm block library.
2. **Site analysis** — Load each URL (authenticated full-browser session if the site is firewalled), extract structural skeletons, and **group URLs into templates** by structural similarity. Pick a representative URL per template and note coverage gaps. Write `tools/importer/page-templates.json` + `migration-work/visual-trees.json`.
3. **Page analysis** — For each template's representative page (and any gap pages), produce artifacts in `migration-work/`; classify default content vs. blocks vs. interactive widgets; identify new block variants.
4. **Block mapping** — Populate each template's `blocks[]`/`sections[]` with DOM selectors and section styles.
5. **Import infrastructure** — Generate parsers + transformers per template (site-specific cleanup/sections; skip Dynamic Media steps unless DM URLs are present).
6. **Content import** — Per template: generate the import script, bundle, run the bulk import across all its URLs → `content/*.plain.html`.
7. **Preview & verify** — Spot-check rendered pages at the local preview (`/content/...`), compare to sources, fix parser/transformer issues.
8. **(Optional) Design migration** — Extract brand tokens and style new block variants, then visually verify.

## Checklist

- [ ] Obtain the URL list (paste in chat)
- [ ] Confirm/reuse project setup (`.migration/project.json`)
- [ ] Site analysis — group URLs into templates + `visual-trees.json`
- [ ] Confirm which templates/URLs to import (if multiple templates found)
- [ ] Page analysis — artifacts per representative page
- [ ] Block mapping — populate `blocks[]`/`sections[]` per template
- [ ] Import infrastructure — parsers + transformers per template
- [ ] Content import — import scripts + bulk import → `content/*.plain.html`
- [ ] Preview & verify rendered content against sources
- [ ] (Optional) Design migration for new blocks

## Notes

- **Execution requires Execute mode** — approving this plan switches modes so I can run the steps.
- **Blocker:** Please paste the **list of URLs** to migrate. If they span more than one site/domain, tell me — infrastructure (cleanup transformers, brand tokens, header/footer) is site-specific and won't carry across domains.
- **Scope check after grouping:** If Site Analysis finds many templates, I'll confirm whether to import all of them or a subset before running content import.
- **Reused conventions:** content served under `/content`; `content/` is git-excluded (only `blocks/`, `styles/`, `head.html` travel via git); Document Authoring flattens nested wrapper `<div>`s, so block JS should rebuild structure from semantic content.
- **Still pending (separate):** the Air Arabia **handover PDF** requested earlier remains available whenever you want it.
