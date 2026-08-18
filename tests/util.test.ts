import { describe, expect, it } from "bun:test";
import {
  absUrl,
  decodeHtmlEntities,
  largestSrcset,
  truncateHeadTail,
} from "../src/extract/util";

describe("Extract Util", () => {
  describe("absUrl", () => {
    it("resolves relative URLs", () => {
      expect(absUrl("https://example.com/sub/page.html", "about.html")).toBe(
        "https://example.com/sub/about.html"
      );
      expect(absUrl("https://example.com/sub/page.html", "/root.html")).toBe(
        "https://example.com/root.html"
      );
    });

    it("filters out unusable schemes", () => {
      expect(absUrl("https://example.com", "javascript:void(0)")).toBeNull();
      expect(absUrl("https://example.com", "mailto:test@example.com")).toBeNull();
      expect(absUrl("https://example.com", "tel:+12345678")).toBeNull();
      expect(absUrl("https://example.com", "data:text/plain,hello")).toBeNull();
      expect(absUrl("https://example.com", "#section")).toBeNull();
    });
  });

  describe("largestSrcset", () => {
    it("picks the highest width candidate", () => {
      const srcset = "small.jpg 300w, medium.jpg 600w, large.jpg 1200w";
      expect(largestSrcset(srcset)).toBe("large.jpg");
    });

    it("picks the highest density candidate", () => {
      const srcset = "normal.jpg 1x, retina.jpg 2x";
      expect(largestSrcset(srcset)).toBe("retina.jpg");
    });
  });

  describe("decodeHtmlEntities", () => {
    it("decodes named and numerical HTML entities", () => {
      expect(decodeHtmlEntities("&lt;b&gt;Hello &amp; World&lt;/b&gt;")).toBe(
        "<b>Hello & World</b>"
      );
      expect(decodeHtmlEntities("&#39;quotes&#39; &quot;test&quot;")).toBe(
        "'quotes' \"test\""
      );
    });
  });

  describe("truncateHeadTail", () => {
    it("truncates long strings with separator", () => {
      const longStr = "A".repeat(1000) + "B".repeat(1000);
      const truncated = truncateHeadTail(longStr, 200);
      expect(truncated.length).toBeLessThan(longStr.length);
      expect(truncated).toContain("characters omitted");
      expect(truncated.startsWith("A")).toBeTrue();
      expect(truncated.endsWith("B")).toBeTrue();
    });

    it("leaves short strings untouched", () => {
      const shortStr = "Hello World";
      expect(truncateHeadTail(shortStr, 50)).toBe(shortStr);
    });
  });
});
