#!/usr/bin/env node

/*
 * live-compare-mobile-panels.js — UNFAKEABLE mobile panel comparison
 *
 * Opens hamburger on SOURCE and MIGRATED independently at 375x812,
 * detects interaction pattern (slide-in vs accordion), clicks each
 * top-level heading, extracts sub-panel content, and compares.
 * Writes register + SHA-256 hashed marker.
 *
 * Interaction pattern detection:
 *   - SLIDE-IN: clicking heading hides original menu, new panel
 *     slides in (translateX), back button present, fills drawer
 *   - ACCORDION: clicking heading expands sub-items inline, other
 *     headings remain visible, no back button, height animation
 *
 * Uses universal header/hamburger detection (no site-specific selectors).
 *
 * Usage:
 *   node live-compare-mobile-panels.js \
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
  const line = `[${ts}] ${prefix} [SCRIPT:live-compare-mobile-panels]`
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

/**
 * Universal hamburger finder (same heuristics as detect-mobile-structure.js)
 */
async function findHamburger(page) {
  return page.evaluate(() => {
    const candidates = [];
    const antiPatterns = /search|close|dismiss|cookie|consent|login|sign|cart|account|share|banner|govt|government|official/i;

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && rect.width > 0 && rect.height > 0 && rect.top < 350;
    }

    document.querySelectorAll(
      'button[aria-label*="menu" i], button[aria-label*="nav" i], '
      + 'button[aria-expanded]',
    ).forEach((el) => {
      if (isVisible(el)) candidates.push({ el, score: 50 });
    });

    const pats = [
      '[class*="hamburger"]', '[class*="menu-toggle"]',
      '[class*="menu-btn"]', '[class*="menu-button"]',
      '[class*="burger"]', '[class*="menu-opener"]',
      '[class*="nav-trigger"]', '[class*="main-nav-trigger"]',
      '[class*="header-menu"]', '[id*="header-menu"]',
    ];
    pats.forEach((sel) => {
      document.querySelectorAll(sel).forEach((el) => {
        if (isVisible(el)) candidates.push({ el, score: 45 });
      });
    });

    document.querySelectorAll('button, [role="button"]').forEach((el) => {
      if (!isVisible(el)) return;
      if (el.textContent.trim().toLowerCase() === 'menu') {
        candidates.push({ el, score: 55 });
      }
    });

    candidates.forEach((c) => {
      const label = c.el.getAttribute('aria-label') || '';
      const cls = (c.el.className || '').toString();
      const id = c.el.id || '';
      if (antiPatterns.test(label) || antiPatterns.test(cls)
          || antiPatterns.test(id)) {
        c.score -= 35;
      }
      const rect = c.el.getBoundingClientRect();
      if (rect.width > 200) c.score -= 10;
      if (c.el.textContent.trim().length > 10
          && !/menu/i.test(c.el.textContent)) {
        c.score -= 10;
      }
    });

    const valid = candidates.filter((c) => c.score > 0);
    valid.sort((a, b) => b.score - a.score);
    if (valid.length === 0) return null;

    const rect = valid[0].el.getBoundingClientRect();
    return {
      x: rect.x, y: rect.y, width: rect.width, height: rect.height,
    };
  });
}

/**
 * Find first clickable top-level heading in the open mobile menu.
 * Returns bounding rect of the trigger element, or null.
 */
