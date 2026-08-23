# harness-web-tools

Fast, lightweight, platform-agnostic web tools suite (`web_search` and `web_extract`) with modular adapters for **Pi** (`@earendil-works/pi-coding-agent`), **OpenCode** (`@opencode-ai/plugin`), and **Hermes Agent**.

Provides native search and web content extraction without requiring external browser automation, headless browser runtimes, or paid API keys.

---

## Features

### 1. `web_search` Tool
- **Keyless Web Search**: Built-in DuckDuckGo HTML and Lite search interfaces out of the box — zero setup or API keys needed.
- **Direct Clean URLs**: Automatically unwraps redirect targets into clean, direct links.
- **Flexible Backend Support**: Optional configuration for SearXNG (`SEARXNG_URL`) and Brave Search (`BRAVE_API_KEY`) with automatic fallback.

### 2. `web_extract` Tool
- **Pure HTTP Fetching**: Fast static extraction with realistic browser headers, redirect handling, and timeout safeguards.
- **Multiple Output Modes**:
  - `format="markdown"` (default): Clean article text in Markdown + appended `## Links`, `## Images`, and `## Videos` manifests.
  - `format="links"`: Skips body text parsing to return only the page title + full link, image, and video inventories (fast, minimal token usage).
  - `format="data"`: Structured JSON extraction covering schema.org JSON-LD blocks, OpenGraph (`og:*`), Twitter Cards (`twitter:*`), canonical links, and `<meta>` tags.
- **Comprehensive Asset Discovery**:
  - **Links**: Extracts all `<a href>` links with anchor text and resolves relative paths.
  - **Images**: Gathers `<img src/srcset>` (resolving the highest resolution candidate), `<picture>/<source>`, `og:image`, `twitter:image`, video posters, and lazy-load attributes (`data-src`, etc.).
  - **Videos**: Detects `<video src>`, `<source>` video elements, video metadata, iframe embeds (YouTube, Vimeo, Twitch, Rumble, etc.), and direct media file links (`.mp4`, `.webm`, `.m3u8`, etc.).
- **Budget Control**: Head + tail truncation when `char_limit` is exceeded, preserving the appended resource manifests at the end.
- **Concurrent Batching**: Parallel multi-URL extraction with connection pooling.

---

## Platform Adapters

### 1. Pi (`@earendil-works/pi-coding-agent`)

```bash
pi install git:github.com/luimu64/harness-web-tools
```

Or import directly in custom Pi extensions:
```ts
import piExtension from "harness-web-tools/pi";
export default piExtension;
```

### 2. OpenCode (`@opencode-ai/plugin`)

Use in OpenCode plugins via `harness-web-tools/opencode`:
```ts
import { webSearchTool, webExtractTool } from "harness-web-tools/opencode";

// Or export default plugin
import opencodePlugin from "harness-web-tools/opencode";
export default opencodePlugin;
```

### 3. Hermes Agent

The repository is a native Hermes Agent plugin. Symlink or clone it directly into your Hermes plugins directory:

```bash
# Clone or symlink into Hermes plugins
ln -s /path/to/harness-web-tools ~/.hermes/plugins/web/harness-web-tools

# Enable the plugin & configure backend
hermes plugins enable web/harness-web-tools --allow-tool-override
hermes config set web.extract_backend harness-web-tools
```

Or register into JS/TS Hermes contexts via `harness-web-tools/hermes`:
```ts
import { hermesTools, executeWebSearch, executeWebExtract, register } from "harness-web-tools/hermes";

// Register into Hermes Agent context
register(hermesContext);
```

### 4. Standalone / Core API

```ts
import { searchWeb, extractUrl, extractUrls } from "harness-web-tools";

const searchResults = await searchWeb("bun typescript runtime", { limit: 5 });
const extractResult = await extractUrl("https://example.com", { format: "markdown" });
```

---

## Tool Schemas

### `web_search`

| Parameter | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `query` | `string` | Search keywords or query string | *(Required)* |
| `limit` | `number` | Maximum number of results to return (1–20) | `5` |

### `web_extract`

| Parameter | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `urls` | `string[]` | List of URLs to fetch and extract | *(Required)* |
| `format` | `"markdown" \| "links" \| "data"` | Extraction mode | `"markdown"` |
| `char_limit` | `number` | Character budget per page before truncation | `15000` |

---

## Optional Configuration

| Environment Variable | Description |
| :--- | :--- |
| `SEARXNG_URL` | Base URL of a self-hosted SearXNG instance (e.g. `https://searx.example.com`) |
| `BRAVE_API_KEY` | Brave Search API key for commercial search backend |

---

## Development & Testing

```bash
# Install dependencies
bun install

# Run test suite
bun test

# Typecheck
bun run typecheck

# Build bundle
bun run build
```

---

## License

MIT
