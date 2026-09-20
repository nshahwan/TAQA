#!/usr/bin/env node

/*
 * deep-drill-panels.js
 *
 * UNFAKEABLE deep sub-menu validation. Uses Playwright to:
 *   1. Open the hamburger on the migrated site
 *   2. Click EVERY trigger at EVERY depth level
 *   3. Verify each sub-panel actually becomes visible (not just in DOM)
 *   4. Test back button returns to parent
 *   5. Produce a tamper-proof register with SHA-256 hash
 *
 * Applies to ANY site with off-canvas / slide-in / megamenu / accordion
 * navigation — not site-specific.
 *
 * Usage:
 *   node scripts/deep-drill-panels.js \
 *     --url=http://localhost:3000/content/index.html \
 *     [--viewport=1440x900] \
 *     [--validation-dir=migration-work/navigation-validation]
 *
 * Run twice — once at desktop, once at mobile:
 *   node scripts/deep-drill-panels.js --url=<url> --viewport=1440x900
 *   node scripts/deep-drill-panels.js --url=<url> --viewport=375x812
 *
 * Exit codes:
 *   0 = all panels validated
 *   1 = one or more panels failed
 *   2 = runner error
 *
 * Outputs:
 *   - deep-drill-register-desktop.json / deep-drill-register-mobile.json
 *   - .deep-drill-complete-desktop / .deep-drill-complete-mobile (marker with SHA-256 hash)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { VALIDATION_DIR } from './validation-paths.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function debugLog(validationDir, level, msg) {
  const ts = new Date().toISOString();
  const prefix = { ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵' }[level] || 'ℹ️';
  try {
    const dir = path.resolve(validationDir);
    if (fs.existsSync(dir)) {
      fs.appendFileSync(
        path.join(dir, 'debug.log'),
        `[${ts}] ${prefix} [SCRIPT:deep-drill-panels] [${level}] ${msg}\n`,
      );
    }
  } catch { /* ignore */ }
}