async function findFirstHeadingTrigger(page) {
  return page.evaluate(() => {
    // Look for visible clickable items in the open menu
    const menuSels = [
      '[class*="mobile-menu"]', '[class*="nav-menu"]',
      '[class*="mobile-nav"]', '[class*="menu-panel"]',
      '[class*="drawer"]', '[class*="off-canvas"]',
      'nav ul',
    ];

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && rect.width > 0 && rect.height > 0;
    }

    // Find the main visible nav container
    let container = null;
    menuSels.some((sel) => {
      const els = document.querySelectorAll(sel);
      return Array.from(els).some((el) => {
        if (isVisible(el) && el.getBoundingClientRect().height > 100) {
          container = el;
          return true;
        }
        return false;
      });
    });

    if (!container) {
      // fallback: look for any visible container with multiple buttons/links
      const allContainers = document.querySelectorAll(
        '[class*="panel"], [class*="menu"], [class*="nav"]',
      );
      Array.from(allContainers).some((el) => {
        if (!isVisible(el)) return false;
        const rect = el.getBoundingClientRect();
        if (rect.height < 100) return false;
        const triggers = el.querySelectorAll('button, a');
        const visTriggers = Array.from(triggers).filter((t) => isVisible(t));
        if (visTriggers.length >= 3) {
          container = el;
          return true;
        }
        return false;
      });
    }

    if (!container) return null;

    // Find items that look like top-level menu headings (buttons or links
    // that have siblings suggesting they expand sub-content)
    const triggerCandidates = container.querySelectorAll(
      ':scope > * button, :scope > * > a, '
      + ':scope > li > button, :scope > li > a, '
      + ':scope > div > button, :scope > div > a',
    );

    const found = Array.from(triggerCandidates).find((trigger) => {
      if (!isVisible(trigger)) return false;
      const rect = trigger.getBoundingClientRect();
      if (rect.height < 20 || rect.height > 80) return false;
      const text = trigger.textContent.trim();
      if (!text || text.length > 40) return false;
      if (/search|login|sign|cart|account|language|locale/i.test(text)) return false;
      return true;
    });
    if (!found) return null;
    const foundRect = found.getBoundingClientRect();
    return {
      x: foundRect.x,
      y: foundRect.y,
      width: foundRect.width,
      height: foundRect.height,
      text: found.textContent.trim(),
    };
  });
}

/**
 * Detect the interaction pattern after clicking a heading.
 *
 * Captures state before and after click, then determines:
 *  - slide-in: original headings become invisible/offscreen, new panel appears
 *  - accordion: heading's sibling expands inline, others stay visible
 *
 * Key insight: React slide-in panels keep items in DOM but translate them
 * off-screen (transform: translateX(-100%)). So we check both CSS visibility
 * AND whether items are within the viewport bounds.
 *
 * Returns { pattern: 'slide-in'|'accordion'|'unknown', signals: {...} }
 */
