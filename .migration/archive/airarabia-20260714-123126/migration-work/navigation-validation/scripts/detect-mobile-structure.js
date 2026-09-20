#!/usr/bin/env node

/*
 * detect-mobile-structure.js
 *
 * Universal mobile header detection — finds the header element on ANY site
 * using multi-strategy heuristics (semantic HTML, ARIA, position, class
 * patterns). No site-specific selectors needed.
 *
 * Usage:
 *   node .../detect-mobile-structure.js --url=<url>
 *   [--validation-dir=<path>] [--viewport=375x812]
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
  const line = `[${ts}] ${prefix} [SCRIPT:detect-mobile-structure]`
    + ` [${level}] ${msg}\n`;
  try {
    if (valDir && fs.existsSync(valDir)) {
      fs.appendFileSync(path.join(valDir, 'debug.log'), line);
    }
  } catch { /* ignore */ }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let url = null;
  let validationDir = VALIDATION_DIR;
  let viewport = '375x812';
  args.forEach((a) => {
    if (a.startsWith('--url=')) url = a.slice(6);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
    else if (a.startsWith('--viewport=')) viewport = a.slice(11);
  });
  return { url, validationDir, viewport };
}

/**
 * Browser-side: find the header element using multiple strategies.
 * Returns { element selector description, rect, confidence }.
 */
