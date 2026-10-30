#!/usr/bin/env node
// kit.mjs: the brand kit on disk (marketing-brand-kit). Node 22, no dependencies.
// A kit is artifacts/brand-<slug>/theme.json plus its stable copies in artifacts/brand-<slug>/source/.
// artifacts/brand-kits.json lists the kits and names the default one.
//
//   new       --kit NAME                          create the kit folder and an empty theme (the first kit is the default)
//   list                                          the kits, with the default marked
//   show      --kit NAME                          print theme.json and its sha256 (the read token merge needs; assets[] is not part of it,
//                                                 so importing a file after a read does not invalidate the read)
//   import    FILE|URL --kit NAME --name N --kind logo|font|image|reference [--tags a,b] [--from ORIGINAL] [--referer PAGE_URL]
//                                                 stable copy into source/, recorded in assets[] with its source
//   font-meta FILE [--declared-weight N --declared-style S]   weight, style and format read from the font file itself (fc-scan, then the OS/2 table);
//                                                 the declared pair is a flagged last resort
//   validate  --kit NAME | --patch FILE           closed role vocabularies and field shapes
//   merge     --kit NAME --patch FILE --expect-sha SHA [--override] [--set-default] [--allow-remove]
//                                                 write with the theme contract's merge rules; previous file kept as theme.json.bak
//   verify    --kit NAME                          re-read: every path opens, every remote URL answers, every role valid
//   contrast  --kit NAME                          fg on bg contrast ratio; a warning, never a change
//   prompt    --kit NAME                          the palette, type and notes block to translate into a prompt (paths relative to the working directory)
//   delete    --kit NAME --by "WORDS"             only on the customer's explicit request; WORDS are theirs
// Options: --artifacts DIR (default ./artifacts). Exit 0 ok, 1 check failed, 2 usage.
import fs from 'node:fs'
import path from 'node:path'
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import zlib from 'node:zlib'

export const ROLES = {
  color: ['primary', 'secondary', 'accent', 'bg', 'fg', 'muted'],
  font: ['heading', 'body', 'mono', 'accent'],
  logo: ['light', 'dark', 'mono', 'color'],
  source: ['google', 'custom'],
  kind: ['logo', 'font', 'image', 'reference']
}
const WHOLE = ['colors', 'fonts', 'logos', 'images', 'assets'] // supplying one replaces the whole collection
const EXPIRING = /(\.fal\.media\/|X-Amz-Expires=|X-Goog-Expires=|[?&](Signature|sig|token|Expires)=)/i

class Fail extends Error { constructor (m, code = 1) { super(m); this.code = code } }
const args = process.argv.slice(2)
const cmd = args[0]
const flag = (n) => args.includes(`--${n}`)
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : d }
const VALUED = new Set(['--kit', '--name', '--kind', '--tags', '--patch', '--expect-sha', '--artifacts', '--by', '--from', '--referer', '--declared-weight', '--declared-style'])
const positional = () => args.slice(1).filter((a, i, all) => !a.startsWith('--') && !VALUED.has(all[i]) && !(i > 0 && VALUED.has(all[i - 1])))
const root = () => path.resolve(opt('artifacts', 'artifacts'))
const sha = (buf) => createHash('sha256').update(buf).digest('hex')
// ASCII slug; a name with no ASCII letters (Japanese, Arabic, Cyrillic) falls back to a short hash of the name, never to ''.
const slug = (s) => {
  const a = String(s).toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '')
  return a || 'k' + sha(Buffer.from(String(s))).slice(0, 6)
}
// The read token: sha256 of theme.json WITHOUT assets[]. An import only appends an asset row, so it must not invalidate a read.
const readToken = (buf) => { const t = JSON.parse(buf); delete t.assets; return sha(Buffer.from(JSON.stringify(t))) }
const readJson = (f) => JSON.parse(fs.readFileSync(f, 'utf8'))
const writeJson = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2) + '\n')
const out = (v) => console.log(typeof v === 'string' ? v : JSON.stringify(v, null, 2))

