#!/usr/bin/env node
// parse-series.mjs — CSV/JSON → a labelled, EXACT-FIGURE series the chart components bind.
//
//   node "$SKILL/scripts/parse-series.mjs" <data.csv|data.json|-> [options] > series.json
//
// Emits { kind, meta, series:[{ label, value, display }] } where:
//   - label   : the category / x-axis label, verbatim from the input.
//   - value   : a NUMBER used for GEOMETRY ONLY (bar height / line y). Magnitude suffixes
//               (k/m/b/t) are expanded so 2.5M and 1,200 compare on one scale.
//   - display : the input cell text VERBATIM ($, commas, %, decimals preserved). This is what
//               the chart shows; rm-build binds it into props.json unchanged. The exact-figure
//               rule: the figure on screen == the input figure, never rounded. parse-series
//               NEVER reformats display.
//
// No external deps (Node 22 ESM). bash-3.2 safe (it is node, not shell). On parse failure it
// writes a clear diagnostic to stderr and exits non-zero — it never invents data.
//
// Options:
//   --label-col=<name|index>   pick the label column (default: first mostly-non-numeric column)
//   --value-col=<name|index>   pick the value column (default: first mostly-numeric column)
//   --kind=bar|line|counter|ranking   tag the series (default: bar). ranking sorts by value desc.
//   --out=<path>               also write the JSON to a file (still prints to stdout)

import { readFileSync, writeFileSync } from "node:fs";

function die(msg) {
  process.stderr.write(`parse-series: ${msg}\n`);
  process.exit(1);
}

// ---- args ----------------------------------------------------------------
const argv = process.argv.slice(2);
const opts = {};
let input = null;
for (const a of argv) {
  if (a.startsWith("--")) {
    const [k, v] = a.slice(2).split("=");
    opts[k] = v === undefined ? true : v;
  } else if (input === null) {
    input = a;
  }
}
if (!input) die("usage: parse-series.mjs <data.csv|data.json|-> [--label-col=] [--value-col=] [--kind=] [--out=]");
const kind = String(opts.kind || "bar").toLowerCase();
if (!["bar", "line", "counter", "ranking"].includes(kind)) die(`unknown --kind=${opts.kind}`);

const raw = input === "-" ? readFileSync(0, "utf8") : readFileSync(input, "utf8");

// ---- number extraction (geometry only; display is preserved separately) --
function numericFrom(rawCell) {
  const s = String(rawCell).trim();
  const m = s.match(/-?[\d,]*\.?\d+/);
  if (!m) return null;
  const n = parseFloat(m[0].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  const suffix = s.slice(m.index + m[0].length).trim().toLowerCase();
  const mult = suffix.startsWith("k")
    ? 1e3
    : suffix.startsWith("m")
      ? 1e6
      : suffix.startsWith("b")
        ? 1e9
        : suffix.startsWith("t")
          ? 1e12
          : 1;
  return n * mult;
}
// Column-detection test: the WHOLE trimmed cell must be a number (optionally with a currency
// prefix and a %/magnitude suffix). Looser than numericFrom on purpose — "Q1"/"Jan"/"FY24"
// are LABELS, not values, even though numericFrom could pull a digit out of them.
const NUM_RE = /^[-+]?[$£€¥]?\s*[\d,]*\.?\d+\s*(%|bps|[kmbtKMBT])?$/;
const isNumeric = (v) => v != null && NUM_RE.test(String(v).trim());

// ---- CSV parser (RFC-ish: quotes, escaped quotes, embedded commas/newlines) ----
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQ = false;
      } else field += c;
      continue;
    }
    if (c === '"') inQ = true;
    else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") field += c;
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.length && !(r.length === 1 && r[0].trim() === ""));
}

// ---- build rows of {label, displayCell} ----------------------------------
function colIndex(spec, header) {
  if (spec === undefined) return -1;
  if (/^\d+$/.test(String(spec))) return Number(spec);
  const idx = header.findIndex((h) => h.trim().toLowerCase() === String(spec).trim().toLowerCase());
  if (idx === -1) die(`column "${spec}" not found in header: ${header.join(", ")}`);
  return idx;
}

let pairs = []; // { label, displayCell }

