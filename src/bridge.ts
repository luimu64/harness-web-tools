import { searchWeb } from "./search";
import { extractUrl, extractUrls } from "./extract";

async function main() {
  const mode = process.argv[2];
  const inputJson = process.argv[3];

  if (!mode || !inputJson) {
    console.error(JSON.stringify({ error: "Missing mode or input json" }));
    process.exit(1);
  }

  try {
    const input = JSON.parse(inputJson);

    if (mode === "search") {
      const queries: string[] = Array.isArray(input.queries)
        ? input.queries
        : input.query
        ? [input.query]
        : [];
      const limit = input.limit || 5;

      if (queries.length === 0) {
        console.log(JSON.stringify({ sources: [], truncated: false, engine: "duckduckgo", total: 0 }));
        return;
      }

      // Merge results across queries
      const allSources: any[] = [];
      const seenUrls = new Set<string>();
      let usedEngine = "duckduckgo";

      for (const q of queries) {
        const res = await searchWeb(q, { limit });
        usedEngine = res.engine;
        for (const item of res.data.web) {
          if (!seenUrls.has(item.url)) {
            seenUrls.add(item.url);
            allSources.push({
              url: item.url,
              title: item.title,
              snippet: item.description,
            });
          }
        }
      }

      console.log(
        JSON.stringify({
          sources: allSources.slice(0, limit * queries.length),
          truncated: false,
          engine: usedEngine,
          total: allSources.length,
        })
      );
    } else if (mode === "extract") {
      const urls: string[] = Array.isArray(input.urls) ? input.urls : [input.url];
      const format = input.format || "markdown";
      const charLimit = input.charLimit || input.char_limit || 15000;

      const results = await extractUrls(urls, {
        format,
        charLimit,
      });

      const formattedTexts = results.map((r) => {
        if (r.error) {
          return `## URL: ${r.url}\n**Error:** ${r.error}`;
        }
        return `## URL: ${r.url}\n**Title:** ${r.title}\n\n${r.content}`;
      });

      console.log(
        JSON.stringify({
          content: formattedTexts.join("\n\n---\n\n").trim(),
          results,
        })
      );
    } else if (mode === "fetch") {
      const url: string = input.url;
      const res = await extractUrl(url, { format: "markdown" });
      console.log(
        JSON.stringify({
          url: res.url,
          statusCode: res.metadata?.statusCode || 200,
          body: {
            kind: "html",
            content: res.raw_content || res.content,
          },
          markdown: res.content,
          title: res.title,
          truncated: false,
        })
      );
    } else {
      console.error(JSON.stringify({ error: `Unknown mode: ${mode}` }));
      process.exit(1);
    }
  } catch (err: any) {
    console.error(JSON.stringify({ error: err?.message || String(err) }));
    process.exit(1);
  }
}

main();
