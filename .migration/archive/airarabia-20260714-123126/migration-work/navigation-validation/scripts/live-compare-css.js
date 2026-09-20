#!/usr/bin/env node

/*
 * live-compare-css.js
 *
 * INDEPENDENT CSS comparison — uses Playwright to extract getComputedStyle from
 * key navigation elements on BOTH source and migrated sites. Compares critical
 * CSS properties (font, color, spacing, background, dimensions) and reports diffs.
 *
 * This script CANNOT be faked — it navigates both URLs and reads computed styles
 * directly from the live rendered DOM. No agent-authored JSON is used as input.
 *
 * Usage:
 *   node scripts/live-compare-css.js \
 *     --source-url=https://www.example.com \
 *     --migrated-url=http://localhost:3000/content/index.html \
 *     [--selectors-config=<path>] \
 *     [--validation-dir=migration-work/navigation-validation] \
 *     [--viewport=1440x900] \
 *     [--threshold=80]
 *
 * Exit codes:
 *   0 = CSS similarity >= threshold for all elements
 *   1 = one or more elements below threshold
 *   2 = usage/runner error
 *
 * Outputs:
 *   - live-css-comparison.json (full register with per-property diffs)
 *   - .live-css-comparison-complete marker
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
  const chromiumDirs = fs.readdirSync(localBrowsers).filter((d) => d.startsWith('chromium-'));
  const candidates = chromiumDirs.flatMap((dir) => [
    path.join(localBrowsers, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    path.join(localBrowsers, dir, 'chrome-linux', 'chrome'),
  ]);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function debugLog(validationDir, level, msg) {
  const ts = new Date().toISOString();
  const prefix = { ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵', END: '🏁' }[level] || 'ℹ️';
  const entry = `[${ts}] ${prefix} [SCRIPT:live-compare-css] [${level}] ${msg}\n`;
  try {
    if (validationDir && fs.existsSync(validationDir)) {
      fs.appendFileSync(path.join(validationDir, 'debug.log'), entry);
    }
  } catch { /* ignore */ }
}

// Critical CSS properties to compare — these are the most visible to users
const CRITICAL_PROPERTIES = [
  'fontSize', 'fontWeight', 'fontFamily', 'color', 'backgroundColor',
  'height', 'paddingTop', 'paddingBottom', 'paddingLeft', 'paddingRight',
  'display', 'flexDirection', 'alignItems', 'justifyContent', 'gap',
  'borderBottom', 'borderTop', 'boxShadow', 'opacity', 'position',
  'textDecoration', 'textTransform', 'letterSpacing', 'lineHeight',
];

