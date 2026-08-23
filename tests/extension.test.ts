import { describe, expect, it } from "bun:test";
import extensionEntry from "../src/adapters/pi";

describe("Pi Extension Registration & Execution", () => {
  it("registers web_search and web_extract tools and commands", async () => {
    const tools: Record<string, any> = {};
    const commands: Record<string, any> = {};

    const mockPi = {
      registerTool(toolDef: any) {
        tools[toolDef.name] = toolDef;
      },
      registerCommand(name: string, cmdDef: any) {
        commands[name] = cmdDef;
      },
    };

    extensionEntry(mockPi);

    expect(tools["web_search"]).toBeDefined();
    expect(tools["web_extract"]).toBeDefined();
    expect(commands["search"]).toBeDefined();

    // Test web_search tool execution
    const searchTool = tools["web_search"];
    const searchOut = await searchTool.execute(
      "call_123",
      { query: "TypeScript", limit: 2 },
      null,
      null,
      null
    );
    expect(searchOut.content[0].type).toBe("text");
    expect(searchOut.content[0].text).toContain("Search results for");
    expect(searchOut.details.data.web.length).toBeGreaterThan(0);

    // Test web_extract tool execution (markdown mode)
    const extractTool = tools["web_extract"];
    const extractOut = await extractTool.execute(
      "call_456",
      { urls: ["https://example.com"], format: "markdown" },
      null,
      null,
      null
    );
    expect(extractOut.content[0].type).toBe("text");
    expect(extractOut.content[0].text).toContain("Example Domain");
    expect(extractOut.details.results.length).toBe(1);

    // Test web_extract tool execution (data mode)
    const extractDataOut = await extractTool.execute(
      "call_789",
      { urls: ["https://example.com"], format: "data" },
      null,
      null,
      null
    );
    expect(extractDataOut.content[0].text).toContain('"canonical"');
    expect(extractDataOut.details.results[0].structured).toBeDefined();
  });
});
