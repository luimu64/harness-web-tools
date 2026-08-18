# pi-web-tools

Fast, lightweight web search and content extraction extension for the [Pi coding agent](https://pi.dev) (`@earendil-works/pi-coding-agent`).

Provides native `web_search` and `web_extract` tools without requiring external browser automation, headless browser runtimes, or paid API keys.

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

## Installation

### Via Pi Package Manager (Git)

```bash
pi install git:github.com/luimu64/pi-web-tools
```

### Manual Installation

Clone into your Pi extensions directory:

```bash
# Global extension (available across all projects)
git clone https://github.com/luimu64/pi-web-tools.git ~/.pi/agent/extensions/pi-web-tools
cd ~/.pi/agent/extensions/pi-web-tools && bun install

# Or project-local extension
git clone https://github.com/luimu64/pi-web-tools.git .pi/extensions/pi-web-tools
cd .pi/extensions/pi-web-tools && bun install
```

### Quick Test

```bash
pi -e ./src/index.ts
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

## Interactive Slash Commands

- `/search <query>`: Quick interactive web search directly from the Pi interactive prompt.

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

# Build distribution bundle
bun run build

# Typecheck
bun run typecheck
```

---

## License

MIT
