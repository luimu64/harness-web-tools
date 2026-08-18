# pi-web-tools

Fast, zero-browser web search and content extraction extension for the [Pi coding agent](https://pi.dev) (`@earendil-works/pi-coding-agent`).

Extracted from local-extract and web search capabilities with **zero external browser/Camoufox dependencies** — pure HTTP + Cheerio + Turndown + DuckDuckGo HTML parser.

---

## Features

### 1. `web_search` Tool
- **Keyless Web Search**: Uses DuckDuckGo HTML and Lite search interfaces out of the box — no API keys required.
- **Clean URLs**: Unwraps DuckDuckGo redirect URLs (`//duckduckgo.com/l/?uddg=...`) to direct target URLs.
- **Optional Backends**: Supports SearXNG (`SEARXNG_URL`) and Brave Search (`BRAVE_API_KEY`) with automatic fallback.

### 2. `web_extract` Tool
- **Fast HTTP Extraction**: Direct static fetch with realistic browser headers, redirect following, and timeout bounds.
- **Output Modes**:
  - `format="markdown"` (default): Clean article markdown + appended `## Links`, `## Images`, `## Videos` feature manifests.
  - `format="links"`: Skips full markdown extraction and returns only the page title + comprehensive link/image/video inventories (fast, low-token).
  - `format="data"`: Structured JSON extraction of schema.org JSON-LD blocks, OpenGraph (`og:*`), Twitter Cards (`twitter:*`), and standard `<meta>` tags.
- **Rich Feature Discovery**:
  - `Links`: Catches every `<a href>` with anchor text, resolving relative paths.
  - `Images`: Extracts `<img src/srcset>` (highest resolution candidate), `<picture>/<source>`, `og:image`, `twitter:image`, video posters, and lazy-load attributes (`data-src`, etc.).
  - `Videos`: Extracts `<video src>`, `<source>` video streams, OpenGraph/Twitter player metas, iframe embeds (YouTube, Vimeo, Twitch, Rumble, etc.), and direct media file links (`.mp4`, `.webm`, `.m3u8`, etc.).
- **Budget Control**: Head + tail truncation when `char_limit` is exceeded, preserving the appended feature manifests at the tail.
- **Concurrent Batching**: Parallel multi-URL fetching with connection pool limits.

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
| `query` | `string` | Search query keywords | *(Required)* |
| `limit` | `number` | Max number of search results (1–20) | `5` |

### `web_extract`

| Parameter | Type | Description | Default |
| :--- | :--- | :--- | :--- |
| `urls` | `string[]` | Array of URLs to extract | *(Required)* |
| `format` | `"markdown" \| "links" \| "data"` | Output extraction format | `"markdown"` |
| `char_limit` | `number` | Per-page character budget before truncation | `15000` |

---

## Interactive Slash Commands

- `/search <query>`: Quick interactive web search from the Pi TUI prompt.

---

## Optional Environment Variables

| Variable | Description |
| :--- | :--- |
| `SEARXNG_URL` | Base URL of a self-hosted SearXNG instance (e.g. `https://searx.example.com`) |
| `BRAVE_API_KEY` | Brave Search API key for optional commercial search backend |

---

## Development & Testing

```bash
# Install dependencies
bun install

# Run test suite
bun test

# Build bundled distribution
bun run build

# Typecheck
bun run typecheck
```

---

## License

MIT
