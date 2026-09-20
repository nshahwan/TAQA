# TAQA — AEM Sites (Universal Editor) Demo Environment

Edge Delivery Services project migrated from **da.live document authoring** to
**AEM Sites with the Universal Editor** (crosswalk / content-driven authoring).

Content is authored in AEM as a Cloud Service and delivered through Edge Delivery.

## Environments
- Author (Universal Editor): https://author-p208666-e2179906.adobeaemcloud.com/
- Preview: https://main--TAQA--nshahwan.aem.page/
- Live: https://main--TAQA--nshahwan.aem.live/

## What changed in the migration

- **Component models** — every block now ships a `_<block>.json` (definitions /
  models / filters) next to its JS/CSS, describing how it is authored in the
  Universal Editor.
- **Generated definitions** — `models/` holds the base content models and the
  three merge sources that glob `blocks/*/_*.json`. `npm run build:json` merges
  them into the root `component-definition.json`, `component-models.json` and
  `component-filters.json` that AEM reads.
- **Instrumentation** — `scripts/scripts.js` exports `moveInstrumentation`, and
  blocks that restructure their DOM (cards, carousels, accordion) call it so
  authored items stay editable in the Universal Editor. `scripts/aem.js` is the
  UE-aware boilerplate build.
- **Content mount** — `fstab.yaml` points the `/` mountpoint at the AEM author
  environment's `franklin.delivery` endpoint; `paths.json` maps `/content/` and
  `/content/dam/`.

## Installation

```sh
npm i
```

## Build component models

Run this whenever you add or change a block model (`blocks/*/_*.json`) or a base
model in `models/`. It regenerates the root `component-*.json` files, which are
committed and read by AEM.

```sh
npm run build:json
```

## Linting

`lint:js` also validates the component models via `eslint-plugin-xwalk`.

```sh
npm run lint
```

## Local development

1. Add the [AEM Code Sync GitHub App](https://github.com/apps/aem-code-sync) to this repository.
2. Connect the repository in AEM (Universal Editor) so authored content resolves against `author-p208666-e2179906.adobeaemcloud.com`.
3. Install the [AEM CLI](https://github.com/adobe/helix-cli): `npm install -g @adobe/aem-cli`
4. Start AEM Proxy: `aem up` (opens `http://localhost:3000`).
5. Open the project in your IDE and start coding.

## Documentation

- [Developer Tutorial](https://www.aem.live/developer/tutorial)
- [Anatomy of a Project](https://www.aem.live/developer/anatomy-of-a-project)
- [Authoring with the Universal Editor](https://www.aem.live/developer/component-model-definitions)
- [Web Performance](https://www.aem.live/developer/keeping-it-100)
