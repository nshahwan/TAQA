# TAQA Help & Support — AEM content package

Installable AEM content package for the migrated **Help & Support** page.

## What's in it

- **`taqa-help-and-support-content.zip`** — a vault (FileVault) content package that
  installs the page at **`/content/taqa/help-and-support`** as an xwalk / Universal
  Editor page.
- **`help-and-support.jcr.xml`** — the raw JCR XML (same content as inside the zip),
  for reference / diffing.

The page contains all migrated blocks with their Universal Editor models:
`hero-support`, `carousel-quicklink`, `columns-appbanner` (native columns),
`carousel-tips`, `accordion-faq` (**104 Q&A across 5 category tabs**), and
`cards-support` (dark section). Page title/description metadata is included.

Images are referenced by absolute URL and resolve at render time, so no DAM
package is required for the page to display.

## Install (AEM Package Manager)

1. Open **AEM author** → **Tools → Deployment → Package Manager**
   (`/crx/packmgr/index.jsp`).
2. **Upload Package** → choose `taqa-help-and-support-content.zip`.
3. **Install**. It writes to `/content/taqa/help-and-support`
   (filter root — nothing else is touched).
4. Open the page in **Universal Editor** to author it. It also serves at
   **`/help-and-support`** via the `paths.json` mapping once previewed/published.

## Package structure

```
jcr_root/content/taqa/help-and-support/.content.xml   ← the page (cq:Page)
META-INF/vault/filter.xml                             ← filter root
META-INF/vault/properties.xml                         ← package metadata
```

## Regenerating

The zip is produced from `content/index.plain.html` by:

```
node tools/importer/build-jcr.mjs content/index.plain.html <out>.jcr.xml
```

which converts the decorated block-table HTML to xwalk JCR via
`@adobe/helix-md2jcr`, then the JCR is packaged into the vault zip above.
