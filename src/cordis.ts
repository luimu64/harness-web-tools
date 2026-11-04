/**
 * Legacy `./cordis` entrypoint.
 *
 * Kept for compatibility with earlier installs; it re-exports the real
 * DeepSeek Harness adapter. New integrations should import
 * `harness-web-tools/dsh`.
 */
export {
  name,
  inject,
  apply,
  webSearchTool,
  webExtractTool,
  createSearchProvider,
  createFetchProvider,
  SEARCH_PROVIDER_ID,
  FETCH_PROVIDER_ID,
} from "./adapters/dsh";

export type { DshConfig } from "./adapters/dsh";
export { default } from "./adapters/dsh";