function index () {
  const f = path.join(root(), 'brand-kits.json')
  return { f, v: fs.existsSync(f) ? readJson(f) : { schema: 'sl8.brand-kits/1', default: null, kits: [] } }
}
function kitDir (name) {
  if (!name) throw new Fail('--kit NAME is required', 2)
  const { v } = index()
  const hit = v.kits.find((k) => k.name.toLowerCase() === String(name).toLowerCase() || k.project === name)
  if (!hit) throw new Fail(`no kit named '${name}' (kit.mjs list)`)
  return { dir: path.join(root(), hit.project), entry: hit }
}
const themeFile = (dir) => path.join(dir, 'theme.json')

// ---- validation -------------------------------------------------------------------------------
export function validate (t, { partial = false } = {}) {
  const errs = []
  const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x)
  if (!isObj(t)) return ['theme is not a JSON object']
  for (const legacy of ['palette', 'typography', 'brandColors', 'logo']) if (legacy in t) errs.push(`legacy free-form key '${legacy}': use colors[], fonts[], logos[]`)
  if ('notes' in t && typeof t.notes !== 'string') errs.push('notes must be Markdown text')
  if ('colors' in t) {
    if (!Array.isArray(t.colors)) errs.push('colors must be an array')
    else t.colors.forEach((c, i) => {
      if (!isObj(c) || !c.name) errs.push(`colors[${i}]: name required`)
      if (!/^#[0-9a-f]{6}$/i.test(c?.hex ?? '')) errs.push(`colors[${i}] ${c?.name ?? ''}: hex must be #RRGGBB, got '${c?.hex}'`)
      if (!ROLES.color.includes(c?.role)) errs.push(`colors[${i}] ${c?.name ?? ''}: role '${c?.role}' not in ${ROLES.color.join('|')}`)
    })
  }
  if ('fonts' in t) {
    if (!Array.isArray(t.fonts)) errs.push('fonts must be an array')
    else t.fonts.forEach((f, i) => {
      if (!isObj(f) || !f.name) errs.push(`fonts[${i}]: name required`)
      if (!ROLES.source.includes(f?.source)) errs.push(`fonts[${i}] ${f?.name ?? ''}: source '${f?.source}' not in google|custom`)
      if (!ROLES.font.includes(f?.role)) errs.push(`fonts[${i}] ${f?.name ?? ''}: role '${f?.role}' not in ${ROLES.font.join('|')}`)
      if (f?.source === 'custom') {
        if (!Array.isArray(f.files) || !f.files.length) errs.push(`fonts[${i}] ${f.name}: a custom font needs files[]`)
        else f.files.forEach((x, j) => {
          if (!x?.url) errs.push(`fonts[${i}].files[${j}]: url required`)
          if (!Number.isInteger(x?.weight)) errs.push(`fonts[${i}].files[${j}]: weight (from the file) required`)
          if (!['normal', 'italic', 'oblique'].includes(x?.style)) errs.push(`fonts[${i}].files[${j}]: style normal|italic|oblique required`)
          if (!['woff2', 'woff', 'truetype', 'opentype'].includes(x?.format)) errs.push(`fonts[${i}].files[${j}]: format woff2|woff|truetype|opentype required`)
        })
      }
    })
  }
  if ('logos' in t) {
    if (!Array.isArray(t.logos)) errs.push('logos must be an array')
    else t.logos.forEach((l, i) => {
      if (!isObj(l) || !l.name || !l.url) errs.push(`logos[${i}]: name and url required`)
      if (!ROLES.logo.includes(l?.variant)) errs.push(`logos[${i}] ${l?.name ?? ''}: variant '${l?.variant}' not in ${ROLES.logo.join('|')}`)
      if (typeof l?.hasBackground !== 'boolean') errs.push(`logos[${i}] ${l?.name ?? ''}: hasBackground must be true or false`)
    })
  }
  if ('images' in t && (!Array.isArray(t.images) || t.images.some((x) => typeof x !== 'string'))) errs.push('images must be an array of paths or URLs (the first is the thumbnail)')
  if ('assets' in t) {
    if (!Array.isArray(t.assets)) errs.push('assets must be an array')
    else {
      const seen = new Set()
      t.assets.forEach((a, i) => {
        const k = String(a?.name ?? '').toLowerCase()
        if (!k || !a.path) errs.push(`assets[${i}]: name and path required`)
        if (seen.has(k)) errs.push(`assets[${i}]: name '${a.name}' is not unique`)
        seen.add(k)
        if (a?.kind && !ROLES.kind.includes(a.kind)) errs.push(`assets[${i}]: kind '${a.kind}' not in ${ROLES.kind.join('|')}`)
      })
    }
  }
  for (const k of ['missing', 'unconfirmed']) if (k in t && !Array.isArray(t[k])) errs.push(`${k} must be an array`)
  if (!partial && Array.isArray(t.unconfirmed)) {
    for (const u of t.unconfirmed) {
      const v = String(u?.recommended ?? '').toLowerCase()
      if (v && (t.colors ?? []).some((c) => c.hex?.toLowerCase() === v)) errs.push(`unconfirmed '${u.item}': its candidate ${u.recommended} is already saved as a colour; one patch must carry the full colors[] AND the unconfirmed[] without this entry`)
    }
  }
  return errs
}

