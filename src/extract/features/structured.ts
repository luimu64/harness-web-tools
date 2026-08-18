import type { CheerioAPI } from "cheerio";
import type { StructuredData } from "../../types";
import { absUrl } from "../util";

export function extractStructuredData(
  $: CheerioAPI,
  baseUrl: string
): StructuredData {
  const jsonld: any[] = [];
  const opengraph: Record<string, string> = {};
  const twitter: Record<string, string> = {};
  const meta: Record<string, string> = {};

  // 1. JSON-LD scripts
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const rawText = $(el).text().trim();
      if (!rawText) return;
      const parsed = JSON.parse(rawText);
      jsonld.push(parsed);
    } catch {
      // Ignore malformed JSON-LD
    }
  });

  // 2. Meta tags
  $("meta").each((_, el) => {
    const $el = $(el);
    const prop = ($el.attr("property") || $el.attr("name") || "").trim().toLowerCase();
    const content = ($el.attr("content") || "").trim();

    if (!prop || !content) return;

    if (prop.startsWith("og:")) {
      const key = prop.slice(3);
      if (!(key in opengraph)) {
        opengraph[key] = content;
      }
    } else if (prop.startsWith("twitter:")) {
      const key = prop.slice(8);
      if (!(key in twitter)) {
        twitter[key] = content;
      }
    } else {
      if (!(prop in meta)) {
        meta[prop] = content;
      }
    }
  });

  // 3. Canonical link
  let canonical = "";
  const canonicalHref = $('link[rel="canonical"]').attr("href");
  if (canonicalHref) {
    canonical = absUrl(baseUrl, canonicalHref) || canonicalHref;
  }

  // 4. Title
  const tagTitle = $("title").first().text().replace(/\s+/g, " ").trim();
  const title =
    tagTitle ||
    opengraph["title"] ||
    twitter["title"] ||
    meta["title"] ||
    "";

  // 5. Description
  const description =
    meta["description"] ||
    opengraph["description"] ||
    twitter["description"] ||
    "";

  return {
    url: baseUrl,
    title,
    description,
    canonical,
    jsonld,
    opengraph,
    twitter,
    meta,
    counts: {
      jsonld: jsonld.length,
      meta: Object.keys(meta).length,
      opengraph: Object.keys(opengraph).length,
      twitter: Object.keys(twitter).length,
    },
  };
}
