/* Postbuild guard: confirm the Supabase host actually inlined into the bundle.
   Self-adjusting (reads the host from env), so it survives a project change. */
try { require('dotenv').config(); } catch (_) {}
const fs = require('fs'), path = require('path');
const url = process.env.REACT_APP_SUPABASE_URL || '';
const host = url.replace(/^https?:\/\//, '').split('/')[0];
const dir = path.join('build', 'static', 'js');
const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.js')) : [];
const blob = files.map((f) => fs.readFileSync(path.join(dir, f), 'utf8')).join('');
if (!host || !blob.includes(host)) {
  console.error('\n\x1b[31m\u2716 Build verification FAILED \u2014 Supabase host not found in compiled bundle.\x1b[0m');
  console.error('  The app would load blank. Do NOT deploy this build.\n');
  process.exit(1);
}
console.log('\u2713 postbuild: Supabase host present in bundle (' + host + ').');