// ---- merge (the theme contract: shallow top level; colors/fonts/logos/images replace whole) --------
export function merge (current, patch, { override = false } = {}) {
  if (override) { const keep = {}; for (const k of ['name', 'assets', 'missing', 'unconfirmed']) if (k in current && !(k in patch)) keep[k] = current[k]; return { ...keep, ...patch } } // --override replaces the content, never the name, the asset ledger or the debt lists unless the patch names them
  const next = { ...current }
  for (const [k, v] of Object.entries(patch)) next[k] = v // a supplied collection replaces the old one whole
  return next
}
function dropped (current, patch) {
  const lost = []
  for (const k of WHOLE) {
    if (!(k in patch) || !Array.isArray(current[k])) continue
    const keep = new Set((patch[k] ?? []).map((x) => (typeof x === 'string' ? x : x?.name ?? '').toLowerCase()))
    for (const x of current[k]) { const n = (typeof x === 'string' ? x : x?.name ?? ''); if (!keep.has(n.toLowerCase())) lost.push(`${k}: ${n}`) }
  }
  return lost
}

// ---- font metadata from the file itself ------------------------------------------------------
const FC_WEIGHT = [[0, 100], [40, 200], [50, 300], [75, 350], [80, 400], [100, 500], [180, 600], [200, 700], [205, 800], [210, 900], [215, 950]]
// Weight and italic bit read from the font's OS/2 table (ttf, otf, woff, woff2). Node only: zlib for woff, brotli for woff2.
// OS/2 is never transformed in woff2, so it can be read once the stream is decompressed. Returns null when it cannot be read.
const WOFF2_TAGS = 'cmap head hhea hmtx maxp name OS/2 post cvt fpgm glyf loca prep CFF VORG EBDT EBLC gasp hdmx kern LTSH PCLT VDMX vhea vmtx BASE GDEF GPOS GSUB EBSC JSTF MATH CBDT CBLC COLR CPAL SVG sbix acnt avar bdat bloc bsln cvar fdsc feat fmtx fvar gvar hsty just lcar mort morx opbd prop trak Zapf Silf Glat Gloc Feat Sill'.split(' ')
export function readOS2 (file) {
  try {
    const b = fs.readFileSync(file); const magic = b.toString('latin1', 0, 4)
    let os2 = null
    if (magic === 'wOF2') {
      let p = 48; const n = b.readUInt16BE(12); const tabs = []
      const base128 = () => { let v = 0; for (let i = 0; i < 5; i++) { const c = b[p++]; v = v * 128 + (c & 0x7f); if (!(c & 0x80)) break } return v }
      for (let i = 0; i < n; i++) {
        const fl = b[p++]; const idx = fl & 0x3f; const ver = fl >> 6
        const tag = idx === 0x3f ? (p += 4, b.toString('latin1', p - 4, p)) : WOFF2_TAGS[idx]
        const orig = base128(); const transformed = (tag === 'glyf' || tag === 'loca') ? ver === 0 : ver !== 0
        tabs.push({ tag, len: transformed ? base128() : orig })
      }
      const dec = zlib.brotliDecompressSync(b.subarray(p, p + b.readUInt32BE(20)))
      let off = 0
      for (const t of tabs) { if (t.tag === 'OS/2') os2 = dec.subarray(off, off + t.len); off += t.len }
    } else if (magic === 'wOFF') {
      const n = b.readUInt16BE(12)
      for (let i = 0; i < n; i++) {
        const e = 44 + i * 20
        if (b.toString('latin1', e, e + 4) !== 'OS/2') continue
        const off = b.readUInt32BE(e + 4); const cl = b.readUInt32BE(e + 8); const ol = b.readUInt32BE(e + 12)
        const raw = b.subarray(off, off + cl); os2 = cl < ol ? zlib.inflateSync(raw) : raw
      }
    } else {
      const n = b.readUInt16BE(4)
      for (let i = 0; i < n; i++) { const e = 12 + i * 16; if (b.toString('latin1', e, e + 4) === 'OS/2') os2 = b.subarray(b.readUInt32BE(e + 8), b.readUInt32BE(e + 8) + b.readUInt32BE(e + 12)) }
    }
    if (!os2 || os2.length < 64) return null
    const sel = os2.readUInt16BE(62)
    return { weight: os2.readUInt16BE(4), style: sel & 0x200 ? 'oblique' : sel & 1 ? 'italic' : 'normal' }
  } catch { return null }
}
export function fontMeta (file) {
  const head = Buffer.alloc(4); const fd = fs.openSync(file, 'r'); fs.readSync(fd, head, 0, 4, 0); fs.closeSync(fd)
  const magic = head.toString('latin1')
  const format = magic === 'wOF2' ? 'woff2' : magic === 'wOFF' ? 'woff' : magic === 'OTTO' ? 'opentype' : (head.readUInt32BE(0) === 0x00010000 || magic === 'true') ? 'truetype' : null
  const r = spawnSync('fc-scan', ['--format', '%{family[0]}\\t%{style[0]}\\t%{weight}\\t%{slant}\\n', file], { encoding: 'utf8' })
  if (r.error || r.status !== 0 || !r.stdout.trim()) {
    // fc-scan could not read it (a woff2 without Brotli in FreeType is the usual case): read the OS/2 table ourselves.
    const o = readOS2(file)
    if (o) return { file, format, weight: Math.min(1000, Math.max(1, o.weight)), style: o.style, family: null, source_of_values: 'the file\'s OS/2 table (fc-scan could not read it)', suggested_name: `font-${o.weight}-${o.style}` }
    const dw = Number(opt('declared-weight')); const ds = opt('declared-style')
    if (Number.isInteger(dw) && dw > 0 && ['normal', 'italic', 'oblique'].includes(ds)) return { file, format, weight: dw, style: ds, family: null, source_of_values: 'declared by the page (@font-face), not read from the file: say so in the hand-off', suggested_name: `font-${dw}-${ds}` }
    return { file, format, weight: null, style: null, family: null, error: `neither fc-scan nor the OS/2 table could read the file${r.error ? ` (${r.error.code})` : ''}: do not guess weight or style from the name. If the page's @font-face declared them (candidates.json font_faces[]), pass --declared-weight N --declared-style S; the result is marked as declared, not read` }
  }
  const [family, styleName, w, s] = r.stdout.trim().split('\n')[0].split('\t')
  const fw = Number(w)
  const weight = FC_WEIGHT.reduce((best, [fc, css]) => Math.abs(fc - fw) < Math.abs(best[0] - fw) ? [fc, css] : best, FC_WEIGHT[0])[1]
  const slant = Number(s)
  const style = slant >= 110 ? 'oblique' : slant >= 100 ? 'italic' : 'normal'
  return { file, family, style_name: styleName, weight, style, format, suggested_name: `${slug(family)}-${weight}-${style}` }
}

