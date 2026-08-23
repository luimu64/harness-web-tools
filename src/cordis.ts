import { searchWeb } from "./search";
import { extractUrl, extractUrls } from "./extract";
import type { ExtractFormat } from "./types";

export const name = "pi-web-tools";
export const inject = ["web", "tools", "systemPrompt"];

export function apply(ctx: any, config: any = {}) {
  // 1. Register Search & Fetch Providers on ctx.web if web service exists
  const web = ctx.get ? ctx.get("web") : ctx.web;
  if (web) {
    if (typeof web.registerSearchProvider === "function") {
      try {
        web.registerSearchProvider({
          id: "pi-web-search",
          available() {
            return true;
          },
          async search(request: { query: string; maxResults?: number }, _signal?: AbortSignal) {
            const limit = request.maxResults || 8;
            const res = await searchWeb(request.query, { limit });
            const sources = res.data.web.map((item) => ({
              url: item.url,
              title: item.title,
              snippet: item.description,
            }));
            return {
              sources,
              truncated: false,
            };
          },
        });
      } catch (err: any) {
        // Provider might already be registered
      }
    }

    if (typeof web.registerFetchProvider === "function") {
      try {
        web.registerFetchProvider({
          id: "pi-web-fetch",
          available() {
            return true;
          },
          async fetch(request: { url: string }, _signal?: AbortSignal) {
            const res = await extractUrl(request.url, { format: "markdown" });
            return {
              url: res.url,
              statusCode: res.metadata?.statusCode || (res.error ? 500 : 200),
              body: {
                kind: "html" as const,
                content: res.raw_content || res.content,
              },
              truncated: false,
            };
          },
        });
      } catch (err: any) {
        // Provider might already be registered
      }
    }
  }

  // 2. Register web_extract tool
  const tools = ctx.get ? ctx.get("tools") : ctx.tools;
  if (tools && typeof tools.register === "function") {
    const defineTool = (opts: any) => opts; // If defineTool helper is used
    tools.register({
      name: "web_extract",
      description:
        "Extract clean readable content, links, images, video manifests, or structured JSON-LD/OpenGraph metadata from one or more URLs without headless browser overhead.",
      parameters: {
        type: "object",
        properties: {
          urls: {
            type: "array",
            items: { type: "string" },
            description: "List of web page URLs to fetch and extract content from.",
          },
          format: {
            type: "string",
            enum: ["markdown", "links", "data"],
            description:
              "Extraction mode: 'markdown' (clean text + link/image/video manifests), 'links' (manifest only), or 'data' (structured JSON-LD / OpenGraph).",
          },
          char_limit: {
            type: "number",
            description: "Character budget per page before head+tail truncation (default: 15000).",
          },
        },
        required: ["urls"],
      },
      output: {
        schema: {
          type: "object",
          additionalProperties: false,
          properties: {
            content: { type: "string", required: true },
            count: { type: "number", required: true },
          },
        },
        render: (_args: any, value: any) => [{ type: "text", text: value.content }],
      },
      async execute(args: { urls: string[]; format?: ExtractFormat; char_limit?: number }) {
        const format = args.format || "markdown";
        const charLimit = args.char_limit || 15000;
        const results = await extractUrls(args.urls, { format, charLimit });

        const formattedResults = results.map((r) => {
          if (r.error) {
            return `## URL: ${r.url}\n**Error:** ${r.error}\n`;
          }
          return `## URL: ${r.url}\n**Title:** ${r.title}\n\n${r.content}\n`;
        });

        return {
          content: formattedResults.join("\n\n---\n\n").trim(),
          count: results.length,
        };
      },
    });
  }

  // 3. System prompt section if systemPrompt service exists
  const systemPrompt = ctx.get ? ctx.get("systemPrompt") : ctx.systemPrompt;
  if (systemPrompt && typeof systemPrompt.section === "function") {
    systemPrompt.section({
      name: "tool:web_extract",
      order: 112,
      text: "Use web_extract to retrieve and parse content from web URLs. It provides markdown extraction with structured link/image/video manifests, link-only inventories, and JSON-LD/OpenGraph structured data.",
    });
  }
}

export default {
  name,
  inject,
  apply,
};
