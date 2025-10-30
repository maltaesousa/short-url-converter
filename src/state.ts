import { DrawingFeatureData, GeoGirafePosition, SharedLayer } from "./types";

export class State {
  baselayer?: string;
  projection?: string;
  position?: GeoGirafePosition;
  layers: SharedLayer[] = [];
  opacity?: Record<string, number>;
  features?: DrawingFeatureData[];
  dimensions?: Record<string, string>;
  unconvertedParts: string[] = [];
  order = 1000;

  constructor() {}

  createLayer(layerId: number, checked=0, opacity=1) {
    const layer = {
      id: layerId,
      order: this.order++,
      checked,
      isExpanded: 1,
      children: [],
      excludedChildrenIds: [],
      opacity
    }
    return layer;
  }

  addLayer(layerId: number, checked=0, opacity=1): SharedLayer {
    const layer = this.createLayer(layerId, checked, opacity);
    this.layers.push(layer);
    return layer;
  }

  addSubLayer(parentLayer: SharedLayer, layerId: number, checked=0, opacity=1): SharedLayer {
    const layer = this.createLayer(layerId, checked, opacity);
    parentLayer.children.push(layer);
    return layer;
  }

  findLayerById(layerId: number): SharedLayer | undefined {
    const search = (layers: SharedLayer[]): SharedLayer | undefined => {
      for (const layer of layers) {
        if (layer.id === layerId) {
          return layer;
        }
        const child = search(layer.children);
        if (child) {
          return child;
        }
      }
      return undefined;
    };
    return search(this.layers);
  }
}
