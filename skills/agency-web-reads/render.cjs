// The rendered read for site_read.py --render: load each page in the machine's pre-installed
// Playwright Chromium, let its scripts run, scroll to the end (blocks shown on scroll), and print one
// JSON line per page: {chain: [{url, status, headers}], body: the page's HTML after scripts}.
// Read-only: it loads pages and scrolls; it never types, clicks or submits.
//   node render.cjs <url> [<url> ...] [--wait ms]
const fs = require('node:fs'), path = require('node:path'), { execSync } = require('node:child_process');
const { browserPath } = require('./find-browser.cjs');
if (!process.env.PLAYWRIGHT_BROWSERS_PATH && fs.existsSync('/opt/pw-browsers')) process.env.PLAYWRIGHT_BROWSERS_PATH = '/opt/pw-browsers';

function playwright() {
  try { return require('playwright'); } catch {}
  const roots = ['/opt/node-tools/node_modules'];
  try { roots.unshift(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch {}
  for (const r of roots) { try { return require(path.join(r, 'playwright')); } catch {} }
  throw new Error('Playwright not found (use a machine with it pre-installed)');
}

(async () => {
  const a = process.argv.slice(2), i = a.indexOf('--wait');
  const wait = i >= 0 ? Number(a.splice(i, 2)[1]) : 3000;
  const chromium = playwright().chromium;
  let exe = process.env.CHROMIUM_PATH;  // else Playwright's own browser, else the machine's (a Studio image has the Headless Shell)
  if (!exe) { try { if (!fs.existsSync(chromium.executablePath())) throw 0; } catch { exe = browserPath(); } }
  const browser = await chromium.launch(exe ? { executablePath: exe, args: (process.platform === 'linux' && process.getuid && process.getuid() === 0) ? ['--no-sandbox'] : [] } : {});
  for (const url of a) {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 },
      userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36' });
    let chain = [], body = '';
    try {
      const res = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
      for (let r = res && res.request(); r; r = r.redirectedFrom()) {
        const rr = await r.response();
        chain.unshift({ url: r.url(), status: rr ? rr.status() : 'error', headers: rr ? await rr.allHeaders() : {} });
      }
      await page.waitForLoadState('networkidle', { timeout: wait + 10000 }).catch(() => {});
      await page.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 100)); } });
      await page.waitForTimeout(wait);
      body = await page.content();
    } catch (e) { chain.push({ url, status: `error: ${e.message.split('\n')[0]}` }); }
    console.log(JSON.stringify({ chain, body }));
    await page.close();
  }
  await browser.close();
})();