// ---- commands ---------------------------------------------------------------------------------
function cmdNew () {
  const name = opt('kit'); if (!name) throw new Fail('new needs --kit NAME', 2)
  const { f, v } = index()
  if (v.kits.some((k) => k.name.toLowerCase() === name.toLowerCase())) throw new Fail(`a kit named '${name}' exists (names are unique, case-insensitive): read it and patch it instead`)
  const project = `brand-${slug(name)}`
  if (v.kits.some((k) => k.project === project)) throw new Fail(`folder ${project} is taken by another kit name`)
  const dir = path.join(root(), project)
  fs.mkdirSync(path.join(dir, 'source', 'extracted'), { recursive: true })
  writeJson(themeFile(dir), { name, notes: '', colors: [], fonts: [], logos: [], images: [], assets: [], missing: [], unconfirmed: [] })
  v.kits.push({ name, project, created_at: new Date().toISOString() })
  if (!v.default) v.default = name // the first kit becomes the default; later ones only with --set-default
  fs.mkdirSync(root(), { recursive: true }); writeJson(f, v)
  out({ kit: name, project, dir: path.relative(process.cwd(), dir), default: v.default === name, note: '<kit> in every path is the project value (the folder name), not the display name' })
}

function cmdList () { const { v } = index(); out({ default: v.default, kits: v.kits.map((k) => ({ ...k, default: k.name === v.default })) }) }

