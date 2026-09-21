# Content import: Edge Delivery → AEM crosswalk (Universal Editor)

Migrating the code (blocks + component models) does **not** move content. The
original demo pages were authored in da.live and live on
`main--demoenvironment--lmanning2.aem.live`. This step imports them into AEM as
a Cloud Service as Universal-Editor-editable content under `/content/taqa/en`
(the site root created by the AEM Create-Site wizard — see `paths.json`).

Because the source site and this repo use the **same blocks**, the authored
`.plain.html` block structure maps 1:1 to the component models — so the import
is essentially a structural copy.

## Files

- `urls-xwalk.txt` — source pages to import, as `.plain.html` (authored block
  structure, before client-side decoration).
- `import-xwalk.js` — near-identity transform: returns the body, resolves media
  URLs, synthesizes page metadata.

## Step 1 — Generate the JCR content package (needs the Import-as-a-Service key)

The crosswalk import runs through Adobe's hosted Import-as-a-Service. Set the
API key (Adobe-internal; request from the AEM Import-as-a-Service team), then:

```sh
export AEM_IMPORT_API_KEY=your-import-api-key
npm run import:xwalk
```

Output: `import-result.zip` (JCR pages) + `asset-mapping.json` (DAM assets).

## Step 2 — Upload the package to AEM

Get a **development token** from your AEM author Developer Console, save it to
`token.txt`, then:

```sh
npm run import:upload
```

This installs the package (pages appear under `/content/taqa/en`) and uploads
the images to the DAM. Open
`/content/taqa/en/addc/en-us/residential/overview` (etc.) in the Universal
Editor and Publish.

> Target env is hard-coded to `author-p208666-e2179906.adobeaemcloud.com` in the
> `import:upload` script — change it there if the environment changes.
