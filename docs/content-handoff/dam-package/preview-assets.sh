#!/usr/bin/env bash
# Post-install: trigger EDS preview for the DAM assets + the page, then verify.
# Run AFTER taqa-dam-assets.zip is installed in the AEM author DAM (/content/dam/taqa).
# Requires the admin.hlx.page auth that the platform injects (or `aem` CLI login).
set -euo pipefail

ORG=nshahwan
SITE=TAQA
BRANCH=main
ADMIN="https://admin.hlx.page"
DAM="content/dam/taqa"

ASSETS=(
  app-store-badge.png
  footer-appstore.png
  footer-playstore.png
  footer-taqa-distribution.png
  footer-taqa-group-company.png
  google-play-badge.png
  hero-help-support.png
  support-call.svg
  support-chat.svg
  support-location.svg
  support-video.svg
  taqa-logo.svg
  tip-air-conditioning.png
  tip-efficient-lighting.png
  tip-save-electricity.png
  tip-save-water-home.png
  tip-save-water-outside.png
  tip-water-usage.png
  tip-wise-appliances.png
)

echo "=== 1. Preview each DAM asset ==="
for a in "${ASSETS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$ADMIN/preview/$ORG/$SITE/$BRANCH/$DAM/$a")
  echo "  preview $code  /$DAM/$a"
done

echo "=== 2. Re-preview the pages that reference them ==="
for p in "index" "addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$ADMIN/preview/$ORG/$SITE/$BRANCH/$p")
  echo "  preview $code  /$p"
done

echo "=== 3. Verify assets resolve on preview delivery (expect 200) ==="
for a in "${ASSETS[@]}"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "https://$BRANCH--taqa--$ORG.aem.page/$DAM/$a")
  echo "  deliver $code  /$DAM/$a"
done

echo "=== 4. (Optional) Publish to live — uncomment when preview looks right ==="
# for a in "${ASSETS[@]}"; do
#   curl -s -X POST "$ADMIN/live/$ORG/$SITE/$BRANCH/$DAM/$a" >/dev/null && echo "  published /$DAM/$a"
# done
# for p in "index" "addc/en-us/residential/help-and-support/transfer-and-removal-of-electricity-services"; do
#   curl -s -X POST "$ADMIN/live/$ORG/$SITE/$BRANCH/$p" >/dev/null && echo "  published /$p"
# done

echo "Done. Any 200s in step 3 mean the images now render."
