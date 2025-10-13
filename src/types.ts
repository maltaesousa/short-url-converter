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
  position?: {
    center: [number, number];
    zoom?: number;
  };
  theme?: string;
  basemap?: string;
  layers?: string[];
  opacity?: Record<string, number>;
  dimensions?: Record<string, string>;
  drawing?: {
    features: DrawingFeatureData[];
  };
}

export interface DrawingFeatureData {
  n: string;        // name
  sc: string;       // strokeColor
  sw: number;       // strokeWidth
  fc: string;       // fillColor
  ls: string;       // lineStroke
  as: string;       // arrowStyle
  ap: string;       // arrowPosition
  nfz: number;      // nameFontSize
  mfz: number;      // measureFontSize
  f: string;        // font
  g: object;        // geojson
  dn: boolean;      // displayName
  dm: boolean;      // displayMeasure
  nc: string;       // nameColor
  mc: string;       // measureColor
  s: boolean;       // selected
  t: number;        // type (DrawingShape)
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
