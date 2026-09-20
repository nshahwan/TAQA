#!/usr/bin/env node

/**
 * validate-mobile-content.js
 *
 * Hash-based content validation for mobile nav panels.
 * Compares nav.plain.html source data against the rendered mobile DOM.
 *
 * Ground truth: nav.plain.html (section 2 sub-lists + section 3 links)
 * Rendered: localhost mobile panel DOM (hamburger open)
 *
 * Produces SHA-256 hashes for both sides per category.
 * FAILS if hashes don't match — no tolerance, no approximation.
 *
 * Usage:
 *   node scripts/validate-mobile-content.js \
 *     --migrated-url=http://localhost:3000/content/index \
 *     --nav-file=content/nav.plain.html \
 *     [--validation-dir=migration-work/navigation-validation]
 *
 * Exit codes: 0 = PASS, 1 = FAIL, 2 = runner error
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { JSDOM } from 'jsdom';
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
  const entry = `[${ts}] ${prefix} [SCRIPT:validate-mobile-content] [${level}] ${msg}\n`;
  try {
    if (validationDir && fs.existsSync(validationDir)) {
      fs.appendFileSync(path.join(validationDir, 'debug.log'), entry);
    }
  } catch { /* ignore */ }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let migratedUrl = null;
  let navFile = null;
  let validationDir = VALIDATION_DIR;

  args.forEach((a) => {
    if (a.startsWith('--migrated-url=')) migratedUrl = a.slice(15);
    else if (a.startsWith('--nav-file=')) navFile = a.slice(11);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
  });

  return { migratedUrl, navFile, validationDir };
}

/**
 * Extract expected content from nav.plain.html (ground truth).
 * Returns { categories: [...], secondaryLinks: [...] }
 */
function extractExpectedFromNavFile(navFilePath) {
  const html = fs.readFileSync(navFilePath, 'utf-8');
  const dom = new JSDOM(`<body>${html}</body>`);
  const doc = dom.window.document;
  const sections = doc.querySelectorAll('body > div');

  const categories = [];
  const menuSection = sections[1];
  if (menuSection) {
    const navItems = menuSection.querySelectorAll(':scope > ul > li');
    navItems.forEach((item) => {
      const topLink = item.querySelector(':scope > a');
      if (!topLink) return;
      const label = topLink.textContent.trim();
      const subList = item.querySelector(':scope > ul');

      if (subList) {
        const subItems = subList.querySelectorAll(':scope > li');
        const items = [];
        subItems.forEach((si) => {
          const link = si.querySelector('a');
          if (!link) return;
          const img = si.querySelector('img');
          items.push({
            text: link.textContent.trim(),
            href: link.getAttribute('href'),
            hasImage: !!img,
            imgSrc: img ? img.getAttribute('src') : null,
            imgAlt: img ? (img.getAttribute('alt') || '') : null,
          });
        });
        categories.push({
          label,
          hasSubPanel: true,
          linkCount: items.length,
          imageCount: items.filter((i) => i.hasImage).length,
          items,
        });
      } else {
        categories.push({
          label,
          hasSubPanel: false,
          href: topLink.getAttribute('href'),
        });
      }
    });
  }

  const secondaryLinks = [];
  const hamburgerSection = sections[2];
  if (hamburgerSection) {
    const links = hamburgerSection.querySelectorAll('a');
    links.forEach((link) => {
      secondaryLinks.push({
        text: link.textContent.trim(),
        href: link.getAttribute('href'),
      });
    });
  }

  return { categories, secondaryLinks };
}

