import type { CheerioAPI } from "cheerio";
import { absUrl, largestSrcset } from "../util";

const LAZY_SRC_ATTRS = ["src", "data-src", "data-original", "data-lazy-src"];
const META_IMAGE_PROPS = new Set([
  "og:image",
  "og:image:url",
  "og:image:secure_url",
  "twitter:image",
  "twitter:image:src",
]);

export function extractImages(
  $: CheerioAPI,
  baseUrl: string
): { heading: string; items: string[] } {
  const images = new Set<string>();

  const add = (url?: string | null) => {
    const resolved = absUrl(baseUrl, url);
    if (resolved) {
      images.add(resolved);
    }
  };

  // 1. <img> tags and lazy-load attributes
  $("img").each((_, el) => {
    const $el = $(el);
    for (const attr of LAZY_SRC_ATTRS) {
      add($el.attr(attr));
    }
    const srcset = $el.attr("srcset") || $el.attr("data-srcset");
    if (srcset) {
      add(largestSrcset(srcset));
    }
  });

  // 2. <picture> <source> tags
  $("picture source, source").each((_, el) => {
    const $el = $(el);
    const mime = ($el.attr("type") || "").toLowerCase();
    if (mime.startsWith("video/") || mime.startsWith("audio/")) {
      return; // Handled by video extractor
    }
    const srcset = $el.attr("srcset");
    if (srcset) {
      add(largestSrcset(srcset));
    }
    add($el.attr("src"));
  });

  // 3. <link rel="image_src" / rel="preload" as="image">
  $("link").each((_, el) => {
    const $el = $(el);
    const rel = ($el.attr("rel") || "").toLowerCase().split(/\s+/);
    if (rel.includes("image_src")) {
      add($el.attr("href"));
    } else if (rel.includes("preload") && ($el.attr("as") || "").toLowerCase() === "image") {
      add($el.attr("href"));
    }
  });

  // 4. <meta> tags (og:image, twitter:image, itemprop=image)
  $("meta").each((_, el) => {
    const $el = $(el);
    const prop = ($el.attr("property") || $el.attr("name") || "").toLowerCase();
    if (META_IMAGE_PROPS.has(prop) || $el.attr("itemprop") === "image") {
      add($el.attr("content"));
    }
  });

  // 5. <video poster="...">
  $("video").each((_, el) => {
    add($(el).attr("poster"));
  });

  return {
    heading: "Images",
    items: Array.from(images).map((u) => `- ${u}`),
  };
}
