import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { extractUrl, extractUrls } from "../src/extract";

/**
 * Extraction tests run against a local fixture server, so they assert the
 * extractor's behaviour rather than whatever a public page looks like today.
 */

const ARTICLE_HTML = `<!doctype html>
<html>
  <head>
    <title>Fixture Article</title>
    <meta property="og:title" content="Fixture OG Title">
    <link rel="canonical" href="https://example.com/canonical">
    <script type="application/ld+json">{"@type":"Article","headline":"Fixture Headline"}</script>
  </head>
  <body>
    <nav><a href="/nav">Navigation</a></nav>
    <main>
      <h1>Fixture Heading</h1>
      <p>Body text that is long enough to be treated as the primary content of the page.</p>
      <p><a href="/next-page">Next page</a> and <a href="https://other.test/x">external</a>.</p>
      <img src="/pic.png" alt="A picture">
      <iframe src="https://www.youtube.com/embed/abc123"></iframe>
      <table><tr><th>Key</th><th>Value</th></tr><tr><td>a</td><td>1</td></tr></table>
    </main>
  </body>
</html>`;

let server: any;
let base = "";

beforeAll(() => {
  server = Bun.serve({
    port: 0,
    fetch(req) {
      const { pathname } = new URL(req.url);
      if (pathname === "/article") {
        return new Response(ARTICLE_HTML, {
          headers: { "content-type": "text/html; charset=utf-8" },
        });
      }
      if (pathname === "/json") {
        return new Response(JSON.stringify({ hello: "world" }), {
          headers: { "content-type": "application/json" },
        });
      }
      return new Response("missing", { status: 404 });
    },
  });
  base = `http://127.0.0.1:${server.port}`;
});

afterAll(() => {
  server?.stop(true);
});

describe("Web Extract", () => {
  it("extracts markdown with title, prose and tables", async () => {
    const res = await extractUrl(`${base}/article`, { format: "markdown" });

    expect(res.error).toBeUndefined();
    expect(res.title).toBe("Fixture Article");
    expect(res.metadata?.source).toBe("static");
    expect(res.metadata?.statusCode).toBe(200);
    expect(res.content).toContain("Fixture Heading");
    expect(res.content).toContain("Body text that is long enough");
    expect(res.content).toContain("| Key | Value |");
    expect(res.content).toContain("| a | 1 |");
    // Navigational chrome is dropped from the article text (it stays in the
    // link manifest appended after the `---` separator).
    const body = res.content.split("\n\n---\n\n")[0]!;
    expect(body).not.toContain("Navigation");
  });

  it("appends link, image and video manifests to markdown", async () => {
    const res = await extractUrl(`${base}/article`);
    expect(res.content).toContain("## Links");
    expect(res.content).toContain(`${base}/next-page`);
    expect(res.content).toContain("## Images");
    expect(res.content).toContain(`${base}/pic.png`);
    expect(res.content).toContain("## Videos");
    expect(res.content).toContain("youtube.com/embed/abc123");
  });

  it("returns only the manifest in links mode", async () => {
    const res = await extractUrl(`${base}/article`, { format: "links" });

    expect(res.metadata?.source).toBe("links");
    expect(res.content).toContain("## Links");
    expect(res.content).toContain(`${base}/next-page`);
    expect(res.content).not.toContain("Body text that is long enough");
  });

  it("returns structured data in data mode", async () => {
    const res = await extractUrl(`${base}/article`, { format: "data" });

    expect(res.metadata?.source).toBe("data");
    expect(res.structured?.title).toBe("Fixture Article");
    expect(res.structured?.canonical).toBe("https://example.com/canonical");
    expect(res.structured?.jsonld[0]?.headline).toBe("Fixture Headline");
    expect(res.structured?.opengraph.title).toBe("Fixture OG Title");
    expect(res.content).toContain('"@type": "Article"');
  });

  it("pretty-prints JSON responses", async () => {
    const res = await extractUrl(`${base}/json`);
    expect(res.metadata?.source).toBe("data");
    expect(res.content).toContain('"hello": "world"');
  });

  it("reports non-2xx responses without throwing", async () => {
    const res = await extractUrl(`${base}/missing`);
    expect(res.error).toContain("404");
    expect(res.metadata?.statusCode).toBe(404);
  });

  it("truncates to the character budget, keeping head and tail", async () => {
    const res = await extractUrl(`${base}/article`, { format: "markdown", charLimit: 120 });
    expect(res.content).toContain("characters omitted");
    expect(res.content.length).toBeLessThan(400);
  });

  it("extracts a batch concurrently, preserving input order", async () => {
    const results = await extractUrls([`${base}/article`, `${base}/json`, `${base}/missing`]);
    expect(results).toHaveLength(3);
    expect(results[0]!.title).toBe("Fixture Article");
    expect(results[1]!.metadata?.source).toBe("data");
    expect(results[2]!.error).toContain("404");
  });

  it("returns an empty array for an empty batch", async () => {
    expect(await extractUrls([])).toEqual([]);
  });
});
