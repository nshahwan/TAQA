#!/usr/bin/env node

/*
 * compare-mobile-animation.js — Validates slide-in/accordion animation timing
 *
 * Measures transition-duration and easing on mobile nav panels for both
 * SOURCE and MIGRATED, then compares. Flags if migrated is significantly
 * different (>200ms off or mismatched easing curve type).
 *
 * Writes register + SHA-256 hashed marker.
 *
 * Usage:
 *   node compare-mobile-animation.js \
 *     --source=<url> --migrated=<url> \
 *     [--validation-dir=<path>] [--viewport=375x812]
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

function debugLog(valDir, level, msg) {
  const ts = new Date().toISOString();
  const prefix = {
    ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵',
  }[level] || 'ℹ️';
  const line = `[${ts}] ${prefix} [SCRIPT:compare-mobile-animation]`
    + ` [${level}] ${msg}\n`;
  try {
    if (valDir && fs.existsSync(valDir)) {
      fs.appendFileSync(path.join(valDir, 'debug.log'), line);
    }
  } catch { /* ignore */ }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let sourceUrl = null;
  let migratedUrl = null;
  let validationDir = VALIDATION_DIR;
  let viewport = '375x812';
  args.forEach((a) => {
    if (a.startsWith('--source=')) sourceUrl = a.slice(9);
    else if (a.startsWith('--migrated=')) migratedUrl = a.slice(11);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
    else if (a.startsWith('--viewport=')) viewport = a.slice(11);
  });
  return {
    sourceUrl, migratedUrl, validationDir, viewport,
  };
}

function parseDuration(val) {
  if (!val) return 0;
  if (val.endsWith('ms')) return parseFloat(val);
  if (val.endsWith('s')) return parseFloat(val) * 1000;
  return parseFloat(val) || 0;
}

function classifyEasing(easing) {
  if (!easing) return 'unknown';
  const e = easing.toLowerCase().trim();
  if (e === 'linear') return 'linear';
  if (e === 'ease' || e === 'ease-in-out') return 'ease';
  if (e === 'ease-in') return 'ease-in';
  if (e === 'ease-out') return 'ease-out';
  if (e.startsWith('cubic-bezier')) return 'cubic-bezier';
  return 'other';
}

async function findHamburgerAndOpen(page) {
  const hamburgerRect = await page.evaluate(() => {
    const candidates = [];
    const antiPatterns = /search|close|dismiss|cookie|consent|login|sign|cart|account|share|banner|govt/i;

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && rect.width > 0 && rect.height > 0 && rect.top < 350;
    }

    document.querySelectorAll(
      'button[aria-label*="menu" i], button[aria-label*="nav" i], button[aria-expanded]',
    ).forEach((el) => { if (isVisible(el)) candidates.push({ el, score: 50 }); });

    ['[class*="hamburger"]', '[class*="menu-toggle"]', '[class*="burger"]',
      '[class*="menu-btn"]', '[class*="menu-button"]'].forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (isVisible(el)) candidates.push({ el, score: 45 });
      });
    });

    document.querySelectorAll('button, [role="button"]').forEach((el) => {
      if (isVisible(el) && el.textContent.trim().toLowerCase() === 'menu') {
        candidates.push({ el, score: 55 });
      }
    });

    candidates.forEach((c) => {
      const label = c.el.getAttribute('aria-label') || '';
      const cls = (c.el.className || '').toString();
      if (antiPatterns.test(label) || antiPatterns.test(cls)) c.score -= 35;
      if (c.el.getBoundingClientRect().width > 200) c.score -= 10;
    });

    const valid = candidates.filter((c) => c.score > 0);
    valid.sort((a, b) => b.score - a.score);
    if (!valid.length) return null;
    const rect = valid[0].el.getBoundingClientRect();
    return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
  });

  if (!hamburgerRect) return false;
  await page.mouse.click(hamburgerRect.x, hamburgerRect.y);
  await page.waitForTimeout(600);
  return true;
}

async function measureAnimation(page, url, vw, vh) {
  await page.setViewportSize({ width: vw, height: vh });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  // Dismiss cookies
  await page.evaluate(() => {
    ['#onetrust-accept-btn-handler', '[id*="cookie"] button',
      '[class*="cookie"] button', '[class*="consent"] button'].some((sel) => {
      const btns = document.querySelectorAll(sel);
      return Array.from(btns).some((btn) => {
        const t = btn.textContent.toLowerCase();
        if (/accept|agree|allow|ok|aceitar/.test(t)) { btn.click(); return true; }
        return false;
      });
    });
  });
  await page.waitForTimeout(500);

  const opened = await findHamburgerAndOpen(page);
  if (!opened) return { error: 'hamburger-not-found', transitions: [] };

  // Extract transition properties from nav-related elements
  const transitions = await page.evaluate(() => {
    const results = [];
    const sels = [
      '[class*="mobile-menu"]', '[class*="nav-menu"]', '[class*="mobile-nav"]',
      '[class*="panel"]', '[class*="drawer"]', '[class*="slide"]',
      '[class*="sub"]', '[class*="root"]', '[class*="level"]',
      'nav', 'nav *',
    ];

    const seen = new Set();
    sels.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (seen.has(el)) return;
        seen.add(el);
        const style = window.getComputedStyle(el);
        const dur = style.transitionDuration;
        const prop = style.transitionProperty;
        const timing = style.transitionTimingFunction;
        if (!dur || dur === '0s') return;

        const cls = el.className ? el.className.toString().trim() : '';
        const tag = el.tagName.toLowerCase();
        if (!cls && !tag) return;

        results.push({
          selector: cls ? `.${cls.split(/\s+/)[0]}` : tag,
          transitionDuration: dur,
          transitionProperty: prop,
          transitionTimingFunction: timing,
        });
      });
    });
    return results;
  });

  // Find the most relevant transition (transform/opacity on panel-like elements)
  const ranked = transitions.map((t) => {
    let relevance = 0;
    if (/transform|all/.test(t.transitionProperty)) relevance += 3;
    if (/opacity/.test(t.transitionProperty)) relevance += 1;
    if (/panel|slide|menu|root|mobile|drawer/i.test(t.selector)) relevance += 2;
    return { ...t, relevance };
  }).sort((a, b) => b.relevance - a.relevance);

  const primary = ranked[0] || null;

  return {
    error: null,
    transitions: ranked.slice(0, 5),
    primary: primary ? {
      selector: primary.selector,
      duration: primary.transitionDuration,
      durationMs: parseDuration(primary.transitionDuration),
      easing: primary.transitionTimingFunction,
      easingClass: classifyEasing(primary.transitionTimingFunction),
      property: primary.transitionProperty,
    } : null,
  };
}