const looksJSON = input.endsWith(".json") || /^\s*[[{]/.test(raw);
if (looksJSON) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (e) {
    die(`invalid JSON: ${e.message}`);
  }
  if (Array.isArray(data) && data.length && Array.isArray(data[0])) {
    // [[label, value], ...]
    pairs = data.map((r) => ({ label: String(r[0]), displayCell: String(r[1]) }));
  } else if (data && Array.isArray(data.series)) {
    // already-shaped { series:[{label,value,display}] } → pass display through verbatim
    pairs = data.series.map((d) => ({ label: String(d.label), displayCell: String(d.display ?? d.value) }));
  } else if (data && Array.isArray(data.labels) && Array.isArray(data.values)) {
    pairs = data.labels.map((l, i) => ({ label: String(l), displayCell: String(data.values[i]) }));
  } else if (Array.isArray(data) && data.length && typeof data[0] === "object") {
    const keys = Object.keys(data[0]);
    const labelKey = opts["label-col"] && !/^\d+$/.test(String(opts["label-col"]))
      ? String(opts["label-col"])
      : keys.find((k) => data.every((r) => !isNumeric(r[k]))) || keys[0];
    const valueKey = opts["value-col"] && !/^\d+$/.test(String(opts["value-col"]))
      ? String(opts["value-col"])
      : keys.find((k) => k !== labelKey && data.some((r) => isNumeric(r[k]))) || keys[1];
    if (!valueKey) die("could not find a numeric value column in the JSON objects");
    pairs = data.map((r) => ({ label: String(r[labelKey]), displayCell: String(r[valueKey]) }));
  } else {
    die("unrecognised JSON shape (expected array of objects, [label,value] pairs, {labels,values}, or {series})");
  }
} else {
  const rows = parseCSV(raw);
  if (rows.length < 2) die("CSV needs a header row + at least one data row");
  const header = rows[0];
  const body = rows.slice(1);
  let labelCol = colIndex(opts["label-col"], header);
  let valueCol = colIndex(opts["value-col"], header);
  const ncol = header.length;
  if (valueCol < 0) {
    // first column that is mostly numeric across the body
    valueCol = -1;
    for (let c = 0; c < ncol; c++) {
      const num = body.filter((r) => isNumeric(r[c])).length;
      if (num >= Math.ceil(body.length / 2)) {
        valueCol = c;
        break;
      }
    }
    if (valueCol < 0) die("no numeric value column detected; pass --value-col=<name|index>");
  }
  if (labelCol < 0) {
    // first non-value column, preferring a mostly-non-numeric one
    labelCol = -1;
    for (let c = 0; c < ncol; c++) {
      if (c === valueCol) continue;
      const nonNum = body.filter((r) => !isNumeric(r[c])).length;
      if (nonNum >= Math.ceil(body.length / 2)) {
        labelCol = c;
        break;
      }
    }
    if (labelCol < 0) labelCol = valueCol === 0 ? 1 : 0;
  }
  pairs = body.map((r) => ({ label: String(r[labelCol] ?? "").trim(), displayCell: String(r[valueCol] ?? "").trim() }));
}

if (!pairs.length) die("no data rows parsed");

// ---- assemble the series (display verbatim, value for geometry) ----------
const series = pairs.map(({ label, displayCell }) => {
  const display = displayCell.trim();
  const value = numericFrom(display);
  if (value === null) process.stderr.write(`parse-series: warning — non-numeric value "${display}" (label ${label}); geometry will be 0\n`);
  return { label, value: value === null ? 0 : value, display };
});

if (kind === "ranking") series.sort((a, b) => b.value - a.value);

// unit hint from the first display cell (prefix/suffix around the number)
const first = series.find((s) => /\d/.test(s.display))?.display ?? "";
const um = first.match(/^(\D*)[\d,.\s]+(\D*)$/);
const unit = { prefix: um ? um[1].trim() : "", suffix: um ? um[2].trim() : "" };

const values = series.map((s) => s.value);
const out = {
  kind,
  meta: {
    count: series.length,
    min: Math.min(...values),
    max: Math.max(...values),
    unit,
    source: input === "-" ? "stdin" : input,
  },
  series,
};

const json = JSON.stringify(out, null, 2);
if (opts.out) {
  writeFileSync(String(opts.out), json + "\n");
  process.stderr.write(`parse-series: wrote ${series.length} points → ${opts.out} (kind=${kind})\n`);
}
process.stdout.write(json + "\n");