async function detectInteractionPattern(page, headingRect) {
  const viewportSize = page.viewportSize();
  const vpWidth = viewportSize?.width || 375;

  // 1. Capture pre-click state: all visible nav items and their positions
  const preState = await page.evaluate((vpW) => {
    function isOnScreen(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && style.opacity !== '0' && rect.width > 0 && rect.height > 0
        && rect.left > -50 && rect.right < vpW + 50
        && rect.top > -50 && rect.bottom < window.innerHeight + 50;
    }

    const navEls = document.querySelectorAll(
      'nav button, nav a, [class*="menu"] button, [class*="menu"] a, '
      + '[class*="nav"] button, [class*="nav"] a',
    );
    const items = [];
    navEls.forEach((el) => {
      if (!isOnScreen(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > 60 && rect.top < 800) {
        items.push({
          text: el.textContent.trim().slice(0, 30),
          top: Math.round(rect.top),
          left: Math.round(rect.left),
        });
      }
    });

    // Check for any existing back button
    const backSels = [
      '[class*="back"]', '[aria-label*="back" i]', '[class*="voltar"]',
      '[aria-label*="voltar" i]', '[class*="prev"]', '[class*="return"]',
      '[class*="arrow-left"]', '[class*="chevron-left"]',
    ];
    const hasBackBefore = backSels.some((sel) => {
      const els = document.querySelectorAll(sel);
      return Array.from(els).some((el) => isOnScreen(el));
    });

    return { items, hasBackBefore, itemCount: items.length };
  }, vpWidth);

  // 2. Click the heading
  await page.mouse.click(
    headingRect.x + headingRect.width / 2,
    headingRect.y + headingRect.height / 2,
  );
  await page.waitForTimeout(800);

  // 3. Capture post-click state
  const postState = await page.evaluate((args) => {
    const { preItems, vpW } = args;

    function isOnScreen(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && style.opacity !== '0' && rect.width > 0 && rect.height > 0
        && rect.left > -50 && rect.right < vpW + 50
        && rect.top > -50 && rect.bottom < window.innerHeight + 50;
    }

    function isDomVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && style.opacity !== '0' && rect.width > 0 && rect.height > 0;
    }

    const navEls = document.querySelectorAll(
      'nav button, nav a, [class*="menu"] button, [class*="menu"] a, '
      + '[class*="nav"] button, [class*="nav"] a',
    );

    // Check which items are still ON-SCREEN (not just DOM-visible)
    const currentOnScreenTexts = new Set();
    navEls.forEach((el) => {
      if (!isOnScreen(el)) return;
      currentOnScreenTexts.add(el.textContent.trim().slice(0, 30));
    });

    let originalItemsOnScreen = 0;
    preItems.forEach((item) => {
      if (currentOnScreenTexts.has(item.text)) originalItemsOnScreen += 1;
    });

    // Also count items that are in DOM but OFF-SCREEN (translated away)
    let itemsMovedOffscreen = 0;
    navEls.forEach((el) => {
      if (!isDomVisible(el)) return;
      if (isOnScreen(el)) return;
      const text = el.textContent.trim().slice(0, 30);
      if (preItems.some((pi) => pi.text === text)) {
        itemsMovedOffscreen += 1;
      }
    });

    // Check for back button appearing
    const backSels = [
      '[class*="back"]', '[aria-label*="back" i]', '[class*="voltar"]',
      '[aria-label*="voltar" i]', '[class*="prev"]', '[class*="return"]',
      '[class*="arrow-left"]', '[class*="chevron-left"]',
    ];
    const hasBackAfter = backSels.some((sel) => {
      const els = document.querySelectorAll(sel);
      return Array.from(els).some((el) => isOnScreen(el));
    });

    // Check for translated panels (slide-in evidence via transform)
    let hasTranslatedPanel = false;
    let hasPanelFillingDrawer = false;
    let translatedPanelCount = 0;

    const allEls = document.querySelectorAll('*');
    allEls.forEach((el) => {
      const style = window.getComputedStyle(el);
      const transform = style.transform || '';
      if (transform === 'none' || transform === '') return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 100 || rect.height < 100) return;
      // Element has a transform and is large enough to be a panel
      if (isDomVisible(el)) {
        hasTranslatedPanel = true;
        translatedPanelCount += 1;
      }
      if (rect.height > 300 && rect.width > 250) {
        hasPanelFillingDrawer = true;
      }
    });

    // Check if parent containers of pre-click items have transforms
    let parentHasTransform = false;
    navEls.forEach((el) => {
      const text = el.textContent.trim().slice(0, 30);
      if (!preItems.some((pi) => pi.text === text)) return;
      let parent = el.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        const style = window.getComputedStyle(parent);
        const transform = style.transform || '';
        if (transform !== 'none' && transform !== '') {
          parentHasTransform = true;
          break;
        }
        parent = parent.parentElement;
        depth += 1;
      }
    });

    // Accordion signals
    const allOnScreenNow = [];
    navEls.forEach((el) => {
      if (!isOnScreen(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.top > 60) allOnScreenNow.push(rect.top);
    });
    const totalOnScreenNow = allOnScreenNow.length;

    let hasHeightExpansion = false;
    const subPanels = document.querySelectorAll(
      '[class*="sub"], [class*="submenu"], [class*="collapse"], '
      + '[class*="expand"], [class*="dropdown"]',
    );
    subPanels.forEach((el) => {
      if (!isOnScreen(el)) return;
      const rect = el.getBoundingClientRect();
      if (rect.height > 30 && rect.height < 500) {
        hasHeightExpansion = true;
      }
    });

    return {
      originalItemsOnScreen,
      itemsMovedOffscreen,
      hasBackAfter,
      hasTranslatedPanel,
      hasPanelFillingDrawer,
      translatedPanelCount,
      parentHasTransform,
      totalOnScreenNow,
      hasHeightExpansion,
    };
  }, { preItems: preState.items, vpW: vpWidth });

  // 4. Score the pattern
  let slideInScore = 0;
  let accordionScore = 0;

  const onScreenRatio = preState.itemCount > 0
    ? postState.originalItemsOnScreen / preState.itemCount : 1;
  const offscreenCount = postState.itemsMovedOffscreen;

  // Slide-in signals: items disappear from viewport
  if (onScreenRatio < 0.3) slideInScore += 40;
  else if (onScreenRatio < 0.5) slideInScore += 25;
  else if (onScreenRatio < 0.7) slideInScore += 10;

  // Items moved off-screen (translated) is strong slide-in signal
  if (offscreenCount > 2) slideInScore += 35;
  else if (offscreenCount > 0) slideInScore += 20;

  if (postState.hasBackAfter && !preState.hasBackBefore) slideInScore += 30;
  if (postState.parentHasTransform) slideInScore += 25;
  if (postState.hasTranslatedPanel) slideInScore += 15;
  if (postState.hasPanelFillingDrawer) slideInScore += 10;

  // Accordion signals: items stay visible, sub-items expand inline
  if (onScreenRatio > 0.7) accordionScore += 35;
  if (offscreenCount === 0) accordionScore += 15;
  if (postState.totalOnScreenNow > preState.itemCount) accordionScore += 20;
  if (postState.hasHeightExpansion) accordionScore += 20;
  if (!postState.hasBackAfter) accordionScore += 15;
  if (!postState.parentHasTransform && !postState.hasTranslatedPanel) accordionScore += 10;

  let pattern = 'unknown';
  if (slideInScore > accordionScore && slideInScore >= 30) pattern = 'slide-in';
  else if (accordionScore > slideInScore && accordionScore >= 30) pattern = 'accordion';

  const signals = {
    preClickItemCount: preState.itemCount,
    postClickOriginalOnScreen: postState.originalItemsOnScreen,
    itemsMovedOffscreen: offscreenCount,
    originalOnScreenRatio: Math.round(onScreenRatio * 100),
    backButtonAppeared: postState.hasBackAfter && !preState.hasBackBefore,
    parentHasTransform: postState.parentHasTransform,
    hasTranslatedPanel: postState.hasTranslatedPanel,
    translatedPanelCount: postState.translatedPanelCount,
    hasPanelFillingDrawer: postState.hasPanelFillingDrawer,
    postClickTotalOnScreen: postState.totalOnScreenNow,
    hasHeightExpansion: postState.hasHeightExpansion,
    slideInScore,
    accordionScore,
  };

  return { pattern, signals, headingClicked: headingRect.text || 'unknown' };
}

