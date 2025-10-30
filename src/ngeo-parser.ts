import { View } from 'ol';
import { ThemesLoader } from './themes-loader';
import { SharedLayer, TreeItem } from './types';
import { ViewManager } from './viewmanager';
import { Logger } from './logger';
import { State } from './state';
import { FeatureConverter } from './feature-converter';


const logger = Logger.getInstance();

export class NgeoParser {
  private treeItems: TreeItem[] = [];
  private olView: View;
  private state?: State;

  constructor() {
    this.olView = ViewManager.getOlView();
  }

  async initialize() {    
    if (!this.treeItems || this.treeItems.length === 0) {
      const dbConnection = process.env.DB_CONNECTION;
      const dbSchema = process.env.DB_MAIN_SCHEMA;
      const themesLoader = new ThemesLoader(dbConnection, dbSchema);
      this.treeItems = await themesLoader.loadThemes();
      themesLoader.close();
    }
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
        logger.debug(`Baselayer '${baselayerName}' not found in db, will set background to id: 0`);
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
            not_found_layers.push(groupName);
          } else {
            const layer = this.state.createLayer(itemId, 1);
            parentGroup?.children.push(layer);
          }
        }
        params.delete(key);
        continue;
      }
      // Special layers actions
      const terms = ['tree_enable_', 'tree_opacity_'];
      const matchedTerm = terms.find(term => key.startsWith(term));
      if (matchedTerm) {
        const itemName = key.replace(matchedTerm, '');
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
        const opacity = matchedTerm === 'tree_opacity_' ? parseFloat(value) : 1;
        const checked = (matchedTerm === 'tree_enable_') ? (value === 'true' ? 1 : 0) : 1;

        // If layer still exists and not already added, add it
        if (item) {
          const alreadyAdded = this.state.findLayerById(item.id);
          if (alreadyAdded) {
            if (matchedTerm === 'tree_opacity_') {
              alreadyAdded.opacity = opacity;
            }
            if (matchedTerm === 'tree_enable_') {
              alreadyAdded.checked = checked;
            }
          } else {
            if (parentGroup) {
              this.state.addSubLayer(parentGroup, item.id, checked, opacity);
            } else if (currentThemeLayer) {
              this.state.addSubLayer(currentThemeLayer, item.id, checked, opacity);
            } else {
              this.state.addLayer(item.id, checked, opacity);
            }
          }
        } else {
          not_found_layers.push(value);
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

    // DRAWING
    if (params.has('rl_features')) {
      const featureConverter = new FeatureConverter();
      const ngeoFeatures = featureConverter.decodeFeatureHash(params.get('rl_features')!);
      this.state.features = featureConverter.convertNgeoFeaturesToDrawing(ngeoFeatures);

      params.delete('rl_features');
    }

    if (params.keys().next().done === false) {
      logger.debug('Unprocessed URL parameters remain:');
      this.state.unconvertedParts = params.toString().split('&');
    }

    return this.state;
  }
}
