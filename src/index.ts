import { Type } from "@sinclair/typebox";
import { searchWeb } from "./search";
import { extractUrl, extractUrls } from "./extract";
import type { ExtractFormat, ExtractResult, SearchResponse } from "./types";

export * from "./types";
export { searchWeb } from "./search";
export { extractUrl, extractUrls } from "./extract";

/**
 * Pi Harness Extension Entrypoint.
 * Automatically discovered by Pi when placed in ~/.pi/agent/extensions or installed via pi install.
 */
export default function (pi: any) {
  // 1. Register web_search Tool
  pi.registerTool({
    name: "web_search",
    label: "Web Search",
    description:
      "Search the web for up-to-date information, documentation, articles, and websites. Returns titles, URLs, and snippets.",
    parameters: Type.Object({
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
    }),
    async execute(_toolCallId: string, params: { query: string; limit?: number }, _signal: any, _onUpdate: any, _ctx: any) {
      try {
        const response: SearchResponse = await searchWeb(params.query, {
          limit: params.limit || 5,
        });

        if (response.data.web.length === 0) {
          return {
            content: [
              {
                type: "text",
                text: `No search results found for: "${params.query}"`,
              },
            ],
            details: response,
          };
        }

        const lines: string[] = [
          `# Search results for: "${params.query}" (${response.data.web.length} results via ${response.engine})\n`,
        ];

        for (const item of response.data.web) {
          lines.push(`### ${item.position}. ${item.title}`);
          lines.push(`- **URL:** ${item.url}`);
          if (item.description) {
            lines.push(`- **Snippet:** ${item.description}`);
          }
          lines.push("");
        }

        return {
          content: [
            {
              type: "text",
              text: lines.join("\n").trim(),
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
  });

  // 2. Register web_extract Tool
  pi.registerTool({
    name: "web_extract",
    label: "Web Extract",
    description:
      "Extract readable content from web page URLs without browser overhead. Modes: 'markdown' (clean text + link/image/video manifests), 'links' (manifest only), 'data' (structured JSON-LD / OpenGraph).",
    parameters: Type.Object({
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
    }),
    async execute(
      _toolCallId: string,
      params: { urls: string[]; format?: string; char_limit?: number },
      _signal: any,
      _onUpdate: any,
      _ctx: any
    ) {
      try {
        const format = (params.format as ExtractFormat) || "markdown";
        const results: ExtractResult[] = await extractUrls(params.urls, {
          format,
          charLimit: params.char_limit || 15000,
        });

        const formattedResults = results.map((r) => {
          if (r.error) {
            return `## URL: ${r.url}\n**Error:** ${r.error}\n`;
          }
          return `## URL: ${r.url}\n**Title:** ${r.title}\n\n${r.content}\n`;
        });

        return {
          content: [
            {
              type: "text",
              text: formattedResults.join("\n\n---\n\n").trim(),
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
  });

  // 3. Register convenient slash commands for interactive Pi sessions
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
        const top = res.data.web.slice(0, 3).map((r) => `${r.title} - ${r.url}`).join("\n");
        ctx?.ui?.notify(`Found ${res.total} results:\n${top}`, "info");
      },
    });
  }
}