/**
 * Dismiss cookie banners on the page.
 */
async function dismissCookies(page) {
  await page.evaluate(() => {
    const patterns = [
      '#onetrust-accept-btn-handler',
      '[id*="cookie"] button',
      '[class*="cookie"] button',
      '[class*="consent"] button',
    ];
    patterns.some((sel) => {
      const btns = document.querySelectorAll(sel);
      return Array.from(btns).some((btn) => {
        const text = btn.textContent.toLowerCase();
        if (text.includes('accept') || text.includes('agree')
            || text.includes('allow') || text.includes('ok')
            || text.includes('akzeptieren') || text.includes('aceitar')) {
          btn.click();
          return true;
        }
        return false;
      });
    });
  });
  await page.waitForTimeout(500);
}

/**
 * Extract mobile menu content AND interaction pattern from a page.
 * Returns { headings: [...], interactionPattern: {...}, error: string|null }
 */
async function extractMobileMenu(page, url, vw, vh) {
  await page.setViewportSize({ width: vw, height: vh });
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForTimeout(3000);

  await dismissCookies(page);

  // Find and click hamburger
  const hamburgerRect = await findHamburger(page);
  if (!hamburgerRect) return { error: 'hamburger-not-found', headings: [], interactionPattern: null };

  await page.mouse.click(
    hamburgerRect.x + hamburgerRect.width / 2,
    hamburgerRect.y + hamburgerRect.height / 2,
  );
  await page.waitForTimeout(800);

  // Extract all top-level headings
  const menuData = await page.evaluate(() => {
    const results = [];

    function isVisible(el) {
      const style = window.getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      return style.display !== 'none' && style.visibility !== 'hidden'
        && rect.width > 0 && rect.height > 0;
    }

    function extractLinks(container) {
      const links = [];
      container.querySelectorAll('a').forEach((a) => {
        const style = window.getComputedStyle(a);
        if (style.display === 'none') return;
        const text = a.textContent.trim();
        if (!text) return;
        links.push({
          text,
          href: a.href,
          hasImage: a.querySelector('img') !== null,
        });
      });
      return links;
    }

    // Strategy 1: nav ul > li
    const navUls = document.querySelectorAll('nav ul');
    let bestUl = null;
    let bestCount = 0;
    navUls.forEach((ul) => {
      const items = Array.from(ul.querySelectorAll(':scope > li')).filter(
        (li) => isVisible(li),
      );
      if (items.length > bestCount) {
        bestCount = items.length;
        bestUl = ul;
      }
    });

    // Strategy 2: div-based mobile menus
    const divMenuSels = [
      '[class*="mobile-menu"]', '[class*="nav-menu"]',
      '[class*="mobile-nav"]', '[class*="menu-panel"]',
      '[class*="drawer"]', '[class*="off-canvas"]',
    ];
    let divMenu = null;
    divMenuSels.some((sel) => {
      const el = document.querySelector(sel);
      if (el && isVisible(el) && el.getBoundingClientRect().height > 0) {
        divMenu = el;
        return true;
      }
      return false;
    });

    if (bestUl) {
      Array.from(bestUl.querySelectorAll(':scope > li')).forEach((li) => {
        if (!isVisible(li)) return;
        const trigger = li.querySelector(
          ':scope > a, :scope > button, :scope > [role="button"]',
        );
        if (!trigger) return;
        const heading = trigger.textContent.trim().replace(/[›»▸→↓‹«◂←↑]/g, '').trim();
        const subUl = li.querySelector(':scope > ul, :scope > div > ul');
        const links = subUl ? extractLinks(subUl) : [];
        results.push({ heading, linkCount: links.length, links });
      });
    } else if (divMenu) {
      Array.from(divMenu.children).forEach((item) => {
        if (!isVisible(item)) return;
        const trigger = item.querySelector('button, a, [role="button"]');
        if (!trigger) return;
        const heading = trigger.textContent.trim().replace(/[›»▸→↓‹«◂←↑]/g, '').trim();
        const subPanel = item.querySelector(
          '[class*="sub"], [class*="panel"], [class*="dropdown"], ul',
        );
        const links = subPanel ? extractLinks(subPanel) : [];
        results.push({ heading, linkCount: links.length, links });
      });
    }

    return results;
  });

  // Detect interaction pattern by clicking the first heading
  const firstHeading = await findFirstHeadingTrigger(page);
  let interactionPattern = null;

  if (firstHeading) {
    interactionPattern = await detectInteractionPattern(page, firstHeading);
  } else {
    interactionPattern = {
      pattern: 'unknown',
      signals: { note: 'Could not find clickable heading to test' },
      headingClicked: null,
    };
  }

  return { error: null, headings: menuData, interactionPattern };
}

