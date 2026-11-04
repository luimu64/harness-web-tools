/**
 * DeepSeek Harness (dsh) adapter.
 *
 * dsh ships its own model-facing `web_search` / `web_fetch` tools
 * (`@deepseek-ai/dsh-tool-web`) over the `ctx.web` provider seam. The native
 * integration is therefore to register providers, not to duplicate the tools:
 * the package contributes the keyless search backend and the richer extraction
 * backend without owning schemas or presentation.
 *
 * `web_extract` is registered as a separate tool because its `format` /
 * `char_limit` modes (link inventories, JSON-LD/OpenGraph) have no equivalent
 * in the `web_fetch` contract.
 */
import { searchWeb } from "../search";
import { extractUrl, extractUrls } from "../extract";
import { formatExtractResults, formatSearchResults } from "../formatters";
import type { ExtractFormat } from "../types";

/** Cordis plugin name used by loader diagnostics. */
export const name = "harness-web-tools";

/**
 * The `web` seam is required. `tools` is looked up optionally: a profile
 * without the tool registry can still serve providers.
 */
export const inject = ["web"];

/** Stable provider ids; select them with `searchProvider` / `fetchProvider`. */
export const SEARCH_PROVIDER_ID = "harness-web-search";
export const FETCH_PROVIDER_ID = "harness-web-extract";

/** Provider picker copy; `en` is required by the dsh LocalizedText contract. */
const SEARCH_DESCRIPTION = {
  en: "Keyless DuckDuckGo search (HTML endpoint, Lite as fallback). No API key, no configuration; returns titles, URLs, and snippets.",
};

const FETCH_DESCRIPTION = {
  en: "Static HTTP fetch with article extraction: clean markdown plus link, image, and video manifests. No headless browser, no JavaScript execution, no API key.",
};

/** Plugin configuration. Every field defaults to enabled. */
export interface DshConfig {
  /** Register the keyless search provider. Defaults to true. */
  searchProvider?: boolean;
  /** Register the extraction fetch provider. Defaults to true. */
  fetchProvider?: boolean;
  /** Register the `web_extract` tool when the tool registry is present. Defaults to true. */
  extractTool?: boolean;
  /** Register the `web_search` fallback tool when no other suite owns it. Defaults to true. */
  searchTool?: boolean;
}

/** Provider-facing shape of one dsh search source. */
interface DshSearchSource {
  url: string;
  title?: string;
  snippet?: string;
}

/** Provider-facing shape of one dsh fetch result. */
interface DshFetchResult {
  url: string;
  statusCode: number;
  body: { kind: "html" | "text"; content: string };
  truncated: boolean;
}

/** The subset of `ctx.web` this plugin uses. */
export interface DshWebService {
  registerSearchProvider(provider: any): void;
  registerFetchProvider(provider: any): void;
}

/**
 * Build the keyless search provider registered on `ctx.web`.
 */
export function createSearchProvider() {
  return {
    id: SEARCH_PROVIDER_ID,
    title: "harness-web-tools",
    description: SEARCH_DESCRIPTION,
    available() {
      return true;
    },
    async search(
      request: { query: string; maxResults?: number },
      signal?: AbortSignal
    ): Promise<{ sources: DshSearchSource[]; truncated: boolean }> {
      if (signal?.aborted) throw new Error("web search aborted");
      const limit = request.maxResults || 8;
      const response = await searchWeb(request.query, { limit });
      return {
        sources: response.data.web.map((item) => ({
          url: item.url,
          title: item.title,
          snippet: item.description,
        })),
        truncated: false,
      };
    },
  };
}

/**
 * Build the extraction fetch provider registered on `ctx.web`.
 *
 * The body is returned as `text` because extraction already produced the
 * markdown the model should read; `html` would make `dsh-tool-web` run its own
 * converter a second time and drop the link/image/video manifests.
 */
export function createFetchProvider() {
  return {
    id: FETCH_PROVIDER_ID,
    title: "harness-web-tools",
    description: FETCH_DESCRIPTION,
    available() {
      return true;
    },
    async fetch(
      request: { url: string },
      signal?: AbortSignal
    ): Promise<DshFetchResult> {
      if (signal?.aborted) throw new Error("web fetch aborted");
      const result = await extractUrl(request.url, { format: "markdown" });
      const statusCode = result.metadata?.statusCode;

      if (statusCode === undefined && result.error) {
        throw new Error(`web fetch failed: ${result.error}`);
      }

      return {
        url: result.url,
        statusCode: statusCode ?? 200,
        body: {
          kind: "text",
          content: result.content || result.raw_content || result.error || "",
        },
        truncated: false,
      };
    },
  };
}

