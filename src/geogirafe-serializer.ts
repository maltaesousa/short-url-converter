import { NgeoState, GeoGirafeState, GeoGirafeExtendedState, GeoGirafePosition, SharedLayer, DrawingFeatureData } from './types';
import * as LZString from 'lz-string';

export class GeoGirafeSerializer {
  private themeNameToIdMap: Record<string, number>;
  private layerNameToIdMap: Record<string, number>;
  private basemapNameToIdMap: Record<string, number>;

  constructor(
    themeMap: Record<string, number> = {},
    layerMap: Record<string, number> = {},
    basemapMap: Record<string, number> = {}
  ) {
    this.themeNameToIdMap = themeMap;
    this.layerNameToIdMap = layerMap;
    this.basemapNameToIdMap = basemapMap;
  }

  convertToState(ngeoState: NgeoState, drawingFeatures?: DrawingFeatureData[]): { state: GeoGirafeState, extendedState: GeoGirafeExtendedState, unconvertible: string[] } {
    const ggState: GeoGirafeState = {};
    const ggExtendedState: GeoGirafeExtendedState = {};
    const unconvertible: string[] = [];

    if (ngeoState.mapX !== undefined && ngeoState.mapY !== undefined) {
      ggState.position = {
        center: [ngeoState.mapX, ngeoState.mapY]
      };
      
      if (ngeoState.mapZoom !== undefined) {
        const resolution = this.zoomToResolution(ngeoState.mapZoom);
        ggState.position.resolution = resolution;
      }
    }

    if (ngeoState.baselayer) {
      const basemapId = this.basemapNameToIdMap[ngeoState.baselayer];
      if (basemapId !== undefined) {
        ggState.basemap = basemapId;
      } else {
        unconvertible.push(`baselayer: ${ngeoState.baselayer} (no ID mapping)`);
      }
    }

    const layers: SharedLayer[] = [];
    let layerOrder = 1;

    if (ngeoState.theme) {
      const themeId = this.themeNameToIdMap[ngeoState.theme];
      if (themeId !== undefined) {
        const themeChildren: SharedLayer[] = [];
        let childOrder = 1;

        if (ngeoState.layers && ngeoState.layers.length > 0) {
          for (const layerName of ngeoState.layers) {
            const layerId = this.layerNameToIdMap[layerName];
            if (layerId !== undefined) {
              themeChildren.push({
                id: layerId,
                order: childOrder++,
                checked: 1,
                isExpanded: 0,
                opacity: ngeoState.opacity?.[layerName],
                children: [],
                excludedChildrenIds: []
              });
            } else {
              unconvertible.push(`layer: ${layerName} (no ID mapping)`);
            }
          }
        }

        layers.push({
          id: themeId,
          order: layerOrder++,
          checked: 1,
          isExpanded: 1,
          children: themeChildren,
          excludedChildrenIds: []
        });
      } else {
        unconvertible.push(`theme: ${ngeoState.theme} (no ID mapping)`);
      }
    } else if (ngeoState.layers && ngeoState.layers.length > 0) {
      for (const layerName of ngeoState.layers) {
        const layerId = this.layerNameToIdMap[layerName];
        if (layerId !== undefined) {
          layers.push({
            id: layerId,
            order: layerOrder++,
            checked: 1,
            isExpanded: 0,
            opacity: ngeoState.opacity?.[layerName],
            children: [],
            excludedChildrenIds: []
          });
        } else {
          unconvertible.push(`layer: ${layerName} (no ID mapping)`);
        }
      }
    }

    if (layers.length > 0) {
      ggState.layers = layers;
    }

    if (drawingFeatures && drawingFeatures.length > 0) {
      ggExtendedState.drawing = {
        features: drawingFeatures
      };
    }

    return { state: ggState, extendedState: ggExtendedState, unconvertible };
  }

  async serializeToUrl(state: GeoGirafeState, extendedState: GeoGirafeExtendedState, baseUrl: string): Promise<string> {
    const stateJson = this.serializeState(state);
    const extendedStateJson = this.serializeExtendedState(extendedState);

    const compressedState = LZString.compressToBase64(stateJson);
    const compressedExtendedState = LZString.compressToBase64(extendedStateJson);

    const fullCompressed = extendedStateJson ? `${compressedState}-${compressedExtendedState}` : compressedState;

    return `${baseUrl}#${fullCompressed}`;
  }

  private serializeState(state: GeoGirafeState): string {
    const parts: string[] = [];

    if (state.basemap !== undefined) {
      parts.push(state.basemap.toString());
    }

    if (state.position) {
      const pos = {
        center: state.position.center,
        resolution: state.position.resolution,
        crosshair: state.position.crosshair,
        tooltip: state.position.tooltip
      };
      parts.push(JSON.stringify(pos));
    }

    if (state.layers) {
      parts.push(JSON.stringify(state.layers));
    }

    return parts.join('|');
  }

  private serializeExtendedState(extendedState: GeoGirafeExtendedState): string {
    if (!extendedState || Object.keys(extendedState).length === 0) {
      return '';
    }
    return JSON.stringify(extendedState);
  }

  private zoomToResolution(zoom: number): number {
    const RESOLUTIONS = [
      250, 100, 50, 20, 10, 5, 2.5, 2, 1.5, 1, 0.5, 0.25, 0.125, 0.0625
    ];
    
    if (zoom >= 0 && zoom < RESOLUTIONS.length) {
      return RESOLUTIONS[zoom];
    }
    
    return RESOLUTIONS[RESOLUTIONS.length - 1];
  }
}
