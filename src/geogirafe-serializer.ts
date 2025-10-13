import { GeoGirafeState, NgeoState } from './types';
import * as zlib from 'zlib';
import { promisify } from 'util';

const deflate = promisify(zlib.deflate);

export class GeoGirafeSerializer {
  async convertState(ngeoState: NgeoState): Promise<GeoGirafeState> {
    const ggState: GeoGirafeState = {};

    if (ngeoState.mapX !== undefined) {
      ggState.x = Math.round(ngeoState.mapX);
    }

    if (ngeoState.mapY !== undefined) {
      ggState.y = Math.round(ngeoState.mapY);
    }

    if (ngeoState.mapZoom !== undefined) {
      ggState.z = ngeoState.mapZoom;
    }

    if (ngeoState.theme) {
      ggState.t = ngeoState.theme;
    }

    if (ngeoState.baselayer) {
      ggState.bl = ngeoState.baselayer;
    }

    if (ngeoState.layers && ngeoState.layers.length > 0) {
      ggState.l = ngeoState.layers;
    }

    if (ngeoState.opacity && Object.keys(ngeoState.opacity).length > 0) {
      ggState.o = ngeoState.opacity;
    }

    if (ngeoState.features) {
      ggState.f = [];
    }

    if (ngeoState.dimensions && Object.keys(ngeoState.dimensions).length > 0) {
      ggState.d = ngeoState.dimensions;
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

  serializeToSimpleHash(state: GeoGirafeState): string {
    const parts: string[] = [];

    if (state.x !== undefined && state.y !== undefined) {
      parts.push(`x=${state.x}`);
      parts.push(`y=${state.y}`);
    }

    if (state.z !== undefined) {
      parts.push(`z=${state.z}`);
    }

    if (state.t) {
      parts.push(`t=${encodeURIComponent(state.t)}`);
    }

    if (state.bl) {
      parts.push(`bl=${encodeURIComponent(state.bl)}`);
    }

    if (state.l && state.l.length > 0) {
      parts.push(`l=${state.l.map(encodeURIComponent).join(',')}`);
    }

    if (state.o && Object.keys(state.o).length > 0) {
      const opacityStr = Object.entries(state.o)
        .map(([k, v]) => `${encodeURIComponent(k)}:${v}`)
        .join(',');
      parts.push(`o=${opacityStr}`);
    }

    if (state.d && Object.keys(state.d).length > 0) {
      const dimStr = Object.entries(state.d)
        .map(([k, v]) => `${encodeURIComponent(k)}:${encodeURIComponent(v)}`)
        .join(',');
      parts.push(`d=${dimStr}`);
    }

    return parts.join('&');
  }
}
