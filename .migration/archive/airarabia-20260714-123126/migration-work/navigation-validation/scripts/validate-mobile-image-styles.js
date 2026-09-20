#!/usr/bin/env node

/**
 * validate-mobile-image-styles.js
 *
 * CSS dimension parity validation for mobile nav images.
 * Extracts computed styles from the rendered mobile nav and compares
 * against source reference values.
 *
 * Two image types:
 * - Icons (SVG): expected 26px × 26px
 * - Vehicles (webp/avif): expected width:100%, max-width:80%, height:auto, flex-column layout
 *
 * Usage:
 *   node scripts/validate-mobile-image-styles.js \
 *     --migrated-url=http://localhost:3000/content/index \
 *     [--validation-dir=migration-work/navigation-validation]
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { VALIDATION_DIR } from './validation-paths.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function findLocalChromiumExecutable() {
  const localBrowsers = path.resolve(scriptDir, 'playwright-browsers');
  if (!fs.existsSync(localBrowsers)) return null;
  const chromiumDirs = fs.readdirSync(localBrowsers)
    .filter((d) => d.startsWith('chromium-'));
  const candidates = chromiumDirs.flatMap((dir) => [
    path.join(localBrowsers, dir, 'chrome-linux', 'chrome'),
    path.join(
      localBrowsers,
      dir,
      'chrome-mac-arm64',
      'Google Chrome for Testing.app',
      'Contents',
      'MacOS',
      'Google Chrome for Testing',
    ),
  ]);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function sha256(data) {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

function debugLog(validationDir, level, msg) {
  const ts = new Date().toISOString();
  const prefix = {
    ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵',
  }[level] || 'ℹ️';
  const entry = `[${ts}] ${prefix} [SCRIPT:validate-mobile-image-styles] [${level}] ${msg}\n`;
  try {
    if (validationDir && fs.existsSync(validationDir)) {
      fs.appendFileSync(path.join(validationDir, 'debug.log'), entry);
    }
  } catch { /* ignore */ }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let migratedUrl = null;
  let validationDir = VALIDATION_DIR;

  args.forEach((a) => {
    if (a.startsWith('--migrated-url=')) migratedUrl = a.slice(15);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
  });

  return { migratedUrl, validationDir };
}

const SOURCE_REFERENCE = {
  icons: {
    width: '26px',
    height: '26px',
    objectFit: 'contain',
    parentFlexDirection: 'row',
    parentAlignItems: 'center',
  },
  vehicles: {
    maxWidth: '80%',
    height: 'auto',
    parentFlexDirection: 'column',
    parentAlignItems: 'center',
    parentMarginBottom: '20px',
  },
};

