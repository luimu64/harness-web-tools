import { describe, expect, it } from "bun:test";
import {
  hermesTools,
  webSearchTool,
  webExtractTool,
  executeWebSearch,
  executeWebExtract,
  register,
  default as hermesAdapter,
} from "../src/adapters/hermes";

describe("Hermes Agent Adapter", () => {
  it("exports valid tool definitions conforming to Hermes custom tools schema", () => {
    expect(hermesTools.length).toBe(2);

    expect(webSearchTool.name).toBe("web_search");
    expect(webSearchTool.parameters.type).toBe("object");
    expect(webSearchTool.parameters.properties.query).toBeDefined();
    expect(webSearchTool.parameters.required).toContain("query");
    expect(typeof webSearchTool.handler).toBe("function");
    expect(typeof webSearchTool.execute).toBe("function");

    expect(webExtractTool.name).toBe("web_extract");
    expect(webExtractTool.parameters.type).toBe("object");
    expect(webExtractTool.parameters.properties.urls).toBeDefined();
    expect(webExtractTool.parameters.required).toContain("urls");
    expect(typeof webExtractTool.handler).toBe("function");
    expect(typeof webExtractTool.execute).toBe("function");
  });

  it("executes executeWebSearch successfully", async () => {
    const output = await executeWebSearch({ query: "JavaScript", limit: 2 });
    expect(typeof output).toBe("string");
    expect(output).toContain("Search results for");
  });

  it("returns error JSON when query is missing in executeWebSearch", async () => {
    const output = await executeWebSearch({});
    expect(typeof output).toBe("string");
    const parsed = JSON.parse(output);
    expect(parsed.error).toContain("Missing required parameter: query");
  });

  it("executes executeWebExtract successfully", async () => {
    const output = await executeWebExtract({
      urls: ["https://example.com"],
      format: "markdown",
    });
    expect(typeof output).toBe("string");
    expect(output).toContain("Example Domain");
  });

  it("returns error JSON when urls array is missing or empty in executeWebExtract", async () => {
    const output = await executeWebExtract({});
    expect(typeof output).toBe("string");
    const parsed = JSON.parse(output);
    expect(parsed.error).toContain("Missing required parameter: urls");
  });

  it("registers tools into a Hermes plugin context via register_tool", () => {
    const registered: Record<string, any> = {};
    const mockCtx = {
      register_tool(name: string, params: any, handler: any, meta: any) {
        registered[name] = { params, handler, meta };
      },
    };

    register(mockCtx);
    expect(registered["web_search"]).toBeDefined();
    expect(registered["web_extract"]).toBeDefined();
    expect(registered["web_search"].params.type).toBe("object");
  });

  it("registers tools into a Hermes context via registerTool", () => {
    const registered: Record<string, any> = {};
    const mockCtx = {
      registerTool(tool: any) {
        registered[tool.name] = tool;
      },
    };

    hermesAdapter.register(mockCtx);
    expect(registered["web_search"]).toBeDefined();
    expect(registered["web_extract"]).toBeDefined();
  });
});
