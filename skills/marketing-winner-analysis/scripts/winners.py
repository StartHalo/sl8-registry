#!/usr/bin/env python3
"""Read-only winner analysis over an ad account's insights export (SL8, marketing-winner-analysis).

Standard library only (csv, zipfile, xml): reads CSV and XLSX without pandas or openpyxl.
It never calls a network and never writes to an ad account.

  columns <export> [--sheet NAME] [--header-row N]
                                             list the columns, fill and sample values (step 6)
  flatten <reply.json ...> --out flat.csv [--set col=value ...]
                                             flatten raw API insight replies into one CSV (step 5, token routes)
  rank    <export> --map map.json --out DIR  window and static filter, per-ad totals, floors, ranking (steps 2, 5-7)
  record  --dir DIR --selected sel.json --ledger LEDGER
                                             evidence records and ledger rows (steps 8-10)
  check   --dir DIR [--ledger LEDGER] [--scan PATH ...] [--token-env NAME]
                                             record, ledger and credential checks (steps 3, 4, 7-10)

Exit codes: 0 ok; 1 a check failed or a file could not be read; 3 the map is incomplete
(missing column, definition, floor or basis); 4 no static-image rows in the export.
"""
import csv, datetime, io, json, os, re, sys, zipfile
import xml.etree.ElementTree as ET

BOUNDARY = ("Read-only run: this analysis reads the account's details, campaigns, ad sets, ads, "
            "creatives with previews, insights, action and conversion counts, and spend, and nothing else. It creates, "
            "changes, pauses, resumes, publishes, deletes, duplicates, uploads or re-budgets nothing; "
            "changes are made in the platform's ads manager by a person with write access.")
PROVES = "existence and traceability of this ad and its numbers in the account's own insights; not creative quality"
NS = {"m": "http://schemas.openxmlformats.org/spreadsheetml/2006/main"}
RID = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}id"


def fail(code, msg):
    print(f"ERROR {msg}", file=sys.stderr)
    sys.exit(code)


# ---------- reading exports ----------

def col_index(ref):
    n = 0
    for ch in re.match(r"[A-Z]+", ref).group(0):
        n = n * 26 + ord(ch) - 64
    return n - 1


def read_xlsx(path, sheet=None):
    """Return (rows, sheet name, all sheet names). With no sheet named, the first sheet whose widest
    row holds at least 3 filled cells is used (platform workbooks often start with a notes sheet)."""
    with zipfile.ZipFile(path) as z:
        names = set(z.namelist())
        shared = []
        if "xl/sharedStrings.xml" in names:
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).findall("m:si", NS):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS['m']}}}t")))
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        targets = {r.get("Id"): r.get("Target") for r in rels}
        sheets = [(s.get("name"), targets[s.get(RID)]) for s in wb.find("m:sheets", NS)]

        def load(target):
            target = target.lstrip("/")
            target = target if target.startswith("xl/") else "xl/" + target
            rows = []
            for row in ET.fromstring(z.read(target)).iter(f"{{{NS['m']}}}row"):
                vals = {}
                for c in row.findall("m:c", NS):
                    t = c.get("t")
                    v = c.find("m:v", NS)
                    if t == "s" and v is not None:
                        val = shared[int(v.text)]
                    elif t == "inlineStr":
                        val = "".join(x.text or "" for x in c.iter(f"{{{NS['m']}}}t"))
                    else:
                        val = v.text if v is not None else ""
                    vals[col_index(c.get("r"))] = val
                if vals:
                    rows.append([vals.get(i, "") for i in range(max(vals) + 1)])
            return rows

        if sheet:
            pick = next((s for s in sheets if s[0] == sheet), None)
            if not pick:
                fail(1, f"sheet {sheet!r} not in workbook (sheets: {', '.join(s[0] for s in sheets)})")
            return load(pick[1]), pick[0], [s[0] for s in sheets]
        for nm, tg in sheets:
            rows = load(tg)
            if rows and max(sum(1 for x in r if str(x).strip()) for r in rows) >= 3:
                return rows, nm, [s[0] for s in sheets]
        fail(1, f"{path}: no sheet holds a table of 3 or more columns (sheets: {', '.join(s[0] for s in sheets)})")


def pick_header(rows, header_row=None):
    """Index of the header row: the one given (1-based), else the first row at least 60% as wide as the widest
    of the first 50 rows (skips a report title and date-range lines above the table)."""
    if header_row:
        return header_row - 1
    filled = [sum(1 for x in r if str(x).strip()) for r in rows[:50]]
    widest = max(filled)
    return next(i for i, n in enumerate(filled) if n >= 0.6 * widest)


