# harness-web-tools

Keyless web search and static page extraction for **DeepSeek Harness** (`dsh`).

No API keys, no accounts, no configuration, no headless browser. It plugs into dsh's `ctx.web` seam so the harness's own `web_search` and `web_fetch` tools get a working backend, and adds a `web_extract` tool for page inventories and structured metadata.

---

## What it does

### Search — two backends, both keyless

| Backend | Endpoint | Used for |
| :--- | :--- | :--- |
| `duckduckgo-html` | `https://html.duckduckgo.com/html/` (GET) | Primary |
| `duckduckgo-lite` | `https://lite.duckduckgo.com/lite/` (POST) | Fallback when the HTML endpoint errors or returns nothing |

`searchWeb()` tries HTML first, falls back to Lite, and reports which one answered in `engine`. Redirect wrappers (`//duckduckgo.com/l/?uddg=…`) are unwrapped into direct URLs, results are deduplicated, and positions are sequential.

DuckDuckGo rate limits aggressive clients and answers with an `anomaly` page instead of results. Both parsers treat that page as "no results" rather than garbage, which is exactly what makes the fallback work — but neither backend can defeat a hard block.

### Extraction — pure HTTP, no JavaScript execution

`extractUrl()` fetches a page with browser-like headers and converts it to Markdown with Turndown. Three modes:

- `markdown` (default) — article text plus appended `## Links`, `## Images`, `## Videos` manifests.
- `links` — manifests only, no body parsing. Cheapest in tokens.
- `data` — JSON-LD, OpenGraph, Twitter cards, canonical URL, and `<meta>` tags as JSON.

Also: GFM tables, fenced code blocks with language, `<img srcset>` resolution to the largest candidate, lazy-load attributes, video/iframe detection, head+tail truncation on `charLimit`, and concurrent batch fetching (6 at a time).

---

## Install (dsh)

The package is a dsh bundle: `package.json` declares `dsh.bundle.patch` and `cordis.patch.yml` mounts the host plugin.

```bash
dsh plugin --profile web add github:luimu64/harness-web-tools
# or from a local checkout:
dsh plugin --profile web add /path/to/harness-web-tools
dsh --profile web --dump-config   # confirm the harness-web-tools layer
```

Pin the providers if dsh reports more than one:

```bash
export DSH_WEB_SEARCH_PROVIDER=harness-web-search
export DSH_WEB_FETCH_PROVIDER=harness-web-extract
```

Provider and tool registration can be switched off per row:

```yaml
- id: harness-web-tools
  name: harness-web-tools/dsh
  config:
    searchProvider: true   # register the search provider
    fetchProvider: true    # register the fetch provider
    extractTool: true      # register the web_extract tool
    searchTool: true       # register the web_search tool when nothing else owns it
```

`web_extract` is registered as its own tool because `format` / `char_limit` have no equivalent in the `web_fetch` contract.

---

## Tool schemas

### `web_search`

| Parameter | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `query` | `string` | Search keywords | *(required)* |
| `limit` | `number` | Maximum results (1–20) | `5` |

### `web_extract`

| Parameter | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `urls` | `string[]` | URLs to fetch | *(required)* |
| `format` | `"markdown" \| "links" \| "data"` | Extraction mode | `"markdown"` |
| `char_limit` | `number` | Character budget per page before truncation | `15000` |

---

## Library use

```ts
import { searchWeb, extractUrl, extractUrls } from "harness-web-tools";

const hits = await searchWeb("bun typescript runtime", { limit: 5 });
const page = await extractUrl("https://example.com", { format: "markdown" });
const batch = await extractUrls(["https://a.test", "https://b.test"], { format: "links" });
```

---

## Development

```bash
bun install
bun test                 # deterministic: parsers, fallback chain, extraction fixtures
HWB_LIVE=1 bun test      # also hits the real DuckDuckGo endpoints
bun run typecheck
bun run build            # bundles dist/index.js and dist/adapters/dsh.js
```

Live tests are opt-in because DuckDuckGo blocks repeated automated queries; the fixture tests cover the parsers either way.

## License

MIT
