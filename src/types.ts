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

export interface TreeItem {
  id: number;
  name: string;
  type: string;
  // list of parent IDs, [theme_id, layergroup_id, smaller_group_id, ...]
  parent_ids: number[];
}

export interface SharedLayer {
  id: number;
  order: number;
  checked: number;
  isExpanded: number;
  timeRestriction?: string;
  opacity?: number;
  swiped?: 'left' | 'right' | 'no';
  children: SharedLayer[];
  excludedChildrenIds: number[];
}

export interface GeoGirafePosition {
  center: [number, number];
  resolution?: number;
  crosshair?: string;
  tooltip?: string;
}

export interface ExtendedState {
  drawing: string;
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
  convertedUrl?: string;
  error?: string;
}

export interface ConversionStats {
  total: number;
  converted: number;
  skipped: number;
  failed: number;
}
