import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import dshPlugin, {
  apply,
  createFetchProvider,
  createSearchProvider,
  name,
  inject,
  SEARCH_PROVIDER_ID,
  FETCH_PROVIDER_ID,
  webExtractTool,
  webSearchTool,
} from "../src/adapters/dsh";

/** Minimal fake of the two dsh services the plugin consumes. */
function makeCtx(existingToolNames: string[] = []) {
  const registered: { search: any[]; fetch: any[]; tools: any[] } = {
    search: [],
    fetch: [],
    tools: [],
  };
  const toolMap = new Map<string, any>(existingToolNames.map((n) => [n, { name: n }]));
  const ctx = {
    get(service: string) {
      if (service === "web") {
        return {
          registerSearchProvider: (p: unknown) => registered.search.push(p),
          registerFetchProvider: (p: unknown) => registered.fetch.push(p),
        };
      }
      if (service === "tools") {
        return {
          register: (t: any) => {
            registered.tools.push(t);
            toolMap.set(t.name, t);
          },
          get: (n: string) => toolMap.get(n),
        };
      }
      return undefined;
    },
  };
  return { ctx, registered };
}

let server: any;
let baseUrl = "";

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === "/article") {
        return new Response(
          `<!doctype html><html><head><title>Test Article</title>
           <meta property="og:title" content="OG Test Article">
           <script type="application/ld+json">{"@type":"Article","headline":"Test Article"}</script>
           </head><body><main><h1>Hello</h1><p>Body text for extraction.</p>
           <a href="/next">Next page</a><img src="/pic.png" alt="Pic">
           </main></body></html>`,
          { headers: { "content-type": "text/html; charset=utf-8" } }
        );
      }
      return new Response("missing", { status: 404, headers: { "content-type": "text/plain" } });
    },
  });
  baseUrl = `http://127.0.0.1:${server.port}`;
});

afterAll(() => {
  server?.stop(true);
});

describe("DeepSeek Harness adapter", () => {
  it("declares the cordis plugin trio", () => {
    expect(name).toBe("harness-web-tools");
    expect(inject).toEqual(["web"]);
    expect(typeof apply).toBe("function");
    expect(dshPlugin.name).toBe("harness-web-tools");
  });

  it("registers search and fetch providers on ctx.web", () => {
    const { ctx, registered } = makeCtx(["web_search"]);
    apply(ctx);

    expect(registered.search).toHaveLength(1);
    expect(registered.fetch).toHaveLength(1);
    expect((registered.search[0] as any).id).toBe(SEARCH_PROVIDER_ID);
    expect((registered.fetch[0] as any).id).toBe(FETCH_PROVIDER_ID);
    expect((registered.search[0] as any).available()).toBe(true);
    expect((registered.fetch[0] as any).available()).toBe(true);
    expect((registered.search[0] as any).description.en).toContain("DuckDuckGo");
  });

  it("registers web_extract and skips the web_search fallback when tool-web owns it", () => {
    const { ctx, registered } = makeCtx(["web_search"]);
    apply(ctx);

    const toolNames = (registered.tools as any[]).map((t) => t.name);
    expect(toolNames).toEqual(["web_extract"]);
    expect((registered.tools[0] as any).parameters.urls.required).toBe(true);
  });

  it("registers the web_search fallback when no web tool suite is present", () => {
    const { ctx, registered } = makeCtx();
    apply(ctx);

    const toolNames = (registered.tools as any[]).map((t) => t.name);
    expect(toolNames).toEqual(["web_extract", "web_search"]);
    expect(webSearchTool.name).toBe("web_search");
  });

  it("honors provider/tool opt-outs", () => {
    const { ctx, registered } = makeCtx();
    apply(ctx, { searchProvider: false, fetchProvider: false, extractTool: false, searchTool: false });
    expect(registered.search).toHaveLength(0);
    expect(registered.fetch).toHaveLength(0);
    expect(registered.tools).toHaveLength(0);
  });

  it("fetch provider returns extracted text body with the page status", async () => {
    const provider = createFetchProvider();
    const result = await provider.fetch({ url: `${baseUrl}/article` });

    expect(result.statusCode).toBe(200);
    expect(result.body.kind).toBe("text");
    expect(result.body.content).toContain("Body text for extraction.");
    expect(result.body.content).toContain("Hello");
    expect(result.truncated).toBe(false);
  });

  it("fetch provider surfaces non-2xx responses as results, not errors", async () => {
    const provider = createFetchProvider();
    const result = await provider.fetch({ url: `${baseUrl}/nope` });
    expect(result.statusCode).toBe(404);
  });

  it("search provider maps results into dsh sources", async () => {
    const provider = createSearchProvider();
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        `<div class="result"><h2><a class="result__a" href="https://example.com/a">Hit A</a></h2>` +
          `<a class="result__snippet">Snippet A</a></div>`,
        { status: 200 }
      )) as unknown as typeof fetch;

    try {
      const response = await provider.search({ query: "anything", maxResults: 4 });
      expect(response.truncated).toBe(false);
      expect(response.sources).toEqual([
        { url: "https://example.com/a", title: "Hit A", snippet: "Snippet A" },
      ]);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("web_search tool formats search output", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (async () =>
      new Response(
        `<div class="result"><h2><a class="result__a" href="https://example.com/b">Hit B</a></h2>` +
          `<a class="result__snippet">Snippet B</a></div>`,
        { status: 200 }
      )) as unknown as typeof fetch;

    try {
      const output = await webSearchTool.execute({ query: "anything", limit: 3 });
      expect(output).toContain("Search results for");
      expect(output).toContain("### 1. Hit B");
      expect(output).toContain("- **URL:** https://example.com/b");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("web_extract tool returns markdown plus link/image manifests", async () => {
    const output = await webExtractTool.execute({
      urls: [`${baseUrl}/article`],
      format: "markdown",
    });

    expect(output).toContain("## URL:");
    expect(output).toContain("Test Article");
    expect(output).toContain("Body text for extraction.");
    expect(output).toContain("/next");
    expect(output).toContain("/pic.png");
  });

  it("web_extract tool returns structured data mode", async () => {
    const output = await webExtractTool.execute({
      urls: [`${baseUrl}/article`],
      format: "data",
    });
    expect(output).toContain('"@type": "Article"');
    expect(output).toContain("opengraph");
  });

  it("web_extract output is a string with a text render block", () => {
    expect(webExtractTool.output.schema).toEqual({ type: "string" });
    const blocks = webExtractTool.output.render({}, "hello");
    expect(blocks).toEqual([{ type: "text", text: "hello" }]);
  });
});
