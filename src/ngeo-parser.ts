import { NgeoState } from './types';

const CHAR64 = '.-_!*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghjkmnpqrstuvwxyz';

export class NgeoParser {
  private accuracy = 0.1;

  parseUrl(url: string, originUrl: string): NgeoState | null {
    try {
      const urlObj = new URL(url);
      
      if (!url.startsWith(originUrl)) {
        return null;
      }

      const state: NgeoState = {};
      
      const pathMatch = urlObj.pathname.match(/\/theme\/([^/?]+)/);
      if (pathMatch) {
        state.theme = pathMatch[1];
      }

      const params = urlObj.searchParams;
      
      if (params.has('map_x') && params.has('map_y')) {
        state.mapX = parseFloat(params.get('map_x')!);
        state.mapY = parseFloat(params.get('map_y')!);
      }
      
      if (params.has('map_zoom')) {
        state.mapZoom = parseInt(params.get('map_zoom')!);
      }

      if (params.has('baselayer_ref')) {
        state.baselayer = params.get('baselayer_ref')!;
      }

      if (params.has('tree_groups')) {
        state.layers = params.get('tree_groups')!.split(',');
      }

      const dimensions: Record<string, string> = {};
      params.forEach((value, key) => {
        if (key.startsWith('dim_')) {
          const dimName = key.substring(4);
          dimensions[dimName] = value;
        }
      });
      if (Object.keys(dimensions).length > 0) {
        state.dimensions = dimensions;
      }

      const opacity: Record<string, number> = {};
      params.forEach((value, key) => {
        if (key.startsWith('tree_opacity_')) {
          const layerName = key.substring(13);
          opacity[layerName] = parseFloat(value);
        }
      });
      if (Object.keys(opacity).length > 0) {
        state.opacity = opacity;
      }

      if (params.has('rl_features')) {
        state.features = params.get('rl_features')!;
      }

      return state;
    } catch (error) {
      console.error('Error parsing ngeo URL:', error);
      return null;
    }
  }

  decodeFeatureHash(text: string): any[] {
    if (!text || !text.startsWith('F')) {
      return [];
    }

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

  private parseFeature(text: string, context: { prevX: number; prevY: number }): any | null {
    if (text.length < 3 || text[1] !== '(') {
      return null;
    }

    const geomType = text[0];
    const splitIndex = text.indexOf('~');
    
    const geometryText = splitIndex >= 0 ? text.substring(0, splitIndex) + ')' : text;
    const geometry = this.parseGeometry(geometryText, context);

    const properties: any = {};
    let style: any = null;

    if (splitIndex >= 0) {
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

      if (styleSplitIndex >= 0) {
        const styleText = rest.substring(styleSplitIndex + 1);
        style = this.parseStyle(styleText);
      }
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

  private decodeCoordinates(text: string, context: { prevX: number; prevY: number }): number[][] {
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

      coords.push([context.prevX * this.accuracy, context.prevY * this.accuracy]);
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
}
