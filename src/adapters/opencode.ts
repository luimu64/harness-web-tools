import { tool, type ToolDefinition, type ToolContext } from "@opencode-ai/plugin";
import { searchWeb } from "../search";
import { extractUrls } from "../extract";
import { formatSearchResults, formatExtractResults } from "../formatters";
import type { ExtractFormat } from "../types";

const z = tool.schema;

export const webSearchArgs = {
  query: z
    .string()
    .describe("The search keywords or query to look up on the web."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(20)
    .optional()
    .describe("Maximum number of search results to return (1-20, default: 5)."),
};

export const webExtractArgs = {
  urls: z
    .array(z.string())
    .describe("List of web page URLs to extract content from (max 5 recommended per call)."),
  format: z
    .enum(["markdown", "links", "data"])
    .optional()
    .describe(
      "Output mode: 'markdown' (default text + manifests), 'links' (manifest only), or 'data' (structured JSON metadata)."
    ),
  char_limit: z
    .number()
    .optional()
    .describe("Character budget per page before head+tail truncation (default: 15000)."),
};

export const webSearchTool: ToolDefinition = tool({
  description:
    "Search the web for up-to-date information, documentation, articles, and websites. Returns titles, URLs, and snippets.",
  args: webSearchArgs,
  async execute(args, _context: ToolContext) {
    try {
      const response = await searchWeb(args.query, {
        limit: args.limit || 5,
      });
      return formatSearchResults(response);
    } catch (err: any) {
      return `Web search error: ${err?.message || String(err)}`;
    }
  },
});

export const webExtractTool: ToolDefinition = tool({
  description:
    "Extract readable content from web page URLs without browser overhead. Modes: 'markdown' (clean text + link/image/video manifests), 'links' (manifest only), or 'data' (structured JSON-LD / OpenGraph).",
  args: webExtractArgs,
  async execute(args, _context: ToolContext) {
    try {
      const format = (args.format as ExtractFormat) || "markdown";
      const results = await extractUrls(args.urls, {
        format,
        charLimit: args.char_limit || 15000,
      });
      return formatExtractResults(results);
    } catch (err: any) {
      return `Web extraction error: ${err?.message || String(err)}`;
    }
  },
});

export const opencodeTools = {
  web_search: webSearchTool,
  web_extract: webExtractTool,
};

/**
 * OpenCode Plugin definition exposing web search and web extract tools.
 */
export async function opencodePlugin(_input?: any, _options?: any) {
  return {
    tool: opencodeTools,
  };
}

export default opencodePlugin;
