import DrawingFeature, { DrawingShape } from '@geogirafe/lib-geoportal/components/drawing/drawingFeature';

export class FeatureConverter {
  convertNgeoFeaturesToDrawing(ngeoFeatures: any[]): DrawingFeature[] {
    const drawingFeatures: DrawingFeature[] = [];

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

  private convertSingleFeature(feature: any): DrawingFeature | null {
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

    const name = feature.properties?.name || feature.properties?.title || undefined;
    const drawingFeature = new DrawingFeature(drawingShape, geojson, name);

    if (feature.style) {
      this.applyStyle(drawingFeature, feature.style);
    }

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

  private applyStyle(drawingFeature: DrawingFeature, style: any): void {
    if (style.strokeColor) {
      drawingFeature.strokeColor = this.parseColor(style.strokeColor);
    }
    
    if (style.strokeWidth !== undefined) {
      drawingFeature.strokeWidth = parseFloat(style.strokeWidth);
    }
    
    if (style.fillColor) {
      drawingFeature.fillColor = this.parseColor(style.fillColor);
    }

    if (style.name !== undefined) {
      drawingFeature.displayName = style.name === 'true' || style.name === true;
    }
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
