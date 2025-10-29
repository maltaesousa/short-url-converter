// Copy and adapted from ngeo FeatureHash
//
// https://github.com/camptocamp/ngeo/blob/master/src/format/FeatureHash.js
//
// The MIT License (MIT)
//
// Copyright (c) 2015-2025 Camptocamp SA
//
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
// the Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
// FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
// COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
// IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
// CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

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

const CHAR64 = '.-_!*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghjkmnpqrstuvwxyz';

export class FeatureConverter {
  private accuracy = 0.1;

  decodeFeatureHash(text: string): any[] {
    const features: any[] = [];
    let remainingText = text.substring(1);
    let prevX = 0;
    let prevY = 0;

    while (remainingText.length > 0) {
      const closeParenIndex = remainingText.indexOf(')');
      if (closeParenIndex < 0) break;

      const featureText = remainingText.substring(0, closeParenIndex + 1);
      const feature = this.parseFeature(featureText, { prevX, prevY });

      if (feature) {
        features.push(feature);
        prevX = feature.prevX || prevX;
        prevY = feature.prevY || prevY;
      }

      remainingText = remainingText.substring(closeParenIndex + 1);
    }

    return features;
  }

  // Example p(36zth-ngu4S~n*Point%201'c*%23DB4436'a*0'o*0.2'm*false'b*false's*10'k*2~pointRadius*13'fillColor*%23ffffff'pointRadius*10'fillColor*%23db4436)
  private parseFeature(text: string, context: { prevX: number; prevY: number }): any | null {
    const geomType = text[0];
    const splitIndex = text.indexOf('~');

    const geometryText = splitIndex >= 0 ? text.substring(0, splitIndex) + ')' : text;
    const geometry = this.parseGeometry(geometryText, context);

    const properties: any = {};
    let style: any = null;

    const rest = text.substring(splitIndex + 1, text.length - 1);
    const styleSplitIndex = rest.indexOf('~');

    const propsText = styleSplitIndex >= 0 ? rest.substring(0, styleSplitIndex) : rest;
    if (propsText) {
      const parts = propsText.split("'");
      for (const part of parts) {
        if (part) {
          const decoded = decodeURIComponent(part);
          const keyVal = decoded.split('*');
          if (keyVal.length === 2) {
            properties[keyVal[0]] = keyVal[1];
          }
        }
      }
    }

    console.log('Parsed properties:', properties);

    if (styleSplitIndex >= 0) {
      const styleText = rest.substring(styleSplitIndex + 1);
      style = this.parseStyle(styleText);
    }

    return {
      type: geomType,
      geometry,
      properties,
      style,
      prevX: context.prevX,
      prevY: context.prevY
    };
  }

  private parseGeometry(text: string, context: { prevX: number; prevY: number }): any {
    const geomType = text[0];
    const coordsText = text.substring(2, text.length - 1);

    const coords = this.decodeCoordinates(coordsText, context);

    return {
      type: geomType,
      coordinates: coords
    };
  }

  private decodeCoordinates(text: string, context: { prevX: number; prevY: number }): number[] | number[][] {
    const coords: number[][] = [];
    let index = 0;

    while (index < text.length) {
      let b: number;
      let shift = 0;
      let result = 0;

      do {
        b = CHAR64.indexOf(text.charAt(index++));
        if (b < 0) break;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 32 && index < text.length);

      const dx = result & 1 ? ~(result >> 1) : result >> 1;
      context.prevX += dx;

      shift = 0;
      result = 0;

      do {
        b = CHAR64.indexOf(text.charAt(index++));
        if (b < 0) break;
        result |= (b & 0x1f) << shift;
        shift += 5;
      } while (b >= 32 && index < text.length);

      const dy = result & 1 ? ~(result >> 1) : result >> 1;
      context.prevY += dy;

      const coord = [context.prevX * this.accuracy, context.prevY * this.accuracy];
      coords.push(coord);
    }

    if (coords.length === 1) {
      // For a single point, return number[]
      return coords[0];
    }

    return coords;
  }

  private parseStyle(text: string): any {
    const parts = text.split("'");
    const style: any = {};

    for (const part of parts) {
      if (part) {
        const keyVal = part.split('*');
        if (keyVal.length === 2) {
          style[keyVal[0]] = keyVal[1];
        }
      }
    }

    return style;
  }

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

    let counter = 0;
    const defaultStrokeWidth = drawingShape === DrawingShape.Point ? 12 : 2;

    const drawingFeature: DrawingFeatureData = {
      n: feature.properties?.n || feature.properties?.n || `${drawingShape} ${counter++}`,
      sc: feature.properties?.c ? feature.properties?.c : '#3399CC',
      sw: feature.style?.strokeWidth !== undefined ? parseFloat(feature.style.strokeWidth) : defaultStrokeWidth,
      fc: feature.style?.fillColor ? this.parseColor(feature.style.fillColor) : '#3399CC',
      ls: 'full',
      as: 'none',
      ap: 'whole',
      nfz: 14,
      mfz: 12,
      f: 'Arial',
      g: geojson,
      dn: feature.properties?.b === 'true',
      dm: feature.properties?.m === 'true',
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
    return decodeURI(color);
  }
}
