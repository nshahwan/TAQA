# DAM Assets Content Package

`taqa-dam-assets.zip` is a ready-to-install AEM content package containing the
**19 migrated image assets** (every asset the index / help-and-support page and
its nav + footer reference), targeting **`/content/dam/taqa`**. This now includes
the hero banner and the app-promo store badges that the index page uses, in
addition to the nav logo, footer images, support-card icons, and tip icons.

## Contents

**Package format:** proper AEM `dam:Asset` nodes — each asset is a
`dam:Asset` with `jcr:content/renditions/original` (the binary) and mimetype
metadata, so Package Manager install produces real, browsable DAM assets (not
raw `nt:file` nodes). Validated: 19 asset nodes, 19 original renditions, 20
`.content.xml` (1 folder + 19 assets), all well-formed.

```
jcr_root/content/dam/taqa/
  .content.xml                     ← sling:Folder
  <asset>/.content.xml             ← dam:Asset node (per asset)
  <asset>/_jcr_content/renditions/original  ← binary (per asset)

  taqa-logo.svg                    ← header/nav logo
  footer-appstore.png              ← footer App Store badge
  footer-playstore.png             ← footer Google Play badge
  footer-taqa-group-company.png    ← footer "A TAQA Group Company" logo
  footer-taqa-distribution.png     ← footer TAQA Distribution wordmark
  support-chat.svg                 ← support cards: CHAT WITH US
  support-video.svg                ← support cards: CONNECT VIA VIDEO
  support-call.svg                 ← support cards: CALL US
  support-location.svg             ← support cards: FIND A LOCATION
  tip-air-conditioning.png         ← energy-tips carousel icons (7)
  tip-save-electricity.png
  tip-efficient-lighting.png
  tip-wise-appliances.png
  tip-save-water-home.png
  tip-save-water-outside.png
  tip-water-usage.png
META-INF/vault/filter.xml          ← filter root: /content/dam/taqa
META-INF/vault/properties.xml      ← name=taqa-dam-assets, group=taqa
```

## Why this package exists

The content fragments (`nav.plain.html`, `footer.plain.html`) and the imported
page reference these images by relative path (`images/<file>`). On this **xwalk**
project the delivery source is the **AEM Cloud Service author DAM**
(`aemAssetsFolderPath: /content/dam/TAQA`), so the assets must live in the author
DAM to be served on preview/live.

The migration environment can reach `admin.hlx.page` and `admin.da.live` (the
assets were staged to DA), but **cannot write to the author instance**
(`author-p208666-e2179906.adobeaemcloud.com` returns 401 — it's outside the
injected credential scope). This package hands the assets off for an
author-authenticated install.

## Install (requires AEM author access)

**Package Manager UI:**
1. Open `https://author-p208666-e2179906.adobeaemcloud.com/crx/packmgr`
2. Upload Package → `taqa-dam-assets.zip` → Install
3. Verify the 16 assets under `/content/dam/taqa`

**CLI (aem-import-helper):**
```bash
aem-import-helper aem upload \
  --zip docs/content-handoff/dam-package/taqa-dam-assets.zip \
  --target https://author-p208666-e2179906.adobeaemcloud.com \
  --token <IMS-token>
```

## After install

Once the assets are in the DAM, confirm they serve on preview:
`https://main--taqa--nshahwan.aem.page/content/dam/taqa/taqa-logo.svg` (or the
path your block references). If the blocks reference site-root `images/…`, ensure
that path maps to the DAM folder, or adjust the references to the DAM path.

> Casing note: `aemAssetsFolderPath` is `/content/dam/TAQA` (uppercase) in
> `.migration/project.json`, while paths.json currently uses `/content/dam/en`.
> Install to whichever DAM path your site actually serves from and keep the block
> image references consistent with it.
