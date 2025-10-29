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

  createLayer(layerId: number, checked=0) {
    const layer = {
      id: layerId,
      order: this.order++,
      checked,
      isExpanded: 1,
      children: [],
      excludedChildrenIds: []
    }
    return layer;
  }

  addLayer(layerId: number, checked=0): SharedLayer {
    const layer = this.createLayer(layerId, checked);
    this.layers.push(layer);
    return layer;
  }

  addSubLayer(parentLayer: SharedLayer, layerId: number, checked=0): SharedLayer {
    const layer = this.createLayer(layerId, checked);
    parentLayer.children.push(layer);
    return layer;
  }

}
