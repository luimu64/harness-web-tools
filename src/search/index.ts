import type { SearchOptions, SearchResponse, SearchResult } from "../types";
import { searchDdgHtml, searchDdgLite } from "./duckduckgo";

const DEFAULT_TIMEOUT_MS = 12000;

/**
 * Search the web with DuckDuckGo.
 *
 * Two keyless backends, tried in order:
 *   1. `duckduckgo-html` — https://html.duckduckgo.com/html/
 *   2. `duckduckgo-lite` — https://lite.duckduckgo.com/lite/
 *
 * Lite is the fallback: the HTML endpoint sometimes answers with an empty or
 * bot-checked page, while Lite keeps serving plain result tables. The reported
 * `engine` says which one produced the results.
 */
export async function searchWeb(
  query: string,
  options: SearchOptions = {}
): Promise<SearchResponse> {
  const limit = Math.min(Math.max(options.limit || 5, 1), 20);
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;

  let results: SearchResult[] = [];
  let engine = "none";

  try {
    results = await searchDdgHtml(query, limit, timeoutMs);
    if (results.length > 0) engine = "duckduckgo-html";
  } catch {
    // Fall through to Lite.
  }

  if (results.length === 0) {
    try {
      results = await searchDdgLite(query, limit, timeoutMs);
      if (results.length > 0) engine = "duckduckgo-lite";
    } catch {
      // Both backends failed; return the empty response.
    }
  }

  return {
    data: {
      web: results,
    },
    query,
    total: results.length,
    engine,
  };
}