function compareMenus(sourceHeadings, migratedHeadings) {
  const comparisons = [];
  let allMatch = true;

  sourceHeadings.forEach((srcH) => {
    const migH = migratedHeadings.find(
      (m) => m.heading.toLowerCase() === srcH.heading.toLowerCase(),
    );

    if (!migH) {
      comparisons.push({
        heading: srcH.heading,
        status: 'MISSING',
        source: { linkCount: srcH.linkCount },
        migrated: null,
      });
      allMatch = false;
      return;
    }

    const linkCountMatch = srcH.linkCount === migH.linkCount;
    const srcTexts = srcH.links.map((l) => l.text.toLowerCase());
    const migTexts = migH.links.map((l) => l.text.toLowerCase());
    const textOverlap = srcTexts.filter((t) => migTexts.includes(t)).length;
    const textMatchRatio = srcH.linkCount > 0
      ? textOverlap / srcH.linkCount : 1;

    const status = linkCountMatch && textMatchRatio >= 0.8
      ? 'MATCH' : 'MISMATCH';
    if (status !== 'MATCH') allMatch = false;

    comparisons.push({
      heading: srcH.heading,
      status,
      source: { linkCount: srcH.linkCount },
      migrated: { linkCount: migH.linkCount },
      textMatchRatio: Math.round(textMatchRatio * 100),
    });
  });

  // Check for extra headings in migrated
  migratedHeadings.forEach((migH) => {
    const found = sourceHeadings.find(
      (s) => s.heading.toLowerCase() === migH.heading.toLowerCase(),
    );
    if (!found) {
      comparisons.push({
        heading: migH.heading,
        status: 'EXTRA',
        source: null,
        migrated: { linkCount: migH.linkCount },
      });
    }
  });

  return { comparisons, allMatch };
}

