import { describe, expect, it } from "bun:test";
import * as cheerio from "cheerio";
import {
  collectFeatures,
  extractImages,
  extractLinks,
  extractStructuredData,
  extractVideos,
  renderFeatureManifest,
} from "../src/extract/features";

describe("Extractor Features", () => {
  const sampleHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Test Page Title</title>
        <meta name="description" content="A sample test page" />
        <meta property="og:title" content="OG Title" />
        <meta property="og:image" content="https://example.com/og.jpg" />
        <meta property="og:video" content="https://example.com/video.mp4" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href="https://example.com/canonical-page" />
        <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "Article",
            "headline": "Structured Article Headline"
          }
        </script>
      </head>
      <body>
        <h1>Main Heading</h1>
        <p>Some body text goes here.</p>
        <a href="/docs/guide">Documentation Guide</a>
        <a href="https://github.com/test/repo">GitHub Repo</a>
        <img src="/images/hero.png" alt="Hero Image" />
        <img data-src="/images/lazy.png" srcset="/images/small.png 300w, /images/large.png 1200w" />
        <iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe>
        <video poster="/images/video-thumb.jpg">
          <source src="/media/clip.webm" type="video/webm" />
        </video>
        <a href="/downloads/video.m3u8">Stream Playlist</a>
      </body>
    </html>
  `;

  it("extracts links properly", () => {
    const $ = cheerio.load(sampleHtml);
    const links = extractLinks($, "https://example.com");
    expect(links.heading).toBe("Links");
    expect(links.items.length).toBeGreaterThanOrEqual(2);
    expect(links.items.some((i) => i.includes("https://example.com/docs/guide"))).toBeTrue();
    expect(links.items.some((i) => i.includes("https://github.com/test/repo"))).toBeTrue();
  });

  it("extracts images properly with srcset and lazy loading", () => {
    const $ = cheerio.load(sampleHtml);
    const images = extractImages($, "https://example.com");
    expect(images.heading).toBe("Images");
    expect(images.items.some((i) => i.includes("https://example.com/images/hero.png"))).toBeTrue();
    expect(images.items.some((i) => i.includes("https://example.com/images/large.png"))).toBeTrue();
    expect(images.items.some((i) => i.includes("https://example.com/og.jpg"))).toBeTrue();
  });

  it("extracts videos from iframe embeds, video tags, and media links", () => {
    const $ = cheerio.load(sampleHtml);
    const videos = extractVideos($, "https://example.com");
    expect(videos.heading).toBe("Videos");
    expect(videos.items.some((i) => i.includes("youtube.com/embed/dQw4w9WgXcQ"))).toBeTrue();
    expect(videos.items.some((i) => i.includes("https://example.com/media/clip.webm"))).toBeTrue();
    expect(videos.items.some((i) => i.includes("https://example.com/downloads/video.m3u8"))).toBeTrue();
  });

  it("extracts structured data and JSON-LD", () => {
    const $ = cheerio.load(sampleHtml);
    const structured = extractStructuredData($, "https://example.com");
    expect(structured.title).toBe("Test Page Title");
    expect(structured.description).toBe("A sample test page");
    expect(structured.canonical).toBe("https://example.com/canonical-page");
    expect(structured.jsonld.length).toBe(1);
    expect(structured.jsonld[0].headline).toBe("Structured Article Headline");
    expect(structured.opengraph.title).toBe("OG Title");
    expect(structured.twitter.card).toBe("summary_large_image");
    expect(structured.counts.jsonld).toBe(1);
  });

  it("collects and renders all manifest sections into markdown", () => {
    const { sections } = collectFeatures(sampleHtml, "https://example.com");
    const manifest = renderFeatureManifest("Test Page Title", sections);
    expect(manifest).toContain("# Test Page Title");
    expect(manifest).toContain("## Links");
    expect(manifest).toContain("## Images");
    expect(manifest).toContain("## Videos");
  });
});
