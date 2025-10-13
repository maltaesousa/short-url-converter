import { NgeoState, GeoGirafeState, DrawingFeatureData } from './types';
import * as zlib from 'zlib';
import { promisify } from 'util';

const deflate = promisify(zlib.deflate);

export class GeoGirafeSerializer {
  convertToState(ngeoState: NgeoState, drawingFeatures?: DrawingFeatureData[]): GeoGirafeState {
    const ggState: GeoGirafeState = {};

    if (ngeoState.mapX !== undefined && ngeoState.mapY !== undefined) {
      ggState.position = {
        center: [ngeoState.mapX, ngeoState.mapY]
      };
      
      if (ngeoState.mapZoom !== undefined) {
        ggState.position.zoom = ngeoState.mapZoom;
      }
    }

    if (ngeoState.theme) {
      ggState.theme = ngeoState.theme;
    }

    if (ngeoState.baselayer) {
      ggState.basemap = ngeoState.baselayer;
    }

    if (ngeoState.layers && ngeoState.layers.length > 0) {
      ggState.layers = ngeoState.layers;
    }

    if (ngeoState.opacity && Object.keys(ngeoState.opacity).length > 0) {
      ggState.opacity = ngeoState.opacity;
    }

    if (ngeoState.dimensions && Object.keys(ngeoState.dimensions).length > 0) {
      ggState.dimensions = ngeoState.dimensions;
    }

    if (drawingFeatures && drawingFeatures.length > 0) {
      ggState.drawing = {
        features: drawingFeatures
      };
    }

    return ggState;
  }

  async serializeToUrl(state: GeoGirafeState, baseUrl: string): Promise<string> {
    const stateJson = JSON.stringify(state);
    
    const compressed = await deflate(Buffer.from(stateJson, 'utf-8'));
    const base64 = compressed.toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    return `${baseUrl}#${base64}`;
  }
}
