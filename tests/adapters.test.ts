import { describe, expect, it } from "bun:test";
import * as webTools from "../src/index";
import * as adapters from "../src/adapters";
import piAdapter from "../src/adapters/pi";
import opencodePlugin from "../src/adapters/opencode";
import hermesAdapter from "../src/adapters/hermes";

describe("Unified Adapters & Exports", () => {
  it("exports core search and extraction functions", () => {
    expect(typeof webTools.searchWeb).toBe("function");
    expect(typeof webTools.extractUrl).toBe("function");
    expect(typeof webTools.extractUrls).toBe("function");
    expect(typeof webTools.formatSearchResults).toBe("function");
    expect(typeof webTools.formatExtractResults).toBe("function");
  });

  it("exports all adapters and platform entrypoints from adapters module", () => {
    expect(adapters.pi).toBeDefined();
    expect(adapters.opencode).toBeDefined();
    expect(adapters.hermes).toBeDefined();

    expect(typeof adapters.piAdapter).toBe("function");
    expect(typeof adapters.opencodePlugin).toBe("function");
    expect(adapters.hermesAdapter).toBeDefined();
  });

  it("exports platform tools directly from root index", () => {
    expect(typeof webTools.registerPiAdapter).toBe("function");
    expect(typeof webTools.createPiWebSearchTool).toBe("function");
    expect(typeof webTools.createPiWebExtractTool).toBe("function");

    expect(webTools.opencodeWebSearch).toBeDefined();
    expect(webTools.opencodeWebExtract).toBeDefined();
    expect(typeof webTools.opencodePlugin).toBe("function");

    expect(webTools.hermesTools).toBeDefined();
    expect(typeof webTools.hermesWebSearch).toBe("function");
    expect(typeof webTools.hermesWebExtract).toBe("function");
  });

  it("does not export a default adapter from root index", () => {
    expect((webTools as Record<string, unknown>).default).toBeUndefined();
  });

  it("exports cordis plugin correctly", () => {
    expect(webTools.cordisPlugin).toBeDefined();
    expect(webTools.cordisPlugin.name).toBe("harness-web-tools");
    expect(typeof webTools.cordisPlugin.apply).toBe("function");
  });
});
