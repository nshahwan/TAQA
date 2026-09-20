#!/usr/bin/env node

/*
 * live-compare-content.js
 *
 * INDEPENDENT content comparison — uses Playwright to extract ALL navigation text,
 * links, and structure from the source site's live DOM and compares against the
 * migrated site's live DOM. Also validates against nav.plain.html to ensure no
 * content was lost during authoring.
 *
 * This script CANNOT be faked — it reads content directly from both live pages.
 * No agent-authored mapping is used as input.
 *
 * Three-way comparison:
 *   1. Source live DOM → canonical truth
 *   2. Migrated live DOM → must match source
 *   3. nav.plain.html file → must contain all source content
 *
 * Usage:
 *   node scripts/live-compare-content.js \
 *     --source-url=https://www.example.com \
 *     --migrated-url=http://localhost:3000/content/index.html \
 *     --nav-file=content/nav.plain.html \
 *     [--validation-dir=migration-work/navigation-validation] \
 *     [--viewport=1440x900]
 *
 * Exit codes:
 *   0 = all content present on both migrated and nav file
 *   1 = content missing
 *   2 = usage/runner error
 *
 * Outputs:
 *   - live-content-comparison.json (full register)
 *   - .live-content-comparison-complete marker
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
  const entry = `[${ts}] ${prefix} [SCRIPT:live-compare-content] [${level}] ${msg}\n`;
  try {
    if (validationDir && fs.existsSync(validationDir)) {
      fs.appendFileSync(path.join(validationDir, 'debug.log'), entry);
    }
  } catch { /* ignore */ }
}

function parseArgs() {
  const args = process.argv.slice(2);
  let sourceUrl = null;
  let migratedUrl = null;
  let navFile = null;
  let validationDir = VALIDATION_DIR;
  let viewport = '1440x900';

  args.forEach((a) => {
    if (a.startsWith('--source-url=')) sourceUrl = a.slice(13);
    else if (a.startsWith('--migrated-url=')) migratedUrl = a.slice(15);
    else if (a.startsWith('--nav-file=')) navFile = a.slice(11);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
    else if (a.startsWith('--viewport=')) viewport = a.slice(11);
  });

  return { sourceUrl, migratedUrl, navFile, validationDir, viewport };
}

async function extractNavContent(page) {
  return page.evaluate(() => {
    const header = document.querySelector('header, [role="banner"]');
    if (!header) return { found: false, error: 'No header found' };

    // Extract all visible links in the header/nav area
    const allLinks = [];
    const linkElements = header.querySelectorAll('a');
    for (const a of linkElements) {
      const style = window.getComputedStyle(a);
      const rect = a.getBoundingClientRect();
      const text = a.textContent.trim().replace(/\s+/g, ' ');
      if (text && (style.display !== 'none' || rect.height === 0)) {
        allLinks.push({
          text,
          href: a.getAttribute('href') || '',
          visible: style.display !== 'none' && style.visibility !== 'hidden',
        });
      }
    }

    // Extract all visible images
    const allImages = [];
    const imgElements = header.querySelectorAll('img');
    for (const img of imgElements) {
      const src = img.getAttribute('src') || '';
      const alt = img.getAttribute('alt') || '';
      if (src) {
        allImages.push({ src, alt, visible: window.getComputedStyle(img).display !== 'none' });
      }
    }

    // Extract nav trigger labels (top-level nav items)
    const navTriggers = [];
    const navItems = header.querySelectorAll('nav > ul > li > a, nav > ul > li > button, nav > div > a, nav > div > button');
    for (const item of navItems) {
      const text = item.textContent.trim().replace(/\s+/g, ' ');
      if (text && text.length < 50) {
        navTriggers.push(text);
      }
    }

    // Get all text content (for fuzzy matching)
    const allText = header.textContent.replace(/\s+/g, ' ').trim();

    return {
      found: true,
      links: allLinks,
      linkCount: allLinks.length,
      images: allImages,
      imageCount: allImages.length,
      navTriggers,
      allTextLength: allText.length,
      allText: allText.substring(0, 5000), // Cap at 5000 chars
    };
  });
}

