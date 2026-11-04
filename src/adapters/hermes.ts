import { searchWeb } from "../search";
import { extractUrls } from "../extract";
import { formatSearchResults, formatExtractResults } from "../formatters";
import type { ExtractFormat } from "../types";

export interface HermesToolParameterProperty {
  type: string;
  description?: string;
  enum?: string[];
  items?: { type: string };
  minimum?: number;
  maximum?: number;
  [key: string]: any;
}

export interface HermesToolParameterSchema {
  type: "object";
  properties: Record<string, HermesToolParameterProperty>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface HermesToolDefinition {
  name: string;
  description: string;
  parameters: HermesToolParameterSchema;
  handler: (args: Record<string, any>, ...extra: any[]) => Promise<string>;
  execute: (args: Record<string, any>, ...extra: any[]) => Promise<string>;
}

/**
 * Hermes Agent web_search execution handler.
 */
export async function executeWebSearch(
  args: { query?: string; limit?: number; [key: string]: any },
  ..._extra: any[]
): Promise<string> {
  try {
    if (!args || typeof args.query !== "string" || !args.query.trim()) {
      return JSON.stringify({ error: "Missing required parameter: query" });
    }
    const limit = typeof args.limit === "number" ? args.limit : 5;
    const response = await searchWeb(args.query, { limit });
    return formatSearchResults(response);
  } catch (err: any) {
    return JSON.stringify({
      error: `Web search error: ${err?.message || String(err)}`,
    });
  }
}

/**
 * Hermes Agent web_extract execution handler.
 */
export async function executeWebExtract(
  args: {
    urls?: string[];
    format?: string;
    char_limit?: number;
    [key: string]: any;
  },
  ..._extra: any[]
): Promise<string> {
  try {
    const urls = Array.isArray(args?.urls) ? args.urls : [];
    if (urls.length === 0) {
      return JSON.stringify({
        error: "Missing required parameter: urls (must be an array of URL strings)",
      });
    }
    const format = (args.format as ExtractFormat) || "markdown";
    const charLimit =
      typeof args.char_limit === "number" ? args.char_limit : 15000;
    const results = await extractUrls(urls, { format, charLimit });
    return formatExtractResults(results);
  } catch (err: any) {
    return JSON.stringify({
      error: `Web extraction error: ${err?.message || String(err)}`,
    });
  }
}

export const webSearchTool: HermesToolDefinition = {
  name: "web_search",
  description:
    "Search the web for up-to-date information, documentation, articles, and websites. Returns titles, URLs, and snippets.",
  parameters: {
    type: "object",
    properties: {
      query: {
        type: "string",
        description: "The search keywords or query to look up on the web.",
      },
      limit: {
        type: "number",
        description: "Maximum number of search results to return (1-20, default: 5).",
        minimum: 1,
        maximum: 20,
      },
    },
    required: ["query"],
  },
  handler: executeWebSearch,
  execute: executeWebSearch,
};

export const webExtractTool: HermesToolDefinition = {
  name: "web_extract",
  description:
    "Extract readable content from web page URLs without browser overhead. Modes: 'markdown' (clean text + link/image/video manifests), 'links' (manifest only), or 'data' (structured JSON-LD / OpenGraph).",
  parameters: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description:
          "List of web page URLs to extract content from (max 5 recommended per call).",
      },
      format: {
        type: "string",
        enum: ["markdown", "links", "data"],
        description:
          "Output mode: 'markdown' (default text + manifests), 'links' (manifest only), or 'data' (structured JSON metadata).",
      },
      char_limit: {
        type: "number",
        description:
          "Character budget per page before head+tail truncation (default: 15000).",
      },
    },
    required: ["urls"],
  },
  handler: executeWebExtract,
  execute: executeWebExtract,
};

export const hermesTools: HermesToolDefinition[] = [webSearchTool, webExtractTool];

/**
 * Register tools on a Hermes Agent context or plugin registry.
 */
export function register(ctx: any): void {
  if (!ctx) return;

  if (typeof ctx.register_tool === "function") {
    for (const tool of hermesTools) {
      ctx.register_tool(tool.name, tool.parameters, tool.handler, {
        description: tool.description,
      });
    }
  } else if (typeof ctx.registerTool === "function") {
    for (const tool of hermesTools) {
      ctx.registerTool(tool);
    }
  }
}

export default {
  tools: hermesTools,
  webSearchTool,
  webExtractTool,
  executeWebSearch,
  executeWebExtract,
  register,
};
