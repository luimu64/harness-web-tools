export * as pi from "./pi";
export * as opencode from "./opencode";
export * as hermes from "./hermes";
export * as dsh from "./dsh";

export { default as piAdapter, registerPiAdapter, createPiWebSearchTool, createPiWebExtractTool } from "./pi";
export { default as opencodePlugin, webSearchTool as opencodeWebSearch, webExtractTool as opencodeWebExtract, opencodeTools } from "./opencode";
export { default as hermesAdapter, hermesTools, webSearchTool as hermesWebSearchTool, webExtractTool as hermesWebExtractTool, executeWebSearch as hermesWebSearch, executeWebExtract as hermesWebExtract } from "./hermes";
export {
  default as dshAdapter,
  apply as registerDshPlugin,
  createSearchProvider as createDshSearchProvider,
  createFetchProvider as createDshFetchProvider,
  webSearchTool as dshWebSearchTool,
  webExtractTool as dshWebExtractTool,
  SEARCH_PROVIDER_ID as DSH_SEARCH_PROVIDER_ID,
  FETCH_PROVIDER_ID as DSH_FETCH_PROVIDER_ID,
} from "./dsh";
export type { DshConfig, DshWebService } from "./dsh";