function cmdShow () {
  const { dir } = kitDir(opt('kit'))
  const buf = fs.readFileSync(themeFile(dir))
  out({ sha256: readToken(buf), theme: JSON.parse(buf) })
}

// What the bytes are, from the file itself (not the URL). null = unknown.
export function sniff (buf) {
  const h = buf.subarray(0, 16); const ascii = h.toString('latin1'); const head = buf.subarray(0, 512).toString('utf8').trimStart().toLowerCase()
  if (h[0] === 0x89 && ascii.slice(1, 4) === 'PNG') return { type: 'png', ext: '.png' }
  if (h[0] === 0xff && h[1] === 0xd8) return { type: 'jpeg', ext: '.jpg' }
  if (ascii.startsWith('GIF8')) return { type: 'gif', ext: '.gif' }
  if (ascii.startsWith('RIFF') && ascii.slice(8, 12) === 'WEBP') return { type: 'webp', ext: '.webp' }
  if (ascii.startsWith('wOF2')) return { type: 'woff2', ext: '.woff2' }
  if (ascii.startsWith('wOFF')) return { type: 'woff', ext: '.woff' }
  if (ascii.startsWith('OTTO')) return { type: 'opentype', ext: '.otf' }
  if (h.readUInt32BE(0) === 0x00010000 || ascii.startsWith('true')) return { type: 'truetype', ext: '.ttf' }
  if (ascii.startsWith('PK\x03\x04')) return { type: 'zip', ext: '.zip' }
  if (ascii.startsWith('%PDF')) return { type: 'pdf', ext: '.pdf' }
  if (head.startsWith('<!doctype html') || head.startsWith('<html') || head.includes('<head') || head.includes('<body')) return { type: 'html', ext: '.html' }
  if (head.includes('<svg') || (head.startsWith('<?xml') && buf.subarray(0, 4096).toString('utf8').includes('<svg'))) return { type: 'svg', ext: '.svg' }
  return null
}
const UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/152.0 Safari/537.36'
function cmdImport () {
  const [src] = positional(); const name = opt('name'); const kind = opt('kind')
  if (!src || !name || !ROLES.kind.includes(kind)) throw new Fail('import FILE|URL --kit NAME --name N --kind logo|font|image|reference [--tags a,b]', 2)
  const { dir } = kitDir(opt('kit'))
  const t = readJson(themeFile(dir))
  if ((t.assets ?? []).some((a) => a.name.toLowerCase() === name.toLowerCase())) throw new Fail(`asset name '${name}' is taken in this kit (names are unique)`)
  const remote = /^https?:\/\//i.test(src)
  const inKit = !remote && path.resolve(src).startsWith(dir + path.sep) // a prepared copy already in the kit (prepared/): record it, do not copy
  let rel; let dest; let tmp = null
  if (inKit) {
    rel = path.relative(dir, path.resolve(src)); dest = path.join(dir, rel)
    if (!fs.existsSync(dest)) throw new Fail(`${rel} does not exist`)
  } else {
    // Fetch or copy to a temp name first, look at the bytes, then name the copy by what it is.
    tmp = path.join(dir, 'source', `.incoming-${slug(name)}`)
    if (remote) {
      const referer = opt('referer', new URL(src).origin + '/')
      const r = spawnSync('curl', ['-fsSL', '--max-time', '90', '-A', UA, '-e', referer, '-o', tmp, src], { encoding: 'utf8' })
      if (r.status !== 0) { try { fs.rmSync(tmp) } catch {} ; throw new Fail(`could not download ${src} (curl exit ${r.status}): record it under missing[], never substitute a lookalike`) }
    } else fs.copyFileSync(src, tmp)
    const buf = fs.readFileSync(tmp)
    if (!buf.length) { fs.rmSync(tmp); throw new Fail(`${src} is empty`) }
    const kindOf = sniff(buf)
    if (kindOf?.type === 'html' && kind !== 'reference') { fs.rmSync(tmp); throw new Fail(`${src} returned an HTML page, not a ${kind} (hotlink protection, a bot challenge or a login page): record it under missing[] or get the file from the customer`) }
    if (kindOf?.type === 'zip') { fs.rmSync(tmp); throw new Fail(`${src} is a zip pack: unzip it into source/ (unzip -o PACK -d artifacts/<project>/source/pack) and import its members one by one`) }
    const fromUrl = (path.extname(remote ? new URL(src).pathname : src) || '').toLowerCase()
    const ext = kindOf?.ext ?? (fromUrl || '.bin')
    rel = path.join('source', `${slug(name)}${ext}`); dest = path.join(dir, rel)
    if (fs.existsSync(dest)) { fs.rmSync(tmp); throw new Fail(`${rel} exists; pick another name (the original is never overwritten)`) }
    fs.renameSync(tmp, dest)
  }
  if (!fs.statSync(dest).size) throw new Fail(`${rel} is empty`)
  const row = { name, kind, path: rel, source: remote ? src : inKit ? `prepared from ${opt('from', 'an original in source/')}` : path.basename(src), tags: (opt('tags', '') || '').split(',').map((s) => s.trim()).filter(Boolean), sha256: sha(fs.readFileSync(dest)), imported_at: new Date().toISOString() }
  // An import is not a theme edit: it only appends the asset row, and the read token (sha256) ignores assets[], so a read stays valid.
  t.assets = [...(t.assets ?? []), row]; writeJson(themeFile(dir), t)
  out({ ...row, sha256_of_file: row.sha256, kit_sha256: readToken(fs.readFileSync(themeFile(dir))) })
}

