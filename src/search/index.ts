import type { SearchOptions, SearchResponse, SearchResult } from "../types";
import { searchDdgHtml, searchDdgLite } from "./duckduckgo";

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Query SearXNG JSON API instance.
 */
async function searchSearxng(
  query: string,
  searxngUrl: string,
  limit: number = 5,
  timeoutMs: number = 10000
): Promise<SearchResult[]> {
  const base = searxngUrl.replace(/\/+$/, "");
  const url = `${base}/search?q=${encodeURIComponent(query)}&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`SearXNG returned HTTP ${res.status}`);
    const data = await res.json();
    const results: SearchResult[] = [];
    for (const r of (data?.results || []).slice(0, limit)) {
      results.push({
        title: r.title || r.url || "",
        url: r.url || "",
        description: r.content || r.snippet || "",
        position: results.length + 1,
      });
    }
    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Query Brave Search API if API key is provided.
 */
async function searchBrave(
  query: string,
  apiKey: string,
  limit: number = 5,
  timeoutMs: number = 10000
): Promise<SearchResult[]> {
  const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${limit}`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": apiKey,
      },
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Brave Search returned HTTP ${res.status}`);
    const data = await res.json();
    const results: SearchResult[] = [];
    for (const r of (data?.web?.results || []).slice(0, limit)) {
      results.push({
        title: r.title || r.url || "",
        url: r.url || "",
        description: r.description || "",
        position: results.length + 1,
      });
    }
    return results;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Main Web Search function.
 * Tries configured engines with automatic fallback.
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const limit = Math.min(Math.max(options.limit || 5, 1), 20);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const engine = options.engine || "auto";

  const searxngUrl = options.searxngUrl || process.env.SEARXNG_URL;
  const braveApiKey = options.braveApiKey || process.env.BRAVE_API_KEY;

  let results: SearchResult[] = [];
  let usedEngine = "duckduckgo";

  // 1. Explicit or preferred SearXNG
  if (engine === "searxng" || (engine === "auto" && searxngUrl)) {
    if (searxngUrl) {
      try {
        results = await searchSearxng(query, searxngUrl, limit, timeoutMs);
        if (results.length > 0) {
          usedEngine = "searxng";
        }
      } catch {
        // Fall back to DDG
      }
    }
  }

  // 2. Explicit Brave
  if (results.length === 0 && (engine === "brave" || (engine === "auto" && braveApiKey))) {
    if (braveApiKey) {
      try {
        results = await searchBrave(query, braveApiKey, limit, timeoutMs);
        if (results.length > 0) {
          usedEngine = "brave";
        }
      } catch {
        // Fall back to DDG
      }
    }
  }

  // 3. DuckDuckGo HTML (Default, no key required)
  if (results.length === 0) {
    try {
      results = await searchDdgHtml(query, limit, timeoutMs);
      if (results.length > 0) {
        usedEngine = "duckduckgo-html";
      }
    } catch {
      // Fall through to Lite
    }
  }

  // 4. DuckDuckGo Lite fallback
  if (results.length === 0) {
    try {
      results = await searchDdgLite(query, limit, timeoutMs);
      if (results.length > 0) {
        usedEngine = "duckduckgo-lite";
      }
    } catch {
      // All search methods failed
    }
  }

  return {
    data: {
      web: results,
    },
    query,
    total: results.length,
    engine: usedEngine,
  };
}
