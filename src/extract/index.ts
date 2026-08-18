import * as cheerio from "cheerio";
import type { ExtractOptions, ExtractResult, StructuredData } from "../types";
import { collectFeatures, extractStructuredData, renderFeatureManifest } from "./features";
import { htmlToMarkdown } from "./markdown";
import { truncateHeadTail } from "./util";

const DEFAULT_TIMEOUT_MS = 25000;
const MAX_CONCURRENT = 6;

const DEFAULT_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (X11; Linux x86_64; rv:135.0) Gecko/20100101 Firefox/135.0",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7",
  "Accept-Language": "en-US,en;q=0.9",
  "Cache-Control": "no-cache",
};

/**
 * Extract content from a single URL.
 */
export async function extractUrl(
  url: string,
  options: ExtractOptions = {}
): Promise<ExtractResult> {
  const format = options.format || "markdown";
  const timeoutMs = options.timeoutMs || DEFAULT_TIMEOUT_MS;
  const charLimit = options.charLimit;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let response: Response;
    try {
      response = await fetch(url, {
        headers: DEFAULT_HEADERS,
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    const finalUrl = response.url || url;
    const contentType = response.headers.get("content-type") || "";

    if (!response.ok) {
      return {
        url,
        title: "",
        content: "",
        raw_content: "",
        error: `HTTP Error ${response.status}: ${response.statusText}`,
        metadata: {
          source: "static",
          statusCode: response.status,
          contentType,
        },
      };
    }

    const text = await response.text();

    // Check if response is raw JSON
    if (contentType.includes("application/json") || (text.trim().startsWith("{") && text.trim().endsWith("}"))) {
      let formattedJson = text;
      try {
        formattedJson = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}

      return {
        url: finalUrl,
        title: url,
        content: truncateHeadTail(formattedJson, charLimit),
        raw_content: text,
        metadata: {
          source: "data",
          statusCode: response.status,
          contentType,
          charCount: formattedJson.length,
        },
      };
    }

    const $ = cheerio.load(text);

    // Mode: DATA (Structured JSON-LD, OpenGraph, Meta)
    if (format === "data") {
      const structured: StructuredData = extractStructuredData($, finalUrl);
      const jsonContent = JSON.stringify(structured, null, 2);
      return {
        url: finalUrl,
        title: structured.title || url,
        content: truncateHeadTail(jsonContent, charLimit),
        raw_content: text,
        metadata: {
          source: "data",
          statusCode: response.status,
          contentType,
          charCount: jsonContent.length,
        },
        structured,
      };
    }

    // Extract title
    const tagTitle = $("title").first().text().replace(/\s+/g, " ").trim();
    const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
    const title = tagTitle || ogTitle || url;

    // Collect feature manifests (Links, Images, Videos)
    const { sections } = collectFeatures(text, finalUrl, options.features);

    // Mode: LINKS (Manifest only)
    if (format === "links") {
      const manifest = renderFeatureManifest(title, sections);
      return {
        url: finalUrl,
        title,
        content: truncateHeadTail(manifest, charLimit),
        raw_content: text,
        metadata: {
          source: "links",
          statusCode: response.status,
          contentType,
          charCount: manifest.length,
        },
      };
    }

    // Mode: MARKDOWN (Default)
    const { markdown } = htmlToMarkdown(text, finalUrl);
    let fullContent = markdown;

    const manifest = renderFeatureManifest("", sections);
    if (manifest) {
      fullContent = fullContent ? `${fullContent}\n\n---\n\n${manifest}` : manifest;
    }

    if (!fullContent.trim()) {
      fullContent = $("body").text().replace(/\s+/g, " ").trim();
    }

    return {
      url: finalUrl,
      title: title || url,
      content: truncateHeadTail(fullContent, charLimit),
      raw_content: text,
      metadata: {
        source: "static",
        statusCode: response.status,
        contentType,
        charCount: fullContent.length,
      },
    };
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError" || err?.message?.includes("aborted");
    return {
      url,
      title: "",
      content: "",
      raw_content: "",
      error: isTimeout ? `Request timed out after ${timeoutMs}ms` : `Extraction failed: ${err?.message || String(err)}`,
      metadata: {
        source: "static",
      },
    };
  }
}

/**
 * Extract content from multiple URLs concurrently.
 */
export async function extractUrls(
  urls: string[],
  options: ExtractOptions = {}
): Promise<ExtractResult[]> {
  if (!urls || urls.length === 0) {
    return [];
  }

  const results: ExtractResult[] = new Array(urls.length);
  const queue = urls.map((url, index) => ({ url, index }));

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) break;
      results[item.index] = await extractUrl(item.url, options);
    }
  }

  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT, urls.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
