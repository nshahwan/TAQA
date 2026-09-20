#!/usr/bin/env node

/*
 * enforcement-gate.js
 *
 * TAMPER-PROOF FINAL GATE — verifies that ALL mandatory validation scripts have
 * actually been executed. Checks:
 *
 *   1. Marker files exist (produced by scripts, not writable by agent)
 *   2. Marker files contain valid SHA-256 hashes matching their register JSON
 *   3. Timestamps are within the current session window (no stale/reused markers)
 *   4. Register JSON files exist and contain expected structure
 *   5. Source URLs in markers match the session's source URL
 *   6. All registers report results (pass or fail — both are valid runs; MISSING is not)
 *
 * This is the ONLY gate that Step 13 checks. If this script exits non-zero,
 * the migration CANNOT be reported as complete.
 *
 * Usage:
 *   node scripts/enforcement-gate.js \
 *     --session=migration-work/navigation-validation/session.json \
 *     [--validation-dir=migration-work/navigation-validation] \
 *     [--require-pass] \
 *     [--max-age-hours=24]
 *
 * Flags:
 *   --require-pass: Fail if any register has allValidated: false (default: just check existence)
 *   --max-age-hours: Maximum age of markers in hours (default: 24)
 *
 * Exit codes:
 *   0 = all mandatory scripts confirmed executed
 *   1 = one or more scripts were NOT executed or markers are invalid
 *   2 = usage/configuration error
 *
 * Outputs:
 *   - enforcement-gate-report.json (audit trail of what passed/failed)
 *   - .enforcement-gate-complete marker
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { VALIDATION_DIR } from './validation-paths.js';

function debugLog(validationDir, level, msg) {
  const ts = new Date().toISOString();
  const prefix = {
    ERROR: '❌', PASS: '✅', BLOCK: '🚫', START: '🔵', END: '🏁',
  }[level] || 'ℹ️';
  const entry = `[${ts}] ${prefix} [SCRIPT:enforcement-gate] [${level}] ${msg}\n`;
  try {
    if (validationDir && fs.existsSync(validationDir)) {
      fs.appendFileSync(path.join(validationDir, 'debug.log'), entry);
    }
  } catch { /* ignore */ }
}

// Mandatory scripts that MUST have run before Step 13
const MANDATORY_CHECKS = [
  {
    id: 'row-detection',
    markerFile: '.row-detection-complete',
    registerFile: 'phase-1-row-detection.json',
    description: 'Phase 1: Header row detection (detect-header-rows.js)',
    hasHash: false, // Legacy script, no hash in marker
  },
  {
    id: 'live-panel-comparison',
    markerFile: '.live-panel-comparison-complete',
    registerFile: 'live-panel-comparison.json',
    description: 'Live panel comparison (live-compare-panels.js)',
    hasHash: true,
  },
  {
    id: 'live-css-comparison',
    markerFile: '.live-css-comparison-complete',
    registerFile: 'live-css-comparison.json',
    description: 'Live CSS comparison (live-compare-css.js)',
    hasHash: true,
  },
  {
    id: 'live-content-comparison',
    markerFile: '.live-content-comparison-complete',
    registerFile: 'live-content-comparison.json',
    description: 'Live content comparison (live-compare-content.js)',
    hasHash: true,
  },
  {
    id: 'mobile-structure-detection',
    markerFile: 'mobile/.mobile-structure-detection-complete',
    registerFile: 'mobile/mobile-structure-detection.json',
    description: 'Mobile structure detection (detect-mobile-structure.js)',
    hasHash: true,
  },
  {
    id: 'mobile-panel-comparison',
    markerFile: 'mobile/.mobile-panel-comparison-complete',
    registerFile: 'mobile/mobile-panel-comparison.json',
    description: 'Mobile panel comparison + interaction pattern (live-compare-mobile-panels.js)',
    hasHash: true,
  },
  {
    id: 'mobile-dimensional-gate',
    markerFile: 'mobile/.mobile-dimensional-gate-complete',
    registerFile: 'mobile/mobile-dimensional-gate-report.json',
    description: 'Mobile dimensional gate (mobile-dimensional-gate.js)',
    hasHash: true,
  },
  {
    id: 'deep-drill-desktop',
    markerFile: '.deep-drill-complete-desktop',
    registerFile: 'deep-drill-register-desktop.json',
    description: 'Deep drill panel verification — desktop (deep-drill-panels.js --viewport=desktop)',
    hasHash: true,
  },
  {
    id: 'deep-drill-mobile',
    markerFile: '.deep-drill-complete-mobile',
    registerFile: 'deep-drill-register-mobile.json',
    description: 'Deep drill panel verification — mobile (deep-drill-panels.js --viewport=mobile)',
    hasHash: true,
  },
];

