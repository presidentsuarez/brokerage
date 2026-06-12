/* Prebuild guard: refuse to build without Supabase env vars.
   Prevents the "blank page" failure where a build with no .env compiles
   REACT_APP_SUPABASE_* to undefined and the app crashes on startup. */
function loadEnv() {
  try { require('dotenv').config(); }
  catch (_) {
    const fs = require('fs');
    if (fs.existsSync('.env')) {
      for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
        const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    }
  }
}
loadEnv();
const required = ['REACT_APP_SUPABASE_URL', 'REACT_APP_SUPABASE_ANON_KEY'];
const missing = required.filter((k) => !process.env[k] || !String(process.env[k]).trim());
if (missing.length) {
  console.error('\n\x1b[31m\u2716 Build blocked \u2014 missing required env vars:\x1b[0m');
  missing.forEach((k) => console.error('   - ' + k));
  console.error('\nRecreate .env before building (see handoff \u00a75). Aborting so we do not ship a blank app.\n');
  process.exit(1);
}
console.log('\u2713 prebuild: Supabase env vars present.');
