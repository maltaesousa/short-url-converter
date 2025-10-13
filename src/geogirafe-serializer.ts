import { NgeoState, State, MapPosition, DrawingFeature } from './types';
import StateSerializer from '@geogirafe/lib-geoportal/tools/share/stateserializer';
import StateManager from '@geogirafe/lib-geoportal/tools/state/statemanager';
import MapPositionSerializer from '@geogirafe/lib-geoportal/tools/share/serializers/mappositionserializer';
import BasemapSerializer from '@geogirafe/lib-geoportal/tools/share/serializers/basemapserializer';
import LayerConfigSerializer from '@geogirafe/lib-geoportal/tools/share/serializers/layerconfigserializer';
import { DrawingState } from '@geogirafe/lib-geoportal/components/drawing/drawingFeature';

export class GeoGirafeSerializer {
  private stateSerializer: StateSerializer;
  private stateManager: StateManager;

  constructor() {
    this.stateManager = new StateManager('converter');
    this.stateSerializer = new StateSerializer('converter');
    
    this.stateSerializer.addSerializer(MapPosition, new MapPositionSerializer());
    this.stateSerializer.addSerializer(Object, new BasemapSerializer());
    this.stateSerializer.addSerializer(Object, new LayerConfigSerializer());
  }

  convertToState(ngeoState: NgeoState, drawingFeatures?: DrawingFeature[]): State {
    const state = this.stateManager.state;

    if (ngeoState.mapX !== undefined && ngeoState.mapY !== undefined) {
      state.position = new MapPosition();
      state.position.center = [ngeoState.mapX, ngeoState.mapY];
      
      if (ngeoState.mapZoom !== undefined) {
        state.position.zoom = ngeoState.mapZoom;
      }
    }

    if (ngeoState.theme) {
      state.extendedState['theme'] = { name: ngeoState.theme };
    }

    if (ngeoState.baselayer) {
      state.extendedState['basemap'] = { ref: ngeoState.baselayer };
    }

    if (ngeoState.layers && ngeoState.layers.length > 0) {
      state.extendedState['layers'] = { list: ngeoState.layers };
    }

    if (ngeoState.opacity && Object.keys(ngeoState.opacity).length > 0) {
      state.extendedState['opacity'] = ngeoState.opacity;
    }

    if (ngeoState.dimensions && Object.keys(ngeoState.dimensions).length > 0) {
      state.extendedState['dimensions'] = ngeoState.dimensions;
    }

    if (drawingFeatures && drawingFeatures.length > 0) {
      const drawingState = new DrawingState();
      drawingState.features = drawingFeatures;
      state.extendedState['drawing'] = drawingState;
    }

    return state;
  }

  async serializeToUrl(state: State, baseUrl: string): Promise<string> {
    const serializedState = this.stateSerializer.getSerializedState();
    return `${baseUrl}#${serializedState}`;
  }

  getSerializedHash(): string {
    return this.stateSerializer.getSerializedState();
  }
}