const FIND_HEADER_FN = `
function findHeader() {
  const vw = window.innerWidth;
  const candidates = [];

  function score(el) {
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    if (rect.height <= 0 || rect.width <= 0) return -1;
    if (style.display === 'none' || style.visibility === 'hidden') return -1;

    let s = 0;
    const vh = window.innerHeight;
    // At the top of the page
    if (rect.top <= 10) s += 30;
    else if (rect.top <= 50) s += 15;
    // Full or near-full width
    if (rect.width >= vw * 0.9) s += 20;
    // Reasonable header height (30-150px is ideal)
    if (rect.height >= 30 && rect.height <= 150) s += 20;
    else if (rect.height > 150 && rect.height <= 250) s += 10;
    else if (rect.height > 250 && rect.height <= 400) s += 0;
    // Fixed/sticky positioning (strong signal for headers)
    if (style.position === 'fixed' || style.position === 'sticky') s += 25;
    // Contains nav links or buttons
    const links = el.querySelectorAll('a, button, [role="button"]');
    if (links.length >= 2 && links.length <= 30) s += 10;
    // Contains logo (img/svg)
    const visuals = el.querySelectorAll('img, svg');
    if (visuals.length > 0 && visuals.length <= 10) s += 5;
    // Semantic bonus
    if (el.tagName === 'HEADER') s += 25;
    if (el.getAttribute('role') === 'banner') s += 25;
    if (el.getAttribute('role') === 'navigation') s += 10;
    // Class/id hints
    const id = (el.id || '').toLowerCase();
    const cls = (el.className || '').toString().toLowerCase();
    if (id.includes('header') || cls.includes('header')) s += 15;
    if (id.includes('nav') || cls.includes('nav')) s += 10;
    if (cls.includes('toolbar') || cls.includes('topbar')) s += 10;
    // HEAVY penalty for being too tall (page wrapper, not header)
    if (rect.height > 400) s -= 30;
    if (rect.height > vh) s -= 50;
    // Penalty for being the body/html or a full-page wrapper
    if (el === document.body || el === document.documentElement) s -= 100;
    if (el.children.length > 50) s -= 10;
    // Penalty for notification/alert banners (not navigation)
    const antiHdr = /message|alert|cookie|consent|notification|promo|announcement/i;
    if (antiHdr.test(cls) || antiHdr.test(id)) s -= 20;
    // Penalty for non-block elements used as headers (p, span, etc)
    if (['P', 'SPAN', 'H1', 'H2', 'H3', 'A'].includes(el.tagName)) s -= 20;
    return s;
  }

  // Strategy 1: semantic elements
  document.querySelectorAll('header, [role="banner"]').forEach((el) => {
    const s = score(el);
    if (s > 0) candidates.push({ el, score: s, strategy: 'semantic' });
  });

  // Strategy 2: elements with header/nav in class or id
  const hdrPattern = /header|masthead|site-nav|top-bar|topbar|navbar|main-nav|mobile-nav|global-nav|primary-nav/i;
  document.querySelectorAll('[class], [id]').forEach((el) => {
    const id = el.id || '';
    const cls = (el.className || '').toString();
    if (hdrPattern.test(id) || hdrPattern.test(cls)) {
      const s = score(el);
      if (s > 0) candidates.push({ el, score: s, strategy: 'class-pattern' });
    }
  });

  // Strategy 3: fixed/sticky elements at top
  const allEls = document.querySelectorAll('body > *, body > * > *');
  allEls.forEach((el) => {
    const style = window.getComputedStyle(el);
    if (style.position === 'fixed' || style.position === 'sticky') {
      const rect = el.getBoundingClientRect();
      if (rect.top <= 10 && rect.width >= vw * 0.8) {
        const s = score(el);
        if (s > 0) candidates.push({ el, score: s, strategy: 'fixed-top' });
      }
    }
  });

  // Strategy 4: first full-width element at top with links
  const bodyChildren = document.querySelectorAll('body > *');
  for (let i = 0; i < Math.min(bodyChildren.length, 5); i += 1) {
    const el = bodyChildren[i];
    const rect = el.getBoundingClientRect();
    if (rect.width >= vw * 0.9 && rect.top <= 50 && rect.height > 20) {
      const links = el.querySelectorAll('a, button');
      if (links.length >= 1) {
        const s = score(el);
        if (s > 0) candidates.push({ el, score: s, strategy: 'top-child' });
      }
    }
  }

  // Deduplicate (same element from multiple strategies — keep highest)
  const seen = new Map();
  candidates.forEach((c) => {
    const existing = seen.get(c.el);
    if (!existing || c.score > existing.score) {
      seen.set(c.el, c);
    }
  });

  const sorted = Array.from(seen.values()).sort((a, b) => b.score - a.score);
  if (sorted.length === 0) return null;

  const winner = sorted[0];
  const rect = winner.el.getBoundingClientRect();
  const tag = winner.el.tagName.toLowerCase();
  const id = winner.el.id ? '#' + winner.el.id : '';
  const cls = Array.from(winner.el.classList || []).slice(0, 3).join('.');

  return {
    selector: tag + id + (cls ? '.' + cls : ''),
    tag,
    score: winner.score,
    strategy: winner.strategy,
    rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
    linkCount: winner.el.querySelectorAll('a, button, [role="button"]').length,
    hasImages: winner.el.querySelectorAll('img, svg').length > 0,
  };
}
`;

/**
 * Browser-side: find and click the hamburger menu button.
 */
