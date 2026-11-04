import { Type, type Static } from "@sinclair/typebox";
import { searchWeb } from "../search";
import { extractUrls } from "../extract";
import { formatSearchResults, formatExtractResults } from "../formatters";
import type { ExtractFormat, ExtractResult, SearchResponse } from "../types";

export const WebSearchParameters = Type.Object({
  query: Type.String({
    description: "The search keywords or query to look up on the web.",
  }),
  limit: Type.Optional(
    Type.Number({
      description: "Maximum number of search results to return (1-20, default: 5).",
      minimum: 1,
      maximum: 20,
    })
  ),
});

export type WebSearchParams = Static<typeof WebSearchParameters>;

export const WebExtractParameters = Type.Object({
  urls: Type.Array(Type.String(), {
    description: "List of web page URLs to extract content from (max 5 recommended per call).",
  }),
  format: Type.Optional(
    Type.String({
      description:
        "Output mode: 'markdown' (default text + manifests), 'links' (manifest only), or 'data' (structured JSON metadata).",
      enum: ["markdown", "links", "data"],
    })
  ),
  char_limit: Type.Optional(
    Type.Number({
      description: "Character budget per page before head+tail truncation (default: 15000).",
    })
  ),
});

export type WebExtractParams = Static<typeof WebExtractParameters>;

/**
 * Creates the Pi web_search tool definition.
 */
export function createPiWebSearchTool() {
  return {
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web for up-to-date information, documentation, articles, and websites. Returns titles, URLs, and snippets.",
    parameters: WebSearchParameters,
    async execute(
      _toolCallId: string,
      params: WebSearchParams,
      _signal?: any,
      _onUpdate?: any,
      _ctx?: any
    ) {
      try {
        const response: SearchResponse = await searchWeb(params.query, {
          limit: params.limit || 5,
        });

        const formatted = formatSearchResults(response);

        return {
          content: [
            {
              type: "text",
              text: formatted,
            },
          ],
          details: response,
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Web search error: ${err?.message || String(err)}`,
            },
          ],
          details: { error: String(err) },
        };
      }
    },
  };
}

/**
 * Creates the Pi web_extract tool definition.
 */
export function createPiWebExtractTool() {
  return {
    name: "web_extract",
    label: "Web Extract",
    description:
      "Extract readable content from web page URLs without browser overhead. Modes: 'markdown' (clean text + link/image/video manifests), 'links' (manifest only), or 'data' (structured JSON-LD / OpenGraph).",
    parameters: WebExtractParameters,
    async execute(
      _toolCallId: string,
      params: { urls: string[]; format?: string; char_limit?: number },
      _signal?: any,
      _onUpdate?: any,
      _ctx?: any
    ) {
      try {
        const format = (params.format as ExtractFormat) || "markdown";
        const results: ExtractResult[] = await extractUrls(params.urls, {
          format,
          charLimit: params.char_limit || 15000,
        });

        const formatted = formatExtractResults(results);

        return {
          content: [
            {
              type: "text",
              text: formatted,
            },
          ],
          details: {
            results,
            format,
            count: results.length,
          },
        };
      } catch (err: any) {
        return {
          content: [
            {
              type: "text",
              text: `Web extraction error: ${err?.message || String(err)}`,
            },
          ],
          details: { error: String(err) },
        };
      }
    },
  };
}

/**
 * Pi Extension Entrypoint.
 * Registers web tools and slash commands into Pi coding agent harness.
 */
export function registerPiAdapter(pi: any) {
  if (!pi) return;

  if (typeof pi.registerTool === "function") {
    pi.registerTool(createPiWebSearchTool());
    pi.registerTool(createPiWebExtractTool());
  }

  if (typeof pi.registerCommand === "function") {
    pi.registerCommand("search", {
      description: "Search the web (e.g. /search typescript bun)",
      handler: async (args: string, ctx: any) => {
        if (!args || !args.trim()) {
          ctx?.ui?.notify("Please provide a search query", "warning");
          return;
        }
        ctx?.ui?.setStatus("web-search", `Searching "${args}"...`);
        const res = await searchWeb(args);
        ctx?.ui?.setStatus("web-search", "");
        if (res.data.web.length === 0) {
          ctx?.ui?.notify(`No results found for "${args}"`, "info");
          return;
        }
        const top = res.data.web
          .slice(0, 3)
          .map((r) => `${r.title} - ${r.url}`)
          .join("\n");
        ctx?.ui?.notify(`Found ${res.total} results:\n${top}`, "info");
      },
    });
  }
}

export default registerPiAdapter;
