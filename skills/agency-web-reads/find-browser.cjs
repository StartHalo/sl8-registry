// Where a browser may be on this machine: a pure lookup, so a test can fake the machine under `root`.
// Order: CHROMIUM_PATH, CHROME_PATH, the Chrome Headless Shell a Studio image links onto the PATH
// (/usr/local/bin) and keeps under /opt/sl8, then a browser Playwright downloaded itself (its cache, PLAYWRIGHT_BROWSERS_PATH).
const fs = require('node:fs'), path = require('node:path'), os = require('node:os');

function walk(dir, depth, want) {
  let names = [];
  try { names = fs.readdirSync(dir).sort().reverse(); } catch { return []; }
  const out = [];
  for (const n of names) {
    const p = path.join(dir, n);
    let st; try { st = fs.statSync(p); } catch { continue; }
    if (st.isFile() && want(n, dir)) out.push(p);
    else if (st.isDirectory() && depth > 0) out.push(...walk(p, depth - 1, want));
  }
  return out;
}

function browserPath({ env = process.env, root = '', home = os.homedir() } = {}) {
  const found = [env.CHROMIUM_PATH, env.CHROME_PATH, root + '/usr/local/bin/chrome-headless-shell']
    .filter((p) => p && fs.existsSync(p));
  found.push(...walk(root + '/opt/sl8/chrome-headless-shell', 5, (n) => n === 'chrome-headless-shell'));
  const pw = env.PLAYWRIGHT_BROWSERS_PATH;
  for (const base of [...(pw && pw !== '0' ? [pw] : []), path.join(home, '.cache', 'ms-playwright')]) {
    found.push(...walk(base, 3, (n, d) => /\/chromium(_headless_shell)?-[^/]*\//.test(d + '/')
      && (n === 'chrome' || n === 'headless_shell' || n === 'chrome-headless-shell')));
  }
  return found[0];
}

module.exports = { browserPath };
