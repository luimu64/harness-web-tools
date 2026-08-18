import * as cheerio from "cheerio";
import type { FeatureManifest, FeatureSection, StructuredData } from "../../types";
import { extractLinks } from "./links";
import { extractImages } from "./images";
import { extractVideos } from "./videos";
import { extractStructuredData } from "./structured";

export { extractLinks, extractImages, extractVideos, extractStructuredData };

/**
 * Run all feature extractors over the HTML document.
 */
export function collectFeatures(
  html: string,
  baseUrl: string,
  enabledFeatures?: string[]
): FeatureManifest {
  const $ = cheerio.load(html);

  // Compute visible text length outside scripts/styles
  const cloned = cheerio.load(html);
  cloned("script, style, noscript, svg").remove();
  const textLength = cloned("body").text().replace(/\s+/g, " ").trim().length;

  const featuresToRun = enabledFeatures && enabledFeatures.length > 0
    ? enabledFeatures.map((f) => f.toLowerCase())
    : ["links", "images", "videos"];

  const sections: FeatureSection[] = [];

  if (featuresToRun.includes("links")) {
    try {
      const links = extractLinks($, baseUrl);
      if (links.items.length > 0) sections.push(links);
    } catch {
      // Best effort
    }
  }

  if (featuresToRun.includes("images")) {
    try {
      const images = extractImages($, baseUrl);
      if (images.items.length > 0) sections.push(images);
    } catch {
      // Best effort
    }
  }

  if (featuresToRun.includes("videos")) {
    try {
      const videos = extractVideos($, baseUrl);
      if (videos.items.length > 0) sections.push(videos);
    } catch {
      // Best effort
    }
  }

  return {
    sections,
    textLength,
  };
}

/**
 * Render feature sections as formatted markdown.
 */
export function renderFeatureManifest(
  title: string,
  sections: FeatureSection[]
): string {
  const parts: string[] = [];

  if (title) {
    parts.push(`# ${title}\n`);
  }

  for (const section of sections) {
    parts.push(`## ${section.heading} (${section.items.length})`);
    parts.push(...section.items);
    parts.push("");
  }

  return parts.join("\n").trim();
}
