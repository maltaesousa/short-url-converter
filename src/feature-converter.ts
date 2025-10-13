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

export enum DrawingShape {
  Point = 0,
  Polyline = 1,
  Polygon = 2,
  Square = 3,
  Rectangle = 4,
  Disk = 5,
  FreehandPolyline = 6,
  FreehandPolygon = 7
}

export class FeatureConverter {
  convertNgeoFeaturesToDrawing(ngeoFeatures: any[]): DrawingFeatureData[] {
    const drawingFeatures: DrawingFeatureData[] = [];

    for (const feature of ngeoFeatures) {
      try {
        const drawingFeature = this.convertSingleFeature(feature);
        if (drawingFeature) {
          drawingFeatures.push(drawingFeature);
        }
      } catch (error) {
        console.error('Error converting feature:', error);
      }
    }

    return drawingFeatures;
  }

  private convertSingleFeature(feature: any): DrawingFeatureData | null {
    if (!feature.geometry) {
      return null;
    }

    const geomType = feature.geometry.type || feature.type;
    const drawingShape = this.mapGeometryTypeToDrawingShape(geomType);
    
    if (drawingShape === null) {
      return null;
    }

    const geojson = {
      type: 'Feature',
      geometry: {
        type: this.normalizeGeometryType(geomType),
        coordinates: feature.geometry.coordinates
      },
      properties: feature.properties || {}
    };

    const name = feature.properties?.name || feature.properties?.title || 'Drawing';
    
    const drawingFeature: DrawingFeatureData = {
      n: name,
      sc: feature.style?.strokeColor ? this.parseColor(feature.style.strokeColor) : '#3399CC',
      sw: feature.style?.strokeWidth !== undefined ? parseFloat(feature.style.strokeWidth) : 2,
      fc: feature.style?.fillColor ? this.parseColor(feature.style.fillColor) : '#3399CC',
      ls: 'full',
      as: 'none',
      ap: 'whole',
      nfz: 14,
      mfz: 12,
      f: 'Arial',
      g: geojson,
      dn: feature.style?.name === 'true' || feature.style?.name === true || false,
      dm: true,
      nc: '#000000',
      mc: '#000000',
      s: false,
      t: drawingShape
    };

    return drawingFeature;
  }

  private mapGeometryTypeToDrawingShape(geomType: string): DrawingShape | null {
    const typeMap: Record<string, DrawingShape> = {
      'p': DrawingShape.Point,
      'Point': DrawingShape.Point,
      'l': DrawingShape.Polyline,
      'LineString': DrawingShape.Polyline,
      'L': DrawingShape.Polyline,
      'MultiLineString': DrawingShape.Polyline,
      'a': DrawingShape.Polygon,
      'Polygon': DrawingShape.Polygon,
      'A': DrawingShape.Polygon,
      'MultiPolygon': DrawingShape.Polygon
    };

    return typeMap[geomType] ?? null;
  }

  private normalizeGeometryType(geomType: string): string {
    const normalizeMap: Record<string, string> = {
      'p': 'Point',
      'l': 'LineString',
      'L': 'MultiLineString',
      'a': 'Polygon',
      'A': 'MultiPolygon'
    };

    return normalizeMap[geomType] || geomType;
  }

  private parseColor(color: string): string {
    if (color.startsWith('#')) {
      return color;
    }
    
    if (color.match(/^\d+$/)) {
      const num = parseInt(color);
      return `#${num.toString(16).padStart(6, '0')}`;
    }
    
    return color;
  }
}
