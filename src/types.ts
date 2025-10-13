import State from '@geogirafe/lib-geoportal/tools/state/state';
import MapPosition from '@geogirafe/lib-geoportal/tools/state/mapposition';
import DrawingFeature, { DrawingShape } from '@geogirafe/lib-geoportal/components/drawing/drawingFeature';

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

export { State, MapPosition, DrawingFeature, DrawingShape };
