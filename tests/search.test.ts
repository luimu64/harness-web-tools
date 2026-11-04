import { afterEach, describe, expect, it } from "bun:test";
import { searchWeb } from "../src/search";

/**
 * Fallback chain tests. `fetch` is stubbed so each backend can be made to
 * succeed, return nothing, or fail without touching the network.
 */

const HTML_PAGE = `<div class="result">
  <h2><a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fhtml&rut=1">HTML Hit</a></h2>
  <a class="result__snippet">Snippet from the HTML endpoint.</a>
</div>`;

const LITE_PAGE = `<table>
  <tr><td><a class="result-link" href="https://example.com/lite">Lite Hit</a></td></tr>
  <tr><td class="result-snippet">Snippet from the Lite endpoint.</td></tr>
</table>`;

type Mode = "ok" | "empty" | "http500" | "throw";

function stubFetch(html: Mode, lite: Mode) {
  globalThis.fetch = (async (input: any, init?: any) => {
    const url = typeof input === "string" ? input : String(input?.url ?? input);
    const isLite = url.includes("lite.duckduckgo.com");
    const mode = isLite ? lite : html;

    if (mode === "throw") throw new Error("network down");
    if (mode === "http500") return new Response("nope", { status: 500 });
    if (mode === "empty") return new Response("<html><body></body></html>", { status: 200 });
    return new Response(isLite ? LITE_PAGE : HTML_PAGE, { status: 200 });
  }) as typeof fetch;
}

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("searchWeb fallback chain", () => {
  it("uses the HTML backend when it answers", async () => {
    stubFetch("ok", "ok");
    const res = await searchWeb("anything", { limit: 3 });

    expect(res.engine).toBe("duckduckgo-html");
    expect(res.total).toBe(1);
    expect(res.data.web[0]!.title).toBe("HTML Hit");
    expect(res.data.web[0]!.url).toBe("https://example.com/html");
  });

  it("falls back to Lite when the HTML backend returns no results", async () => {
    stubFetch("empty", "ok");
    const res = await searchWeb("anything", { limit: 3 });

    expect(res.engine).toBe("duckduckgo-lite");
    expect(res.data.web[0]!.title).toBe("Lite Hit");
    expect(res.data.web[0]!.description).toContain("Lite endpoint");
  });

  it("falls back to Lite when the HTML backend errors", async () => {
    stubFetch("http500", "ok");
    const res = await searchWeb("anything", { limit: 3 });

    expect(res.engine).toBe("duckduckgo-lite");
    expect(res.total).toBe(1);
  });

  it("falls back to Lite when the HTML backend throws", async () => {
    stubFetch("throw", "ok");
    const res = await searchWeb("anything", { limit: 3 });

    expect(res.engine).toBe("duckduckgo-lite");
  });

  it("returns an empty, non-throwing response when both backends fail", async () => {
    stubFetch("throw", "throw");
    const res = await searchWeb("anything", { limit: 3 });

    expect(res.engine).toBe("none");
    expect(res.total).toBe(0);
    expect(res.data.web).toEqual([]);
    expect(res.query).toBe("anything");
  });

  it("clamps the limit to 1..20 and defaults to 5", async () => {
    const many = Array.from(
      { length: 30 },
      (_, i) =>
        `<div class="result"><h2><a class="result__a" href="https://example.com/${i}">Hit ${i}</a></h2>` +
        `<a class="result__snippet">Snippet ${i}</a></div>`
    ).join("");

    globalThis.fetch = (async () =>
      new Response(`<html><body>${many}</body></html>`, { status: 200 })) as unknown as typeof fetch;

    expect((await searchWeb("anything", { limit: 100 })).total).toBe(20);
    expect((await searchWeb("anything", {})).total).toBe(5);
  });
});

const LIVE = process.env.HWB_LIVE === "1";

describe.skipIf(!LIVE)("searchWeb live", () => {
  it("searches the real web and reports which backend served it", async () => {
    const res = await searchWeb("bun typescript runtime", { limit: 3 });

    expect(res.query).toBe("bun typescript runtime");
    expect(["duckduckgo-html", "duckduckgo-lite"]).toContain(res.engine);
    expect(res.data.web.length).toBeGreaterThan(0);
    expect(res.data.web.length).toBeLessThanOrEqual(3);
    expect(res.data.web[0]!.url).toMatch(/^https?:\/\//);
    expect(res.data.web[0]!.position).toBe(1);
  }, 30000);
});