def read_table(path, sheet=None, header_row=None):
    """Cells are kept exactly as exported (ids, names and ad sets are the attribution key); header names are
    trimmed. Duplicate header names get ' (2)', ' (3)' and are listed in meta.duplicate_headers."""
    if not os.path.isfile(path):
        fail(1, f"no such export: {path}")
    if path.lower().endswith((".xlsx", ".xlsm")):
        rows, used, all_sheets = read_xlsx(path, sheet)
        fmt = "xlsx"
    else:
        raw = open(path, "rb").read()
        text = raw.decode("utf-8", "replace")
        for enc in ("utf-8-sig", "utf-16", "cp1252"):
            try:
                text = raw.decode(enc)
                break
            except UnicodeDecodeError:
                continue
        try:
            dialect = csv.Sniffer().sniff(text[:8192], delimiters=",;\t")
        except csv.Error:
            dialect = csv.excel
        rows = list(csv.reader(io.StringIO(text), dialect))
        used, all_sheets, fmt = None, None, "csv"
    rows = [r for r in rows if any(str(x).strip() for x in r)]
    if not rows:
        fail(1, f"{path}: no rows")
    hi = pick_header(rows, header_row)
    head, dups, seen = [], [], {}
    for h in rows[hi]:
        h = str(h).strip()
        seen[h] = seen.get(h, 0) + 1
        if seen[h] > 1:
            dups.append(h)
            h = f"{h} ({seen[h]})"
        head.append(h)
    body = [dict(zip(head, [str(x) for x in r] + [""] * (len(head) - len(r)))) for r in rows[hi + 1:]]
    return head, body, {"format": fmt, "sheet": used, "sheets": all_sheets, "header_row": hi + 1,
                        "duplicate_headers": dups}


def num(s):
    s = str(s or "").strip()
    if s in ("", "-", "--", "n/a", "N/A", "None", "null"):
        return None
    s = re.sub(r"[^\d,.\-eE]", "", s)
    if "," in s and "." in s:
        s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".") if re.fullmatch(r"-?\d+,\d{1,2}", s) else s.replace(",", "")
    try:
        return float(s)
    except ValueError:
        return None


HINTS = {
    "ad_id": r"\bad id\b|^ad_id$", "ad_name": r"\bad name\b|^ad_name$", "ad_set": r"ad set|adset",
    "media_type": r"media type|creative type|format|asset type|object type",
    "spend": r"amount spent|\bspend\b|\bcost\b(?! per)", "conversions": r"purchase|conversion|lead|registration|action|results?$",
    "value": r"value|revenue", "image": r"image|thumbnail|preview|creative url",
    "impressions": r"impression|reach", "currency": r"currency", "date": r"date|day|reporting (starts|ends)", "currency": r"currency",
    "market": r"country|region|market", "language": r"language|locale",
    "placement": r"placement|platform|position", "optimization": r"optimi[sz]ation|objective|event",
    "audience": r"audience", "budget": r"budget",
}