const FIND_HAMBURGER_FN = `
function findHamburger() {
  const vw = window.innerWidth;
  const candidates = [];

  function isVisible(el) {
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== 'none'
      && style.visibility !== 'hidden'
      && rect.width > 0
      && rect.height > 0
      && rect.top < 350;
  }

  function getSelector(el) {
    const tag = el.tagName.toLowerCase();
    if (el.id) return tag + '#' + el.id;
    const cls = Array.from(el.classList || []).slice(0, 3).join('.');
    return cls ? tag + '.' + cls : tag;
  }

  // 1. aria-label patterns
  const ariaLabels = [
    'button[aria-label*="menu" i]',
    'button[aria-label*="nav" i]',
    'button[aria-label*="toggle" i]',
    '[role="button"][aria-label*="menu" i]',
    '[aria-expanded][aria-label*="menu" i]',
    'button[aria-expanded]',
  ];
  ariaLabels.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (isVisible(el)) {
        candidates.push({ el, score: 50, reason: 'aria-label' });
      }
    });
  });

  // 2. Class patterns (strong signals)
  const strongClsPatterns = [
    '[class*="hamburger"]',
    '[class*="menu-toggle"]',
    '[class*="nav-toggle"]',
    '[class*="mobile-menu"]',
    '[class*="menu-btn"]',
    '[class*="menu-button"]',
    '[class*="burger"]',
    '[class*="menu-icon"]',
    '[class*="nav-btn"]',
    '[class*="toggle-menu"]',
    '[class*="menu-trigger"]',
    '[class*="menu-opener"]',
    '[class*="header-menu"]',
    '[class*="main-nav-trigger"]',
    '[class*="nav-trigger"]',
    '[id*="menu-btn"]',
    '[id*="header-menu"]',
  ];
  strongClsPatterns.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!isVisible(el)) return;
      const rect = el.getBoundingClientRect();
      // If element is too wide (likely a container, not the button)
      // look for a clickable child inside it
      if (rect.width > 200) {
        const child = el.querySelector('button, a, [role="button"], svg, img');
        if (child && child.getBoundingClientRect().width <= 150) {
          candidates.push({ el: child, score: 45, reason: 'class-pattern-child' });
        } else {
          candidates.push({ el, score: 30, reason: 'class-pattern-wide' });
        }
      } else {
        candidates.push({ el, score: 45, reason: 'class-pattern' });
      }
    });
  });

  // 2b. Broader class patterns (weaker signal)
  const broadClsPatterns = [
    '[class*="nav-menu"]',
    '[class*="js-menu"]',
    '[class*="js-header-menu"]',
  ];
  broadClsPatterns.forEach((sel) => {
    document.querySelectorAll(sel).forEach((el) => {
      if (!isVisible(el)) return;
      const rect = el.getBoundingClientRect();
      // Only match small elements (likely icons/buttons, not the menu itself)
      if (rect.width <= 150 && rect.height <= 80) {
        candidates.push({ el, score: 35, reason: 'broad-class' });
      }
    });
  });

  // 3. Buttons with 2-3 child spans (common hamburger bar pattern)
  document.querySelectorAll('button, [role="button"]').forEach((el) => {
    if (!isVisible(el)) return;
    const spans = el.querySelectorAll(':scope > span, :scope > div');
    if (spans.length >= 2 && spans.length <= 4) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 60 && rect.height <= 60) {
        candidates.push({ el, score: 25, reason: 'span-bars' });
      }
    }
  });

  // 4. Small buttons in top area with no text (icon buttons)
  document.querySelectorAll('button, [role="button"]').forEach((el) => {
    if (!isVisible(el)) return;
    const rect = el.getBoundingClientRect();
    const text = el.textContent.trim();
    if (rect.width <= 60 && rect.height <= 60
        && rect.top < 100 && text.length <= 3) {
      candidates.push({ el, score: 15, reason: 'small-top-button' });
    }
  });

  // 5. Buttons with text "Menu" or containing menu-related words
  document.querySelectorAll('button, [role="button"]').forEach((el) => {
    if (!isVisible(el)) return;
    const text = el.textContent.trim().toLowerCase();
    if (text === 'menu' || text === 'menü') {
      candidates.push({ el, score: 55, reason: 'menu-text' });
    }
  });

  // Boost score for small/compact elements (likely icon buttons)
  candidates.forEach((c) => {
    const rect = c.el.getBoundingClientRect();
    if (rect.width <= 60 && rect.height <= 60) c.score += 10;
    else if (rect.width > 200) c.score -= 10;
  });

  // Apply penalties for non-hamburger buttons
  const antiPatterns = /search|close|dismiss|cookie|consent|login|sign|cart|account|share|banner|govt|government|official/i;
  candidates.forEach((c) => {
    const label = c.el.getAttribute('aria-label') || '';
    const cls = (c.el.className || '').toString();
    const id = c.el.id || '';
    const text = c.el.textContent.trim();
    if (antiPatterns.test(label) || antiPatterns.test(cls)
        || antiPatterns.test(id)) {
      c.score -= 35;
    }
    // Additional text-based penalty (but not for "Menu" text)
    if (text.length > 10 && !/menu/i.test(text)) {
      c.score -= 10;
    }
  });

  // Deduplicate
  const seen = new Map();
  candidates.forEach((c) => {
    const existing = seen.get(c.el);
    if (!existing || c.score > existing.score) seen.set(c.el, c);
  });

  const sorted = Array.from(seen.values())
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score);
  if (sorted.length === 0) return null;

  const winner = sorted[0];
  return {
    selector: getSelector(winner.el),
    score: winner.score,
    reason: winner.reason,
    rect: winner.el.getBoundingClientRect(),
  };
}
`;