function cmdValidate () {
  const p = opt('patch')
  const t = p ? readJson(p) : readJson(themeFile(kitDir(opt('kit')).dir))
  const errs = validate(t, { partial: !!p })
  for (const e of errs) console.log(`FAIL ${e}`)
  console.log(`validate: ${errs.length} problem(s)`)
  if (errs.length) process.exitCode = 1
}

function cmdMerge () {
  const { dir, entry } = kitDir(opt('kit'))
  const pf = opt('patch'); const expect = opt('expect-sha')
  if (!pf) throw new Fail('merge needs --patch FILE', 2)
  const f = themeFile(dir)
  const buf = fs.readFileSync(f)
  if (!expect) throw new Fail('merge needs --expect-sha from `kit.mjs show`: read the kit before changing it', 2)
  if (expect !== readToken(buf)) throw new Fail(`theme.json changed since you read it (the kit now reads ${readToken(buf)}, you passed ${expect}): run kit.mjs show again and rebuild the patch`)
  const current = JSON.parse(buf); const patch = readJson(pf)
  const perr = validate(patch, { partial: true })
  if (perr.length) { perr.forEach((e) => console.log(`FAIL ${e}`)); throw new Fail(`patch rejected: ${perr.length} problem(s); nothing written`) }
  const override = flag('override')
  const lost = override ? [] : dropped(current, patch)
  if (lost.length && !flag('allow-remove')) {
    lost.forEach((l) => console.log(`WOULD REMOVE ${l}`))
    throw new Fail('the patch replaces a collection and leaves entries out: send the full collection, or pass --allow-remove when the customer asked to remove them')
  }
  const next = merge(current, patch, { override })
  if (!next.name) next.name = entry.name
  const errs = validate(next)
  if (errs.length) { errs.forEach((e) => console.log(`FAIL ${e}`)); throw new Fail('merged kit fails validation; nothing written') }
  fs.writeFileSync(path.join(dir, 'theme.json.bak'), buf)
  writeJson(f, next)
  if (flag('set-default')) { const { f: xf, v } = index(); v.default = entry.name; writeJson(xf, v) }
  out({ written: path.relative(process.cwd(), f), backup: 'theme.json.bak', override, set_default: flag('set-default'), removed: lost, sha256: readToken(fs.readFileSync(f)) })
}

