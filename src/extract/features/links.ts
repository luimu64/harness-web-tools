import type { CheerioAPI } from "cheerio";
import { absUrl } from "../util";

const MAX_ANCHOR_TEXT = 120;

export function extractLinks(
  $: CheerioAPI,
  baseUrl: string
): { heading: string; items: string[] } {
  const linksMap = new Map<string, string>();

  $("a").each((_, el) => {
    const href = $(el).attr("href");
    const resolved = absUrl(baseUrl, href);
    if (!resolved) return;

    let text = $(el).text().replace(/\s+/g, " ").trim();
    if (text.length > MAX_ANCHOR_TEXT) {
      text = text.slice(0, MAX_ANCHOR_TEXT) + "...";
    }

    // Dedupe by URL; keep first anchor text seen
    if (!linksMap.has(resolved)) {
      linksMap.set(resolved, text);
    }
  });

  const items: string[] = [];
  for (const [url, text] of linksMap.entries()) {
    if (text && text !== url) {
      const safeText = text.replace(/\]/g, "\\]").replace(/\(/g, "\\(");
      items.push(`- [${safeText}](${url})`);
    } else {
      items.push(`- ${url}`);
    }
  }

  return {
    heading: "Links",
    items,
  };
}
