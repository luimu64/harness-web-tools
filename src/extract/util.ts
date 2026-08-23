/**
 * Utility functions for URL handling, srcset parsing, and content truncation.
 */

const SKIP_SCHEMES = [
  "data:",
  "javascript:",
  "mailto:",
  "tel:",
  "vbscript:",
  "#",
];

/**
 * Resolve a relative URL against a base URL, filtering out unusable schemes.
 */
export function absUrl(baseUrl: string, url?: string | null): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  for (const scheme of SKIP_SCHEMES) {
    if (trimmed.toLowerCase().startsWith(scheme)) {
      return null;
    }
  }

  try {
    const resolved = new URL(trimmed, baseUrl);
    // Only accept http and https protocols
    if (resolved.protocol !== "http:" && resolved.protocol !== "https:") {
      return null;
    }
    return resolved.href;
  } catch {
    return null;
  }
}

/**
 * Extract the highest resolution candidate URL from an HTML srcset string.
 * Handles density descriptors (1x, 2x) and width descriptors (300w, 1200w).
 */
export function largestSrcset(srcset?: string | null): string | null {
  if (!srcset) return null;
  let bestUrl: string | null = null;
  let bestScore = -1;

  for (const entry of srcset.split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;

    const parts = trimmed.split(/\s+/);
    const candidateUrl = parts[0];
    if (!candidateUrl) continue;
    let score = 0;

    if (parts.length > 1 && parts[1]) {
      const desc = parts[1].toLowerCase();
      if (desc.endsWith("w")) {
        const w = parseInt(desc.slice(0, -1), 10);
        if (!isNaN(w)) score = w;
      } else if (desc.endsWith("x")) {
        const x = parseFloat(desc.slice(0, -1));
        if (!isNaN(x)) score = Math.round(x * 1000);
      }
    }

    // On ties, later candidates usually have higher quality
    if (score >= bestScore) {
      bestScore = score;
      bestUrl = candidateUrl;
    }
  }

  return bestUrl;
}

/**
 * Decode common HTML entities.
 */
export function decodeHtmlEntities(str: string): string {
  if (!str) return "";
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

/**
 * Truncate content keeping head and tail windows if charLimit is exceeded.
 */
export function truncateHeadTail(content: string, charLimit?: number): string {
  if (!charLimit || content.length <= charLimit) {
    return content;
  }

  const headBudget = Math.floor(charLimit * 0.7);
  const tailBudget = charLimit - headBudget;

  const head = content.slice(0, headBudget);
  const tail = content.slice(-tailBudget);

  const omitted = content.length - (head.length + tail.length);
  const separator = `\n\n... [${omitted.toLocaleString()} characters omitted] ...\n\n`;

  return head + separator + tail;
}