function cmdVerify () {
  const { dir } = kitDir(opt('kit'))
  const t = readJson(themeFile(dir))
  const errs = validate(t); const warn = []; const ok = []
  const urls = [
    ...(t.logos ?? []).map((l) => [`logos ${l.name}`, l.url]),
    ...(t.fonts ?? []).flatMap((x) => (x.files ?? []).map((ff) => [`fonts ${x.name} ${ff.weight} ${ff.style}`, ff.url])),
    ...(t.images ?? []).map((u, i) => [`images[${i}]${i === 0 ? ' (thumbnail)' : ''}`, u]),
    ...(t.referenceImageUrl ? [['referenceImageUrl', t.referenceImageUrl]] : []),
    ...(t.assets ?? []).map((a) => [`assets ${a.name}`, a.path])
  ]
  for (const [what, u] of urls) {
    if (!u) { errs.push(`${what}: empty url`); continue }
    if (/^https?:\/\//i.test(u)) {
      if (EXPIRING.test(u)) { errs.push(`${what}: ${u} looks temporary or signed; import a stable copy`); continue }
      let r = spawnSync('curl', ['-sSIL', '-A', UA, '--max-time', '30', '-o', '/dev/null', '-w', '%{http_code}', u], { encoding: 'utf8' })
      let code = Number(r.stdout)
      // Many CDNs answer HEAD with 403 or 405 for a good URL: retry as a one-byte GET before failing.
      if (!(code >= 200 && code < 400)) { r = spawnSync('curl', ['-sSL', '-A', UA, '-r', '0-0', '--max-time', '30', '-o', '/dev/null', '-w', '%{http_code}', u], { encoding: 'utf8' }); code = Number(r.stdout) }
      if (code >= 200 && code < 400) warn.push(`${what}: remote ${u} answers ${code}; a stable copy in source/ is the default`)
      else errs.push(`${what}: ${u} answers ${r.stdout || 'nothing'}`)
      continue
    }
    const p = path.resolve(dir, u)
    if (!fs.existsSync(p) || !fs.statSync(p).isFile() || !fs.statSync(p).size) errs.push(`${what}: ${u} does not exist or is empty`)
    else ok.push(`${what}: ${u}`)
  }
  // Request only the weights a font ships: asking a 400-only family for 600 or 700 renders a fake (synthesised) bold.
  for (const x of t.fonts ?? []) if (x.source === 'custom' && x.files?.length) ok.push(`fonts ${x.name} ships weights ${[...new Set(x.files.map((ff) => `${ff.weight}${ff.style === 'normal' ? '' : ' ' + ff.style}`))].join(', ')}: use only these (a weight it does not ship is a fake bold)`)
  for (const x of t.fonts ?? []) if (x.source === 'google') warn.push(`fonts ${x.name} (google): the shipped weights are not in the kit; request only weights the family offers`)
  for (const a of t.assets ?? []) {
    const p = path.resolve(dir, a.path)
    if (a.sha256 && fs.existsSync(p) && sha(fs.readFileSync(p)) !== a.sha256) errs.push(`assets ${a.name}: ${a.path} changed since import (originals are never overwritten)`)
  }
  for (const m of t.missing ?? []) warn.push(`missing: ${m.item ?? JSON.stringify(m)}${m.reason ? ` (${m.reason})` : ''}`)
  for (const u of t.unconfirmed ?? []) warn.push(`unconfirmed: ${u.item} (not saved; waiting for the customer)`)
  for (const role of ['fg', 'bg']) if (!(t.colors ?? []).some((c) => c.role === role) && !(t.missing ?? []).some((m) => String(m.item ?? '').includes(role))) warn.push(`no ${role} colour and not listed under missing[]`)
  ok.forEach((l) => console.log(`ok   ${l}`)); warn.forEach((l) => console.log(`WARN ${l}`)); errs.forEach((l) => console.log(`FAIL ${l}`))
  console.log(`verify: ${ok.length} file(s) open, ${warn.length} warning(s), ${errs.length} problem(s)`)
  if (errs.length) process.exitCode = 1
}