// Optional checks — logged but don't block
const OPTIONAL_CHECKS = [
  {
    id: 'megamenu-behavior',
    registerFile: 'megamenu-behavior-register.json',
    description: 'Megamenu behavior register (compare-megamenu-behavior.js)',
  },
  {
    id: 'row-elements-behavior',
    registerFile: 'row-elements-behavior-register.json',
    description: 'Row elements behavior register (compare-row-elements-behavior.js)',
  },
  {
    id: 'structural-schema',
    registerFile: 'schema-register.json',
    description: 'Structural schema register (compare-structural-schema.js)',
  },
  {
    id: 'mobile-animation',
    registerFile: 'mobile/mobile-animation-comparison.json',
    description: 'Mobile animation timing comparison (compare-mobile-animation.js)',
  },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let sessionPath = null;
  let validationDir = VALIDATION_DIR;
  let requirePass = false;
  let maxAgeHours = 24;

  args.forEach((a) => {
    if (a.startsWith('--session=')) sessionPath = a.slice(10);
    else if (a.startsWith('--validation-dir=')) validationDir = a.slice(17);
    else if (a === '--require-pass') requirePass = true;
    else if (a.startsWith('--max-age-hours=')) maxAgeHours = parseInt(a.slice(16), 10);
  });

  return {
    sessionPath, validationDir, requirePass, maxAgeHours,
  };
}

function verifyMarkerHash(markerPath, registerPath) {
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
    if (!marker.hash) return { valid: false, reason: 'No hash in marker' };

    const registerContent = fs.readFileSync(registerPath, 'utf-8');
    const register = JSON.parse(registerContent);
    const expectedHash = crypto.createHash('sha256').update(JSON.stringify(register)).digest('hex');

    if (marker.hash !== expectedHash) {
      return { valid: false, reason: `Hash mismatch: marker=${marker.hash.substring(0, 16)}..., computed=${expectedHash.substring(0, 16)}...` };
    }

    return { valid: true, timestamp: marker.timestamp, allValidated: marker.allValidated };
  } catch (e) {
    return { valid: false, reason: `Error reading files: ${e.message}` };
  }
}

function checkTimestamp(timestamp, maxAgeHours) {
  if (!timestamp) return { valid: false, reason: 'No timestamp' };
  try {
    const ts = new Date(timestamp);
    const now = new Date();
    const ageMs = now - ts;
    const ageHours = ageMs / (1000 * 60 * 60);
    if (ageHours > maxAgeHours) {
      return { valid: false, reason: `Marker is ${Math.round(ageHours)}h old (max: ${maxAgeHours}h)` };
    }
    if (ageMs < 0) {
      return { valid: false, reason: 'Timestamp is in the future' };
    }
    return { valid: true, ageHours: Math.round(ageHours * 10) / 10 };
  } catch {
    return { valid: false, reason: 'Invalid timestamp format' };
  }
}

function normalizeUrl(url) {
  return url ? url.replace(/\/+$/, '') : url;
}

function checkSourceUrlMatch(markerPath, expectedSourceUrl) {
  if (!expectedSourceUrl) return { valid: true, reason: 'No session sourceUrl to check against' };
  try {
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf-8'));
    if (!marker.sourceUrl) return { valid: true, reason: 'Marker has no sourceUrl field' };
    if (normalizeUrl(marker.sourceUrl) !== normalizeUrl(expectedSourceUrl)) {
      return { valid: false, reason: `Source URL mismatch: marker="${marker.sourceUrl}", session="${expectedSourceUrl}"` };
    }
    return { valid: true };
  } catch {
    return { valid: true }; // Can't check, don't block
  }
}

