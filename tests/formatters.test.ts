import { describe, expect, it } from "bun:test";
import { formatExtractResults, formatSearchResults } from "../src/formatters";
import type { ExtractResult, SearchResponse } from "../src/types";

describe("Core Formatters", () => {
  describe("formatSearchResults", () => {
    it("formats empty search results correctly", () => {
      const response: SearchResponse = {
        query: "nonexistent term 12345",
        total: 0,
        engine: "duckduckgo",
        data: { web: [] },
      };
      const formatted = formatSearchResults(response);
      expect(formatted).toBe('No search results found for: "nonexistent term 12345"');
    });

    it("formats search results into structured markdown", () => {
      const response: SearchResponse = {
        query: "bun runtime",
        total: 2,
        engine: "duckduckgo",
        data: {
          web: [
            {
              position: 1,
              title: "Bun — A fast all-in-one JavaScript runtime",
              url: "https://bun.sh",
              description: "Bun is a fast JavaScript package manager and runtime.",
            },
            {
              position: 2,
              title: "Bun Documentation",
              url: "https://bun.sh/docs",
              description: "Read the official Bun documentation.",
            },
          ],
        },
      };
      const formatted = formatSearchResults(response);
      expect(formatted).toContain('# Search results for: "bun runtime" (2 results via duckduckgo)');
      expect(formatted).toContain("### 1. Bun — A fast all-in-one JavaScript runtime");
      expect(formatted).toContain("- **URL:** https://bun.sh");
      expect(formatted).toContain("- **Snippet:** Bun is a fast JavaScript package manager and runtime.");
      expect(formatted).toContain("### 2. Bun Documentation");
      expect(formatted).toContain("- **URL:** https://bun.sh/docs");
    });
  });

  describe("formatExtractResults", () => {
    it("handles empty results array", () => {
      const formatted = formatExtractResults([]);
      expect(formatted).toBe("No extraction results.");
    });

    it("formats successful extractions into markdown", () => {
      const results: ExtractResult[] = [
        {
          url: "https://example.com",
          title: "Example Domain",
          content: "Example content here.",
        },
      ];
      const formatted = formatExtractResults(results);
      expect(formatted).toContain("## URL: https://example.com");
      expect(formatted).toContain("**Title:** Example Domain");
      expect(formatted).toContain("Example content here.");
    });

    it("formats error extractions with error message", () => {
      const results: ExtractResult[] = [
        {
          url: "https://invalid.example/404",
          title: "",
          content: "",
          error: "HTTP Error 404: Not Found",
        },
      ];
      const formatted = formatExtractResults(results);
      expect(formatted).toContain("## URL: https://invalid.example/404");
      expect(formatted).toContain("**Error:** HTTP Error 404: Not Found");
    });
  });
});