function lum (hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }
function cmdContrast () {
  const t = readJson(themeFile(kitDir(opt('kit')).dir))
  const by = (r) => (t.colors ?? []).filter((c) => c.role === r)
  const pairs = []
  for (const bg of by('bg')) for (const fg of [...by('fg'), ...by('muted'), ...by('primary'), ...by('accent')]) pairs.push([fg, bg])
  if (!pairs.length) { console.log('WARN no bg colour with a fg, muted, primary or accent colour to compare'); return }
  for (const [fg, bg] of pairs) {
    const r = ratio(fg.hex, bg.hex)
    const verdict = r >= 4.5 ? 'meets 4.5:1 (normal text)' : r >= 3 ? 'meets 3:1 only (large text: 24px+, or 19px+ bold)' : 'below 3:1'
    console.log(`${r < 4.5 ? 'WARN' : 'ok  '} ${fg.role} ${fg.name} ${fg.hex} on bg ${bg.name} ${bg.hex}: ${r.toFixed(2)}:1, ${verdict}`)
  }
  console.log('contrast: a warning for the customer; no brand colour is changed')
}

function cmdPrompt () {
  const t = readJson(themeFile(kitDir(opt('kit')).dir))
  const lines = []
  if ((t.colors ?? []).length) lines.push('Brand palette: ' + t.colors.map((c) => `${c.role} ${c.name} ${c.hex.toUpperCase()}`).join('; ') + '.')
  if ((t.fonts ?? []).length) lines.push('Typography: ' + t.fonts.map((f) => `${f.role} ${f.name}`).join('; ') + '.')
  if (t.notes) lines.push('Brand notes:\n' + t.notes.trim())
  const { dir } = kitDir(opt('kit'))
  const here = (u) => (/^https?:\/\//i.test(u) ? u : path.relative(process.cwd(), path.resolve(dir, u))) // usable from the job root as printed
  const logos = (t.logos ?? []).map((l) => `${l.name} (${l.variant}${l.hasBackground ? ', has a background' : ', transparent'}) ${here(l.url)}`)
  out({ prompt_block: lines.join('\n'), paths_relative_to: process.cwd(), logos_to_composite: logos, images: (t.images ?? []).map(here), unconfirmed: (t.unconfirmed ?? []).map((u) => u.item), missing: (t.missing ?? []).map((m) => m.item ?? m) })
}

function cmdDelete () {
  const by = opt('by'); if (!by) throw new Fail('delete needs --by "<the customer\'s words asking for it>"', 2)
  const { dir, entry } = kitDir(opt('kit'))
  const { f, v } = index()
  fs.rmSync(dir, { recursive: true, force: true })
  v.kits = v.kits.filter((k) => k.name !== entry.name)
  const wasDefault = v.default === entry.name
  if (wasDefault) v.default = null // never pick a new default on the customer's behalf
  v.deleted = [...(v.deleted ?? []), { name: entry.name, by, at: new Date().toISOString() }]
  writeJson(f, v)
  out({ deleted: entry.name, default_cleared: wasDefault })
}

const COMMANDS = { new: cmdNew, list: cmdList, show: cmdShow, import: cmdImport, validate: cmdValidate, merge: cmdMerge, verify: cmdVerify, contrast: cmdContrast, prompt: cmdPrompt, delete: cmdDelete, 'font-meta': () => { const [f] = positional(); if (!f) throw new Fail('font-meta FILE', 2); const m = fontMeta(f); out(m); if (m.error) process.exitCode = 1 } }
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    if (!COMMANDS[cmd]) throw new Fail(`usage: kit.mjs ${Object.keys(COMMANDS).join('|')} … (see the header of this file)`, 2)
    COMMANDS[cmd]()
  } catch (e) {
    if (!(e instanceof Fail)) throw e
    console.error(`kit.mjs: ${e.message}`); process.exitCode = e.code
  }
}