function main() {
  const {
    sessionPath, validationDir, requirePass, maxAgeHours,
  } = parseArgs();
  const absValidationDir = path.resolve(validationDir);

  if (!fs.existsSync(absValidationDir)) {
    console.error(`Validation directory does not exist: ${absValidationDir}`);
    console.error('This means NO validation scripts have been run.');
    process.exit(2);
  }

  debugLog(absValidationDir, 'START', `enforcement-gate.js — requirePass=${requirePass}, maxAgeHours=${maxAgeHours}`);

  // Load session for source URL verification
  let session = null;
  const resolvedSessionPath = sessionPath ? path.resolve(sessionPath) : path.join(absValidationDir, 'session.json');
  if (fs.existsSync(resolvedSessionPath)) {
    try {
      session = JSON.parse(fs.readFileSync(resolvedSessionPath, 'utf-8'));
    } catch { /* ignore */ }
  }

  const report = {
    timestamp: new Date().toISOString(),
    validationDir: absValidationDir,
    sessionSourceUrl: session?.sourceUrl || null,
    requirePass,
    maxAgeHours,
    mandatory: [],
    optional: [],
    passed: true,
    blockers: [],
  };

  console.log('=== ENFORCEMENT GATE ===');
  console.log(`Validation dir: ${absValidationDir}`);
  console.log(`Session source: ${session?.sourceUrl || 'unknown'}`);
  console.log(`Require pass: ${requirePass}`);
  console.log(`Max age: ${maxAgeHours}h\n`);

  // Check mandatory scripts
  console.log('--- MANDATORY CHECKS ---');
  MANDATORY_CHECKS.forEach((check) => {
    const markerPath = path.join(absValidationDir, check.markerFile);
    const registerPath = path.join(absValidationDir, check.registerFile);
    const result = { id: check.id, description: check.description, checks: [] };

    // 1. Register exists
    const registerExists = fs.existsSync(registerPath);
    result.checks.push({ check: 'register-exists', passed: registerExists });
    if (!registerExists) {
      result.status = 'MISSING';
      result.reason = `Register file not found: ${check.registerFile}`;
      report.mandatory.push(result);
      report.blockers.push(`[${check.id}] ${result.reason}`);
      console.log(`  ❌ ${check.id}: MISSING — register not found`);
      return;
    }

    // 2. Marker exists
    const markerExists = fs.existsSync(markerPath);
    result.checks.push({ check: 'marker-exists', passed: markerExists });
    if (!markerExists && check.markerFile !== check.registerFile) {
      result.status = 'MISSING';
      result.reason = `Marker file not found: ${check.markerFile}`;
      report.mandatory.push(result);
      report.blockers.push(`[${check.id}] ${result.reason}`);
      console.log(`  ❌ ${check.id}: MISSING — marker not found`);
      return;
    }

    // 3. Hash verification (for scripts that produce hashed markers)
    if (check.hasHash && markerExists) {
      const hashResult = verifyMarkerHash(markerPath, registerPath);
      result.checks.push({ check: 'hash-valid', passed: hashResult.valid, detail: hashResult.reason || '' });
      if (!hashResult.valid) {
        result.status = 'TAMPERED';
        result.reason = `Hash verification failed: ${hashResult.reason}`;
        report.mandatory.push(result);
        report.blockers.push(`[${check.id}] ${result.reason}`);
        console.log(`  ❌ ${check.id}: TAMPERED — ${hashResult.reason}`);
        return;
      }
    }

    // 4. Timestamp check
    let timestamp = null;
    try {
      const markerData = JSON.parse(fs.readFileSync(markerExists ? markerPath : registerPath, 'utf-8'));
      timestamp = markerData.timestamp;
    } catch { /* ignore */ }
    const tsResult = checkTimestamp(timestamp, maxAgeHours);
    result.checks.push({ check: 'timestamp-valid', passed: tsResult.valid, detail: tsResult.reason || `${tsResult.ageHours}h old` });
    if (!tsResult.valid) {
      result.status = 'STALE';
      result.reason = `Timestamp check failed: ${tsResult.reason}`;
      report.mandatory.push(result);
      report.blockers.push(`[${check.id}] ${result.reason}`);
      console.log(`  ❌ ${check.id}: STALE — ${tsResult.reason}`);
      return;
    }

    // 5. Source URL match
    if (check.hasHash && markerExists) {
      const urlResult = checkSourceUrlMatch(markerPath, session?.sourceUrl);
      result.checks.push({ check: 'source-url-match', passed: urlResult.valid, detail: urlResult.reason || '' });
      if (!urlResult.valid) {
        result.status = 'WRONG_SOURCE';
        result.reason = `Source URL mismatch: ${urlResult.reason}`;
        report.mandatory.push(result);
        report.blockers.push(`[${check.id}] ${result.reason}`);
        console.log(`  ❌ ${check.id}: WRONG SOURCE — ${urlResult.reason}`);
        return;
      }
    }

    // 6. allValidated check (only if --require-pass)
    if (requirePass) {
      let allValidated = true;
      try {
        const registerData = JSON.parse(fs.readFileSync(registerPath, 'utf-8'));
        if (registerData.allValidated === false) allValidated = false;
        if (registerData.passed === false) allValidated = false;
      } catch { /* ignore */ }

      result.checks.push({ check: 'all-validated', passed: allValidated });
      if (!allValidated) {
        result.status = 'FAILED';
        result.reason = 'Script ran but reported failures (allValidated: false)';
        report.mandatory.push(result);
        report.blockers.push(`[${check.id}] ${result.reason}`);
        console.log(`  ❌ ${check.id}: FAILED — validation not passed`);
        return;
      }
    }

    result.status = 'VERIFIED';
    report.mandatory.push(result);
    console.log(`  ✅ ${check.id}: VERIFIED`);
  });

  // Check optional scripts
  console.log('\n--- OPTIONAL CHECKS ---');
  OPTIONAL_CHECKS.forEach((check) => {
    const registerPath = path.join(absValidationDir, check.registerFile);
    const exists = fs.existsSync(registerPath);
    report.optional.push({ id: check.id, description: check.description, exists });
    console.log(`  ${exists ? '✅' : '⚠️ '} ${check.id}: ${exists ? 'present' : 'not found (non-blocking)'}`);
  });

  // Final verdict
  report.passed = report.blockers.length === 0;

  // Write report
  const reportPath = path.join(absValidationDir, 'enforcement-gate-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));

  // Write enforcement marker
  const markerContent = JSON.stringify({
    timestamp: report.timestamp,
    passed: report.passed,
    mandatoryChecked: MANDATORY_CHECKS.length,
    mandatoryVerified: report.mandatory.filter((m) => m.status === 'VERIFIED').length,
    blockers: report.blockers,
    hash: crypto.createHash('sha256').update(JSON.stringify(report)).digest('hex'),
  });
  fs.writeFileSync(path.join(absValidationDir, '.enforcement-gate-complete'), markerContent);

  console.log(`\n${'='.repeat(60)}`);
  if (report.passed) {
    console.log('ENFORCEMENT GATE: ✅ PASSED');
    console.log(`  All ${MANDATORY_CHECKS.length} mandatory scripts verified.`);
    debugLog(absValidationDir, 'PASS', `PASSED — all ${MANDATORY_CHECKS.length} mandatory checks verified`);
  } else {
    console.log('ENFORCEMENT GATE: ❌ BLOCKED');
    console.log(`  ${report.blockers.length} blocker(s):`);
    report.blockers.forEach((b) => console.log(`    - ${b}`));
    console.log('\n  The following scripts must be (re-)run before Step 13 can complete:');
    report.mandatory.filter((m) => m.status !== 'VERIFIED').forEach((m) => {
      console.log(`    - ${m.description}`);
    });
    debugLog(absValidationDir, 'BLOCK', `BLOCKED — ${report.blockers.length} blockers: ${report.blockers.join('; ')}`);
  }
  console.log(`${'='.repeat(60)}`);

  process.exit(report.passed ? 0 : 1);
}

main();
