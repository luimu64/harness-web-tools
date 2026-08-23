import { describe, expect, it } from "bun:test";
import { searchWeb } from "../src/search";
import { cleanDdgUrl } from "../src/search/duckduckgo";

describe("Web Search", () => {
  it("cleans DDG uddg redirect URLs", () => {
    const raw = "//duckduckgo.com/l/?uddg=https%3A%2F%2Fbun.sh%2F&rut=abc123";
    expect(cleanDdgUrl(raw)).toBe("https://bun.sh/");
  });

  it("searches the web via DuckDuckGo and returns structured hits", async () => {
    const response = await searchWeb("bun typescript runtime", { limit: 3 });
    expect(response.query).toBe("bun typescript runtime");
    expect(response.data.web.length).toBeGreaterThan(0);
    const first = response.data.web[0];
    expect(first).toBeDefined();
    if (first) {
      expect(first.title).toBeDefined();
      expect(first.url).toMatch(/^https?:\/\//);
      expect(first.position).toBe(1);
    }
  });
});
