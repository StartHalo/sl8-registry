// Screenshot web pages at desktop and phone width with the machine's Playwright and Chromium.
// Read-only: loads pages, scrolls them, never types, clicks a submit or posts a form.
//
//   node shoot.mjs <url> [<url> ...] [--out shots] [--views desktop,phone] [--full] [--wait 1500]
//                  [--mark "<css selector>=<label>"]... [--open "<css selector>"] [--jpeg]
//
// --views   desktop = 1280x800, phone = 390x844 (iPhone user agent, touch); both at 2x pixels
// --full    the whole page (default: the first screen only)
// --mark    outline an element in red with a label (repeatable; the first match that is visible)
// --open    click one element first, e.g. a menu button (never a submit button)
// Writes <out>/<page>-<view>.png (or .jpg) and <out>/index.json (url, view, size, time, title).
import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';
import { browserPath } from './find-browser.mjs';

const VIEWS = {
  desktop: { viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2 },
  phone: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' },
};

function args() {
  const a = process.argv.slice(2), o = { urls: [], mark: [], out: 'shots', views: 'desktop,phone', wait: 1500 };
  for (let i = 0; i < a.length; i++) {
    const k = a[i];
    if (k === '-h' || k === '--help') o.help = true;
    else if (k === '--full' || k === '--jpeg') o[k.slice(2)] = true;
    else if (k === '--mark') o.mark.push(a[++i]);
    else if (k.startsWith('--')) o[k.slice(2)] = a[++i];
    else o.urls.push(k);
  }
  return o;
}

async function playwright() {
  try { return await import('playwright'); } catch {}
  const roots = ['/opt/node-tools/node_modules'];
  try { roots.unshift(execSync('npm root -g', { encoding: 'utf8' }).trim()); } catch {}
  const req = createRequire(import.meta.url);
  for (const r of roots) { try { return req(join(r, 'playwright')); } catch {} }
  throw new Error('Playwright not found (npm install playwright, or use a machine with it pre-installed)');
}

const o = args();
if (o.help || !o.urls.length) {
  console.log(`usage: node shoot.mjs <url> [...] [--out dir] [--views desktop,phone] [--full] [--wait ms]
       [--mark "<selector>=<label>"]... [--open "<selector>"] [--jpeg]`);
  process.exit(o.help ? 0 : 2);
}
const out = resolve(o.out); mkdirSync(out, { recursive: true });
const { chromium } = await playwright();
let exe = process.env.CHROMIUM_PATH;
if (!exe) { try { if (!existsSync(chromium.executablePath())) throw 0; } catch { exe = existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : browserPath(); } }
const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
const browser = await chromium.launch({ args: ['--no-sandbox'], ...(exe ? { executablePath: exe } : {}),
  ...(proxy ? { proxy: { server: proxy, bypass: 'localhost,127.0.0.1' } } : {}) });
const index = [];
const hosts = new Set(o.urls.map(u => (u.match(/^\w+:\/\/([^/]*)/) || [])[1]));
for (const url of o.urls) {
  // name from the end of the path (the distinctive part), e.g. /blog/post-name/ -> blog-post-name
  let name = (url.replace(/^\w+:\/\/[^/]*/, '').replace(/[?#].*$/, '').replace(/\.html?$/, '')
    .replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').slice(-60).replace(/^-/, '') || 'home');
  if (hosts.size > 1) name = (url.match(/^\w+:\/\/([^/]*)/) || [])[1] + '-' + name;  // two sites never overwrite each other
  for (const v of o.views.split(',')) {
    const ctx = await browser.newContext(VIEWS[v]);
    const page = await ctx.newPage();
    const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch((e) => ({ status: () => String(e.message).split('\n')[0] }));
    // reveal blocks that animate in on scroll, then back to the top
    const h = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0; y < h; y += 600) { await page.evaluate((y) => window.scrollTo(0, y), y); await page.waitForTimeout(60); }
    await page.evaluate(() => window.scrollTo(0, 0));
    if (o.open) { await page.click(o.open).catch((e) => console.warn(`--open ${o.open}: ${e.message.split('\n')[0]}`)); await page.waitForTimeout(500); }
    await page.waitForTimeout(Number(o.wait));
    // measured before the marks are drawn (they would widen the page)
    const size = await page.evaluate(() => ({ width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight }));
    const missing = await page.evaluate((marks) => {
      const miss = [];
      for (const m of marks) {
        const i = m.lastIndexOf('='), sel = i > 0 ? m.slice(0, i) : m, label = i > 0 ? m.slice(i + 1) : '';
        const e = [...document.querySelectorAll(sel)].find((x) => x.getClientRects().length);
        if (!e) { miss.push(sel); continue; }
        const r = e.getBoundingClientRect(), box = document.createElement('div');
        box.style.cssText = `position:absolute;z-index:2147483646;pointer-events:none;border:3px solid #DB310E;border-radius:6px;` +
          `left:${r.left + scrollX - 5}px;top:${r.top + scrollY - 5}px;width:${r.width + 10}px;height:${r.height + 10}px`;
        document.body.appendChild(box);
        if (label) {
          const t = document.createElement('div'); t.textContent = label;
          t.style.cssText = `position:absolute;z-index:2147483647;background:#DB310E;color:#fff;font:700 14px/1 Arial,sans-serif;` +
            `padding:5px 8px;border-radius:4px;white-space:nowrap;left:${Math.max(4, r.left + scrollX - 5)}px;top:${Math.max(2, r.top + scrollY - 30)}px`;
          document.body.appendChild(t);
        }
      }
      return miss;
    }, o.mark);
    if (missing.length) console.warn(`${url} ${v}: not found: ${missing.join(', ')}`);
    const file = `${name}-${v}.${o.jpeg ? 'jpg' : 'png'}`;
    await page.screenshot({ path: join(out, file), fullPage: !!o.full, ...(o.jpeg ? { type: 'jpeg', quality: 85 } : {}) });
    const row = { file, url, view: `${v} ${VIEWS[v].viewport.width}x${VIEWS[v].viewport.height}`, full: !!o.full,
      status: typeof res?.status === 'function' ? res.status() : null, title: await page.title(), page_css_px: size,
      wider_than_view: size.width > VIEWS[v].viewport.width, taken_utc: new Date().toISOString() };
    index.push(row);
    console.log(`${file}  ${row.status}  ${row.title}${row.wider_than_view ? '  (page wider than the screen)' : ''}`);
    await ctx.close();
  }
}
// merge with an earlier run in the same folder: a re-taken file replaces its row
let old = [];
try { old = JSON.parse(readFileSync(join(out, 'index.json'), 'utf8')); } catch {}
const merged = old.filter((r) => !index.some((n) => n.file === r.file)).concat(index);
writeFileSync(join(out, 'index.json'), JSON.stringify(merged, null, 1) + '\n');
await browser.close();
