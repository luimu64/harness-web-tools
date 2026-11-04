import { afterEach, describe, expect, it } from "bun:test";
import { cleanDdgUrl, searchDdgHtml, searchDdgLite } from "../src/search/duckduckgo";

/**
 * Backend tests.
 *
 * Each DuckDuckGo backend is tested on its own: its parser against markup
 * captured from that endpoint, and — with HWB_LIVE=1 — against the endpoint
 * itself. Live tests are opt-in because DuckDuckGo rate limits aggressive
 * clients and serves an "anomaly" page instead of results.
 */

const LIVE = process.env.HWB_LIVE === "1";

const HTML_FIXTURE = `
<html><body>
  <div class="result results_links results_links_deep web-result">
    <div class="links_main links_deep result__body">
      <h2 class="result__title">
        <a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.sh%2Fdocs&amp;rut=abc">Bun Docs</a>
      </h2>
      <a class="result__snippet" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.sh%2Fdocs&amp;rut=abc">Bun is a fast all-in-one JavaScript runtime &amp; toolkit.</a>
      <a class="result__url" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.sh%2Fdocs">bun.sh/docs</a>
    </div>
  </div>
  <div class="result results_links web-result">
    <div class="result__body">
      <h2 class="result__title">
        <a class="result__a" href="https://github.com/oven-sh/bun">GitHub - oven-sh/bun</a>
      </h2>
      <a class="result__snippet">Incredibly fast JavaScript runtime, bundler, test runner.</a>
    </div>
  </div>
  <div class="result results_links web-result">
    <div class="result__body">
      <h2 class="result__title">
        <a class="result__a" href="https://github.com/oven-sh/bun">GitHub - oven-sh/bun</a>
      </h2>
      <a class="result__snippet">Duplicate of the entry above.</a>
    </div>
  </div>
  <div class="result results_links web-result">
    <div class="result__body">
      <h2 class="result__title"><a class="result__a" href="javascript:void(0)">Not a result</a></h2>
    </div>
  </div>
</body></html>`;

const LITE_FIXTURE = `
<html><body>
  <table>
    <tr><td>1.&nbsp;</td><td><a rel="nofollow" href="https://bun.sh/docs" class="result-link">Bun Docs</a></td></tr>
    <tr><td>&nbsp;</td><td class="result-snippet">Bun is a fast all-in-one JavaScript runtime &amp; toolkit.</td></tr>
    <tr><td>&nbsp;</td><td><span class="link-url">bun.sh/docs</span></td></tr>
    <tr><td>2.&nbsp;</td><td><a rel="nofollow" href="https://github.com/oven-sh/bun" class="result-link">GitHub - oven-sh/bun</a></td></tr>
    <tr><td>&nbsp;</td><td class="result-snippet">Incredibly fast JavaScript runtime, bundler, test runner.</td></tr>
    <tr><td>&nbsp;</td><td><span class="link-url">github.com/oven-sh/bun</span></td></tr>
    <tr><td>3.&nbsp;</td><td><a rel="nofollow" href="https://github.com/oven-sh/bun" class="result-link">GitHub - oven-sh/bun</a></td></tr>
    <tr><td>&nbsp;</td><td class="result-snippet">Duplicate of the entry above.</td></tr>
  </table>
</body></html>`;

const originalFetch = globalThis.fetch;

