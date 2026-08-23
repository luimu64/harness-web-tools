import type { ExtractResult, SearchResponse } from "./types";

/**
 * Formats structured search response into readable markdown text.
 */
export function formatSearchResults(response: SearchResponse): string {
  if (!response.data?.web || response.data.web.length === 0) {
    return `No search results found for: "${response.query}"`;
  }

  const lines: string[] = [
    `# Search results for: "${response.query}" (${response.data.web.length} results via ${response.engine})\n`,
  ];

  for (const item of response.data.web) {
    lines.push(`### ${item.position}. ${item.title}`);
    lines.push(`- **URL:** ${item.url}`);
    if (item.description) {
      lines.push(`- **Snippet:** ${item.description}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

/**
 * Formats multiple extraction results into readable markdown text.
 */
export function formatExtractResults(results: ExtractResult[]): string {
  if (!results || results.length === 0) {
    return "No extraction results.";
  }

  const formattedResults = results.map((r) => {
    if (r.error) {
      return `## URL: ${r.url}\n**Error:** ${r.error}\n`;
    }
    return `## URL: ${r.url}\n**Title:** ${r.title}\n\n${r.content}\n`;
  });

  return formattedResults.join("\n\n---\n\n").trim();
}
