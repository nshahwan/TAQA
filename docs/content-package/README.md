# TAQA Help & Support — AEM content package

Installable AEM content package for the migrated **Help & Support** page.

## What's in it

- **`taqa-help-and-support-content.zip`** — a vault (FileVault) content package that
  installs the page at **`/content/taqa/en/help-and-support/transfer`** as an xwalk /
  Universal Editor page. The `en` and `help-and-support` ancestors are included as
  minimal `cq:Page` nodes with `merge` filters, so they are created only if missing
  and existing content is never clobbered.
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
3. **Install**. It writes the page at `/content/taqa/en/help-and-support/transfer`
   (page filter root — nothing else under it is touched; the `en` and
   `help-and-support` ancestors use `merge`, so siblings are left intact).
4. Open the page in **Universal Editor** to author it. It also serves at
   **`/help-and-support/transfer`** via the `paths.json` mapping once
   previewed/published.

## Package structure

```
jcr_root/content/taqa/en/.content.xml                                  ← ancestor (cq:Page, merge)
jcr_root/content/taqa/en/help-and-support/.content.xml                 ← ancestor (cq:Page, merge)
jcr_root/content/taqa/en/help-and-support/transfer/.content.xml        ← the page (cq:Page)
META-INF/vault/filter.xml                                              ← filter roots
META-INF/vault/properties.xml                                          ← package metadata
```

## Regenerating

The zip is produced from `content/index.plain.html` by:

```
node tools/importer/build-jcr.mjs content/index.plain.html <out>.jcr.xml
```

which converts the decorated block-table HTML to xwalk JCR via
`@adobe/helix-md2jcr`, then the JCR is packaged into the vault zip above.
