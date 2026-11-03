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
  dshAdapter,
  registerDshPlugin,
  createDshSearchProvider,
  createDshFetchProvider,
  dshWebSearchTool,
  dshWebExtractTool,
  DSH_SEARCH_PROVIDER_ID,
  DSH_FETCH_PROVIDER_ID,
} from "./adapters";

export type { DshConfig, DshWebService } from "./adapters";

export { default as cordisPlugin } from "./cordis";