/** Replace fetch with a canned response, recording the request it received. */
function stub(mode: "html" | "lite" | "empty" | "http500" | "throw") {
  const calls: { url: string; method: string }[] = [];

  globalThis.fetch = (async (input: any, init?: any) => {
    calls.push({
      url: typeof input === "string" ? input : String(input?.url ?? input),
      method: init?.method ?? "GET",
    });
    if (mode === "throw") throw new Error("network down");
    if (mode === "http500") return new Response("nope", { status: 500 });
    if (mode === "empty") return new Response("<html><body></body></html>", { status: 200 });
    return new Response(mode === "lite" ? LITE_FIXTURE : HTML_FIXTURE, { status: 200 });
  }) as unknown as typeof fetch;

  return calls;
}

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("DuckDuckGo HTML backend", () => {
  it("requests html.duckduckgo.com with GET and the encoded query", async () => {
    const calls = stub("html");
    await searchDdgHtml("bun runtime", 5, 5000);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://html.duckduckgo.com/html/?q=bun%20runtime");
    expect(calls[0]!.method).toBe("GET");
  });

  it("parses titles, snippets, and unwrapped URLs", async () => {
    stub("html");
    const results = await searchDdgHtml("bun runtime", 5, 5000);

    expect(results).toHaveLength(2); // duplicate and javascript: href dropped
    expect(results[0]).toEqual({
      title: "Bun Docs",
      url: "https://bun.sh/docs",
      description: "Bun is a fast all-in-one JavaScript runtime & toolkit.",
      position: 1,
    });
    expect(results[1]!.title).toBe("GitHub - oven-sh/bun");
    expect(results[1]!.position).toBe(2);
  });

  it("honours the limit", async () => {
    stub("html");
    expect(await searchDdgHtml("bun runtime", 1, 5000)).toHaveLength(1);
  });

  it("returns no results for an empty page", async () => {
    stub("empty");
    expect(await searchDdgHtml("bun runtime", 5, 5000)).toEqual([]);
  });

  it("throws on HTTP errors", async () => {
    stub("http500");
    await expect(searchDdgHtml("bun runtime", 5, 5000)).rejects.toThrow("HTTP 500");
  });

  it("throws on network errors", async () => {
    stub("throw");
    await expect(searchDdgHtml("bun runtime", 5, 5000)).rejects.toThrow("network down");
  });

  it("aborts and throws when the timeout elapses", async () => {
    globalThis.fetch = ((_input: any, init?: any) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener("abort", () => reject(new Error("aborted")));
      })) as unknown as typeof fetch;

    await expect(searchDdgHtml("bun runtime", 5, 5)).rejects.toThrow("aborted");
  });
});

describe("DuckDuckGo Lite backend", () => {
  it("posts the query to lite.duckduckgo.com", async () => {
    const calls = stub("lite");
    await searchDdgLite("bun runtime", 5, 5000);

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://lite.duckduckgo.com/lite/");
    expect(calls[0]!.method).toBe("POST");
  });

  it("parses titles, snippets, and deduplicates", async () => {
    stub("lite");
    const results = await searchDdgLite("bun runtime", 5, 5000);

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      title: "Bun Docs",
      url: "https://bun.sh/docs",
      description: "Bun is a fast all-in-one JavaScript runtime & toolkit.",
      position: 1,
    });
    expect(results[1]!.url).toBe("https://github.com/oven-sh/bun");
  });

  it("honours the limit", async () => {
    stub("lite");
    expect(await searchDdgLite("bun runtime", 1, 5000)).toHaveLength(1);
  });

  it("returns no results for an empty page", async () => {
    stub("empty");
    expect(await searchDdgLite("bun runtime", 5, 5000)).toEqual([]);
  });

  it("throws on HTTP errors", async () => {
    stub("http500");
    await expect(searchDdgLite("bun runtime", 5, 5000)).rejects.toThrow("HTTP 500");
  });
});

describe("cleanDdgUrl", () => {
  it("unwraps uddg redirects", () => {
    expect(cleanDdgUrl("//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.sh%2F&rut=abc123")).toBe(
      "https://bun.sh/"
    );
    expect(cleanDdgUrl("https://duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fa%3Fb%3D1")).toBe(
      "https://example.com/a?b=1"
    );
  });

  it("passes direct URLs through untouched", () => {
    expect(cleanDdgUrl("https://example.com/plain")).toBe("https://example.com/plain");
    expect(cleanDdgUrl("")).toBe("");
  });
});

const QUERY = "bun javascript runtime";

function assertLiveResults(results: Awaited<ReturnType<typeof searchDdgHtml>>, limit: number) {
  expect(Array.isArray(results)).toBe(true);
  expect(results.length).toBeGreaterThan(0);
  expect(results.length).toBeLessThanOrEqual(limit);

  const urls = new Set<string>();
  results.forEach((r, index) => {
    expect(r.position).toBe(index + 1);
    expect(r.url).toMatch(/^https?:\/\//);
    expect(r.url).not.toContain("uddg=");
    expect(r.title.length).toBeGreaterThan(0);
    expect(urls.has(r.url)).toBe(false);
    urls.add(r.url);
  });
  expect(results.some((r) => r.description.length > 0)).toBe(true);
}

describe.skipIf(!LIVE)("live DuckDuckGo endpoints", () => {
  it("HTML backend returns real results", async () => {
    assertLiveResults(await searchDdgHtml(QUERY, 8, 20000), 8);
  }, 30000);

  it("Lite backend returns real results", async () => {
    assertLiveResults(await searchDdgLite(QUERY, 8, 20000), 8);
  }, 30000);

  it("both backends agree on the top hit", async () => {
    const [html, lite] = await Promise.all([
      searchDdgHtml(QUERY, 3, 20000),
      searchDdgLite(QUERY, 3, 20000),
    ]);
    expect(lite[0]!.url).toBe(html[0]!.url);
  }, 30000);
});