/**
 * Browser-side: count top-level mobile menu items after hamburger opens.
 */
const COUNT_MENU_ITEMS_FN = `
function countMenuItems() {
  const results = [];

  // Find all visible ULs with LI children that appeared/became visible
  document.querySelectorAll('nav ul, [role="menu"], [role="navigation"] ul')
    .forEach((ul) => {
      const style = window.getComputedStyle(ul);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const rect = ul.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return;
      const items = Array.from(ul.querySelectorAll(':scope > li'))
        .filter((li) => {
          const s = window.getComputedStyle(li);
          return s.display !== 'none' && li.getBoundingClientRect().height > 0;
        });
      if (items.length >= 2) {
        results.push({ el: ul, count: items.length, type: 'nav-ul' });
      }
    });

  // Also check div-based menus (accordion patterns)
  const divMenuPatterns = [
    '[class*="mobile-menu"]',
    '[class*="nav-menu"]',
    '[class*="drawer"]',
    '[class*="slide-menu"]',
    '[class*="off-canvas"]',
    '[class*="mobile-nav"]',
    '[class*="menu-panel"]',
    '[class*="nav-panel"]',
    '[class*="menu-list"]',
  ];
  divMenuPatterns.forEach((sel) => {
    document.querySelectorAll(sel).forEach((menu) => {
      const style = window.getComputedStyle(menu);
      if (style.display === 'none' || style.visibility === 'hidden') return;
      const rect = menu.getBoundingClientRect();
      if (rect.height <= 0 || rect.width <= 0) return;
      // Count direct interactive children
      const items = Array.from(menu.children).filter((ch) => {
        const s = window.getComputedStyle(ch);
        if (s.display === 'none') return false;
        if (ch.getBoundingClientRect().height <= 0) return false;
        const hasLink = ch.querySelector('a, button') || ch.tagName === 'A';
        return hasLink || ch.tagName === 'BUTTON';
      });
      if (items.length >= 2) {
        results.push({ el: menu, count: items.length, type: 'div-menu' });
      }
    });
  });

  // Also check any UL that is now visible and has 3+ items
  document.querySelectorAll('ul').forEach((ul) => {
    const style = window.getComputedStyle(ul);
    if (style.display === 'none' || style.visibility === 'hidden') return;
    const rect = ul.getBoundingClientRect();
    if (rect.height <= 0 || rect.width <= 0) return;
    if (rect.top < 0 || rect.top > 800) return;
    const items = Array.from(ul.querySelectorAll(':scope > li'))
      .filter((li) => {
        const s = window.getComputedStyle(li);
        return s.display !== 'none' && li.getBoundingClientRect().height > 0;
      });
    if (items.length >= 3) {
      results.push({ el: ul, count: items.length, type: 'any-ul' });
    }
  });

  // Pick the one most likely to be the main mobile nav
  // Prefer: visible, largest count, in the top portion of the viewport
  if (results.length === 0) return { count: 0, type: null, hasImages: false };

  results.sort((a, b) => {
    const rectA = a.el.getBoundingClientRect();
    const rectB = b.el.getBoundingClientRect();
    // Prefer nav-ul and div-menu over any-ul
    const typePriority = { 'nav-ul': 2, 'div-menu': 2, 'any-ul': 1 };
    const pA = typePriority[a.type] || 0;
    const pB = typePriority[b.type] || 0;
    if (pA !== pB) return pB - pA;
    // Then by visible item count (more = better, for main nav)
    if (a.count !== b.count) return b.count - a.count;
    // Then by position (higher = better)
    return rectA.top - rectB.top;
  });

  const best = results[0];
  const rect = best.el.getBoundingClientRect();
  const hasImages = best.el.querySelectorAll('img, svg').length > 0;
  const tag = best.el.tagName.toLowerCase();
  const cls = (best.el.className || '').toString().slice(0, 60);

  return {
    count: best.count,
    type: best.type,
    hasImages,
    selector: tag + (cls ? '.' + cls.split(' ').slice(0, 2).join('.') : ''),
    rect: { top: rect.top, width: rect.width, height: rect.height },
  };
}
`;

