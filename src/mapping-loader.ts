import { Pool } from 'pg';

export interface IdMappings {
  themes: Record<string, number>;
  layers: Record<string, number>;
  basemaps: Record<string, number>;
}

export class MappingLoader {
  private pool: Pool;
  private schema: string;

  constructor(connectionString: string, schema: string) {
    this.pool = new Pool({
      connectionString
    });
    this.schema = schema;
  }

  async loadMappings(): Promise<IdMappings> {
    try {
      const query = `
        SELECT type, id, name 
        FROM ${this.schema}.treeitem 
      `;
      
      const result = await this.pool.query(query);
      
      const themes: Record<string, number> = {};
      const layers: Record<string, number> = {};
      const basemaps: Record<string, number> = {};
      
      for (const row of result.rows) {
        const { type, id, name } = row;
        
        if (type === 'theme') {
          themes[name] = id;
        } else if (type === 'l_wms' || type === 'l_wmts' || type === 'group') {
          layers[name] = id;
        }
        // Note: basemaps might need special handling based on your data structure
        // For now, we'll use a separate query or configuration if needed
      }
      
      console.log(`[INFO] Loaded ${Object.keys(themes).length} themes, ${Object.keys(layers).length} layers from database`);
      
      return { themes, layers, basemaps };
    } catch (error) {
      console.error('[ERROR] Failed to load mappings from database:', error);
      throw new Error(`Database mapping error: ${error}`);
    }
  }

  async loadBasemaps(): Promise<Record<string, number>> {
    try {
      // Query for basemaps - adjust based on your schema
      // This might be a separate table or a specific type in treeitem
      const query = `
        SELECT id, name 
        FROM ${this.schema}.treeitem 
        WHERE type = 'basemap'
        ORDER BY name
      `;
      
      const result = await this.pool.query(query);
      const basemaps: Record<string, number> = {};
      
      for (const row of result.rows) {
        basemaps[row.name] = row.id;
      }
      
      if (Object.keys(basemaps).length > 0) {
        console.log(`[INFO] Loaded ${Object.keys(basemaps).length} basemaps from database`);
      }
      
      return basemaps;
    } catch (error) {
      // Basemaps might not exist as a type, that's okay
      console.warn('[WARN] No basemaps found in database (this is optional)');
      return {};
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