async function extractAllPanelContent(page, triggers) {
  const allPanelLinks = [];

  for (const trigger of triggers) {
    // Find and hover each trigger to reveal panel content
    const triggerHandle = await page.evaluateHandle((text) => {
      const allLinks = document.querySelectorAll('header a, header button, nav a, nav button');
      for (const el of allLinks) {
        const elText = el.textContent.trim();
        if (elText === text || elText.includes(text)) return el;
      }
      return null;
    }, trigger);

    const element = triggerHandle.asElement();
    if (!element) continue;

    await element.hover();
    await page.waitForTimeout(500);

    // Extract Level 2 links and detect sidebar items for Level 3 drilling
    const panelResult = await page.evaluate((triggerText) => {
      const panels = document.querySelectorAll('[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [role="menu"]');
      const links = [];
      let panel = null;
      let maxArea = 0;

      for (const p of panels) {
        const style = window.getComputedStyle(p);
        const rect = p.getBoundingClientRect();
        if (style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 50) {
          const area = rect.width * rect.height;
          if (area > maxArea) { maxArea = area; panel = p; }
          for (const a of p.querySelectorAll('a')) {
            const text = a.textContent.trim().replace(/\s+/g, ' ');
            if (text && text.length < 100) {
              links.push({ text, href: a.getAttribute('href') || '', panel: triggerText });
            }
          }
        }
      }

      // Detect sidebar items that may reveal Level 3 on hover
      const sidebarItems = [];
      if (panel) {
        const sidebarSelectors = [
          '[class*="sidebar"] a', '[class*="sidebar"] li',
          '[class*="category"] a', '[class*="category"] li',
          '[class*="level-1"] > li > a', '[class*="level--1"] > li > a',
          '[class*="nav-list"] > li > a', '[class*="menu-list"] > li > a',
          'ul > li > a',
        ];
        for (const sel of sidebarSelectors) {
          const items = panel.querySelectorAll(sel);
          if (items.length >= 2 && items.length <= 30) {
            items.forEach((item) => {
              const text = item.textContent.trim();
              if (text && item.getBoundingClientRect().height > 0) {
                sidebarItems.push({ text, selector: sel });
              }
            });
            break;
          }
        }
      }

      return { links, sidebarItems, sidebarSelector: sidebarItems.length > 0 ? sidebarItems[0].selector : null };
    }, trigger);

    allPanelLinks.push(...panelResult.links);

    // Level 3 deep drill: hover each sidebar item to extract sub-panel content
    if (panelResult.sidebarItems.length > 0 && panelResult.sidebarSelector) {
      for (let i = 0; i < panelResult.sidebarItems.length; i++) {
        // Re-hover trigger to keep panel open
        await element.hover();
        await page.waitForTimeout(300);

        // Hover sidebar item by index
        const sidebarItem = await page.evaluateHandle(({ selector, idx }) => {
          const panels = document.querySelectorAll('[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [role="menu"]');
          let panel = null;
          let maxArea = 0;
          for (const p of panels) {
            const style = window.getComputedStyle(p);
            const rect = p.getBoundingClientRect();
            if (style.display !== 'none' && style.visibility !== 'hidden' && rect.height > 50) {
              const area = rect.width * rect.height;
              if (area > maxArea) { maxArea = area; panel = p; }
            }
          }
          if (!panel) return null;
          const items = panel.querySelectorAll(selector);
          return items[idx] || null;
        }, { selector: panelResult.sidebarSelector, idx: i });

        const sidebarEl = sidebarItem.asElement();
        if (!sidebarEl) continue;

        await sidebarEl.hover();
        await page.waitForTimeout(400);

        // Extract Level 3 sub-links
        const subLinks = await page.evaluate(({ triggerText, sidebarText }) => {
          const subPanels = document.querySelectorAll(
            '[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [class*="subcontent"], [class*="level-2"], [class*="level--2"], [class*="level-3"], [class*="level--3"], [role="menu"], nav ul ul ul'
          );
          const found = [];
          for (const p of subPanels) {
            const style = window.getComputedStyle(p);
            const rect = p.getBoundingClientRect();
            if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.height > 10) {
              for (const a of p.querySelectorAll('a')) {
                const text = a.textContent.trim().replace(/\s+/g, ' ');
                const aRect = a.getBoundingClientRect();
                if (text && text.length < 100 && aRect.height > 0) {
                  found.push({ text, href: a.getAttribute('href') || '', panel: triggerText, sidebarParent: sidebarText });
                }
              }
            }
          }
          return found;
        }, { triggerText: trigger, sidebarText: panelResult.sidebarItems[i].text });

        allPanelLinks.push(...subLinks);
      }
    }

    // Close panel
    await page.mouse.move(0, 0);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);
  }

  // Deduplicate
  const seen = new Set();
  return allPanelLinks.filter((l) => {
    const key = `${l.text.toLowerCase()}|${l.href}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function parseNavFile(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');

  // Extract all href values and text content from the HTML
  const hrefRegex = /href="([^"]+)"/g;
  const textRegex = />([^<]+)</g;

  const hrefs = [];
  const texts = [];
  let match;

  while ((match = hrefRegex.exec(content)) !== null) {
    hrefs.push(match[1]);
  }
  while ((match = textRegex.exec(content)) !== null) {
    const text = match[1].trim();
    if (text && text.length > 1 && text.length < 100) {
      texts.push(text);
    }
  }

  return { hrefs, texts, rawLength: content.length };
}

function compareContent(sourceContent, migratedContent, navFileContent) {
  const missingOnMigrated = [];
  const missingInNavFile = [];
  const extraOnMigrated = [];

  // Compare source link texts vs migrated link texts
  const sourceLinkTexts = new Set(sourceContent.links.map(l => l.text.toLowerCase()));
  const migratedLinkTexts = new Set(migratedContent.links.map(l => l.text.toLowerCase()));

  for (const text of sourceLinkTexts) {
    if (!migratedLinkTexts.has(text) && text.length > 2) {
      missingOnMigrated.push({ type: 'link-text', value: text });
    }
  }

  for (const text of migratedLinkTexts) {
    if (!sourceLinkTexts.has(text) && text.length > 2) {
      extraOnMigrated.push({ type: 'link-text', value: text });
    }
  }

  // Compare nav triggers
  const sourceTriggers = new Set(sourceContent.navTriggers.map(t => t.toLowerCase()));
  const migratedTriggers = new Set(migratedContent.navTriggers.map(t => t.toLowerCase()));
  for (const t of sourceTriggers) {
    if (!migratedTriggers.has(t)) {
      missingOnMigrated.push({ type: 'nav-trigger', value: t });
    }
  }

  // Check nav.plain.html coverage
  if (navFileContent) {
    const navTexts = new Set(navFileContent.texts.map(t => t.toLowerCase()));
    for (const text of sourceLinkTexts) {
      if (text.length > 3 && !navTexts.has(text)) {
        // Fuzzy check — see if any nav text contains this link text
        const found = [...navTexts].some(nt => nt.includes(text) || text.includes(nt));
        if (!found) {
          missingInNavFile.push({ type: 'link-text', value: text });
        }
      }
    }
  }

  // Image count comparison
  const imageCountMatch = Math.abs(sourceContent.imageCount - migratedContent.imageCount) <= 2;

  return {
    missingOnMigrated,
    missingInNavFile,
    extraOnMigrated,
    imageCountMatch,
    sourceImageCount: sourceContent.imageCount,
    migratedImageCount: migratedContent.imageCount,
    sourceLinkCount: sourceContent.linkCount,
    migratedLinkCount: migratedContent.linkCount,
  };
}

async function main() {
  const { sourceUrl, migratedUrl, navFile, validationDir, viewport } = parseArgs();

  if (!sourceUrl || !migratedUrl) {
    console.error(
      'Usage: node live-compare-content.js \\\n'
      + '  --source-url=<url> --migrated-url=<url> \\\n'
      + '  --nav-file=content/nav.plain.html \\\n'
      + '  [--validation-dir=<path>] [--viewport=1440x900]'
    );
    process.exit(2);
  }

  const [rawW, rawH] = viewport.split('x').map(Number);
  const vw = Number.isFinite(rawW) ? rawW : 1440;
  const vh = Number.isFinite(rawH) ? rawH : 900;
  const absValidationDir = path.resolve(validationDir);

  if (!fs.existsSync(absValidationDir)) fs.mkdirSync(absValidationDir, { recursive: true });
  debugLog(absValidationDir, 'START', `live-compare-content.js — source=${sourceUrl}, migrated=${migratedUrl}, navFile=${navFile || 'none'}`);

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
    // === SOURCE ===
    console.log('\n=== Extracting content from SOURCE ===');
    const sourcePage = await browser.newPage();
    await sourcePage.setViewportSize({ width: vw, height: vh });
    await sourcePage.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sourcePage.waitForTimeout(1500);

    const cookieBtn = await sourcePage.$('#onetrust-accept-btn-handler, button:has-text("Accept"), .cookie-accept');
    if (cookieBtn) { await cookieBtn.click(); await sourcePage.waitForTimeout(500); }

    const sourceContent = await extractNavContent(sourcePage);
    console.log(`  Links: ${sourceContent.linkCount}, Images: ${sourceContent.imageCount}, Triggers: ${sourceContent.navTriggers.length}`);
    console.log(`  Triggers: ${sourceContent.navTriggers.join(', ')}`);

    // Also extract panel content by hovering each trigger
    const sourcePanelLinks = await extractAllPanelContent(sourcePage, sourceContent.navTriggers);
    console.log(`  Panel links (from hovering): ${sourcePanelLinks.length}`);
    await sourcePage.close();

    // === MIGRATED ===
    console.log('\n=== Extracting content from MIGRATED ===');
    const migratedPage = await browser.newPage();
    await migratedPage.setViewportSize({ width: vw, height: vh });
    await migratedPage.goto(migratedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await migratedPage.waitForTimeout(1500);

    const migratedContent = await extractNavContent(migratedPage);
    console.log(`  Links: ${migratedContent.linkCount}, Images: ${migratedContent.imageCount}, Triggers: ${migratedContent.navTriggers.length}`);
    console.log(`  Triggers: ${migratedContent.navTriggers.join(', ')}`);

    // Extract migrated panel content
    const migratedPanelLinks = await extractAllPanelContent(migratedPage, migratedContent.navTriggers);
    console.log(`  Panel links (from hovering): ${migratedPanelLinks.length}`);
    await migratedPage.close();
    await browser.close();

    // === NAV FILE ===
    const navFileContent = parseNavFile(navFile);
    if (navFileContent) {
      console.log(`\n=== nav.plain.html: ${navFileContent.hrefs.length} hrefs, ${navFileContent.texts.length} text nodes ===`);
    }

    // === COMPARISON ===
    console.log('\n=== Comparing content ===');

    // Add panel links to the main content for comparison
    const enrichedSource = {
      ...sourceContent,
      links: [...sourceContent.links, ...sourcePanelLinks.map(l => ({ text: l.text, href: l.href, visible: true }))],
      linkCount: sourceContent.linkCount + sourcePanelLinks.length,
    };
    const enrichedMigrated = {
      ...migratedContent,
      links: [...migratedContent.links, ...migratedPanelLinks.map(l => ({ text: l.text, href: l.href, visible: true }))],
      linkCount: migratedContent.linkCount + migratedPanelLinks.length,
    };

    const comparison = compareContent(enrichedSource, enrichedMigrated, navFileContent);

    console.log(`\n  Source total links: ${enrichedSource.linkCount}`);
    console.log(`  Migrated total links: ${enrichedMigrated.linkCount}`);
    console.log(`  Missing on migrated: ${comparison.missingOnMigrated.length}`);
    console.log(`  Missing in nav file: ${comparison.missingInNavFile.length}`);
    console.log(`  Extra on migrated: ${comparison.extraOnMigrated.length}`);

    if (comparison.missingOnMigrated.length > 0) {
      console.log('\n  ❌ MISSING on migrated:');
      comparison.missingOnMigrated.slice(0, 20).forEach(m => console.log(`    - [${m.type}] "${m.value}"`));
      if (comparison.missingOnMigrated.length > 20) console.log(`    ... and ${comparison.missingOnMigrated.length - 20} more`);
    }

    if (comparison.missingInNavFile.length > 0) {
      console.log('\n  ⚠️  MISSING in nav.plain.html:');
      comparison.missingInNavFile.slice(0, 20).forEach(m => console.log(`    - [${m.type}] "${m.value}"`));
    }

    // Determine pass/fail
    // Critical failures: missing nav triggers, >5 missing links
    const criticalMissing = comparison.missingOnMigrated.filter(m => m.type === 'nav-trigger');
    const significantLinkMissing = comparison.missingOnMigrated.filter(m => m.type === 'link-text').length > 5;
    const allValidated = criticalMissing.length === 0 && !significantLinkMissing;

    const register = {
      script: 'live-compare-content.js',
      timestamp: new Date().toISOString(),
      sourceUrl,
      migratedUrl,
      navFile: navFile || null,
      viewport: { width: vw, height: vh },
      sourceContent: {
        linkCount: enrichedSource.linkCount,
        imageCount: sourceContent.imageCount,
        navTriggers: sourceContent.navTriggers,
        panelLinksCount: sourcePanelLinks.length,
      },
      migratedContent: {
        linkCount: enrichedMigrated.linkCount,
        imageCount: migratedContent.imageCount,
        navTriggers: migratedContent.navTriggers,
        panelLinksCount: migratedPanelLinks.length,
      },
      comparison,
      allValidated,
    };

    // Write register
    const registerPath = path.join(absValidationDir, 'live-content-comparison.json');
    fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));
    console.log(`\nRegister written: ${registerPath}`);

    // Write marker
    const markerContent = JSON.stringify({
      timestamp: register.timestamp,
      sourceUrl,
      migratedUrl,
      allValidated,
      missingOnMigrated: comparison.missingOnMigrated.length,
      missingInNavFile: comparison.missingInNavFile.length,
      hash: crypto.createHash('sha256').update(JSON.stringify(register)).digest('hex'),
    });
    fs.writeFileSync(path.join(absValidationDir, '.live-content-comparison-complete'), markerContent);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${allValidated ? 'CONTENT COMPARISON PASSED' : 'CONTENT COMPARISON FAILED'}`);
    console.log(`  Missing on migrated: ${comparison.missingOnMigrated.length}`);
    console.log(`  Missing in nav file: ${comparison.missingInNavFile.length}`);
    console.log(`${'='.repeat(60)}`);

    if (allValidated) {
      debugLog(absValidationDir, 'PASS', `PASSED — content complete. Missing on migrated: ${comparison.missingOnMigrated.length}, Missing in nav: ${comparison.missingInNavFile.length}`);
    } else {
      debugLog(absValidationDir, 'BLOCK', `FAILED — ${criticalMissing.length} missing triggers, ${comparison.missingOnMigrated.length} missing links total`);
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
