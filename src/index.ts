import { registerPiAdapter } from "./adapters/pi";

export * from "./types";
export * from "./formatters";
export { searchWeb } from "./search";
export { extractUrl, extractUrls } from "./extract";

export * as adapters from "./adapters";
export {
  piAdapter,
  registerPiAdapter,
  createPiWebSearchTool,
  createPiWebExtractTool,
  opencodePlugin,
  opencodeTools,
  opencodeWebSearch,
  opencodeWebExtract,
  hermesAdapter,
  hermesTools,
  hermesWebSearchTool,
  hermesWebExtractTool,
  hermesWebSearch,
  hermesWebExtract,
} from "./adapters";

export { default as cordisPlugin } from "./cordis";

/**
 * Default export: Pi harness extension entrypoint.
 * Automatically discovered by Pi when installed or placed in ~/.pi/agent/extensions.
 */
export default registerPiAdapter;
