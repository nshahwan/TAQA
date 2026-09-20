#!/usr/bin/env node

/*
 * live-compare-panels.js
 *
 * INDEPENDENT panel comparison — uses Playwright to open each megamenu/dropdown panel
 * on BOTH the source site and the migrated site, then extracts content, links, images,
 * and key CSS properties directly from live DOM. Compares them without relying on any
 * agent-authored JSON intermediary.
 *
 * This script CANNOT be faked — it navigates both URLs, hovers triggers, and reads
 * the live DOM state. The agent does not author either side of the comparison.
 *
 * Usage:
 *   node scripts/live-compare-panels.js \
 *     --source-url=https://www.example.com \
 *     --migrated-url=http://localhost:3000/content/index.html \
 *     --triggers="Proprietários,Serviços,Veículos,Concessionárias,Comprar" \
 *     [--validation-dir=migration-work/navigation-validation] \
 *     [--viewport=1440x900]
 *
 * Exit codes:
 *   0 = all panels match (content + structure)
 *   1 = one or more panel mismatches
 *   2 = usage/runner error
 *
 * Outputs:
 *   - live-panel-comparison.json (full register)
 *   - .live-panel-comparison-complete marker (with timestamp + hash)
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
  const entry = `[${ts}] ${prefix} [SCRIPT:live-compare-panels] [${level}] ${msg}\n`;
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
  let triggers = [];
  let validationDir = VALIDATION_DIR;
  let viewport = '1440x900';

  args.forEach((a) => {
    if (a.startsWith('--source-url=')) sourceUrl = a.slice(13);
    else if (a.startsWith('--migrated-url=')) migratedUrl = a.slice(15);
    else if (a.startsWith('--triggers=')) triggers = a.slice(11).split(',').map(t => t.trim());
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
    else if (a.startsWith('--viewport=')) viewport = a.slice(11);
  });

  return { sourceUrl, migratedUrl, triggers, validationDir, viewport };
}

async function extractPanelContent(page, triggerText, viewportWidth) {
  // Find and hover the nav trigger
  const triggerHandle = await page.evaluateHandle((text) => {
    const allLinks = document.querySelectorAll('header a, header button, nav a, nav button');
    for (const el of allLinks) {
      if (el.textContent.trim() === text || el.textContent.trim().includes(text)) {
        return el;
      }
    }
    return null;
  }, triggerText);

  const element = triggerHandle.asElement();
  if (!element) {
    return { found: false, triggerText, error: `Trigger "${triggerText}" not found` };
  }

  // Hover to open panel
  await element.hover();
  await page.waitForTimeout(600);

  // Also try click if hover didn't open anything
  const panelVisibleAfterHover = await page.evaluate(() => {
    const panels = document.querySelectorAll('[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [role="menu"]');
    for (const p of panels) {
      const style = window.getComputedStyle(p);
      const rect = p.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.height > 50) {
        return true;
      }
    }
    return false;
  });

  if (!panelVisibleAfterHover) {
    await element.click();
    await page.waitForTimeout(600);
  }

  // Extract initial panel content (Level 2 — what's visible after opening)
  const panelData = await page.evaluate((trigger) => {
    const candidates = document.querySelectorAll(
      '[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [class*="menu-content"], [role="menu"], nav ul ul'
    );

    let panel = null;
    let maxArea = 0;
    for (const c of candidates) {
      const style = window.getComputedStyle(c);
      const rect = c.getBoundingClientRect();
      if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.height > 50 && rect.width > 100) {
        const area = rect.width * rect.height;
        if (area > maxArea) {
          maxArea = area;
          panel = c;
        }
      }
    }

    if (!panel) {
      return { found: false, triggerText: trigger, error: 'No open panel detected after hover/click' };
    }

    const rect = panel.getBoundingClientRect();

    const links = Array.from(panel.querySelectorAll('a')).map((a) => ({
      text: a.textContent.trim(),
      href: a.getAttribute('href') || '',
      visible: window.getComputedStyle(a).display !== 'none' && a.getBoundingClientRect().height > 0,
    })).filter((l) => l.visible && l.text);

    const images = Array.from(panel.querySelectorAll('img')).map((img) => ({
      src: img.getAttribute('src') || '',
      alt: img.getAttribute('alt') || '',
      width: img.getBoundingClientRect().width,
      height: img.getBoundingClientRect().height,
      visible: window.getComputedStyle(img).display !== 'none' && img.getBoundingClientRect().height > 0,
    })).filter((i) => i.visible);

    const headings = Array.from(panel.querySelectorAll('h1, h2, h3, h4, h5, h6, [class*="heading"], [class*="title"]'))
      .map((h) => h.textContent.trim())
      .filter(Boolean);

    const panelStyle = window.getComputedStyle(panel);

    // Detect sidebar items that may reveal Level 3 content on hover.
    // Look for list items, category links, or sidebar navigation items within the panel.
    const sidebarSelectors = [
      '[class*="sidebar"] a', '[class*="sidebar"] li',
      '[class*="category"] a', '[class*="category"] li',
      '[class*="level-1"] > li > a', '[class*="level--1"] > li > a',
      '[class*="nav-list"] > li > a', '[class*="menu-list"] > li > a',
      'ul > li > a',
    ];
    const sidebarCandidates = [];
    for (const sel of sidebarSelectors) {
      const items = panel.querySelectorAll(sel);
      if (items.length >= 2 && items.length <= 30) {
        items.forEach((item) => {
          const text = item.textContent.trim();
          const itemRect = item.getBoundingClientRect();
          if (text && itemRect.height > 0) {
            sidebarCandidates.push({ text, selector: sel, index: sidebarCandidates.length });
          }
        });
        break;
      }
    }

    return {
      found: true,
      triggerText: trigger,
      dimensions: {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
      },
      links: links.map((l) => ({ text: l.text, href: l.href })),
      linkCount: links.length,
      images: images.map((i) => ({ alt: i.alt, width: Math.round(i.width), height: Math.round(i.height) })),
      imageCount: images.length,
      headings,
      css: {
        background: panelStyle.backgroundColor,
        position: panelStyle.position,
        display: panelStyle.display,
        padding: panelStyle.padding,
        boxShadow: panelStyle.boxShadow,
        zIndex: panelStyle.zIndex,
      },
      sidebarCandidates,
    };
  }, triggerText);

  // Level 3 deep drill: hover each sidebar item to reveal sub-panel content.
  // This catches sidebar+right-panel layouts where Level 3 is only shown on hover.
  if (panelData.found && panelData.sidebarCandidates && panelData.sidebarCandidates.length > 0) {
    const deepLinks = [];
    const sel = panelData.sidebarCandidates[0].selector;

    for (let i = 0; i < panelData.sidebarCandidates.length; i++) {
      // Re-open the panel (previous sidebar hover may have changed state)
      await element.hover();
      await page.waitForTimeout(400);

      // Hover the sidebar item by index
      const sidebarItem = await page.evaluateHandle(({ selector, idx }) => {
        const candidates = document.querySelectorAll(
          '[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [class*="menu-content"], [role="menu"], nav ul ul'
        );
        let panel = null;
        let maxArea = 0;
        for (const c of candidates) {
          const style = window.getComputedStyle(c);
          const rect = c.getBoundingClientRect();
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.height > 50 && rect.width > 100) {
            const area = rect.width * rect.height;
            if (area > maxArea) { maxArea = area; panel = c; }
          }
        }
        if (!panel) return null;
        const items = panel.querySelectorAll(selector);
        return items[idx] || null;
      }, { selector: sel, idx: i });

      const sidebarEl = sidebarItem.asElement();
      if (!sidebarEl) continue;

      await sidebarEl.hover();
      await page.waitForTimeout(400);

      // Extract any newly visible links (Level 3 sub-items)
      const subLinks = await page.evaluate(({ sidebarText }) => {
        const panels = document.querySelectorAll(
          '[class*="dropdown"], [class*="megamenu"], [class*="panel"], [class*="submenu"], [class*="menu-content"], [class*="subcontent"], [class*="level-2"], [class*="level--2"], [class*="level-3"], [class*="level--3"], [role="menu"], nav ul ul ul'
        );
        const found = [];
        for (const p of panels) {
          const style = window.getComputedStyle(p);
          const rect = p.getBoundingClientRect();
          if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && rect.height > 10) {
            for (const a of p.querySelectorAll('a')) {
              const text = a.textContent.trim();
              const aRect = a.getBoundingClientRect();
              if (text && aRect.height > 0 && window.getComputedStyle(a).display !== 'none') {
                found.push({ text, href: a.getAttribute('href') || '', sidebarParent: sidebarText });
              }
            }
          }
        }
        return found;
      }, { sidebarText: panelData.sidebarCandidates[i].text });

      deepLinks.push(...subLinks);
    }

    // Deduplicate and merge Level 3 links into the panel data
    const existingTexts = new Set(panelData.links.map((l) => l.text.toLowerCase()));
    const uniqueDeep = [];
    const seenDeep = new Set();
    for (const dl of deepLinks) {
      const key = `${dl.text.toLowerCase()}|${dl.href}`;
      if (!seenDeep.has(key) && !existingTexts.has(dl.text.toLowerCase())) {
        seenDeep.add(key);
        uniqueDeep.push(dl);
      }
    }

    if (uniqueDeep.length > 0) {
      panelData.deepDrillLinks = uniqueDeep;
      panelData.deepDrillLinkCount = uniqueDeep.length;
      panelData.links = [...panelData.links, ...uniqueDeep.map((l) => ({ text: l.text, href: l.href }))];
      panelData.linkCount = panelData.links.length;
    }
  }

  // Clean up transient property
  if (panelData.sidebarCandidates) delete panelData.sidebarCandidates;

  // Close panel (move mouse away or press Escape)
  await page.mouse.move(0, 0);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);

  return panelData;
}

function comparePanels(sourcePanel, migratedPanel) {
  if (!sourcePanel.found && !migratedPanel.found) {
    return { status: 'skipped', reason: 'Neither side has this panel' };
  }
  if (!sourcePanel.found) {
    return { status: 'skipped', reason: `Source panel not found: ${sourcePanel.error}` };
  }
  if (!migratedPanel.found) {
    return { status: 'failed', reason: `Migrated panel not found: ${migratedPanel.error}`, mismatches: ['Panel missing entirely on migrated'] };
  }

  const mismatches = [];

  // Compare link counts
  if (sourcePanel.linkCount !== migratedPanel.linkCount) {
    mismatches.push(`linkCount: source=${sourcePanel.linkCount}, migrated=${migratedPanel.linkCount}`);
  }

  // Compare link texts (must all be present)
  const sourceLinkTexts = new Set(sourcePanel.links.map(l => l.text.toLowerCase()));
  const migratedLinkTexts = new Set(migratedPanel.links.map(l => l.text.toLowerCase()));
  const missingLinks = [...sourceLinkTexts].filter(t => !migratedLinkTexts.has(t));
  const extraLinks = [...migratedLinkTexts].filter(t => !sourceLinkTexts.has(t));
  if (missingLinks.length > 0) {
    mismatches.push(`MISSING links on migrated: ${missingLinks.join(', ')}`);
  }
  if (extraLinks.length > 0) {
    mismatches.push(`EXTRA links on migrated (not on source): ${extraLinks.join(', ')}`);
  }

  // Compare image counts
  if (sourcePanel.imageCount !== migratedPanel.imageCount) {
    mismatches.push(`imageCount: source=${sourcePanel.imageCount}, migrated=${migratedPanel.imageCount}`);
  }

  // Compare headings
  const sourceHeadings = new Set(sourcePanel.headings.map(h => h.toLowerCase()));
  const migratedHeadings = new Set(migratedPanel.headings.map(h => h.toLowerCase()));
  const missingHeadings = [...sourceHeadings].filter(h => !migratedHeadings.has(h));
  if (missingHeadings.length > 0) {
    mismatches.push(`MISSING headings: ${missingHeadings.join(', ')}`);
  }

  // Compare panel dimensions (within 20% tolerance)
  const widthRatio = migratedPanel.dimensions.width / Math.max(sourcePanel.dimensions.width, 1);
  if (widthRatio < 0.8 || widthRatio > 1.2) {
    mismatches.push(`Panel width: source=${sourcePanel.dimensions.width}px, migrated=${migratedPanel.dimensions.width}px (${Math.round(widthRatio * 100)}%)`);
  }

  const status = mismatches.length === 0 ? 'validated' : 'failed';
  return { status, mismatches, sourcePanel, migratedPanel };
}

async function main() {
  const { sourceUrl, migratedUrl, triggers, validationDir, viewport } = parseArgs();

  if (!sourceUrl || !migratedUrl || triggers.length === 0) {
    console.error(
      'Usage: node live-compare-panels.js \\\n'
      + '  --source-url=<url> --migrated-url=<url> \\\n'
      + '  --triggers="Label1,Label2,..." \\\n'
      + '  [--validation-dir=<path>] [--viewport=1440x900]'
    );
    process.exit(2);
  }

  const [rawW, rawH] = viewport.split('x').map(Number);
  const vw = Number.isFinite(rawW) ? rawW : 1440;
  const vh = Number.isFinite(rawH) ? rawH : 900;
  const absValidationDir = path.resolve(validationDir);

  if (!fs.existsSync(absValidationDir)) fs.mkdirSync(absValidationDir, { recursive: true });
  debugLog(absValidationDir, 'START', `live-compare-panels.js — source=${sourceUrl}, migrated=${migratedUrl}, triggers=${triggers.join(',')}, viewport=${viewport}`);

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
    // === SOURCE EXTRACTION ===
    console.log('\n=== Extracting panels from SOURCE ===');
    const sourcePage = await browser.newPage();
    await sourcePage.setViewportSize({ width: vw, height: vh });
    await sourcePage.goto(sourceUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sourcePage.waitForTimeout(1000);

    // Dismiss cookie banners
    const cookieBtn = await sourcePage.$('#onetrust-accept-btn-handler, button:has-text("Accept"), .cookie-accept');
    if (cookieBtn) { await cookieBtn.click(); await sourcePage.waitForTimeout(500); }

    const sourcePanels = {};
    for (const trigger of triggers) {
      console.log(`  [SOURCE] Hovering: "${trigger}"...`);
      sourcePanels[trigger] = await extractPanelContent(sourcePage, trigger, vw);
      if (sourcePanels[trigger].found) {
        console.log(`    ✓ Found: ${sourcePanels[trigger].linkCount} links, ${sourcePanels[trigger].imageCount} images`);
      } else {
        console.log(`    ✗ ${sourcePanels[trigger].error}`);
      }
    }
    await sourcePage.close();

    // === MIGRATED EXTRACTION ===
    console.log('\n=== Extracting panels from MIGRATED ===');
    const migratedPage = await browser.newPage();
    await migratedPage.setViewportSize({ width: vw, height: vh });
    await migratedPage.goto(migratedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await migratedPage.waitForTimeout(1000);

    const migratedPanels = {};
    for (const trigger of triggers) {
      console.log(`  [MIGRATED] Hovering: "${trigger}"...`);
      migratedPanels[trigger] = await extractPanelContent(migratedPage, trigger, vw);
      if (migratedPanels[trigger].found) {
        console.log(`    ✓ Found: ${migratedPanels[trigger].linkCount} links, ${migratedPanels[trigger].imageCount} images`);
      } else {
        console.log(`    ✗ ${migratedPanels[trigger].error}`);
      }
    }
    await migratedPage.close();
    await browser.close();

    // === COMPARISON ===
    console.log('\n=== Comparing panels ===');
    const results = [];
    let totalPassed = 0;
    let totalFailed = 0;

    for (const trigger of triggers) {
      const comparison = comparePanels(sourcePanels[trigger], migratedPanels[trigger]);
      results.push({ trigger, ...comparison });

      if (comparison.status === 'validated') {
        totalPassed++;
        console.log(`  ✅ "${trigger}": PASS`);
      } else if (comparison.status === 'failed') {
        totalFailed++;
        console.log(`  ❌ "${trigger}": FAIL`);
        comparison.mismatches.forEach(m => console.log(`      - ${m}`));
      } else {
        console.log(`  ⏭️  "${trigger}": SKIPPED — ${comparison.reason}`);
      }
    }

    const allValidated = totalFailed === 0 && totalPassed > 0;
    const register = {
      script: 'live-compare-panels.js',
      timestamp: new Date().toISOString(),
      sourceUrl,
      migratedUrl,
      viewport: { width: vw, height: vh },
      triggersRequested: triggers,
      results,
      summary: {
        totalTriggers: triggers.length,
        passed: totalPassed,
        failed: totalFailed,
        skipped: results.filter(r => r.status === 'skipped').length,
      },
      allValidated,
    };

    // Write register
    const registerPath = path.join(absValidationDir, 'live-panel-comparison.json');
    fs.writeFileSync(registerPath, JSON.stringify(register, null, 2));
    console.log(`\nRegister written: ${registerPath}`);

    // Write tamper-proof marker
    const markerContent = JSON.stringify({
      timestamp: register.timestamp,
      sourceUrl,
      migratedUrl,
      triggers,
      allValidated,
      passed: totalPassed,
      failed: totalFailed,
      hash: crypto.createHash('sha256').update(JSON.stringify(register)).digest('hex'),
    });
    fs.writeFileSync(path.join(absValidationDir, '.live-panel-comparison-complete'), markerContent);

    console.log(`\n${'='.repeat(60)}`);
    console.log(`RESULT: ${allValidated ? 'ALL PANELS VALIDATED' : 'PANEL COMPARISON FAILED'}`);
    console.log(`  Passed: ${totalPassed}/${triggers.length}, Failed: ${totalFailed}/${triggers.length}`);
    console.log(`${'='.repeat(60)}`);

    if (allValidated) {
      debugLog(absValidationDir, 'PASS', `PASSED — ${totalPassed}/${triggers.length} panels validated`);
    } else {
      const failedTriggers = results.filter(r => r.status === 'failed').map(r => r.trigger).join(', ');
      debugLog(absValidationDir, 'BLOCK', `FAILED — ${totalFailed}/${triggers.length} panels failed: ${failedTriggers}`);
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