async function main() {
  const {
    sourceUrl, migratedUrl, validationDir, viewport,
  } = parseArgs();
  if (!sourceUrl || !migratedUrl) {
    console.error(
      'Usage: node live-compare-mobile-panels.js '
      + '--source=<url> --migrated=<url> '
      + '[--validation-dir=<path>]',
    );
    process.exit(2);
  }

  const absValDir = path.resolve(validationDir);
  const mobileDir = path.join(absValDir, 'mobile');
  debugLog(absValDir, 'START', `source=${sourceUrl} migrated=${migratedUrl}`);

  let chromium;
  try {
    // eslint-disable-next-line import/no-unresolved
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
    console.log('Extracting SOURCE mobile menu...');
    const srcPage = await browser.newPage();
    const sourceResult = await extractMobileMenu(srcPage, sourceUrl, vw, vh);
    await srcPage.close();

    if (sourceResult.error) {
      console.log(`[WARN] Source extraction issue: ${sourceResult.error}`);
    }
    console.log(
      `  Source headings: ${sourceResult.headings.length}`
      + ` [${sourceResult.headings.map((h) => h.heading).join(', ')}]`,
    );
    console.log(
      `  Source interaction pattern: ${sourceResult.interactionPattern?.pattern || 'unknown'}`,
    );

    console.log('Extracting MIGRATED mobile menu...');
    const migPage = await browser.newPage();
    const migratedResult = await extractMobileMenu(
      migPage,
      migratedUrl,
      vw,
      vh,
    );
    await migPage.close();

    if (migratedResult.error) {
      console.log(
        `[WARN] Migrated extraction issue: ${migratedResult.error}`,
      );
    }
    console.log(
      `  Migrated headings: ${migratedResult.headings.length}`
      + ` [${migratedResult.headings.map((h) => h.heading).join(', ')}]`,
    );
    console.log(
      `  Migrated interaction pattern: ${migratedResult.interactionPattern?.pattern || 'unknown'}`,
    );

    await browser.close();

    // Compare content
    const { comparisons, allMatch: contentMatch } = compareMenus(
      sourceResult.headings,
      migratedResult.headings,
    );

    // Compare interaction patterns
    const srcPattern = sourceResult.interactionPattern?.pattern || 'unknown';
    const migPattern = migratedResult.interactionPattern?.pattern || 'unknown';
    const patternMatch = srcPattern === migPattern;
    const patternMismatchNote = !patternMatch
      ? `Source uses "${srcPattern}" but migrated uses "${migPattern}"`
      : null;

    const allMatch = contentMatch && patternMatch;

    const register = {
      timestamp: new Date().toISOString(),
      sourceUrl,
      migratedUrl,
      viewport: `${vw}x${vh}`,
      source: {
        headingCount: sourceResult.headings.length,
        headings: sourceResult.headings.map((h) => ({
          heading: h.heading,
          linkCount: h.linkCount,
        })),
        interactionPattern: sourceResult.interactionPattern,
        error: sourceResult.error,
      },
      migrated: {
        headingCount: migratedResult.headings.length,
        headings: migratedResult.headings.map((h) => ({
          heading: h.heading,
          linkCount: h.linkCount,
        })),
        interactionPattern: migratedResult.interactionPattern,
        error: migratedResult.error,
      },
      comparisons,
      contentMatch,
      patternMatch,
      patternMismatchNote,
      allMatch,
    };

    // Write outputs
    if (!fs.existsSync(mobileDir)) fs.mkdirSync(mobileDir, { recursive: true });
    const registerPath = path.join(
      mobileDir,
      'mobile-panel-comparison.json',
    );
    fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));

    // Write hashed marker
    const markerContent = JSON.stringify({
      timestamp: register.timestamp,
      sourceUrl,
      migratedUrl,
      contentMatch,
      patternMatch,
      sourcePattern: srcPattern,
      migratedPattern: migPattern,
      allMatch,
      sourceHeadings: sourceResult.headings.length,
      migratedHeadings: migratedResult.headings.length,
      hash: crypto.createHash('sha256')
        .update(JSON.stringify(register)).digest('hex'),
    });
    fs.writeFileSync(
      path.join(mobileDir, '.mobile-panel-comparison-complete'),
      markerContent,
    );

    // Print results
    console.log(`\n${'='.repeat(60)}`);
    console.log('MOBILE PANEL COMPARISON RESULTS');
    console.log(`${'='.repeat(60)}`);

    console.log('\n--- INTERACTION PATTERN ---');
    console.log(`  Source:   ${srcPattern}`);
    if (sourceResult.interactionPattern?.signals) {
      const s = sourceResult.interactionPattern.signals;
      console.log(`    Heading clicked: "${sourceResult.interactionPattern.headingClicked}"`);
      console.log(`    Items on-screen after click: ${s.originalOnScreenRatio}%`);
      console.log(`    Items moved offscreen: ${s.itemsMovedOffscreen}`);
      console.log(`    Back button appeared: ${s.backButtonAppeared}`);
      console.log(`    Parent has transform: ${s.parentHasTransform}`);
      console.log(`    Translated panels: ${s.translatedPanelCount}`);
      console.log(`    Panel fills drawer: ${s.hasPanelFillingDrawer}`);
      console.log(`    Scores — slide-in: ${s.slideInScore}, accordion: ${s.accordionScore}`);
    }
    console.log(`  Migrated: ${migPattern}`);
    if (migratedResult.interactionPattern?.signals) {
      const s = migratedResult.interactionPattern.signals;
      console.log(`    Heading clicked: "${migratedResult.interactionPattern.headingClicked}"`);
      console.log(`    Items on-screen after click: ${s.originalOnScreenRatio}%`);
      console.log(`    Items moved offscreen: ${s.itemsMovedOffscreen}`);
      console.log(`    Back button appeared: ${s.backButtonAppeared}`);
      console.log(`    Parent has transform: ${s.parentHasTransform}`);
      console.log(`    Translated panels: ${s.translatedPanelCount}`);
      console.log(`    Panel fills drawer: ${s.hasPanelFillingDrawer}`);
      console.log(`    Scores — slide-in: ${s.slideInScore}, accordion: ${s.accordionScore}`);
    }
    const patternIcon = patternMatch ? '✅' : '❌';
    console.log(`  ${patternIcon} Pattern match: ${patternMatch ? 'YES' : 'NO'}`);
    if (patternMismatchNote) console.log(`  ⚠️  ${patternMismatchNote}`);

    console.log('\n--- CONTENT COMPARISON ---');
    comparisons.forEach((c) => {
      const icon = c.status === 'MATCH' ? '✅' : '❌';
      let detail;
      if (c.source && c.migrated) {
        detail = `src=${c.source.linkCount} mig=${c.migrated.linkCount}`;
      } else if (!c.migrated) {
        detail = 'NOT FOUND in migrated';
      } else {
        detail = `EXTRA in migrated (${c.migrated.linkCount} links)`;
      }
      console.log(`  ${icon} ${c.heading}: ${c.status} (${detail})`);
    });

    console.log('\n--- OVERALL ---');
    console.log(`  Content match:     ${contentMatch ? '✅ ALL MATCH' : '❌ MISMATCHES'}`);
    console.log(`  Pattern match:     ${patternMatch ? '✅ SAME' : '❌ DIFFERENT'}`);
    console.log(`  Combined verdict:  ${allMatch ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`${'='.repeat(60)}`);

    debugLog(
      absValDir,
      allMatch ? 'PASS' : 'BLOCK',
      `${allMatch ? 'PASSED' : 'FAILED'} — content: `
      + `${comparisons.filter((c) => c.status === 'MATCH').length}`
      + `/${comparisons.length} panels, pattern: `
      + `src=${srcPattern} mig=${migPattern} (${patternMatch ? 'match' : 'MISMATCH'})`,
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
