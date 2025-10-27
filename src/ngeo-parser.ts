import { View } from 'ol';
import { ThemesLoader } from './themes-loader';
import { SharedLayer, TreeItem } from './types';
import { ViewManager } from './viewmanager';
import { Logger } from './logger';
import { State } from './state';

const CHAR64 = '.-_!*ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghjkmnpqrstuvwxyz';
const logger = new Logger();

export class NgeoParser {
  private accuracy = 0.1;
  private treeItems: TreeItem[] = [];
  private olView: View;
  private state?: State;

  constructor() {
    this.olView = ViewManager.getOlView();
  }

  async initialize() {
    const dbConnection = process.env.DB_CONNECTION;
    const dbSchema = process.env.DB_SCHEMA;

    const themesLoader = new ThemesLoader(dbConnection, dbSchema);
    this.treeItems = await themesLoader.loadThemes();
    themesLoader.close();
  }

  parseUrl(url: string): State {
    const urlObj = new URL(url);
    const params = urlObj.searchParams;
    this.state = new State();

    // TODO: no_redirect??

    // LANG is not shared
    if (params.has('lang')) {
      params.delete('lang');
    }

    // BASELAYER
    if (params.has('baselayer_ref')) {
      const baselayerName = params.get('baselayer_ref')!;
      const baselayerId = this.treeItems.find(item => item.name === baselayerName)?.id;
      if (!baselayerId) {
        logger.info(`Baselayer '${baselayerName}' not found in db, will set background to id: 0`);
      }
      this.state.baselayer = String(baselayerId || 0);
      params.delete('baselayer_ref');
    }

    // MAP POSITION
    if (params.has('map_x') && params.has('map_y')) {
      const mapX = parseFloat(params.get('map_x')!);
      const mapY = parseFloat(params.get('map_y')!);
      let zoom = 1;
      if (params.has('map_zoom')) {
        zoom = parseInt(params.get('map_zoom')!);
        params.delete('map_zoom');
      }
      this.state.position = {
        center: [mapX, mapY],
        resolution: this.olView.getResolutionForZoom(zoom)
      };
      params.delete('map_x');
      params.delete('map_y');
    }

    // LAYERTREE
    const not_found_layers: string[] = [];
    const foundGroupLayers: SharedLayer[] = [];

    // Theme
    let currentThemeLayer: SharedLayer | null = null;
    const pathMatch = urlObj.pathname.match(/\/theme\/([^/?]+)/);
    if (pathMatch) {
      const themeId = this.treeItems.find(item => item.name === pathMatch[1])?.id;
      if (pathMatch && themeId) {
        currentThemeLayer = this.state.addLayer(themeId);
      }
    }

    // Groups and layers
    for (const key of Array.from(params.keys())) {
      const value = params.get(key) || '';
      if (key === 'theme') {
        const themeId = this.treeItems.find(item => item.name === value)?.id;
        if (!themeId) {
          not_found_layers.push(value);
        } else if (currentThemeLayer?.id !== themeId) {
          // New theme encountered, update currentThemeLayer
          currentThemeLayer = this.state.addLayer(themeId);
        }
        params.delete(key);
        continue;
      }
      if (key == 'tree_groups') {
        // Store group info for later use
        const groups = value.split(',');
        const groupLayers: any[] = [];
        for (const groupName of groups) {
          const groupId = this.treeItems.find(item => item.name === groupName)?.id;
          if (!groupId) {
            not_found_layers.push(groupName);
            continue;
          }
          const layer = this.state.createLayer(groupId);
          groupLayers.push(layer);
        }
        // Attach all groups as children of current theme
        if (currentThemeLayer) {
          currentThemeLayer.children.push(...groupLayers);
        } else {
          this.state.layers.push(...groupLayers);
        }
        // Save for later tree_enable lookup
        foundGroupLayers.push(...groupLayers);
        params.delete(key);
        continue;
      }
      if (key.startsWith('tree_group_layers_')) {
        const groupName = key.replace('tree_group_layers_', '');
        const groupId = this.treeItems.find(item => item.name === groupName)?.id;
        if (value && groupId) {
          // Find group in current theme children
          let parentGroup = null;
          if (currentThemeLayer) {
            parentGroup = currentThemeLayer.children.find((layer: any) => layer.id === groupId);
          } else {
            parentGroup = this.state.layers.find((layer: SharedLayer) => layer.id === groupId);
          }
          const itemId = this.treeItems.find(item => item.name === value)?.id;
          if (!itemId) {
            not_found_layers.push(value);
          } else {
            const layer = this.state.createLayer(itemId, 1);
            parentGroup?.children.push(layer);
          }
        }
        params.delete(key);
        continue;
      }
      if (key.startsWith('tree_enable_')) {
        const itemName = key.replace('tree_enable_', '');
        // Find the group parent from foundGroupLayers
        let item = null;
        let parentGroup = null;
        if (foundGroupLayers.length > 0) {
          for (const groupLayer of foundGroupLayers) {
            // Find item with correct parent chain
            item = this.treeItems.find(ti => ti.name === itemName && ti.parent_ids.includes(groupLayer.id));
            if (item) {
              parentGroup = groupLayer;
              break;
            }
          }
        }
        // Fallback: just find by name
        if (!item) {
          item = this.treeItems.find(ti => ti.name === itemName);
        }
        if (!item) {
          not_found_layers.push(value);
        } else if (parentGroup) {
          this.state.addSubLayer(parentGroup, item.id, 1);
        } else if (currentThemeLayer) {
          this.state.addSubLayer(currentThemeLayer, item.id, 1);
        } else {
          this.state.addLayer(item.id, 1);
        }
        params.delete(key);
      }
    }

    if (not_found_layers.length > 0) {
      this.state.unconvertedParts!.push(`Layers not found in DB: ${not_found_layers.join(', ')}`);
    }


    // TODO
    const dimensions: Record<string, string> = {};
    params.forEach((value, key) => {
      if (key.startsWith('dim_')) {
        const dimName = key.substring(4);
        dimensions[dimName] = value;
      }
    });
    if (Object.keys(dimensions).length > 0) {
      this.state.dimensions = dimensions;
    }


    // TODO
    const opacity: Record<string, number> = {};
    params.forEach((value, key) => {
      if (key.startsWith('tree_opacity_')) {
        const layerName = key.substring(13);
        opacity[layerName] = parseFloat(value);
      }
    });
    if (Object.keys(opacity).length > 0) {
      this.state.opacity = opacity;
    }

    if (params.has('rl_features')) {
      this.state.features = params.get('rl_features')!;
    }


    if (params.keys().next().done === false) {
      logger.info('Unprocessed URL parameters remain:');
      this.state.unconvertedParts = params.toString().split('&');
    }

    return this.state;
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
