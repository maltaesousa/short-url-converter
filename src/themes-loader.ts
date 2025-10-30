import { Pool } from 'pg';
import { TreeItem } from './types';

export interface IdMappings {
  themes: Record<string, number>;
  layers: Record<string, number>;
  basemaps: Record<string, number>;
}

export class ThemesLoader {
  private pool: Pool;
  private schema: string;

  constructor(connectionString: string, schema: string) {
    this.pool = new Pool({
      connectionString
    });
    this.schema = schema;
  }

  async loadThemes(): Promise<TreeItem[]> {
    const source = process.env.THEMES_SOURCE || 'database';
    if (source === 'csv') {
      // Read from themes.csv
      const fs = await import('fs');
      const path = 'themes.csv';
      if (!fs.existsSync(path)) {
        throw new Error('themes.csv not found');
      }
      const content = fs.readFileSync(path, 'utf-8');
      const lines = content.trim().split('\n');
      const treeItems: TreeItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const row = lines[i];
        // id,name,type,parent_ids
        // parent_ids is a string like "[1,2,3]"
        const match = row.match(/^(\d+),"([^"]+)",([^,]+),"\[([^\]]*)\]"$/);
        if (match) {
          const id = parseInt(match[1]);
          const name = match[2];
          const type = match[3];
          const parent_ids = match[4]
            ? match[4].split(',').map(s => s.trim()).filter(Boolean).map(Number)
            : [];
          treeItems.push({ id, name, type, parent_ids });
        }
      }
      console.log(`[INFO] Loaded ${treeItems.length} treeItems from themes.csv`);
      return treeItems;
    } else {
      // Read from database
      let treeItems: TreeItem[] = [];
      try {
        const query = `
          WITH RECURSIVE parent_paths AS (
            SELECT
                ti.id AS treeitem_id,
                ti.name AS treeitem_name,
                ti.type AS treeitem_type,
                ti.id AS current_id,
                ARRAY[]::integer[] AS parent_ids
            FROM ${this.schema}.treeitem ti

            UNION ALL

            -- Recurse parents
            SELECT
                pp.treeitem_id,
                pp.treeitem_name,
                pp.treeitem_type,
                lgt.treegroup_id AS current_id,
                array_prepend(lgt.treegroup_id, pp.parent_ids) AS parent_ids
            FROM parent_paths pp
            JOIN ${this.schema}.layergroup_treeitem lgt 
                ON lgt.treeitem_id = pp.current_id
          )
          -- Keep only paths that goes to the last parent possible
          SELECT DISTINCT
              pp.treeitem_id as id,
              pp.treeitem_name as name,
              pp.treeitem_type as type,
              pp.parent_ids
          FROM parent_paths pp
          LEFT JOIN ${this.schema}.layergroup_treeitem parent_check
              ON parent_check.treeitem_id = pp.current_id  -- still has a parent ?
          WHERE parent_check.treeitem_id IS NULL       -- if not parent, it's the top of hierarchy
        `;
        const result = await this.pool.query(query);
        treeItems = result.rows;

        console.log(`[INFO] Loaded ${treeItems.length} treeItems from database`);

        return treeItems;

      } catch (error) {
        console.error('[ERROR] Failed to load mappings from database:', error);
        throw new Error(`Database mapping error: ${error}`);
      }
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