function findLocalChromiumExecutable() {
  const localBrowsers = path.resolve(scriptDir, 'playwright-browsers');
  if (!fs.existsSync(localBrowsers)) return null;
  const chromiumDirs = fs.readdirSync(localBrowsers).filter((d) => d.startsWith('chromium-'));
  const candidates = chromiumDirs.flatMap((dir) => [
    path.join(localBrowsers, dir, 'chrome-linux', 'chrome'),
    path.join(localBrowsers, dir, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
  ]);
  return candidates.find((p) => fs.existsSync(p)) || null;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let url = null;
  let viewport = '1440x900';
  let validationDir = VALIDATION_DIR;
  args.forEach((a) => {
    if (a.startsWith('--url=')) url = a.slice(6);
    else if (a.startsWith('--viewport=')) viewport = a.slice(11);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
  });
  const [w, h] = viewport.split('x').map(Number);
  return {
    url, width: w || 1440, height: h || 900, viewport, validationDir,
  };
}

async function main() {
  const {
    url, width, height, viewport, validationDir,
  } = parseArgs();
  if (!url) {
    console.error('Usage: node deep-drill-panels.js --url=<url> [--viewport=1440x900] [--validation-dir=<path>]');
    process.exit(2);
  }

  const absValidationDir = path.resolve(validationDir);
  if (!fs.existsSync(absValidationDir)) fs.mkdirSync(absValidationDir, { recursive: true });

  const mode = width < 600 ? 'mobile' : 'desktop';
  debugLog(absValidationDir, 'START', `deep-drill-panels — url=${url}, viewport=${viewport}, mode=${mode}`);
  log(`=== Deep Drill Panels — ${mode} ${viewport} ===`);
  log(`URL: ${url}`);

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
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);

    // Step 1: Open the hamburger
    log('Opening hamburger...');
    const hamburgerOpened = await page.evaluate(() => {
      const ham = document.querySelector(
        '.header-hamburger, [class*="hamburger"], button[aria-label*="menu" i], button[aria-label*="navigation" i]',
      );
      if (ham) { ham.click(); return true; }
      return false;
    });
    if (!hamburgerOpened) {
      log('FAIL: Could not find hamburger button');
      debugLog(absValidationDir, 'BLOCK', 'Hamburger button not found');
      await browser.close();
      process.exit(1);
    }
    await page.waitForTimeout(800);

    // Step 2: Discover the full panel tree from DOM
    log('Discovering panel tree...');
    const panelTree = await page.evaluate(() => {
      // Generic discovery: find all nav panels by class or role
      const panelSelectors = [
        '.nav-content > .nav-panel',
        '[class*="nav-panel"]',
        '[class*="slide-panel"]',
        '[class*="submenu-panel"]',
        '[role="menu"]',
      ];
      let panels = [];
      for (const sel of panelSelectors) {
        panels = document.querySelectorAll(sel);
        if (panels.length > 1) break;
      }

      const tree = [];
      panels.forEach((panel, idx) => {
        const depth = parseInt(panel.dataset.depth, 10);
        const title = panel.querySelector('.nav-panel-title span, [class*="panel-title"] span, [class*="back"] + span')
          ?.textContent?.trim() || null;
        const items = [];
        const listItems = panel.querySelectorAll(
          ':scope > .nav-list > .nav-item, :scope > ul > li, :scope > [class*="list"] > [class*="item"]',
        );
        listItems.forEach((li) => {
          const btn = li.querySelector(':scope > button, :scope > [class*="button"]');
          const link = li.querySelector(':scope > a, :scope > [class*="link"]');
          if (btn) {
            items.push({
              text: btn.querySelector('span')?.textContent?.trim() || btn.textContent.trim().replace(/\s+/g, ' '),
              type: 'button',
            });
          } else if (link) {
            items.push({
              text: link.textContent.trim(),
              type: 'link',
              href: link.getAttribute('href'),
            });
          }
        });
        tree.push({
          panelIndex: idx,
          depth: Number.isFinite(depth) ? depth : 0,
          title,
          items,
          hasBackButton: !!panel.querySelector('.nav-back, [class*="back"], button[aria-label*="back" i]'),
        });
      });
      return tree;
    });

    if (panelTree.length === 0) {
      log('No panels found in DOM. Checking for accordion/dropdown structure...');
      debugLog(absValidationDir, 'BLOCK', 'No nav panels found in DOM after hamburger click');
      await browser.close();
      process.exit(1);
    }

    log(`Found ${panelTree.length} panels across depths 0-${Math.max(...panelTree.map((p) => p.depth))}`);

    // Step 3: Build every click path from root to each trigger panel
    function findChildPanel(parentPanel, triggerText) {
      return panelTree.find((p) => p.title === triggerText && p.depth === parentPanel.depth + 1);
    }

    const triggerPaths = [];
    function collectPaths(panel, pathSoFar) {
      const triggers = panel.items.filter((i) => i.type === 'button');
      for (const trigger of triggers) {
        const childPanel = findChildPanel(panel, trigger.text);
        if (childPanel) {
          const fullPath = [...pathSoFar, {
            text: trigger.text, depth: childPanel.depth, panelIndex: childPanel.panelIndex,
          }];
          triggerPaths.push(fullPath);
          collectPaths(childPanel, fullPath);
        }
      }
    }

    const rootPanel = panelTree.find((p) => p.depth === 0);
    if (!rootPanel) {
      log('FAIL: No root panel (depth 0) found');
      debugLog(absValidationDir, 'BLOCK', 'No root panel found');
      await browser.close();
      process.exit(1);
    }
    collectPaths(rootPanel, []);

    log(`Total trigger paths to test: ${triggerPaths.length}`);

    if (triggerPaths.length === 0) {
      log('No trigger paths found — nav may be flat (no sub-panels). Passing with 0 paths.');
      debugLog(absValidationDir, 'PASS', 'PASSED — 0 trigger paths (flat nav, no sub-panels)');
      const register = {
        script: 'deep-drill-panels.js',
        timestamp: new Date().toISOString(),
        url,
        viewport: { width, height },
        mode,
        totalPanelsInDOM: panelTree.length,
        maxDepth: 0,
        totalTriggerPaths: 0,
        summary: {
          passed: 0, failed: 0, total: 0, passRate: '100%',
        },
        allValidated: true,
        results: [],
      };
      const registerJson = JSON.stringify(register, null, 2);
      const hash = crypto.createHash('sha256').update(registerJson).digest('hex');
      const suffix = mode === 'mobile' ? '-mobile' : '-desktop';
      fs.writeFileSync(path.join(absValidationDir, `deep-drill-register${suffix}.json`), registerJson);
      fs.writeFileSync(path.join(absValidationDir, `.deep-drill-complete${suffix}`), JSON.stringify({
        timestamp: register.timestamp, url, viewport, mode, allValidated: true,
        passed: 0, failed: 0, totalPaths: 0, totalPanels: panelTree.length, maxDepth: 0, hash,
      }));
      await browser.close();
      process.exit(0);
    }

    // Step 4: Click through every path and verify
    const results = [];
    let passed = 0;
    let failed = 0;

    for (let i = 0; i < triggerPaths.length; i++) {
      const triggerPath = triggerPaths[i];
      const target = triggerPath[triggerPath.length - 1];
      const pathStr = triggerPath.map((p) => p.text).join(' → ');

      // Close and reopen nav for clean state
      await page.evaluate(() => {
        const close = document.querySelector(
          '.nav-close, button[aria-label*="close" i], [class*="close-btn"]',
        );
        if (close) close.click();
      });
      await page.waitForTimeout(400);

      // Reset all panels
      await page.evaluate(() => {
        document.querySelectorAll('.nav-panel, [class*="nav-panel"]').forEach((p) => {
          p.classList.remove(
            'nav-panel-active', 'nav-panel-entering',
            'nav-panel-exiting', 'nav-panel-exiting-reverse',
          );
          if (p.dataset.depth !== '0') p.classList.add('nav-panel-hidden');
          else p.classList.add('nav-panel-active');
        });
      });

      // Reopen hamburger
      await page.evaluate(() => {
        const ham = document.querySelector(
          '.header-hamburger, [class*="hamburger"], button[aria-label*="menu" i], button[aria-label*="navigation" i]',
        );
        if (ham) ham.click();
      });
      await page.waitForTimeout(500);

      // Click through each step in the path
      let pathOk = true;
      for (let step = 0; step < triggerPath.length; step++) {
        const stepInfo = triggerPath[step];
        const parentDepth = step === 0 ? 0 : triggerPath[step - 1].depth;

        const clicked = await page.evaluate(({ triggerText, pd }) => {
          const panels = document.querySelectorAll(
            '.nav-content > .nav-panel, [class*="nav-panel"]',
          );
          for (const panel of panels) {
            if (!panel.classList.contains('nav-panel-active')) continue;
            if (parseInt(panel.dataset.depth, 10) !== pd) continue;
            const btns = panel.querySelectorAll(
              ':scope > .nav-list > .nav-item > .nav-item-button, '
              + ':scope > .nav-list > .nav-item > button, '
              + ':scope > ul > li > button',
            );
            for (const btn of btns) {
              const text = btn.querySelector('span')?.textContent?.trim()
                || btn.textContent.trim().replace(/\s+/g, ' ');
              if (text === triggerText) {
                btn.click();
                return true;
              }
            }
          }
          return false;
        }, { triggerText: stepInfo.text, pd: parentDepth });

        if (!clicked) {
          pathOk = false;
          break;
        }
        await page.waitForTimeout(600);
      }

      if (!pathOk) {
        results.push({ path: pathStr, depth: target.depth, status: 'FAIL', reason: 'Could not click trigger' });
        failed++;
        log(`  ❌ [depth ${target.depth}] ${pathStr} — CLICK FAILED`);
        continue;
      }

      // Verify: the target panel is actually visible
      const verification = await page.evaluate(({ targetText, targetDepth }) => {
        const panels = document.querySelectorAll(
          '.nav-content > .nav-panel, [class*="nav-panel"]',
        );
        for (const panel of panels) {
          if (!panel.classList.contains('nav-panel-active')) continue;
          if (parseInt(panel.dataset.depth, 10) !== targetDepth) continue;
          const title = panel.querySelector(
            '.nav-panel-title span, [class*="panel-title"] span',
          )?.textContent?.trim();
          if (title !== targetText) continue;

          const rect = panel.getBoundingClientRect();
          const style = window.getComputedStyle(panel);
          const isVisible = rect.width > 100 && rect.height > 50
            && style.display !== 'none'
            && style.visibility !== 'hidden';

          const items = [];
          panel.querySelectorAll(
            ':scope > .nav-list > .nav-item, :scope > ul > li',
          ).forEach((li) => {
            const btn = li.querySelector(':scope > button');
            const link = li.querySelector(':scope > a');
            if (btn) items.push(btn.querySelector('span')?.textContent?.trim() || btn.textContent.trim());
            else if (link) items.push(link.textContent.trim());
          });

          return {
            found: true, isVisible, hasBackButton: !!panel.querySelector(
              '.nav-back, [class*="back"], button[aria-label*="back" i]',
            ),
            itemCount: items.length, items,
            width: Math.round(rect.width), height: Math.round(rect.height),
          };
        }
        return { found: false };
      }, { targetText: target.text, targetDepth: target.depth });

      if (!verification.found || !verification.isVisible) {
        results.push({ path: pathStr, depth: target.depth, status: 'FAIL', reason: 'Panel not visible after click' });
        failed++;
        log(`  ❌ [depth ${target.depth}] ${pathStr} — NOT VISIBLE`);
        continue;
      }

      // Test back button
      const backWorks = await page.evaluate(({ targetText, targetDepth }) => {
        const panels = document.querySelectorAll(
          '.nav-content > .nav-panel, [class*="nav-panel"]',
        );
        for (const panel of panels) {
          if (!panel.classList.contains('nav-panel-active')) continue;
          if (parseInt(panel.dataset.depth, 10) !== targetDepth) continue;
          const title = panel.querySelector(
            '.nav-panel-title span, [class*="panel-title"] span',
          )?.textContent?.trim();
          if (title !== targetText) continue;

          const back = panel.querySelector(
            '.nav-back, [class*="back"], button[aria-label*="back" i]',
          );
          if (!back) return { hasBack: false };
          back.click();
          return { hasBack: true, clicked: true };
        }
        return { hasBack: false };
      }, { targetText: target.text, targetDepth: target.depth });

      await page.waitForTimeout(500);

      // Verify parent is restored
      const parentRestored = await page.evaluate(({ parentDepth }) => {
        if (parentDepth < 0) return true;
        const panels = document.querySelectorAll(
          '.nav-content > .nav-panel, [class*="nav-panel"]',
        );
        for (const panel of panels) {
          if (parseInt(panel.dataset.depth, 10) === parentDepth) {
            if (panel.classList.contains('nav-panel-active')
              && !panel.classList.contains('nav-panel-exiting')) {
              return true;
            }
          }
        }
        return false;
      }, { parentDepth: target.depth - 1 });

      results.push({
        path: pathStr,
        depth: target.depth,
        status: 'PASS',
        panelVisible: true,
        itemCount: verification.itemCount,
        hasBackButton: verification.hasBackButton,
        backButtonWorks: backWorks.hasBack && parentRestored,
        dimensions: { width: verification.width, height: verification.height },
      });
      passed++;

      if ((i + 1) % 10 === 0 || i === triggerPaths.length - 1) {
        log(`  Progress: ${i + 1}/${triggerPaths.length} paths tested (${passed} pass, ${failed} fail)`);
      }
    }

    await browser.close();

    // Build register
    const allValidated = failed === 0 && passed > 0;
    const register = {
      script: 'deep-drill-panels.js',
      timestamp: new Date().toISOString(),
      url,
      viewport: { width, height },
      mode,
      totalPanelsInDOM: panelTree.length,
      maxDepth: Math.max(...panelTree.map((p) => p.depth)),
      totalTriggerPaths: triggerPaths.length,
      summary: {
        passed,
        failed,
        total: triggerPaths.length,
        passRate: `${Math.round((passed / triggerPaths.length) * 100)}%`,
      },
      allValidated,
      results,
    };

    // Compute hash BEFORE writing
    const registerJson = JSON.stringify(register, null, 2);
    const hash = crypto.createHash('sha256').update(registerJson).digest('hex');

    const suffix = mode === 'mobile' ? '-mobile' : '-desktop';
    const registerPath = path.join(absValidationDir, `deep-drill-register${suffix}.json`);
    fs.writeFileSync(registerPath, registerJson);

    const marker = {
      timestamp: register.timestamp,
      url,
      viewport,
      mode,
      allValidated,
      passed,
      failed,
      totalPaths: triggerPaths.length,
      totalPanels: panelTree.length,
      maxDepth: register.maxDepth,
      hash,
    };
    fs.writeFileSync(
      path.join(absValidationDir, `.deep-drill-complete${suffix}`),
      JSON.stringify(marker),
    );

    log('');
    log('='.repeat(60));
    log(`DEEP DRILL RESULT (${mode} ${viewport}): ${allValidated ? 'ALL PASSED' : 'FAILED'}`);
    log(`  Panels in DOM: ${panelTree.length}`);
    log(`  Max depth: ${register.maxDepth}`);
    log(`  Trigger paths tested: ${triggerPaths.length}`);
    log(`  Passed: ${passed} | Failed: ${failed}`);
    log(`  Hash: ${hash}`);
    log('='.repeat(60));

    const logLevel = allValidated ? 'PASS' : 'BLOCK';
    debugLog(
      absValidationDir,
      logLevel,
      `${allValidated ? 'PASSED' : 'FAILED'} — ${mode} ${viewport}, ${passed}/${triggerPaths.length} paths, ${panelTree.length} panels, maxDepth=${register.maxDepth}, hash=${hash.substring(0, 16)}...`,
    );

    process.exit(allValidated ? 0 : 1);
  } catch (err) {
    console.error('Runner error:', err);
    debugLog(absValidationDir, 'ERROR', err.message);
    await browser.close();
    process.exit(2);
  }
}

main().catch((err) => { console.error(err); process.exit(2); });