/**
 * The `web_extract` tool definition in the dsh tool-definition shape:
 * `parameters` is a JSON Schema object, `output` declares the canonical value.
 */
export const webExtractTool = {
  name: "web_extract",
  description:
    "Extract one or more web pages without a browser. Modes: 'markdown' (clean text plus link/image/video manifests), 'links' (manifest only), or 'data' (JSON-LD, OpenGraph, Twitter cards, meta). Use this instead of web_fetch when you need structured metadata or resource inventories.",
  // `tools.register` stores `parameters` verbatim as the model-facing JSON
  // Schema, so it has to be a real schema object — the `defineTool` parameter
  // map that dsh's own tools are written with is compiled before it lands here.
  parameters: {
    type: "object",
    properties: {
      urls: {
        type: "array",
        items: { type: "string" },
        description: "Web page URLs to fetch and extract.",
      },
      format: {
        type: "string",
        enum: ["markdown", "links", "data"],
        description:
          "Output mode: 'markdown' (default), 'links' (resource manifest only), or 'data' (structured metadata).",
      },
      char_limit: {
        type: "number",
        description: "Character budget per page before head+tail truncation (default 15000).",
      },
    },
    required: ["urls"],
  },
  output: {
    schema: { type: "string" },
    render: (_args: unknown, value: unknown) => [
      { type: "text", text: String(value) },
    ],
  },
  isConcurrencySafe: () => true,
  async execute(args: {
    urls?: string[];
    format?: ExtractFormat;
    char_limit?: number;
  }): Promise<string> {
    if (!Array.isArray(args?.urls) || args.urls.length === 0) {
      throw new Error("web_extract: `urls` must be a non-empty array of URLs");
    }
    const results = await extractUrls(args.urls, {
      format: args.format || "markdown",
      charLimit: args.char_limit || 15000,
    });
    return formatExtractResults(results);
  },
};

/**
 * Fallback `web_search` tool, registered only when no web tool suite already
 * owns that name (for example a profile without `@deepseek-ai/dsh-tool-web`).
 */
export const webSearchTool = {
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
        description: "Maximum number of results to return (1-20, default 5).",
      },
    },
    required: ["query"],
  },
  output: {
    schema: { type: "string" },
    render: (_args: unknown, value: unknown) => [
      { type: "text", text: String(value) },
    ],
  },
  isConcurrencySafe: () => true,
  async execute(args: { query?: string; limit?: number }): Promise<string> {
    if (typeof args?.query !== "string" || args.query.trim() === "") {
      throw new Error("web_search: `query` must be a non-empty string");
    }
    const response = await searchWeb(args.query, { limit: args.limit || 5 });
    return formatSearchResults(response);
  },
};

/**
 * Register the tools on whatever `tools` service the given context resolves.
 */
function registerTools(tctx: any, config: DshConfig): void {
  const tools = tctx?.tools ?? (typeof tctx?.get === "function" ? tctx.get("tools") : undefined);
  if (!tools || typeof tools.register !== "function") return;

  const owns = (toolName: string): boolean =>
    typeof tools.get === "function" && tools.get(toolName) !== undefined;

  if (config.extractTool !== false) {
    tools.register(webExtractTool);
  }
  if (!owns("web_search") && config.searchTool !== false) {
    tools.register(webSearchTool);
  }
}

/**
 * Register providers on `ctx.web` and the tools on `ctx.tools`.
 *
 * Providers are registered immediately — `web` is a hard dependency. The tools
 * service is bound late through `ctx.inject`, because it is usually provided
 * after this plugin loads: a plain `ctx.get("tools")` at apply time reads
 * `undefined` and the tools would silently never register.
 */
export function apply(ctx: any, config: DshConfig = {}): void {
  const web: DshWebService | undefined =
    typeof ctx.get === "function" ? ctx.get("web") : ctx.web;

  if (web) {
    if (config.searchProvider !== false) {
      web.registerSearchProvider(createSearchProvider());
    }
    if (config.fetchProvider !== false) {
      web.registerFetchProvider(createFetchProvider());
    }
  }

  if (typeof ctx.inject === "function") {
    ctx.inject(["tools"], (tctx: any) => registerTools(tctx, config));
  } else {
    registerTools(ctx, config);
  }
}

export default {
  name,
  inject,
  apply,
};