async function main() {
  const { migratedUrl, navFile, validationDir } = parseArgs();

  if (!migratedUrl || !navFile) {
    console.error(
      'Usage: node validate-mobile-content.js \\\n'
      + '  --migrated-url=<url> --nav-file=<path> \\\n'
      + '  [--validation-dir=<path>]',
    );
    process.exit(2);
  }

  const absValidationDir = path.resolve(validationDir);
  const absNavFile = path.resolve(navFile);

  if (!fs.existsSync(absNavFile)) {
    console.error(`Nav file not found: ${absNavFile}`);
    process.exit(2);
  }

  if (!fs.existsSync(absValidationDir)) {
    fs.mkdirSync(absValidationDir, { recursive: true });
  }

  debugLog(
    absValidationDir,
    'START',
    `validate-mobile-content.js — migrated=${migratedUrl}, nav=${navFile}`,
  );

  // === STEP 1: Extract ground truth from nav.plain.html ===
  console.log('\n=== Extracting ground truth from nav.plain.html ===');
  const expected = extractExpectedFromNavFile(absNavFile);
  console.log(`  Categories: ${expected.categories.length}`);
  console.log(`  With sub-panels: ${expected.categories.filter((c) => c.hasSubPanel).length}`);
  console.log(`  Secondary links: ${expected.secondaryLinks.length}`);

  const expectedWithPanels = expected.categories.filter((c) => c.hasSubPanel);
  expectedWithPanels.forEach((cat) => {
    console.log(`    ${cat.label}: ${cat.linkCount} links, ${cat.imageCount} images`);
  });

  // === STEP 2: Extract rendered content from mobile DOM ===
  console.log('\n=== Extracting rendered content from mobile DOM ===');

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

  // Open hamburger
  await page.click('.nav-hamburger');
  await page.waitForTimeout(500);

  // Extract all mobile panel content
  const rendered = await page.evaluate(() => {
    const panel = document.querySelector('.nav-hamburger-panel');
    if (!panel) return { error: 'No .nav-hamburger-panel found' };

    const triggers = panel.querySelectorAll('.nav-mobile-trigger');
    const subpanels = panel.querySelectorAll('.nav-mobile-subpanel');
    const primaryDirect = panel.querySelectorAll('.nav-mobile-primary > li > a');
    const secondaryList = panel.querySelectorAll('.nav-mobile-secondary > li > a');

    const categories = [];

    // Categories with sub-panels
    Array.from(triggers).forEach((trigger, i) => {
      const sp = subpanels[i];
      if (!sp) return;
      const links = sp.querySelectorAll('.nav-mobile-sublist a');
      const items = Array.from(links).map((a) => {
        const img = a.querySelector('img');
        const span = a.querySelector('span');
        return {
          text: span ? span.textContent.trim() : a.textContent.trim(),
          href: a.getAttribute('href'),
          hasImage: !!img,
          imgSrc: img ? img.getAttribute('src') : null,
          imgAlt: img ? (img.getAttribute('alt') || '') : null,
        };
      });

      categories.push({
        label: trigger.textContent.replace('›', '').trim(),
        hasSubPanel: true,
        linkCount: items.length,
        imageCount: items.filter((it) => it.hasImage).length,
        items,
      });
    });

    // Direct link categories
    Array.from(primaryDirect).forEach((a) => {
      categories.push({
        label: a.textContent.trim(),
        hasSubPanel: false,
        href: a.getAttribute('href'),
      });
    });

    // Secondary links
    const secondaryLinks = Array.from(secondaryList).map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href'),
    }));

    return { categories, secondaryLinks };
  });

  await browser.close();

  if (rendered.error) {
    console.error(`  ERROR: ${rendered.error}`);
    debugLog(absValidationDir, 'ERROR', rendered.error);
    process.exit(2);
  }

  const renderedWithPanels = rendered.categories.filter((c) => c.hasSubPanel);
  renderedWithPanels.forEach((cat) => {
    console.log(`    ${cat.label}: ${cat.linkCount} links, ${cat.imageCount} images`);
  });

  // === STEP 3: Hash comparison ===
  console.log('\n=== Hash Comparison (SHA-256) ===');
  const results = [];
  let allPassed = true;

  // Compare categories with sub-panels
  expectedWithPanels.forEach((expCat) => {
    const renCat = renderedWithPanels.find((r) => r.label === expCat.label);
    if (!renCat) {
      results.push({
        category: expCat.label,
        status: 'FAIL',
        reason: 'Category missing from rendered DOM',
      });
      allPassed = false;
      return;
    }

    // Normalize href for comparison (rendered will have full URL)
    const normalizeItems = (items) => items.map((it) => ({
      text: it.text,
      hrefPath: it.href ? new URL(it.href, 'http://localhost').pathname
        + (new URL(it.href, 'http://localhost').search || '')
        + (new URL(it.href, 'http://localhost').hash || '') : null,
      hasImage: it.hasImage,
      imgAlt: it.imgAlt,
    }));

    const expNorm = normalizeItems(expCat.items);
    const renNorm = normalizeItems(renCat.items);

    const expHash = sha256(expNorm);
    const renHash = sha256(renNorm);
    const match = expHash === renHash;

    if (!match) allPassed = false;

    const result = {
      category: expCat.label,
      status: match ? 'PASS' : 'FAIL',
      expected: {
        linkCount: expCat.linkCount,
        imageCount: expCat.imageCount,
        hash: expHash,
      },
      rendered: {
        linkCount: renCat.linkCount,
        imageCount: renCat.imageCount,
        hash: renHash,
      },
    };

    if (!match) {
      // Find specific mismatches
      const mismatches = [];
      if (expCat.linkCount !== renCat.linkCount) {
        mismatches.push(
          `linkCount: expected=${expCat.linkCount}, rendered=${renCat.linkCount}`,
        );
      }
      if (expCat.imageCount !== renCat.imageCount) {
        mismatches.push(
          `imageCount: expected=${expCat.imageCount}, rendered=${renCat.imageCount}`,
        );
      }
      expNorm.forEach((expItem, idx) => {
        const renItem = renNorm[idx];
        if (!renItem) {
          mismatches.push(`item[${idx}] "${expItem.text}" missing`);
        } else {
          if (expItem.text !== renItem.text) {
            mismatches.push(
              `item[${idx}] text: "${expItem.text}" vs "${renItem.text}"`,
            );
          }
          if (expItem.hasImage !== renItem.hasImage) {
            mismatches.push(
              `item[${idx}] "${expItem.text}" image: expected=${expItem.hasImage}, rendered=${renItem.hasImage}`,
            );
          }
        }
      });
      result.mismatches = mismatches;
    }

    results.push(result);
    const icon = match ? '✅' : '❌';
    console.log(`  ${icon} ${expCat.label}: ${match ? 'PASS' : 'FAIL'} (links=${renCat.linkCount}/${expCat.linkCount}, images=${renCat.imageCount}/${expCat.imageCount})`);
    if (!match && result.mismatches) {
      result.mismatches.forEach((m) => console.log(`      - ${m}`));
    }
  });

  // Compare secondary links — normalize rendered hrefs to paths
  const normalizeHref = (href) => {
    if (!href) return null;
    try {
      const url = new URL(href, 'http://localhost');
      return url.pathname + (url.search || '') + (url.hash || '');
    } catch {
      return href;
    }
  };
  const renSecNorm = rendered.secondaryLinks.map((l) => ({
    text: l.text,
    href: normalizeHref(l.href),
  }));
  const expSecNorm = expected.secondaryLinks.map((l) => ({
    text: l.text,
    href: normalizeHref(l.href),
  }));
  const expSecHash = sha256(expSecNorm);
  const renSecHash = sha256(renSecNorm);
  const secMatch = expSecHash === renSecHash;
  if (!secMatch) allPassed = false;

  const secResult = {
    category: 'Secondary Links',
    status: secMatch ? 'PASS' : 'FAIL',
    expected: { count: expected.secondaryLinks.length, hash: expSecHash },
    rendered: { count: rendered.secondaryLinks.length, hash: renSecHash },
  };
  if (!secMatch) {
    secResult.mismatches = [
      `count: expected=${expected.secondaryLinks.length}, rendered=${rendered.secondaryLinks.length}`,
    ];
  }
  results.push(secResult);
  console.log(`  ${secMatch ? '✅' : '❌'} Secondary Links: ${secMatch ? 'PASS' : 'FAIL'} (${rendered.secondaryLinks.length}/${expected.secondaryLinks.length})`);

  // === STEP 4: Write register ===
  const register = {
    script: 'validate-mobile-content.js',
    timestamp: new Date().toISOString(),
    migratedUrl,
    navFile,
    viewport: { width: 375, height: 812 },
    groundTruth: {
      totalCategories: expected.categories.length,
      categoriesWithPanels: expectedWithPanels.length,
      totalImages: expectedWithPanels.reduce((s, c) => s + c.imageCount, 0),
      totalLinks: expectedWithPanels.reduce((s, c) => s + c.linkCount, 0),
      secondaryLinks: expected.secondaryLinks.length,
    },
    results,
    allValidated: allPassed,
    passed: results.filter((r) => r.status === 'PASS').length,
    failed: results.filter((r) => r.status === 'FAIL').length,
  };

  const registerPath = path.join(absValidationDir, 'mobile-content-hash-register.json');
  fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));

  // Write tamper-proof marker
  const marker = {
    timestamp: register.timestamp,
    allValidated: allPassed,
    passed: register.passed,
    failed: register.failed,
    registerHash: sha256(register),
  };
  fs.writeFileSync(
    path.join(absValidationDir, '.mobile-content-hash-complete'),
    JSON.stringify(marker),
  );

  console.log(`\n${'='.repeat(60)}`);
  console.log(`RESULT: ${allPassed ? 'ALL MOBILE CONTENT VALIDATED' : 'MOBILE CONTENT VALIDATION FAILED'}`);
  console.log(`  Passed: ${register.passed}/${results.length}, Failed: ${register.failed}/${results.length}`);
  console.log(`  Total images verified: ${register.groundTruth.totalImages}`);
  console.log(`${'='.repeat(60)}`);

  if (allPassed) {
    debugLog(
      absValidationDir,
      'PASS',
      `PASSED — ${register.passed}/${results.length} categories validated, `
      + `${register.groundTruth.totalImages} images confirmed`,
    );
  } else {
    const failed = results.filter((r) => r.status === 'FAIL')
      .map((r) => r.category).join(', ');
    debugLog(
      absValidationDir,
      'BLOCK',
      `FAILED — ${register.failed}/${results.length} failed: ${failed}`,
    );
  }

  process.exit(allPassed ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
