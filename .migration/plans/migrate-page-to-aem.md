# Migration Plan: Air Arabia "Flying with Convenience" Page

## Overview

| Field | Value |
|-------|-------|
| **Mode** | Single Page |
| **Source URL** | https://www.airarabia.com/en/plan/flying-with-us/flying-with-convenience |
| **Project Type** | Document Authoring (da) — already detected in `.migration/project.json` |
| **Target** | AEM Edge Delivery Services |

This plan migrates one new page. The project is already set up from the earlier session (project type `da`, library endpoint configured), so Project Setup can be reused rather than redone. Site Analysis / Page Analysis / Block Mapping / Infrastructure / Import will all run fresh for this new URL.

> Note: A prior migration of a different page (hand-baggage help article) is paused at the Import Infrastructure step. This plan does **not** touch that work; artifacts in `migration-work/` will be regenerated for the new URL. If you later want to keep both pages, we should treat them as a URL-list migration so their analysis artifacts don't overwrite each other.

## Migration Steps

1. **Project Setup (reuse)** — Confirm `.migration/project.json` (type `da`, library URL). No sub-agent rerun needed unless config changed.
2. **Site Analysis** — Resize browser to 1440×900, navigate to the URL, dismiss cookie banner, extract structural skeleton. Group into a template (likely a new `plan-article` or similar content template). Write `tools/importer/page-templates.json` + `migration-work/visual-trees.json`. Validate against schema.
3. **Page Analysis** — Dispatch the page-analysis sub-agent to produce `metadata.json`, `screenshot.png`, `cleaned.html`, `images/`, `page-structure.json`, `authoring-analysis.json`. Identify sections, default content vs. blocks, and any new block variants. (Air Arabia is behind an IDO Edge Firewall that 403s headless scrapers — a full-browser Playwright session is used to recover content, as in the prior page.)
4. **Block Mapping** — Populate the template's `blocks[]` and `sections[]` with DOM selectors and section styles; record `metadata.projectType`. Validate against schema.
5. **Import Infrastructure** — Generate `tools/importer/transformers/*.js` (site-wide cleanup + sections) and `tools/importer/parsers/*.js` (one per block variant, if any). Skip Dynamic Media / Scene7 steps unless DM URLs are detected in the image mapping. No `import.js` created here.
6. **Content Import** — Generate the import script for the template, run the bulk import, and produce `content/*.plain.html` + an import report.
7. **Preview & verify** — Check the rendered page in the local preview, compare structure to the source, and confirm content landed correctly (unstyled at this stage — design migration is a separate follow-up).

## Checklist

- [ ] 1. Confirm/reuse project setup (`.migration/project.json`)
- [ ] 2. Site Analysis — skeleton extraction + template skeleton (`page-templates.json`, `visual-trees.json`)
- [ ] 3. Page Analysis — analysis artifacts in `migration-work/` (+ any new block variant code)
- [ ] 4. Block Mapping — populate `blocks[]`/`sections[]` selectors + `projectType`
- [ ] 5. Import Infrastructure — transformers (and parsers if blocks exist)
- [ ] 6. Content Import — import script + bulk import → `content/*.plain.html` + report
- [ ] 7. Preview & verify rendered content against the source

## Decisions / Assumptions

- **Single new page**, targeting `flying-with-convenience`. The paused hand-baggage migration is left as-is.
- Reusing the existing `da` project configuration; no re-detection unless you want it.
- Design/styling is **out of scope** for this run — content structure only. Design migration can follow once content looks right.

## Notes

- Execution requires **Execute mode** — this plan only describes the work; approving it will switch out of plan mode so I can run the steps.
- If you'd rather preserve both the hand-baggage and flying-with-convenience pages together, tell me and I'll re-frame this as a 2-URL list migration so neither page's analysis artifacts clobber the other.
