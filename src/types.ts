export interface Config {
  originUrl: string;
  destinationUrl: string;
  dbSchema: string;
  dbConnection: string;
  inputSource: 'database' | 'json';
}

export interface UrlRecord {
  ref: string;
  url: string;
  expected?: string;
}

export interface NgeoState {
  mapX?: number;
  mapY?: number;
  mapZoom?: number;
  theme?: string;
  baselayer?: string;
  layers?: string[];
  opacity?: Record<string, number>;
  features?: string;
  dimensions?: Record<string, string>;
  [key: string]: any;
}

export interface GeoGirafeState {
  x?: number;
  y?: number;
  z?: number;
  t?: string;
  bl?: string;
  l?: string[];
  o?: Record<string, number>;
  f?: any[];
  d?: Record<string, string>;
}

export interface ConversionResult {
  ref: string;
  success: boolean;
  originalUrl: string;
  convertedUrl?: string;
  error?: string;
  unconvertibleParts?: string[];
}

export interface ConversionStats {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
}