async function main() {
  const { url, validationDir, viewport } = parseArgs();
  if (!url) {
    console.error(
      'Usage: node detect-mobile-structure.js --url=<url> '
      + '[--validation-dir=<path>] [--viewport=375x812]',
    );
    process.exit(2);
  }

  const absValDir = path.resolve(validationDir);
  const mobileDir = path.join(absValDir, 'mobile');
  debugLog(absValDir, 'START', `url=${url}, viewport=${viewport}`);

  let chromium;
  try {
    // eslint-disable-next-line import/no-unresolved
    const pw = await import('playwright');
    chromium = pw.chromium;
  } catch (e) {
    console.error('Playwright not found:', e.message);
    debugLog(absValDir, 'ERROR', `Playwright import failed: ${e.message}`);
    process.exit(2);
  }

  const [rawW, rawH] = viewport.split('x').map(Number);
  const vw = Number.isFinite(rawW) ? rawW : 375;
  const vh = Number.isFinite(rawH) ? rawH : 812;
  const execPath = findLocalChromiumExecutable();
  const launchOpts = { headless: true };
  if (execPath) launchOpts.executablePath = execPath;

  let browser;
  try {
    browser = await chromium.launch(launchOpts);
    const page = await browser.newPage();
    await page.setViewportSize({ width: vw, height: vh });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(3000);

    // Dismiss cookie/consent overlays
    const cookieResult = await page.evaluate(() => {
      const patterns = [
        '#onetrust-accept-btn-handler',
        '[id*="cookie"] button',
        '[class*="cookie"] button',
        'button[class*="accept"]',
        '[class*="consent"] button',
        '[id*="consent"] button',
        'button:has(> span)',
      ];
      let clicked = null;
      patterns.some((sel) => {
        const btns = document.querySelectorAll(sel);
        return Array.from(btns).some((btn) => {
          const text = btn.textContent.toLowerCase();
          if (text.includes('accept') || text.includes('agree')
              || text.includes('allow') || text.includes('ok')
              || text.includes('got it') || text.includes('akzeptieren')
              || text.includes('aceitar')) {
            btn.click();
            clicked = sel;
            return true;
          }
          return false;
        });
      });
      return clicked;
    });
    if (cookieResult) await page.waitForTimeout(500);

    // --- Phase 1: Find header ---
    const headerInfo = await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(`${FIND_HEADER_FN}; return findHeader();`),
    );

    if (!headerInfo) {
      console.error('FAIL: Could not detect header element');
      debugLog(absValDir, 'BLOCK', 'No header detected');
      await browser.close();
      process.exit(1);
    }

    console.log(`Header found: ${headerInfo.selector}`);
    console.log(
      `  strategy=${headerInfo.strategy} score=${headerInfo.score}`
      + ` rect=${JSON.stringify(headerInfo.rect)}`,
    );

    // --- Phase 2: Find hamburger ---
    const hamburgerInfo = await page.evaluate(
      // eslint-disable-next-line no-new-func
      new Function(`${FIND_HAMBURGER_FN}; return findHamburger();`),
    );

    let topLevelMenuItemCount = 0;
    let menuInfo = null;

    if (hamburgerInfo) {
      console.log(
        `Hamburger found: ${hamburgerInfo.selector}`
        + ` (${hamburgerInfo.reason}, score=${hamburgerInfo.score})`,
      );

      try {
        // Click at the hamburger's center coordinates
        const hRect = hamburgerInfo.rect;
        const clickX = hRect.x + hRect.width / 2;
        const clickY = hRect.y + hRect.height / 2;
        await page.mouse.click(clickX, clickY);
        await page.waitForTimeout(800);

        // --- Phase 3: Count menu items ---
        menuInfo = await page.evaluate(
          // eslint-disable-next-line no-new-func
          new Function(`${COUNT_MENU_ITEMS_FN}; return countMenuItems();`),
        );
        topLevelMenuItemCount = menuInfo ? menuInfo.count : 0;

        if (topLevelMenuItemCount > 0) {
          console.log(
            `Menu items: ${topLevelMenuItemCount}`
            + ` (type=${menuInfo.type}, selector=${menuInfo.selector})`,
          );
        } else {
          console.log(
            '[WARN] Hamburger clicked but no menu items detected',
          );
        }
      } catch (clickErr) {
        console.log(
          '[WARN] Hamburger click caused navigation or error:'
          + ` ${clickErr.message.slice(0, 60)}`,
        );
      }
    } else {
      console.log('[WARN] No hamburger button detected');
    }

    await browser.close();

    // --- Build output ---
    const output = {
      viewport: { width: vw, height: vh },
      url,
      timestamp: new Date().toISOString(),
      header: {
        selector: headerInfo.selector,
        strategy: headerInfo.strategy,
        score: headerInfo.score,
        rect: headerInfo.rect,
        linkCount: headerInfo.linkCount,
        hasImages: headerInfo.hasImages,
      },
      hamburger: hamburgerInfo ? {
        selector: hamburgerInfo.selector,
        reason: hamburgerInfo.reason,
        score: hamburgerInfo.score,
      } : null,
      menu: menuInfo ? {
        topLevelItemCount: menuInfo.count,
        type: menuInfo.type,
        hasImages: menuInfo.hasImages,
        selector: menuInfo.selector,
      } : null,
      topLevelMenuItemCount,
      cookieDismissed: cookieResult || null,
    };

    if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });
    const outPath = path.join(mobileDir, 'mobile-structure-detection.json');
    const markerPath = path.join(
      mobileDir,
      '.mobile-structure-detection-complete',
    );
    fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
    fs.writeFileSync(markerPath, JSON.stringify({
      timestamp: output.timestamp,
      url,
      headerSelector: headerInfo.selector,
      topLevelMenuItemCount,
      hash: crypto.createHash('sha256')
        .update(JSON.stringify(output)).digest('hex'),
    }), 'utf-8');

    console.log('=== Mobile Structure Detection Complete ===');
    console.log(JSON.stringify(output, null, 2));
    debugLog(
      absValDir,
      'PASS',
      `header=${headerInfo.selector} hamburger=${hamburgerInfo?.selector || 'none'}`
      + ` menuItems=${topLevelMenuItemCount}`,
    );
    process.exit(0);
  } catch (e) {
    if (browser) await browser.close().catch(() => {});
    console.error(`FAIL: ${e.message}`);
    debugLog(absValDir, 'BLOCK', `FAILED — ${e.message}`);
    process.exit(1);
  }
}

main();
