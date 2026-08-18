import { describe, expect, it } from "bun:test";
import { extractUrl, extractUrls } from "../src/extract";

describe("Web Extract", () => {
  it("extracts markdown from a real URL (https://example.com)", async () => {
    const res = await extractUrl("https://example.com", { format: "markdown" });
    expect(res.error).toBeUndefined();
    expect(res.url).toContain("example.com");
    expect(res.title).toContain("Example Domain");
    expect(res.content).toContain("Example Domain");
    expect(res.metadata?.source).toBe("static");
  });

  it("extracts links format from a real URL", async () => {
    const res = await extractUrl("https://example.com", { format: "links" });
    expect(res.error).toBeUndefined();
    expect(res.metadata?.source).toBe("links");
    expect(res.content).toContain("## Links");
  });

  it("extracts structured data format from a real URL", async () => {
    const res = await extractUrl("https://example.com", { format: "data" });
    expect(res.error).toBeUndefined();
    expect(res.metadata?.source).toBe("data");
    expect(res.structured).toBeDefined();
    expect(res.structured?.url).toContain("example.com");
  });

  it("handles batch URLs concurrently", async () => {
    const urls = ["https://example.com", "https://httpbin.org/status/200"];
    const results = await extractUrls(urls);
    expect(results.length).toBe(2);
    expect(results[0].url).toContain("example.com");
  });

  it("handles 404 or bad URLs gracefully without throwing", async () => {
    const res = await extractUrl("https://httpbin.org/status/404");
    expect(res.error).toBeDefined();
    expect(res.error).toContain("404");
  });
});