async function main() {
  const {
    sourceUrl, migratedUrl, validationDir, viewport,
  } = parseArgs();
  if (!sourceUrl || !migratedUrl) {
    console.error('Usage: node compare-mobile-animation.js --source=<url> --migrated=<url>');
    process.exit(2);
  }

  const absValDir = path.resolve(validationDir);
  const mobileDir = path.join(absValDir, 'mobile');
  debugLog(absValDir, 'START', `source=${sourceUrl} migrated=${migratedUrl}`);

  let chromium;
  try {
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (e) {
    console.error('Playwright not found:', e.message);
    process.exit(2);
  }

  const [rawW, rawH] = viewport.split('x').map(Number);
  const vw = Number.isFinite(rawW) ? rawW : 375;
  const vh = Number.isFinite(rawH) ? rawH : 812;
  const execPath = findLocalChromiumExecutable();
  const launchOpts = { headless: true };
  if (execPath) launchOpts.executablePath = execPath;

  const browser = await chromium.launch(launchOpts);

  try {
    console.log('Measuring SOURCE animation...');
    const srcPage = await browser.newPage();
    const sourceResult = await measureAnimation(srcPage, sourceUrl, vw, vh);
    await srcPage.close();

    console.log('Measuring MIGRATED animation...');
    const migPage = await browser.newPage();
    const migratedResult = await measureAnimation(migPage, migratedUrl, vw, vh);
    await migPage.close();
    await browser.close();

    // Compare
    const srcDur = sourceResult.primary?.durationMs || 0;
    const migDur = migratedResult.primary?.durationMs || 0;
    const durationDiff = Math.abs(srcDur - migDur);
    const durationMatch = durationDiff <= 200;

    const srcEasingClass = sourceResult.primary?.easingClass || 'unknown';
    const migEasingClass = migratedResult.primary?.easingClass || 'unknown';
    const easingMatch = srcEasingClass === migEasingClass
      || (srcEasingClass === 'cubic-bezier' && migEasingClass === 'cubic-bezier');

    const allMatch = durationMatch && easingMatch;

    const register = {
      timestamp: new Date().toISOString(),
      sourceUrl,
      migratedUrl,
      viewport: `${vw}x${vh}`,
      source: {
        primary: sourceResult.primary,
        error: sourceResult.error,
        transitionCount: sourceResult.transitions.length,
      },
      migrated: {
        primary: migratedResult.primary,
        error: migratedResult.error,
        transitionCount: migratedResult.transitions.length,
      },
      comparison: {
        durationDiff,
        durationMatch,
        easingMatch,
        srcDurationMs: srcDur,
        migDurationMs: migDur,
        srcEasing: srcEasingClass,
        migEasing: migEasingClass,
      },
      allMatch,
    };

    if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });
    const registerPath = path.join(mobileDir, 'mobile-animation-comparison.json');
    fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));

    const markerContent = JSON.stringify({
      timestamp: register.timestamp,
      sourceUrl,
      migratedUrl,
      allMatch,
      srcDurationMs: srcDur,
      migDurationMs: migDur,
      durationDiff,
      srcEasing: srcEasingClass,
      migEasing: migEasingClass,
      hash: crypto.createHash('sha256')
        .update(JSON.stringify(register)).digest('hex'),
    });
    fs.writeFileSync(
      path.join(mobileDir, '.mobile-animation-comparison-complete'),
      markerContent,
    );

    // Print results
    console.log(`\n${'='.repeat(60)}`);
    console.log('MOBILE ANIMATION COMPARISON');
    console.log(`${'='.repeat(60)}`);
    console.log(`\n  Source:   ${srcDur}ms, easing: ${sourceResult.primary?.easing || 'none'} (${srcEasingClass})`);
    console.log(`  Migrated: ${migDur}ms, easing: ${migratedResult.primary?.easing || 'none'} (${migEasingClass})`);
    console.log(`\n  Duration diff: ${durationDiff}ms ${durationMatch ? '✅ (≤200ms)' : '❌ (>200ms)'}`);
    console.log(`  Easing match:  ${easingMatch ? '✅' : '❌'}`);
    console.log(`  Overall:       ${allMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`${'='.repeat(60)}`);

    debugLog(
      absValDir,
      allMatch ? 'PASS' : 'BLOCK',
      `${allMatch ? 'PASSED' : 'FAILED'} — src=${srcDur}ms(${srcEasingClass}) `
      + `mig=${migDur}ms(${migEasingClass}) diff=${durationDiff}ms`,
    );
    process.exit(allMatch ? 0 : 1);
  } catch (e) {
    await browser.close().catch(() => {});
    console.error(`FAIL: ${e.message}`);
    debugLog(absValDir, 'BLOCK', `FAILED — ${e.message}`);
    process.exit(1);
  }
}

main();
