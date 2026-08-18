import * as cheerio from "cheerio";
import type { SearchResult } from "../types";
import { decodeHtmlEntities } from "../extract/util";

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
};

/**
 * Clean and unwrap DuckDuckGo redirect URLs (//duckduckgo.com/l/?uddg=...)
 */
export function cleanDdgUrl(rawUrl: string): string {
  if (!rawUrl) return "";
  let clean = rawUrl.trim();

  if (clean.startsWith("//")) {
    clean = "https:" + clean;
  }

  if (clean.includes("uddg=")) {
    try {
      const parsed = new URL(clean.startsWith("http") ? clean : `https://duckduckgo.com${clean}`);
      const uddg = parsed.searchParams.get("uddg");
      if (uddg) {
        return decodeURIComponent(uddg);
      }
    } catch {
      // Fall through to regex extraction
      const m = clean.match(/uddg=([^&]+)/);
      if (m) {
        try {
          return decodeURIComponent(m[1]);
        } catch {}
      }
    }
  }

  return clean;
}

/**
 * Search DuckDuckGo using the HTML interface.
 */
export async function searchDdgHtml(
  query: string,
  limit: number = 5,
  timeoutMs: number = 10000
): Promise<SearchResult[]> {
  const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let html = "";
  try {
    const response = await fetch(url, {
      headers: DEFAULT_HEADERS,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timeoutId);
  }

  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // DDG HTML results are inside .result or .results_links
  $(".result, .results_links").each((_, el) => {
    if (results.length >= limit) return;

    const $el = $(el);

    // Title and URL from .result__a or h2
    const $link = $el.find("a.result__a, h2 a").first();
    const rawHref = $link.attr("href") || $el.find("a.result__url").attr("href") || "";
    const rawTitle = $link.text().trim();
    const rawSnippet = $el.find(".result__snippet, a.result__snippet").text().trim();

    if (!rawHref) return;

    const cleanUrl = cleanDdgUrl(rawHref);
    if (!cleanUrl || !cleanUrl.startsWith("http") || seenUrls.has(cleanUrl)) {
      return;
    }

    const title = decodeHtmlEntities(rawTitle.replace(/\s+/g, " "));
    const description = decodeHtmlEntities(rawSnippet.replace(/\s+/g, " "));

    seenUrls.add(cleanUrl);
    results.push({
      title: title || cleanUrl,
      url: cleanUrl,
      description,
      position: results.length + 1,
    });
  });

  return results;
}

/**
 * Search DuckDuckGo using the Lite interface (fallback).
 */
export async function searchDdgLite(
  query: string,
  limit: number = 5,
  timeoutMs: number = 10000
): Promise<SearchResult[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  const params = new URLSearchParams({ q: query });
  let html = "";

  try {
    const response = await fetch("https://lite.duckduckgo.com/lite/", {
      method: "POST",
      headers: {
        ...DEFAULT_HEADERS,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://lite.duckduckgo.com",
        Referer: "https://lite.duckduckgo.com/",
      },
      body: params.toString(),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`DuckDuckGo Lite returned HTTP ${response.status}`);
    }

    html = await response.text();
  } finally {
    clearTimeout(timeoutId);
  }

  const $ = cheerio.load(html);
  const results: SearchResult[] = [];
  const seenUrls = new Set<string>();

  // In Lite HTML, results are in table rows
  $("table tr").each((_, tr) => {
    if (results.length >= limit) return;

    const $tr = $(tr);
    const $link = $tr.find("a.result-link, a").first();
    const href = $link.attr("href");
    if (!href) return;

    const cleanUrl = cleanDdgUrl(href);
    if (!cleanUrl || !cleanUrl.startsWith("http") || seenUrls.has(cleanUrl)) {
      return;
    }

    const title = decodeHtmlEntities($link.text().trim().replace(/\s+/g, " "));
    const $snippetRow = $tr.next("tr");
    const description = decodeHtmlEntities(
      $snippetRow.find(".result-snippet").text().trim().replace(/\s+/g, " ")
    );

    seenUrls.add(cleanUrl);
    results.push({
      title: title || cleanUrl,
      url: cleanUrl,
      description,
      position: results.length + 1,
    });
  });

  return results;
}
