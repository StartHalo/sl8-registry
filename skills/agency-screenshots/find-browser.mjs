// Where a browser may be on this machine: a pure lookup, so a test can fake the machine under `root`.
// Order: CHROMIUM_PATH, CHROME_PATH, the Chrome Headless Shell a Studio image links onto the PATH
// (/usr/local/bin) and keeps under /opt/sl8, then a browser Playwright downloaded itself (its cache, PLAYWRIGHT_BROWSERS_PATH).
import { existsSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

const walk = (dir, depth, want) => {
  let names = [];
  try { names = readdirSync(dir).sort().reverse(); } catch { return []; }
  const out = [];
  for (const n of names) {
    const p = join(dir, n);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isFile() && want(n, dir)) out.push(p);
    else if (st.isDirectory() && depth > 0) out.push(...walk(p, depth - 1, want));
  }
  return out;
};

export function browserPath({ env = process.env, root = '', home = homedir() } = {}) {
  const found = [env.CHROMIUM_PATH, env.CHROME_PATH, root + '/usr/local/bin/chrome-headless-shell']
    .filter((p) => p && existsSync(p));
  found.push(...walk(root + '/opt/sl8/chrome-headless-shell', 5, (n) => n === 'chrome-headless-shell'));
  const pw = env.PLAYWRIGHT_BROWSERS_PATH;
  for (const base of [...(pw && pw !== '0' ? [pw] : []), join(home, '.cache', 'ms-playwright')]) {
    found.push(...walk(base, 3, (n, d) => /\/chromium(_headless_shell)?-[^/]*\//.test(d + '/')
      && (n === 'chrome' || n === 'headless_shell' || n === 'chrome-headless-shell')));
  }
  return found[0];
}