async function main() {
  const { migratedUrl, validationDir } = parseArgs();

  if (!migratedUrl) {
    console.error(
      'Usage: node validate-mobile-image-styles.js --migrated-url=<url>',
    );
    process.exit(2);
  }

  const absValidationDir = path.resolve(validationDir);
  if (!fs.existsSync(absValidationDir)) {
    fs.mkdirSync(absValidationDir, { recursive: true });
  }

  debugLog(absValidationDir, 'START', `validate-mobile-image-styles.js — url=${migratedUrl}`);

  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (e) {
    console.error(`Playwright not found: ${e.message}`);
    debugLog(absValidationDir, 'ERROR', `Playwright import failed: ${e.message}`);
    process.exit(2);
  }

  const execPath = findLocalChromiumExecutable();
  const launchOpts = { headless: true };
  if (execPath) launchOpts.executablePath = execPath;

  const browser = await chromium.launch(launchOpts);
  const page = await browser.newPage();
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(migratedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(2000);

  await page.click('.nav-hamburger');
  await page.waitForTimeout(500);

  const imageData = await page.evaluate(() => {
    const panel = document.querySelector('.nav-hamburger-panel');
    if (!panel) return { error: 'No .nav-hamburger-panel found' };

    const subpanels = panel.querySelectorAll('.nav-mobile-subpanel');
    const results = [];

    Array.from(subpanels).forEach((sp) => {
      const backBtn = sp.querySelector('.nav-mobile-back');
      const category = backBtn
        ? backBtn.textContent.replace('‹', '').trim()
        : 'unknown';
      const sublist = sp.querySelector('.nav-mobile-sublist');
      const isVehicle = sublist && sublist.classList.contains('nav-mobile-vehicles');

      const imgs = sp.querySelectorAll('.nav-mobile-sublist a img');
      Array.from(imgs).forEach((img) => {
        const link = img.closest('a');
        const linkStyle = link ? window.getComputedStyle(link) : null;
        const imgStyle = window.getComputedStyle(img);
        const src = img.src.substring(img.src.lastIndexOf('/') + 1);

        results.push({
          category,
          type: isVehicle ? 'vehicle' : 'icon',
          src,
          computed: {
            width: imgStyle.width,
            height: imgStyle.height,
            maxWidth: imgStyle.maxWidth,
            objectFit: imgStyle.objectFit,
          },
          parentLink: linkStyle ? {
            display: linkStyle.display,
            flexDirection: linkStyle.flexDirection,
            alignItems: linkStyle.alignItems,
            marginBottom: linkStyle.marginBottom,
            gap: linkStyle.gap,
          } : null,
        });
      });
    });

    return { images: results };
  });

  await browser.close();

  if (imageData.error) {
    console.error(`  ERROR: ${imageData.error}`);
    debugLog(absValidationDir, 'ERROR', imageData.error);
    process.exit(2);
  }

  console.log('\n=== Mobile Image CSS Parity Validation ===');
  console.log(`  Total images found: ${imageData.images.length}`);

  const checks = [];
  let allPassed = true;

  imageData.images.forEach((img) => {
    const check = {
      category: img.category,
      type: img.type,
      src: img.src,
      passed: true,
      mismatches: [],
    };

    if (img.type === 'icon') {
      const ref = SOURCE_REFERENCE.icons;
      if (img.computed.width !== ref.width) {
        check.mismatches.push(`width: expected=${ref.width}, actual=${img.computed.width}`);
      }
      if (img.computed.height !== ref.height) {
        check.mismatches.push(`height: expected=${ref.height}, actual=${img.computed.height}`);
      }
      if (img.parentLink && img.parentLink.flexDirection !== ref.parentFlexDirection) {
        check.mismatches.push(`parent flex-direction: expected=${ref.parentFlexDirection}, actual=${img.parentLink.flexDirection}`);
      }
      if (img.parentLink && img.parentLink.alignItems !== ref.parentAlignItems) {
        check.mismatches.push(`parent align-items: expected=${ref.parentAlignItems}, actual=${img.parentLink.alignItems}`);
      }
    } else {
      const ref = SOURCE_REFERENCE.vehicles;
      if (img.computed.maxWidth !== ref.maxWidth) {
        check.mismatches.push(`max-width: expected=${ref.maxWidth}, actual=${img.computed.maxWidth}`);
      }
      if (img.computed.height !== '0px' && img.computed.height !== ref.height) {
        const heightPx = parseFloat(img.computed.height);
        const widthPx = parseFloat(img.computed.width);
        if (heightPx > 0 && widthPx > 0) {
          const ratio = widthPx / heightPx;
          if (ratio < 1.5 || ratio > 3.5) {
            check.mismatches.push(`aspect ratio out of range: ${ratio.toFixed(2)} (expected ~2.4:1 vehicle)`);
          }
        }
      }
      if (img.parentLink && img.parentLink.flexDirection !== ref.parentFlexDirection) {
        check.mismatches.push(`parent flex-direction: expected=${ref.parentFlexDirection}, actual=${img.parentLink.flexDirection}`);
      }
      if (img.parentLink && img.parentLink.alignItems !== ref.parentAlignItems) {
        check.mismatches.push(`parent align-items: expected=${ref.parentAlignItems}, actual=${img.parentLink.alignItems}`);
      }
      if (img.parentLink && img.parentLink.marginBottom !== ref.parentMarginBottom) {
        check.mismatches.push(`parent margin-bottom: expected=${ref.parentMarginBottom}, actual=${img.parentLink.marginBottom}`);
      }
    }

    if (check.mismatches.length > 0) {
      check.passed = false;
      allPassed = false;
    }
    checks.push(check);
  });

  const iconChecks = checks.filter((c) => c.type === 'icon');
  const vehicleChecks = checks.filter((c) => c.type === 'vehicle');

  console.log(`\n  Icons (SVG): ${iconChecks.length} images`);
  const iconPassed = iconChecks.filter((c) => c.passed).length;
  console.log(`    Passed: ${iconPassed}/${iconChecks.length}`);
  iconChecks.filter((c) => !c.passed).forEach((c) => {
    console.log(`    ❌ ${c.src}: ${c.mismatches.join(', ')}`);
  });

  console.log(`\n  Vehicles (webp/avif): ${vehicleChecks.length} images`);
  const vehiclePassed = vehicleChecks.filter((c) => c.passed).length;
  console.log(`    Passed: ${vehiclePassed}/${vehicleChecks.length}`);
  vehicleChecks.filter((c) => !c.passed).forEach((c) => {
    console.log(`    ❌ ${c.src}: ${c.mismatches.join(', ')}`);
  });

  const register = {
    script: 'validate-mobile-image-styles.js',
    timestamp: new Date().toISOString(),
    migratedUrl,
    viewport: { width: 375, height: 812 },
    sourceReference: SOURCE_REFERENCE,
    summary: {
      totalImages: checks.length,
      iconImages: iconChecks.length,
      vehicleImages: vehicleChecks.length,
      iconPassed,
      vehiclePassed,
      allPassed,
    },
    checks,
    allValidated: allPassed,
    registerHash: sha256(checks),
  };

  const registerPath = path.join(absValidationDir, 'mobile-image-style-register.json');
  fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULT: ${allPassed ? 'ALL IMAGE STYLES MATCH SOURCE' : 'IMAGE STYLE PARITY FAILED'}`);
  console.log(`  Icons: ${iconPassed}/${iconChecks.length}, Vehicles: ${vehiclePassed}/${vehicleChecks.length}`);
  console.log(`${'='.repeat(60)}`);

  if (allPassed) {
    debugLog(absValidationDir, 'PASS', `PASSED — ${checks.length} images CSS-validated (${iconChecks.length} icons, ${vehicleChecks.length} vehicles)`);
  } else {
    const failedCount = checks.filter((c) => !c.passed).length;
    debugLog(absValidationDir, 'BLOCK', `FAILED — ${failedCount}/${checks.length} images have CSS mismatches`);
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(`Unexpected error: ${err.message}`);
  process.exit(2);
});
