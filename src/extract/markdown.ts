import * as cheerio from "cheerio";
import TurndownService from "turndown";

const turndown = new TurndownService({
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "_",
  strongDelimiter: "**",
});

// Configure table support in turndown
turndown.addRule("table", {
  filter: ["table"],
  replacement: function (_content, node) {
    const el = node as HTMLElement;
    const rows: string[][] = [];

    // Parse all rows
    const trs = el.querySelectorAll("tr");
    trs.forEach((tr) => {
      const row: string[] = [];
      const cells = tr.querySelectorAll("th, td");
      cells.forEach((cell) => {
        const text = (cell.textContent || "").replace(/\s+/g, " ").trim();
        row.push(text.replace(/\|/g, "\\|"));
      });
      if (row.length > 0) {
        rows.push(row);
      }
    });

    if (rows.length === 0) return "";

    const colCount = Math.max(...rows.map((r) => r.length));
    const normalizedRows = rows.map((r) => {
      while (r.length < colCount) r.push("");
      return r;
    });

    const header = normalizedRows[0];
    const separator = new Array(colCount).fill("---");
    const body = normalizedRows.slice(1);

    let md = `\n| ${header.join(" | ")} |\n| ${separator.join(" | ")} |\n`;
    for (const r of body) {
      md += `| ${r.join(" | ")} |\n`;
    }
    return md + "\n";
  },
});

// Fenced code blocks with language support
turndown.addRule("fencedCodeBlock", {
  filter: function (node) {
    return (
      node.nodeName === "PRE" &&
      node.firstChild !== null &&
      node.firstChild.nodeName === "CODE"
    );
  },
  replacement: function (_content, node) {
    const el = node as HTMLElement;
    const codeEl = el.querySelector("code");
    const langMatch = (codeEl?.className || el.className || "").match(
      /(?:language|lang)-(\w+)/
    );
    const lang = langMatch ? langMatch[1] : "";
    const code = codeEl?.textContent || el.textContent || "";
    return `\n\`\`\`${lang}\n${code.trim()}\n\`\`\`\n\n`;
  },
});

/**
 * Extract clean Markdown content from an HTML string.
 */
export function htmlToMarkdown(html: string, baseUrl: string): { title: string; markdown: string } {
  if (!html || !html.trim()) {
    return { title: "", markdown: "" };
  }

  const $ = cheerio.load(html);

  // Extract title
  const tagTitle = $("title").first().text().replace(/\s+/g, " ").trim();
  const ogTitle = $('meta[property="og:title"]').attr("content")?.trim();
  const h1Title = $("h1").first().text().replace(/\s+/g, " ").trim();
  const title = tagTitle || ogTitle || h1Title || "";

  // Remove elements that shouldn't appear in readable article text
  $(
    "script, style, noscript, svg, canvas, iframe, form, button, nav, footer, header, [aria-hidden='true']"
  ).remove();

  // Try to find the primary content container
  let mainHtml = $("main, article, #content, .content, .main-content, #main, .post-content, .article-body").first().html();
  if (!mainHtml || mainHtml.trim().length < 150) {
    mainHtml = $("body").html() || html;
  }

  try {
    const md = turndown.turndown(mainHtml);
    // Clean up excessive blank lines
    const cleanedMd = md.replace(/\n{3,}/g, "\n\n").trim();
    return { title, markdown: cleanedMd };
  } catch {
    const plain = $("body").text().replace(/\s+/g, " ").trim();
    return { title, markdown: plain };
  }
}