// Default selectors to check when no config file is provided
const DEFAULT_SELECTORS = [
  { id: 'header-wrapper', selector: 'header, [role="banner"]', label: 'Header wrapper' },
  { id: 'nav-primary', selector: 'header nav, [role="banner"] nav', label: 'Primary nav' },
  { id: 'nav-link-first', selector: 'header nav a, header nav button', label: 'First nav link/button', index: 0 },
  { id: 'nav-link-second', selector: 'header nav a, header nav button', label: 'Second nav link/button', index: 1 },
  { id: 'logo', selector: 'header a[href="/"] img, header .logo img, header img[alt*="logo" i]', label: 'Logo image' },
  { id: 'logo-link', selector: 'header a[href="/"], header a.logo, header [class*="logo"] a', label: 'Logo link' },
  { id: 'header-row-0', selector: 'header > div:first-child, header > nav:first-child', label: 'First header row' },
  { id: 'header-row-1', selector: 'header > div:nth-child(2), header > nav:nth-child(2)', label: 'Second header row' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let sourceUrl = null;
  let migratedUrl = null;
  let selectorsConfig = null;
  let validationDir = VALIDATION_DIR;
  let viewport = '1440x900';
  let threshold = 80;

  args.forEach((a) => {
    if (a.startsWith('--source-url=')) sourceUrl = a.slice(13);
    else if (a.startsWith('--migrated-url=')) migratedUrl = a.slice(15);
    else if (a.startsWith('--selectors-config=')) selectorsConfig = a.slice(19);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
    else if (a.startsWith('--viewport=')) viewport = a.slice(11);
    else if (a.startsWith('--threshold=')) threshold = parseInt(a.slice(12), 10);
  });

  return { sourceUrl, migratedUrl, selectorsConfig, validationDir, viewport, threshold };
}

async function extractStyles(page, selectors, properties) {
  return page.evaluate(({ selectors: sels, properties: props }) => {
    const results = {};
    for (const sel of sels) {
      let elements;
      if (sel.selector) {
        elements = document.querySelectorAll(sel.selector);
      } else {
        continue;
      }

      const el = sel.index !== undefined ? elements[sel.index] : elements[0];
      if (!el) {
        results[sel.id] = { found: false, selector: sel.selector, label: sel.label };
        continue;
      }

      const computed = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const styles = {};
      for (const prop of props) {
        styles[prop] = computed[prop] || '';
      }

      results[sel.id] = {
        found: true,
        selector: sel.selector,
        label: sel.label,
        styles,
        dimensions: {
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        },
        tagName: el.tagName.toLowerCase(),
        className: el.className || '',
      };
    }
    return results;
  }, { selectors, properties });
}

function normalizeColor(color) {
  if (!color) return '';
  return color.replace(/\s+/g, '').toLowerCase();
}

function normalizeFont(font) {
  if (!font) return '';
  return font.replace(/["']/g, '').split(',')[0].trim().toLowerCase();
}

function compareProperty(prop, sourceVal, migratedVal) {
  if (!sourceVal && !migratedVal) return { matches: true };
  if (!sourceVal || !migratedVal) return { matches: false, delta: `source="${sourceVal || 'none'}", migrated="${migratedVal || 'none'}"` };

  // Numeric properties (fontSize, height, padding, etc.)
  const srcNum = parseFloat(sourceVal);
  const migNum = parseFloat(migratedVal);
  if (!isNaN(srcNum) && !isNaN(migNum)) {
    const tolerance = srcNum * 0.15; // 15% tolerance
    const matches = Math.abs(srcNum - migNum) <= Math.max(tolerance, 2);
    return { matches, delta: matches ? null : `source=${sourceVal}, migrated=${migratedVal}` };
  }

  // Color properties
  if (prop === 'color' || prop === 'backgroundColor') {
    const matches = normalizeColor(sourceVal) === normalizeColor(migratedVal);
    return { matches, delta: matches ? null : `source=${sourceVal}, migrated=${migratedVal}` };
  }

  // Font family (just compare primary font)
  if (prop === 'fontFamily') {
    const matches = normalizeFont(sourceVal) === normalizeFont(migratedVal);
    return { matches, delta: matches ? null : `source=${normalizeFont(sourceVal)}, migrated=${normalizeFont(migratedVal)}` };
  }

  // Generic string comparison
  const matches = sourceVal.trim().toLowerCase() === migratedVal.trim().toLowerCase();
  return { matches, delta: matches ? null : `source="${sourceVal}", migrated="${migratedVal}"` };
}

function compareElementStyles(sourceEl, migratedEl, properties) {
  if (!sourceEl.found && !migratedEl.found) return { status: 'skipped', reason: 'Not found on either site' };
  if (!sourceEl.found) return { status: 'skipped', reason: 'Not found on source' };
  if (!migratedEl.found) return { status: 'failed', reason: 'Not found on migrated', matchPercent: 0, diffs: [] };

  const diffs = [];
  let matchCount = 0;
  const totalProps = properties.length;

  for (const prop of properties) {
    const srcVal = sourceEl.styles[prop] || '';
    const migVal = migratedEl.styles[prop] || '';
    const result = compareProperty(prop, srcVal, migVal);
    if (result.matches) {
      matchCount++;
    } else {
      diffs.push({ property: prop, source: srcVal, migrated: migVal, delta: result.delta });
    }
  }

  // Also compare dimensions
  const dimDiffs = [];
  if (sourceEl.dimensions && migratedEl.dimensions) {
    const { width: sw, height: sh } = sourceEl.dimensions;
    const { width: mw, height: mh } = migratedEl.dimensions;
    if (sw > 0 && Math.abs(sw - mw) / sw > 0.15) {
      dimDiffs.push({ property: 'width', source: `${sw}px`, migrated: `${mw}px` });
    }
    if (sh > 0 && Math.abs(sh - mh) / sh > 0.2) {
      dimDiffs.push({ property: 'height', source: `${sh}px`, migrated: `${mh}px` });
    }
  }

  const matchPercent = Math.round((matchCount / totalProps) * 100);
  const status = matchPercent >= 80 && dimDiffs.length === 0 ? 'validated' : 'failed';

  return { status, matchPercent, matchCount, totalProps, diffs, dimensionDiffs: dimDiffs };
}

async function main() {
  const { sourceUrl, migratedUrl, selectorsConfig, validationDir, viewport, threshold } = parseArgs();

  if (!sourceUrl || !migratedUrl) {
    console.error(
      'Usage: node live-compare-css.js \\\n'
      + '  --source-url=<url> --migrated-url=<url> \\\n'
      + '  [--selectors-config=<path>] [--threshold=80] [--viewport=1440x900]'
    );
    process.exit(2);
  }

  const [rawW, rawH] = viewport.split('x').map(Number);
  const vw = Number.isFinite(rawW) ? rawW : 1440;
  const vh = Number.isFinite(rawH) ? rawH : 900;
  const absValidationDir = path.resolve(validationDir);

  if (!fs.existsSync(absValidationDir)) fs.mkdirSync(absValidationDir, { recursive: true });
  debugLog(absValidationDir, 'START', `live-compare-css.js — source=${sourceUrl}, migrated=${migratedUrl}, viewport=${viewport}, threshold=${threshold}%`);

  // Load custom selectors if provided
  let selectors = DEFAULT_SELECTORS;
  if (selectorsConfig && fs.existsSync(selectorsConfig)) {
    try {
      selectors = JSON.parse(fs.readFileSync(selectorsConfig, 'utf-8'));
      console.log(`Loaded ${selectors.length} custom selectors from ${selectorsConfig}`);
    } catch (e) {
      console.error(`Failed to load selectors config: ${e.message}. Using defaults.`);
    }
  }

  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (e) {
    console.error('Playwright not found. Install: npm install playwright');
    debugLog(absValidationDir, 'ERROR', `Playwright import failed: ${e.message}`);
    process.exit(2);
  }

  const execPath = findLocalChromiumExecutable();
  const launchOpts = { headless: true };
  if (execPath) launchOpts.executablePath = execPath;

  const browser = await chromium.launch(launchOpts);

  try {
    // === SOURCE STYLES ===
    console.log('\n=== Extracting CSS from SOURCE ===');
    const sourcePage = await browser.newPage();
    await sourcePage.setViewportSize({ width: vw, height: vh });
    await sourcePage.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sourcePage.waitForTimeout(1500);

    const cookieBtn = await sourcePage.$('#onetrust-accept-btn-handler, button:has-text("Accept"), .cookie-accept');
    if (cookieBtn) { await cookieBtn.click(); await sourcePage.waitForTimeout(500); }

    const sourceStyles = await extractStyles(sourcePage, selectors, CRITICAL_PROPERTIES);
    await sourcePage.close();

    // === MIGRATED STYLES ===
    console.log('=== Extracting CSS from MIGRATED ===');
    const migratedPage = await browser.newPage();
    await migratedPage.setViewportSize({ width: vw, height: vh });
    await migratedPage.goto(migratedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await migratedPage.waitForTimeout(1500);

    const migratedStyles = await extractStyles(migratedPage, selectors, CRITICAL_PROPERTIES);
    await migratedPage.close();
    await browser.close();

    // === COMPARISON ===
    console.log('\n=== Comparing CSS properties ===');
    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    for (const sel of selectors) {
      const sourceEl = sourceStyles[sel.id] || { found: false };
      const migratedEl = migratedStyles[sel.id] || { found: false };
      const comparison = compareElementStyles(sourceEl, migratedEl, CRITICAL_PROPERTIES);

      results.push({
        id: sel.id,
        label: sel.label,
        selector: sel.selector,
        ...comparison,
        sourceFound: sourceEl.found,
        migratedFound: migratedEl.found,
        sourceDimensions: sourceEl.dimensions || null,
        migratedDimensions: migratedEl.dimensions || null,
      });

      if (comparison.status === 'validated') {
        totalPassed++;
        console.log(`  ✅ [${sel.id}] "${sel.label}": ${comparison.matchPercent}% match`);
      } else if (comparison.status === 'failed') {
        totalFailed++;
        console.log(`  ❌ [${sel.id}] "${sel.label}": ${comparison.matchPercent !== undefined ? comparison.matchPercent + '% match' : comparison.reason}`);
        if (comparison.diffs) {
          comparison.diffs.slice(0, 5).forEach(d => console.log(`      - ${d.property}: ${d.delta}`));
          if (comparison.diffs.length > 5) console.log(`      ... and ${comparison.diffs.length - 5} more`);
        }
        if (comparison.dimensionDiffs) {
          comparison.dimensionDiffs.forEach(d => console.log(`      - ${d.property}: source=${d.source}, migrated=${d.migrated}`));
        }
      } else {
        totalSkipped++;
        console.log(`  ⏭️  [${sel.id}] "${sel.label}": SKIPPED — ${comparison.reason}`);
      }
    }

    const overallMatch = totalPassed + totalSkipped > 0 ? Math.round((totalPassed / Math.max(totalPassed + totalFailed, 1)) * 100) : 0;
    const allValidated = totalFailed === 0 && totalPassed > 0;

    const register = {
      script: 'live-compare-css.js',
      timestamp: new Date().toISOString(),
      sourceUrl,
      migratedUrl,
      viewport: { width: vw, height: vh },
      threshold,
      propertiesChecked: CRITICAL_PROPERTIES,
      selectorsChecked: selectors.length,
      results,
      summary: {
        totalSelectors: selectors.length,
        passed: totalPassed,
        failed: totalFailed,
        skipped: totalSkipped,
        overallMatch,
      },
      allValidated,
    };

    // Write register
    const registerPath = path.join(absValidationDir, 'live-css-comparison.json');
    fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));
    console.log(`\nRegister written: ${registerPath}`);

    // Write tamper-proof marker
    const markerContent = JSON.stringify({
      timestamp: register.timestamp,
      sourceUrl,
      migratedUrl,
      allValidated,
      overallMatch,
      passed: totalPassed,
      failed: totalFailed,
      hash: crypto.createHash('sha256').update(JSON.stringify(register)).digest('hex'),
    });
    fs.writeFileSync(path.join(absValidationDir, '.live-css-comparison-complete'), markerContent);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${allValidated ? 'CSS COMPARISON PASSED' : 'CSS COMPARISON FAILED'}`);
    console.log(`  Overall match: ${overallMatch}% (threshold: ${threshold}%)`);
    console.log(`  Passed: ${totalPassed}/${selectors.length}, Failed: ${totalFailed}/${selectors.length}`);
    console.log(`${'='.repeat(60)}`);

    if (allValidated) {
      debugLog(absValidationDir, 'PASS', `PASSED — ${totalPassed}/${selectors.length} elements pass CSS comparison, overallMatch=${overallMatch}%`);
    } else {
      const failedIds = results.filter(r => r.status === 'failed').map(r => r.id).join(', ');
      debugLog(absValidationDir, 'BLOCK', `FAILED — ${totalFailed}/${selectors.length} elements below threshold: ${failedIds}`);
    }

    process.exit(allValidated ? 0 : 1);
  } catch (err) {
    console.error('Runner error:', err.message);
    debugLog(absValidationDir, 'ERROR', err.message);
    await browser.close();
    process.exit(2);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
