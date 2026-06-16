#!/usr/bin/env node
/**
 * scripts/guard-deploy.js
 * Called manually before `gh-pages -d build`.
 * Aborts with a non-zero exit if the build directory is incomplete —
 * prevents a failed CRA build from wiping the live gh-pages branch.
 *
 * Usage (in the deploy recipe, AFTER `CI=false npm run build`):
 *   node scripts/guard-deploy.js && npx gh-pages -d build --dotfiles ...
 */
const fs = require('fs'), path = require('path');

const checks = [
  { file: 'build/index.html',     label: 'index.html' },
  { file: 'build/404.html',       label: '404.html (SPA deep-link fallback)' },
  { file: 'build/CNAME',          label: 'CNAME (custom domain — must be app.winwithone.com)' },
];

let failed = false;

for (const { file, label } of checks) {
  if (!fs.existsSync(path.join(process.cwd(), file))) {
    console.error(`\x1b[31m✖ DEPLOY BLOCKED — ${label} is missing from build/\x1b[0m`);
    failed = true;
  }
}

// Confirm CNAME value
const cnameFile = path.join(process.cwd(), 'build/CNAME');
if (fs.existsSync(cnameFile)) {
  const cname = fs.readFileSync(cnameFile, 'utf8').trim();
  if (cname !== 'app.winwithone.com') {
    console.error(`\x1b[31m✖ DEPLOY BLOCKED — build/CNAME says "${cname}", expected "app.winwithone.com"\x1b[0m`);
    failed = true;
  }
}

// Confirm a main.*.js bundle exists
const jsDir = path.join(process.cwd(), 'build/static/js');
const bundles = fs.existsSync(jsDir)
  ? fs.readdirSync(jsDir).filter(f => /^main\.[a-z0-9]+\.js$/.test(f))
  : [];
if (bundles.length === 0) {
  console.error('\x1b[31m✖ DEPLOY BLOCKED — no main.*.js bundle in build/static/js/\x1b[0m');
  failed = true;
}

if (failed) {
  console.error('\nThe build likely failed or is incomplete. Fix the build before deploying.');
  console.error('Running gh-pages on a broken build wipes the live site.\n');
  process.exit(1);
}

console.log('\x1b[32m✓ Deploy guard passed\x1b[0m');
if (bundles.length) console.log(`  bundle : ${bundles[0]}`);
console.log(`  CNAME  : ${fs.readFileSync(cnameFile,'utf8').trim()}`);
