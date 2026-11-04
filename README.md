# harness-web-tools

Keyless web search (`web_search`) and static page extraction (`web_extract`) with adapters for **Pi** (`@earendil-works/pi-coding-agent`), **OpenCode** (`@opencode-ai/plugin`), **Hermes Agent** and **DeepSeek Harness** (`dsh`).

No API keys, no accounts, no configuration, no headless browser. One core, four adapters: search is DuckDuckGo with a Lite fallback, extraction is plain HTTP plus Turndown.

---

## What it does

### Search — two backends, both keyless

| Backend | Endpoint | Used for |
| :--- | :--- | :--- |
| `duckduckgo-html` | `https://html.duckduckgo.com/html/` (GET) | Primary |
| `duckduckgo-lite` | `https://lite.duckduckgo.com/lite/` (POST) | Fallback when the HTML endpoint errors or returns nothing |

`searchWeb()` tries HTML first, falls back to Lite, and reports which one answered in `engine`. Redirect wrappers (`//duckduckgo.com/l/?uddg=…`) are unwrapped into direct URLs, results are deduplicated, and positions are sequential.

DuckDuckGo rate limits aggressive clients and answers with an `anomaly` page instead of results. Both parsers treat that page as "no results" rather than garbage, which is what makes the fallback work — but neither backend can defeat a hard block.

### Extraction — pure HTTP, no JavaScript execution

`extractUrl()` fetches a page with browser-like headers and converts it to Markdown with Turndown. Three modes:

- `markdown` (default) — article text plus appended `## Links`, `## Images`, `## Videos` manifests.
- `links` — manifests only, no body parsing. Cheapest in tokens.
- `data` — JSON-LD, OpenGraph, Twitter cards, canonical URL, and `<meta>` tags as JSON.

Also: GFM tables, fenced code blocks with language, `<img srcset>` resolution to the largest candidate, lazy-load attributes, video/iframe detection, head+tail truncation on `charLimit`, and concurrent batch fetching (6 at a time).

---

## Platform adapters

### 1. Pi (`@earendil-works/pi-coding-agent`)

```bash
pi install git:github.com/luimu64/harness-web-tools
```

Or import directly in custom Pi extensions:

```ts
import piExtension from "harness-web-tools/pi";
export default piExtension;
```

Registers `web_search` and `web_extract` tools plus a `/search` command.

### 2. OpenCode (`@opencode-ai/plugin`)

```ts
import opencodePlugin from "harness-web-tools/opencode";
export default opencodePlugin;

// or compose the tools yourself
import { webSearchTool, webExtractTool } from "harness-web-tools/opencode";
```

### 3. Hermes Agent

The repository is a native Hermes Agent plugin (`plugin.yaml`, `provider.py`, `tool_override.py`) that shells out to `src/bridge.ts` under Bun. Symlink or clone it into the Hermes plugins directory:

```bash
# Clone or symlink into Hermes plugins
ln -s /path/to/harness-web-tools ~/.hermes/plugins/web/harness-web-tools

# Enable the plugin
hermes plugins enable web/harness-web-tools --allow-tool-override
hermes config set web.extract_backend harness-web-tools
```

Bun must be on `PATH` (or at `~/.bun/bin/bun`). Or register into JS/TS Hermes contexts via `harness-web-tools/hermes`:

```ts
import { hermesTools, executeWebSearch, executeWebExtract, register } from "harness-web-tools/hermes";

register(hermesContext);
```

### 4. DeepSeek Harness (`dsh`)

The package is a dsh **bundle**: `package.json` declares `dsh.bundle.patch`, and `cordis.patch.yml` mounts the host plugin. Install it into a profile:

```bash
dsh plugin --profile web add github:luimu64/harness-web-tools
# or from a local checkout:
dsh plugin --profile web add /path/to/harness-web-tools
dsh --profile web --dump-config   # confirm the harness-web-tools layer
dsh --profile web
```

The adapter registers on the native `ctx.web` seam, so dsh's own `web_search` / `web_fetch` tools are backed by this package:

- Search provider `harness-web-search` (keyless DuckDuckGo).
- Fetch provider `harness-web-extract` (static extraction; clean markdown with link/image/video manifests).

Pin the providers when dsh reports more than one:

```bash
export DSH_WEB_SEARCH_PROVIDER=harness-web-search
export DSH_WEB_FETCH_PROVIDER=harness-web-extract
```

`web_extract` is also registered as its own tool, because `web_fetch` has no `format` or `char_limit` contract. A `web_search` tool is registered only when no other plugin already owns that name (a profile without `@deepseek-ai/dsh-tool-web`).

Plugin options in `cordis.patch.yml` or a later patch layer:

```yaml
- id: harness-web-tools
  name: harness-web-tools/dsh
  config:
    searchProvider: true   # register the search provider
    fetchProvider: true    # register the fetch provider
    extractTool: true      # register the web_extract tool
    searchTool: true       # register the web_search fallback when unclaimed
```

Import directly in a dsh plugin:

```ts
import dshPlugin, { createSearchProvider, webExtractTool } from "harness-web-tools/dsh";
export default dshPlugin; // { name, inject, apply }
```

### 5. Standalone / core API

```ts
import { searchWeb, extractUrl, extractUrls } from "harness-web-tools";

const hits = await searchWeb("bun typescript runtime", { limit: 5 });
const page = await extractUrl("https://example.com", { format: "markdown" });
const batch = await extractUrls(["https://a.test", "https://b.test"], { format: "links" });
```

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

## Development

```bash
bun install
bun test                 # deterministic: parsers, fallback chain, extraction fixtures, adapters
HWB_LIVE=1 bun test      # also hits the real DuckDuckGo endpoints
bun run typecheck
bun run build            # bundles every entry point into dist/
```

Live tests are opt-in because DuckDuckGo blocks repeated automated queries; the fixture tests cover the parsers either way.

## License

MIT
