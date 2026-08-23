import { describe, expect, it } from "bun:test";
import {
  webSearchTool,
  webExtractTool,
  opencodePlugin,
  opencodeTools,
} from "../src/adapters/opencode";

const mockContext: any = {
  sessionID: "test-session",
  messageID: "test-msg",
  agent: "test-agent",
  directory: "/tmp",
  worktree: "/tmp",
  abort: new AbortController().signal,
  metadata() {},
  ask: async () => {},
};

describe("OpenCode Adapter", () => {
  it("provides valid tool definitions with Zod schemas", () => {
    expect(webSearchTool.description).toBeDefined();
    expect(webSearchTool.args).toBeDefined();
    expect(typeof webSearchTool.execute).toBe("function");

    expect(webExtractTool.description).toBeDefined();
    expect(webExtractTool.args).toBeDefined();
    expect(typeof webExtractTool.execute).toBe("function");
  });

  it("exports opencodePlugin returning tool registry hooks", async () => {
    const pluginResult = await opencodePlugin();
    expect(pluginResult.tool).toBeDefined();
    expect(pluginResult.tool.web_search).toBe(webSearchTool);
    expect(pluginResult.tool.web_extract).toBe(webExtractTool);
    expect(opencodeTools.web_search).toBe(webSearchTool);
  });

  it("executes web_search tool and returns formatted string output", async () => {
    const output = await webSearchTool.execute(
      { query: "TypeScript", limit: 2 },
      mockContext
    );
    expect(typeof output).toBe("string");
    expect(output).toContain("Search results for");
    expect(output).toContain("http");
  });

  it("executes web_extract tool and returns formatted string output", async () => {
    const output = await webExtractTool.execute(
      { urls: ["https://example.com"], format: "markdown" },
      mockContext
    );
    expect(typeof output).toBe("string");
    expect(output).toContain("Example Domain");
  });

  it("handles web_extract with links mode", async () => {
    const output = await webExtractTool.execute(
      { urls: ["https://example.com"], format: "links" },
      mockContext
    );
    expect(typeof output).toBe("string");
    expect(output).toContain("Links");
  });
});
