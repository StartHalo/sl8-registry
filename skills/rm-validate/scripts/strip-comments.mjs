// strip-comments.mjs — emit the CODE of every .ts/.tsx under <src-dir> with comments blanked out,
// so the contract lint scans real code, not the contract notes the engine writes in its own comments
// (the starter's files literally say "no Math.random / no CSS transition" in // comments — linting raw
// text would BLOCK the clean, render-proven starter).
//
//   node strip-comments.mjs <src-dir>
//
// Prints one line per non-blank source line, in `relpath:lineno:code` form (relpath rooted at the
// PARENT of <src-dir>, so paths read `src/Foo.tsx:42: ...`). String literals are PRESERVED (a CSS
// string like "transition: all" is a real violation we must still catch); only // line-comments and
// /* */ block-comments are replaced with spaces (line numbers stay aligned). String-aware so `//`
// inside a "http://" string or a `/* */` inside a string is NOT treated as a comment.
import fs from "node:fs";
import path from "node:path";

const srcDir = process.argv[2];
if (!srcDir) { console.error("usage: node strip-comments.mjs <src-dir>"); process.exit(1); }
const rootForRel = path.dirname(path.resolve(srcDir));

function listFiles(dir) {
  const out = [];
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    const fp = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".remotion" || e.name === ".git") continue;
      out.push(...listFiles(fp));
    } else if (/\.(t|j)sx?$/.test(e.name) && !/\.d\.ts$/.test(e.name)) {
      out.push(fp);
    }
  }
  return out;
}

// Replace comments with spaces; keep newlines and string contents intact.
function stripComments(s) {
  let out = "";
  let i = 0;
  const n = s.length;
  // state: 0 code, 1 line-comment, 2 block-comment, 3 single, 4 double, 5 template
  let st = 0;
  while (i < n) {
    const c = s[i];
    const d = i + 1 < n ? s[i + 1] : "";
    if (st === 0) {
      if (c === "/" && d === "/") { st = 1; out += "  "; i += 2; continue; }
      if (c === "/" && d === "*") { st = 2; out += "  "; i += 2; continue; }
      if (c === "'") { st = 3; out += c; i++; continue; }
      if (c === '"') { st = 4; out += c; i++; continue; }
      if (c === "`") { st = 5; out += c; i++; continue; }
      out += c; i++; continue;
    }
    if (st === 1) { // line comment
      if (c === "\n") { st = 0; out += c; } else { out += c === "\t" ? "\t" : " "; }
      i++; continue;
    }
    if (st === 2) { // block comment
      if (c === "*" && d === "/") { st = 0; out += "  "; i += 2; continue; }
      out += c === "\n" ? "\n" : (c === "\t" ? "\t" : " ");
      i++; continue;
    }
    // string states 3/4/5 — copy verbatim, honor escapes, end on the matching quote.
    if (c === "\\") { out += c + (d || ""); i += 2; continue; }
    out += c;
    if ((st === 3 && c === "'") || (st === 4 && c === '"') || (st === 5 && c === "`")) st = 0;
    i++;
  }
  return out;
}

for (const file of listFiles(srcDir)) {
  let raw;
  try { raw = fs.readFileSync(file, "utf8"); } catch { continue; }
  const rel = path.relative(rootForRel, file);
  const cleaned = stripComments(raw).split("\n");
  for (let k = 0; k < cleaned.length; k++) {
    const line = cleaned[k];
    if (line.trim() === "") continue;
    process.stdout.write(`${rel}:${k + 1}:${line}\n`);
  }
}
