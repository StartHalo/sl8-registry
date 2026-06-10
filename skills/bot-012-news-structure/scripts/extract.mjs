#!/usr/bin/env node
// Fabrication-safe main-content extractor for the URL ingestion path.
// Usage:  node extract.mjs <html-file> <source-url>
// Emits JSON: { ok, url, headline, byline, source, datePublished, excerpt, text, textLength }
//
// Strategy: prefer @mozilla/readability (the Firefox Reader-View engine) + JSON-LD
// NewsArticle metadata. If those libs aren't installed, DEGRADE to a regex reader of
// <title>/og:*/meta — never fabricate. Readability either returns clean text or null;
// there is no "creative middle" that could hallucinate body copy.

import { readFileSync } from "node:fs";

const [, , htmlPath, url] = process.argv;
if (!htmlPath || !url) {
  process.stderr.write("usage: node extract.mjs <html-file> <source-url>\n");
  process.exit(2);
}

const html = readFileSync(htmlPath, "utf8");
const host = (() => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
})();

const pick = (re) => {
  const m = html.match(re);
  return m ? m[1].trim() : null;
};
const meta = (prop) =>
  pick(
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']+)["']`,
      "i",
    ),
  ) ||
  pick(
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${prop}["']`,
      "i",
    ),
  );

const jsonLd = () => {
  const out = [];
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) {
    try {
      const j = JSON.parse(m[1].trim());
      Array.isArray(j) ? out.push(...j) : out.push(j);
    } catch {
      /* ignore malformed ld+json */
    }
  }
  return out.find((o) => /NewsArticle|Article|Report/i.test(String(o && o["@type"]))) || null;
};

async function withReadability() {
  // Dynamically imported so a missing dep degrades instead of crashing.
  const { JSDOM } = await import("jsdom");
  const { Readability } = await import("@mozilla/readability");
  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse(); // {title,byline,excerpt,textContent,siteName} | null
  const ld = jsonLd();
  return {
    ok: !!(article && article.textContent && article.textContent.trim().length > 0),
    url,
    headline: article?.title ?? ld?.headline ?? meta("og:title") ?? null,
    byline: article?.byline ?? ld?.author?.name ?? null,
    source: article?.siteName ?? ld?.publisher?.name ?? meta("og:site_name") ?? host,
    datePublished: ld?.datePublished ?? meta("article:published_time") ?? null,
    excerpt: article?.excerpt ?? meta("og:description") ?? null,
    text: article?.textContent?.trim() ?? null,
    textLength: article?.textContent?.trim().length ?? 0,
  };
}

function regexFallback() {
  const ld = jsonLd();
  const title =
    meta("og:title") ||
    ld?.headline ||
    pick(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const desc = meta("og:description") || ld?.description || null;
  // Best-effort body: strip tags from <article> if present, else from <p> blocks.
  const articleBlock = pick(/<article[\s\S]*?>([\s\S]*?)<\/article>/i);
  const paras =
    (html.match(/<p[^>]*>([\s\S]*?)<\/p>/gi) || [])
      .map((p) => p.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim())
      .filter((t) => t.length > 40)
      .join("\n\n") || null;
  const text = (articleBlock ? articleBlock.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null) || paras;
  return {
    ok: !!(title || text),
    url,
    headline: title ?? null,
    byline: ld?.author?.name ?? meta("article:author") ?? null,
    source: meta("og:site_name") ?? ld?.publisher?.name ?? host,
    datePublished: ld?.datePublished ?? meta("article:published_time") ?? null,
    excerpt: desc,
    text: text ?? null,
    textLength: text ? text.length : 0,
    degraded: true,
  };
}

const out = await withReadability().catch(() => regexFallback());
process.stdout.write(JSON.stringify(out, null, 2) + "\n");
