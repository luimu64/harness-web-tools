/**
 * Types for Pi Web Tools Extension
 */

export interface SearchOptions {
  limit?: number;
  engine?: "auto" | "duckduckgo" | "searxng" | "brave";
  searxngUrl?: string;
  braveApiKey?: string;
  timeoutMs?: number;
}

export interface SearchResult {
  title: string;
  url: string;
  description: string;
  position: number;
}

export interface SearchResponse {
  data: {
    web: SearchResult[];
  };
  query: string;
  total: number;
  engine: string;
}

export type ExtractFormat = "markdown" | "links" | "data";

export interface ExtractOptions {
  format?: ExtractFormat;
  charLimit?: number;
  timeoutMs?: number;
  features?: string[]; // e.g. ["links", "images", "videos"]
}

export interface StructuredData {
  url: string;
  title: string;
  description: string;
  canonical: string;
  jsonld: any[];
  opengraph: Record<string, string>;
  twitter: Record<string, string>;
  meta: Record<string, string>;
  counts: {
    jsonld: number;
    meta: number;
    opengraph: number;
    twitter: number;
  };
}

export interface ExtractResult {
  url: string;
  title: string;
  content: string;
  raw_content?: string;
  error?: string | null;
  metadata?: {
    source: "static" | "data" | "links" | "pdf";
    statusCode?: number;
    contentType?: string;
    charCount?: number;
  };
  structured?: StructuredData;
}

export interface FeatureSection {
  heading: string;
  items: string[];
}

export interface FeatureManifest {
  sections: FeatureSection[];
  textLength: number;
}