SCI = re.compile(r"^\d(\.\d+)?[eE][+-]?\d+$")
IMG_EXT = (".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".heic")


def parse_date(s, fmt=None):
    """ISO and common unambiguous forms; an Excel serial number; or the map's own strptime format."""
    s = str(s or "").strip()
    if not s:
        return None
    if re.fullmatch(r"\d{5}(\.\d+)?", s) and 20000 < float(s) < 80000:
        return datetime.date(1899, 12, 30) + datetime.timedelta(days=int(float(s)))
    for f in ([fmt] if fmt else ["%Y-%m-%d", "%Y/%m/%d", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%d %b %Y", "%b %d, %Y"]):
        try:
            return datetime.datetime.strptime(s, f).date()
        except ValueError:
            continue
    return None


def cmd_columns(a):
    head, body, meta = read_table(a.export, a.sheet, a.header_row)
    cols, warn = [], []
    for h in head:
        vals = [r[h] for r in body if r[h].strip() != ""]
        samples = list(dict.fromkeys(vals))[:3]
        cols.append({"name": h, "filled": len(vals), "numeric": bool(vals) and all(num(v) is not None for v in vals[:200]),
                     "samples": samples})
        if vals and sum(1 for v in vals[:200] if SCI.match(v.strip())) >= max(1, len(vals[:200]) // 2):
            warn.append(f"column {h!r} holds numbers in scientific notation (1.2E+17): if it is an id the digits are already lost; "
                        "export it as text or use the CSV")
    if meta["duplicate_headers"]:
        warn.append(f"duplicate header names {meta['duplicate_headers']} were renamed with ' (2)', ' (3)'")
    hints = {k: [h for h in head if re.search(p, h, re.I)] for k, p in HINTS.items()}
    print(json.dumps({"file": a.export, **meta, "rows": len(body), "columns": cols,
                      "hints": {k: v for k, v in hints.items() if v}, "warnings": warn,
                      "note": "hints are name matches only; read each column's definition before using it. "
                              "If the header row is wrong, pass --header-row N (1-based, counted after empty rows)"}, indent=1))


# ---------- flatten (token routes) ----------

def cmd_flatten(a):
    """Raw insight replies ({"data":[{...,"actions":[{"action_type","value"}]}]}) to one flat CSV: scalar fields
    stay, a list of action_type/value objects becomes one column per type ('actions:purchase'). It prints only
    counts and paging cursors, never a URL or a header."""
    rows, cols, skipped = [], [], 0
    consts = dict(x.split("=", 1) for x in (a.set or []))
    for f in a.replies:
        try:
            j = json.load(open(f))
        except (OSError, ValueError) as e:
            fail(1, f"{f}: not readable as JSON ({type(e).__name__})")
        if isinstance(j, dict) and j.get("error"):
            e = j["error"] if isinstance(j["error"], dict) else {}
            fail(1, f"{f}: the platform returned an error (code {e.get('code', '?')}, type {e.get('type', '?')}); "
                    "an expired token, a missing permission or a rate limit: stop and report it, do not use this file")
        data = j.get("data") if isinstance(j, dict) else j
        if not isinstance(data, list):
            fail(1, f"{f}: no 'data' list in the reply")
        if not data:
            print(f"NOTE {f}: an empty page (no rows)")
        nxt = (j.get("paging") or {}) if isinstance(j, dict) else {}
        if nxt.get("next"):
            print(f"PAGING {f}: more pages; request again with the query's cursor parameter "
                  f"(after={(nxt.get('cursors') or {}).get('after', '?')}), header on every call, never by the returned URL")
        for rec in data:
            flat = {}
            for k, v in rec.items():
                if isinstance(v, list) and v and all(isinstance(x, dict) and "action_type" in x for x in v):
                    for x in v:
                        flat[f"{k}:{x['action_type']}"] = x.get("value", "")
                elif v is None or isinstance(v, (str, int, float)):
                    flat[k] = v
                else:
                    skipped += 1
            flat.update(consts)
            for k in flat:
                if k not in cols:
                    cols.append(k)
            rows.append(flat)
    if not rows:
        fail(4, "no rows in any reply")
    os.makedirs(os.path.dirname(os.path.abspath(a.out)), exist_ok=True)
    with open(a.out, "w", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols)
        w.writeheader()
        w.writerows(rows)
    print(json.dumps({"out": a.out, "rows": len(rows), "columns": cols, "nested_fields_skipped": skipped}))


# ---------- rank ----------

def need(m, cond, msg, problems):
    if not cond:
        problems.append(msg)


def check_map(m, head):
    p = []
    c = m.get("columns", {})
    for k in ("ad_id", "ad_name", "spend"):
        need(m, c.get(k), f"columns.{k} is required", p)
    if c.get("media_type"):
        need(m, m.get("static_values"), "static_values must list the media type values that mean a static image", p)
    else:
        need(m, str(m.get("static_assertion", "")).strip(),
             "columns.media_type is missing: map it, or set static_assertion to how the caller says the export was filtered to "
             "still images (their words); with neither, stop and name the missing media type column", p)
    need(m, c.get("ad_set") or m.get("ad_set_not_in_export") is True,
         "columns.ad_set is required (or set ad_set_not_in_export true, and the record says so)", p)
    conv = c.get("conversions") or []
    need(m, isinstance(conv, list) and conv, "columns.conversions must list the raw action/conversion columns", p)
    if isinstance(conv, list) and len(conv) > 1:
        summary = [x for x in conv if re.fullmatch(r"results?", str(x).strip(), re.I)]
        need(m, not summary, f"{summary}: a summary Results column listed beside other conversion columns counts a sale twice; "
                             "list the columns that each count one kind of event, never a summary beside its parts", p)
    if c.get("value"):
        need(m, not re.search(r"roas|ratio|rate|per ", str(c["value"]), re.I),
             f"columns.value {c['value']!r} looks like a ratio; map an amount in currency (summed per ad, then divided by spend)", p)
    used = [x for x in [c.get("ad_id"), c.get("ad_name"), c.get("ad_set"), c.get("media_type"), c.get("spend"),
                         c.get("value"), c.get("image"), c.get("concept"), c.get("date"), c.get("date_start"), c.get("date_end")]
            + list(conv) + [c.get(k) for k in ("market", "language", "audience", "budget", "placement", "optimization")] if x]
    for x in used:
        need(m, x in head, f"column {x!r} is not in the export", p)
    defs = m.get("definitions", {})
    for x in [c.get("spend"), c.get("value")] + list(conv):
        if x:
            need(m, str(defs.get(x, "")).strip(), f"definitions[{x!r}] is missing: say what it counts and where that was read", p)
    need(m, str(m.get("currency", "")).strip(), "currency is required (e.g. USD): spend and floors mean nothing without it", p)
    t = m.get("thresholds", {})
    for k in ("min_conversions", "min_spend"):
        need(m, isinstance(t.get(k), (int, float)), f"thresholds.{k} must be a number set before ranking", p)
    need(m, str(t.get("basis", "")).strip(), "thresholds.basis must say why these floors were chosen", p)
    wv = (m.get("waivers") or {}).get("min_conversions_below_two")
    if wv is not None:
        need(m, str(wv.get("instruction", "")).strip() and str(wv.get("cost", "")).strip(),
             "waivers.min_conversions_below_two needs the caller's instruction (quoted) and the cost in one line", p)
    w = m.get("window", {})
    need(m, w.get("start") and w.get("end") and str(w.get("basis", "")).strip(), "window needs start, end and basis", p)
    for k in ("start", "end"):
        need(m, parse_date(w.get(k)) is not None, f"window.{k} must be YYYY-MM-DD", p)
    has_date = c.get("date") or (c.get("date_start") and c.get("date_end"))
    need(m, has_date or m.get("window_is_export_range") is True,
         "no date column is mapped (columns.date, or date_start and date_end), so the window cannot be applied: map one, or set "
         "window_is_export_range true when the export holds exactly the window", p)
    need(m, m.get("rule", "front") in ("front", "cost", "volume"), "rule must be front, cost or volume", p)
    need(m, m.get("account"), "account (by name, never a token) is required", p)
    need(m, m.get("route") in ("export", "held-token", "pasted-token"), "route must be export, held-token or pasted-token", p)
    need(m, re.fullmatch(r"[a-z0-9-]+", str(m.get("platform", ""))), "platform must be a lowercase word (e.g. meta)", p)
    blob = json.dumps(m)
    need(m, not re.search(r"access_token=|Bearer\s+\S{8,}", blob), "the map holds a token-like string: remove it", p)
    return p


KEYS4 = ("audience", "budget", "placement", "optimization")


def akey(ad):
    return (ad["ad_id"] or ad["ad_name"]).strip()


def comparable(w, s):
    """True when audience, budget, placement and optimisation event match; False when a known one differs; 'unknown'
    when one is missing on either side and none differs."""
    state = True
    for k in KEYS4:
        x, y = w["attributes"].get(k), s["attributes"].get(k)
        if not x or not y:
            state = "unknown"
        elif set(x) != set(y):
            return False
    return state


def cmd_rank(a):
    m = json.load(open(a.map))
    head, body, meta = read_table(a.export, a.sheet or m.get("sheet"), a.header_row or m.get("header_row"))
    problems = check_map(m, head)
    if problems:
        for x in problems:
            print(f"MAP {x}", file=sys.stderr)
        sys.exit(3)
    c = m["columns"]
    t = m["thresholds"]
    # rows with neither id nor name are totals or footers
    blank = [r for r in body if not r[c["ad_id"]].strip() and not r[c["ad_name"]].strip()]
    body = [r for r in body if r[c["ad_id"]].strip() or r[c["ad_name"]].strip()]
    sci = [r[c["ad_id"]] for r in body if SCI.match(r[c["ad_id"]].strip())][:3]
    if sci:
        fail(3, f"ad ids in scientific notation ({sci}): the digits are lost; export the ids as text or use the CSV")
    # window
    w0, w1 = parse_date(m["window"]["start"]), parse_date(m["window"]["end"])
    outside = 0
    if c.get("date") or c.get("date_start"):
        kept = []
        for r in body:
            if c.get("date"):
                d = parse_date(r[c["date"]], m.get("date_format"))
                if d is None:
                    fail(3, f"column {c['date']!r}: cannot read {r[c['date']]!r} as a date; set date_format (strptime) in the map")
                ok = w0 <= d <= w1
            else:
                d0, d1 = parse_date(r[c["date_start"]], m.get("date_format")), parse_date(r[c["date_end"]], m.get("date_format"))
                if d0 is None or d1 is None:
                    fail(3, "date_start/date_end: cannot read a row's dates; set date_format (strptime) in the map")
                ok = d0 >= w0 and d1 <= w1
            if ok:
                kept.append(r)
            else:
                outside += 1
        body = kept
        print(f"window {m['window']['start']}..{m['window']['end']}: {outside} row(s) outside it dropped, {len(body)} kept")
    if not body:
        fail(4, "no rows inside the window")
    # still images only
    if c.get("media_type"):
        static = {str(v).strip().lower() for v in m["static_values"]}
        by_type = {}
        for r in body:
            k = r[c["media_type"]].strip().lower() or "(blank)"
            by_type[k] = by_type.get(k, 0) + 1
        rows = [r for r in body if r[c["media_type"]].strip().lower() in static]
        if not rows:
            fail(4, f"no rows whose {c['media_type']!r} is one of {sorted(static)}; types seen: {by_type}")
        working = {}
        for r in rows:
            k = r[c["media_type"]].strip().lower()
            working[k] = working.get(k, 0) + 1
    else:
        static, rows = set(), body
        by_type = {"(asserted static)": len(body)}
        working = dict(by_type)
    ads = {}
    attrs = ("market", "language", "audience", "budget", "placement", "optimization", "concept", "image", "ad_set")
    for r in rows:
        key = r[c["ad_id"]].strip() or r[c["ad_name"]].strip()
        ad = ads.setdefault(key, {"ad_id": r[c["ad_id"]], "ad_name": r[c["ad_name"]], "rows": 0, "spend": 0.0,
                                  "conversions": 0.0, "by_column": {x: 0.0 for x in c["conversions"]},
                                  "value": None, "attributes": {}})
        ad["rows"] += 1
        ad["spend"] += num(r[c["spend"]]) or 0.0
        for x in c["conversions"]:
            v = num(r[x]) or 0.0
            ad["by_column"][x] += v
            ad["conversions"] += v
        if c.get("value"):
            v = num(r[c["value"]])
            if v is not None:
                ad["value"] = (ad["value"] or 0.0) + v
        for k in attrs:
            if c.get(k) and r[c[k]].strip():
                s = ad["attributes"].setdefault(k, [])
                if r[c[k]] not in s:
                    s.append(r[c[k]])
    rule, top = m.get("rule", "front"), int(m.get("top", 5))
    floor = max(t["min_conversions"], 2)
    waived = (m.get("waivers") or {}).get("min_conversions_below_two")
    if waived is not None:
        floor = max(t["min_conversions"], 1)
    for ad in ads.values():
        ad["cost_per_result"] = round(ad["spend"] / ad["conversions"], 4) if ad["conversions"] else None
        ad["return_on_spend"] = round(ad["value"] / ad["spend"], 4) if ad["value"] is not None and ad["spend"] else None
        if ad["spend"] < t["min_spend"]:
            ad["status"] = "under_delivered"
        elif ad["conversions"] < floor:
            ad["status"] = "below_min_conversions"
        else:
            ad["status"] = "qualified"
    q = [ad for ad in ads.values() if ad["status"] == "qualified"]
    if rule == "front":
        for ad in q:
            dom = [b for b in q if b is not ad and b["conversions"] >= ad["conversions"] and b["cost_per_result"] <= ad["cost_per_result"]
                   and (b["conversions"] > ad["conversions"] or b["cost_per_result"] < ad["cost_per_result"])]
            if dom:
                best = min(dom, key=lambda b: (b["cost_per_result"], -b["conversions"]))
                ad["status"], ad["dominated_by"] = "dominated", akey(best)
                ad["auto_reason"] = f"dominated on both results and cost per result by {akey(best)}"
            else:
                ad["status"] = "front"
    else:
        keyf = (lambda x: (x["cost_per_result"], -x["conversions"])) if rule == "cost" else (lambda x: (-x["conversions"], x["cost_per_result"]))
        for i, ad in enumerate(sorted(q, key=keyf)):
            ad["status"] = "front" if i < top else "dominated"
            if i >= top:
                ad["dominated_by"] = None
                ad["auto_reason"] = f"outside the top {top} on the {rule} rule"
    order = sorted(ads.values(), key=lambda x: ({"front": 0, "dominated": 1, "below_min_conversions": 2, "under_delivered": 3}[x["status"]],
                                                 x["cost_per_result"] if x["cost_per_result"] is not None else 1e18, -x["conversions"]))
    for i, ad in enumerate(order, 1):
        ad["rank"] = i
    os.makedirs(a.out, exist_ok=True)
    source = f"{m['platform']}-{'export' if m['route'] == 'export' else 'api'}"
    rule_text = {"front": "no other qualified ad has both more results and a lower cost per result",
                 "cost": f"the {top} qualified ads with the lowest cost per result", "volume": f"the {top} qualified ads with the most results"}[rule]
    run = {"schema": "sl8.marketing.winners.run/1", "boundary": BOUNDARY, "route": m["route"], "account": m["account"],
           "platform": m["platform"], "source": source, "currency": m["currency"], "window": m["window"],
           "export": os.path.basename(a.export), **meta,
           "thresholds": t, "waivers": m.get("waivers") or {}, "definitions": m["definitions"], "columns": c,
           "static_values": sorted(static), "static_assertion": m.get("static_assertion"),
           "rule": rule, "top": top if rule != "front" else None,
           "rank_rule": f"floors first (spend >= min_spend, results >= {floor}); then the front: {rule_text}. "
                        "Impressions and run length are never used.",
           "rows_outside_window": outside, "rows_without_id_skipped": len(blank),
           "rows_by_media_type": by_type, "working_set_media_types": working, "static_rows": len(rows),
           "non_static_rows_in_working_set": sum(n for k, n in working.items() if static and k not in static),
           "previews": m.get("previews", "to be confirmed"), "created": datetime.date.today().isoformat()}
    json.dump(run, open(os.path.join(a.out, "run.json"), "w"), indent=1)
    json.dump(order, open(os.path.join(a.out, "ranked.json"), "w"), indent=1)
    counts = {s: sum(1 for x in order if x["status"] == s) for s in ("front", "dominated", "below_min_conversions", "under_delivered")}
    print(json.dumps({"static_rows": len(rows), "rows_outside_window": outside, "ads": len(order), **counts,
                      "front": [{"ad_id": x["ad_id"], "ad_name": x["ad_name"], "results": x["conversions"], "spend": x["spend"],
                                 "cost_per_result": x["cost_per_result"]} for x in order if x["status"] == "front"]}, indent=1))


# ---------- record ----------

def safe(s):
    return re.sub(r"[^A-Za-z0-9._-]+", "_", str(s))[:80] or "ad"


def cmd_record(a):
    run = json.load(open(os.path.join(a.dir, "run.json")))
    ranked = {akey(x): x for x in json.load(open(os.path.join(a.dir, "ranked.json")))}
    sel = json.load(open(a.selected))
    today = datetime.date.today()
    runname = os.path.basename(os.path.normpath(a.dir))
    # validate everything first; nothing is written until all of it holds
    for p in sel.get("passed", []):
        if p.get("last_iteration"):
            try:
                d = datetime.date.fromisoformat(p["last_iteration"])
            except ValueError:
                fail(1, f"passed {p.get('ad_id')!r}: last_iteration {p['last_iteration']!r} is not YYYY-MM-DD")
            if d > today:
                fail(1, f"passed {p.get('ad_id')!r}: last_iteration {p['last_iteration']} is in the future")
    used, recs = set(), {}
    for w in sel.get("winners", []):
        ad = ranked.get(str(w["ad_id"]).strip())
        if not ad:
            fail(1, f"winner {w['ad_id']!r} is not in ranked.json")
        if ad["status"] not in ("front", "dominated"):
            fail(1, f"winner {w['ad_id']!r} has status {ad['status']}: it did not pass the floors")
        sib = []
        for s in w.get("siblings", []):
            sa = ranked.get(str(s).strip())
            if not sa:
                fail(1, f"sibling {s!r} is not in ranked.json")
            sib.append({"ad_id": sa["ad_id"], "ad_name": sa["ad_name"], "results": sa["conversions"], "spend": sa["spend"],
                        "cost_per_result": sa["cost_per_result"], "comparable": comparable(ad, sa),
                        "comparable_on": {k: sa["attributes"].get(k, "not in export") for k in KEYS4},
                        "execution": {k: sa["attributes"].get(k) for k in ("market", "language") if sa["attributes"].get(k)}})
            used.add(str(s).strip())
        adset = ad["attributes"].get("ad_set")
        rec = {"schema": "sl8.marketing.winners.evidence/1", "account": run["account"], "window": run["window"],
               "currency": run["currency"],
               "ad_id": ad["ad_id"], "ad_name": ad["ad_name"],
               "ad_set": ("not in export" if not adset else adset[0] if len(adset) == 1 else adset),
               "results": ad["conversions"], "results_by_column": ad["by_column"], "spend": ad["spend"],
               "cost_per_result": ad["cost_per_result"], "return_value": ad["value"], "return_on_spend": ad["return_on_spend"],
               "preview": w.get("preview"), "preview_note": w.get("preview_note", ""), "concept": w.get("concept"),
               "comparable_on": {k: ad["attributes"].get(k, "not in export") for k in KEYS4},
               "siblings": sib, "reference_image": w.get("reference_image"), "source": run["source"], "proves": PROVES,
               "recorded": today.isoformat()}
        if isinstance(rec["ad_set"], list):
            rec["ad_set_note"] = "this ad ran in several ad sets in the window; all listed as exported"
        recs[safe(ad["ad_id"].strip() or ad["ad_name"].strip()) + ".json"] = rec
        used.add(akey(ad))
    passed = {str(p["ad_id"]).strip(): p for p in sel.get("passed", [])}
    rows = []
    for key, ad in ranked.items():
        if key in used or ad["status"] not in ("front", "dominated"):
            continue
        p = passed.get(key, {})
        last = p.get("last_iteration")
        rows.append({"date": today.isoformat(), "run": runname, "concept": p.get("concept"),
                     "best_execution": {"ad_id": ad["ad_id"], "ad_name": ad["ad_name"]},
                     "evidence": {"results": ad["conversions"], "spend": ad["spend"], "cost_per_result": ad["cost_per_result"],
                                  "currency": run["currency"], "window": run["window"], "source": run["source"]},
                     "why_passed_over": p.get("why") or ad.get("auto_reason") or "", "last_iteration": last,
                     "age_days": (today - datetime.date.fromisoformat(last)).days if last else None,
                     "delivery": None if last else {"spend": ad["spend"], "results": ad["conversions"]},
                     "hypothesis": p.get("hypothesis")})
    ledger = json.load(open(a.ledger)) if os.path.exists(a.ledger) else {"schema": "sl8.marketing.winners.ledger/1", "rows": []}
    # a second record of the same run replaces its rows and its evidence; other runs are kept
    ledger["rows"] = [r for r in ledger["rows"] if r.get("run") != runname] + rows
    ev_dir = os.path.join(a.dir, "evidence")
    os.makedirs(ev_dir, exist_ok=True)
    for f in os.listdir(ev_dir):
        if f.endswith(".json") and f not in recs:
            os.remove(os.path.join(ev_dir, f))
    for f, rec in recs.items():
        json.dump(rec, open(os.path.join(ev_dir, f), "w"), indent=1)
    os.makedirs(os.path.dirname(os.path.abspath(a.ledger)), exist_ok=True)
    json.dump(ledger, open(a.ledger, "w"), indent=1)
    print(json.dumps({"evidence": len(recs), "ledger_rows_this_run": len(rows)}))


# ---------- check ----------

TOKENISH = [re.compile(r"access_token=[^&\s\"']{6,}"), re.compile(r"Bearer\s+[A-Za-z0-9._~+/=-]{16,}"),
            re.compile(r"\bEAA[A-Za-z0-9]{30,}"), re.compile(r"# Netscape HTTP Cookie File")]
FIELDS = ("account", "window", "currency", "ad_id", "ad_name", "ad_set", "results", "spend", "cost_per_result", "preview", "concept",
          "siblings", "reference_image", "source", "proves")


def scan(paths, token):
    hits = []
    for root in paths:
        files = [root] if os.path.isfile(root) else [os.path.join(d, f) for d, _, fs in os.walk(root) for f in fs]
        for f in files:
            if token and token in f:
                hits.append(f"{f}: token in the file name")
            if f.lower().endswith(IMG_EXT):
                continue  # pictures: the name is scanned above, the bytes are not text
            try:
                text = open(f, "rb").read().decode("utf-8", "ignore")
            except OSError:
                continue
            for i, line in enumerate(text.splitlines(), 1):
                if (token and token in line) or any(p.search(line) for p in TOKENISH):
                    hits.append(f"{f}:{i}")
    return hits


def check_briefs(a, evs, p):
    bdir = os.path.dirname(os.path.abspath(a.dir))
    by_stem = {safe(e.get("concept")): e for e in evs}
    for f in sorted(os.listdir(bdir)) if os.path.isdir(bdir) else []:
        if not (f.startswith("brief-") and f.endswith(".md")):
            continue
        e = by_stem.get(f[6:-3])
        if not e:
            print(f"NOTE {f}: belongs to no winner of this run; not checked")
            continue
        if e.get("preview") != "confirmed":
            p.append(f"{f}: a brief for an unconfirmed winner ({e.get('ad_id')}) is not allowed")
        text = open(os.path.join(bdir, f), encoding="utf-8", errors="ignore").read()
        parts = re.split(r"(?m)^\s*(?:[-*#]+\s*)?Variation\s+([1-5])\b", text)
        nums = parts[1::2]
        if sorted(set(nums)) != ["1", "2", "3", "4", "5"] or len(nums) != 5:
            p.append(f"{f}: needs exactly five variations headed 'Variation 1' to 'Variation 5' (found {len(nums)})")
        for n, body in zip(nums, parts[2::2]):
            if not re.search(r"(?m)^\s*(?:[-*]\s*)?Changes:\s*\S", body):
                p.append(f"{f}: Variation {n} has no 'Changes: <the one variable>' line")
        if not re.search(r"(?m)^\s*(?:[-*]\s*)?Product facts:\s*\S", text):
            p.append(f"{f}: no 'Product facts: <file name>' or 'Product facts: none, no product claims' line")


def cmd_check(a):
    p = []
    run = json.load(open(os.path.join(a.dir, "run.json")))
    need(run, run.get("boundary", "").startswith("Read-only run"), "run.json has no read-only boundary statement", p)
    ranked = json.load(open(os.path.join(a.dir, "ranked.json")))
    st = set(run.get("static_values") or [])
    if st:
        bad = {k: n for k, n in (run.get("working_set_media_types") or {}).items() if k not in st}
        need(run, not bad, f"the working set holds non-static rows: {bad}", p)
    else:
        need(run, str(run.get("static_assertion") or "").strip(), "no media type column and no static_assertion: images are unproven", p)
    need(run, run.get("currency"), "run.json has no currency", p)
    ev_dir = os.path.join(a.dir, "evidence")
    evs = [json.load(open(os.path.join(ev_dir, f))) for f in sorted(os.listdir(ev_dir)) if f.endswith(".json")] if os.path.isdir(ev_dir) else []
    concepts, unconfirmed = {}, 0
    refs = os.path.abspath(os.path.join(a.dir, "refs")) + os.sep
    for e in evs:
        for f in FIELDS:
            if f == "reference_image" and e.get("preview") != "confirmed":
                continue
            ok = f in e and (e[f] not in (None, "", []) or f == "siblings")
            need(e, ok, f"evidence {e.get('ad_id')}: field {f} is empty", p)
        if e.get("concept") in concepts:
            p.append(f"concept {e['concept']!r} holds two slots: {concepts[e['concept']]} and {e['ad_id']}")
        concepts[e.get("concept")] = e.get("ad_id")
        if e.get("preview") != "confirmed":
            unconfirmed += 1
            need(e, e.get("preview") == "unconfirmed", f"evidence {e.get('ad_id')}: preview must be confirmed or unconfirmed", p)
            need(e, not e.get("reference_image"), f"evidence {e.get('ad_id')}: an unconfirmed winner carries no reference image", p)
        elif e.get("reference_image"):
            ref = os.path.abspath(e["reference_image"])
            need(e, os.path.isfile(ref), f"evidence {e.get('ad_id')}: reference image {e['reference_image']} is missing", p)
            need(e, ref.startswith(refs) and ref.lower().endswith(IMG_EXT),
                 f"evidence {e.get('ad_id')}: reference image must be an image file under {os.path.relpath(refs)}/", p)
        for s in e.get("siblings", []):
            if s.get("comparable") is False:
                diff = [k for k, v in s.get("comparable_on", {}).items()
                        if v != "not in export" and e.get("comparable_on", {}).get(k) not in (None, "not in export")
                        and set(v) != set(e["comparable_on"][k])]
                print(f"NOT COMPARABLE: sibling {s.get('ad_id')} of {e.get('ad_id')} differs on {diff}; say so in the delivery")
            elif s.get("comparable") == "unknown":
                print(f"COMPARABILITY UNKNOWN: sibling {s.get('ad_id')} of {e.get('ad_id')} (audience, budget, placement or "
                      "optimisation event not in the export); say so in the delivery")
        if re.search(r'"(data|paging|cursors)"\s*:', json.dumps(e)):
            p.append(f"evidence {e.get('ad_id')}: looks like a raw API response")
    if a.ledger:
        led = json.load(open(a.ledger)) if os.path.exists(a.ledger) else {"rows": []}
        runname = os.path.basename(os.path.normpath(a.dir))
        in_led = {(r["best_execution"]["ad_id"] or r["best_execution"]["ad_name"]).strip() for r in led["rows"] if r.get("run") == runname}
        sibs = {str(s["ad_id"]).strip() for e in evs for s in e.get("siblings", [])}
        wins = {str(e["ad_id"]).strip() for e in evs}
        for ad in ranked:
            k = akey(ad)
            if ad["status"] in ("front", "dominated") and k not in wins and k not in sibs and k not in in_led:
                p.append(f"ranked ad {k} is neither a winner, a sibling nor a ledger row")
        seen = {}
        for r in led["rows"]:
            ident = (r["best_execution"]["ad_id"] or r["best_execution"]["ad_name"]).strip()
            seen.setdefault(ident, set()).add(r.get("run"))
            if r.get("run") != runname:
                continue
            need(r, r.get("why_passed_over"), f"ledger row {ident}: why_passed_over is empty", p)
            need(r, str(r.get("concept") or "").strip(), f"ledger row {ident}: concept is empty", p)
            need(r, not r.get("concept") or r.get("concept") not in concepts,
                 f"ledger row {ident}: concept {r.get('concept')!r} is a winner's concept; make it a sibling or give it its own concept", p)
            need(r, r.get("last_iteration") or str(r.get("hypothesis") or "").strip(),
                 f"ledger row {ident}: neither last_iteration nor a hypothesis", p)
        for ident, runs in seen.items():
            if len(runs) > 1:
                print(f"NOTE ad {ident} is in the ledger for several runs: {sorted(x for x in runs if x)}")
    check_briefs(a, evs, p)
    token = os.environ.get(a.token_env) if a.token_env else None
    if a.token_env and not token:
        print(f"note: ${a.token_env} is not set; scanning for token-like patterns only")
    hits = scan(a.scan or [a.dir], token)
    for h in hits:
        p.append(f"credential or cookie material at {h}")
    print(json.dumps({"evidence": len(evs), "unconfirmed": unconfirmed, "scanned": a.scan or [a.dir], "credential_hits": len(hits),
                      "problems": len(p)}))
    if unconfirmed:
        print(f"UNCONFIRMED: {unconfirmed} winner(s) have no preview check; deliver them labelled unconfirmed, with no variation brief")
    for x in p:
        print(f"FAIL {x}")
    sys.exit(1 if p else 0)


def main():
    import argparse
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    c = sp.add_parser("columns"); c.add_argument("export"); c.add_argument("--sheet"); c.add_argument("--header-row", type=int)
    f = sp.add_parser("flatten"); f.add_argument("replies", nargs="+"); f.add_argument("--out", required=True); f.add_argument("--set", action="append")
    r = sp.add_parser("rank"); r.add_argument("export"); r.add_argument("--map", required=True); r.add_argument("--out", required=True)
    r.add_argument("--sheet"); r.add_argument("--header-row", type=int)
    d = sp.add_parser("record"); d.add_argument("--dir", required=True); d.add_argument("--selected", required=True); d.add_argument("--ledger", required=True)
    k = sp.add_parser("check"); k.add_argument("--dir", required=True); k.add_argument("--ledger"); k.add_argument("--scan", nargs="*"); k.add_argument("--token-env")
    a = ap.parse_args()
    {"columns": cmd_columns, "flatten": cmd_flatten, "rank": cmd_rank, "record": cmd_record, "check": cmd_check}[a.cmd](a)


if __name__ == "__main__":
    main()
