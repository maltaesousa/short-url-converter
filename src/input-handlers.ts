import { Pool } from 'pg';
import { readFileSync } from 'fs';
import { UrlRecord, Config } from './types';

export class DatabaseHandler {
  private pool: Pool;

  constructor(connectionString: string) {
    this.pool = new Pool({
      connectionString
    });
  }

  async getRecord(ref: string, schema: string): Promise<UrlRecord | null> {
    try {
      const query = `SELECT ref, url FROM ${schema}.shorturl WHERE ref = $1`;
      const result = await this.pool.query(query, [ref]);
      
      if (result.rows.length === 0) {
        return null;
      }

      return {
        ref: result.rows[0].ref,
        url: result.rows[0].url
      };
    } catch (error) {
      console.error(`Error fetching record ${ref}:`, error);
      return null;
    }
  }

  async getAllRecords(schema: string): Promise<UrlRecord[]> {
    try {
      const query = `SELECT ref, url FROM ${schema}.shorturl ORDER BY ref`;
      const result = await this.pool.query(query);
      
      return result.rows.map(row => ({
        ref: row.ref,
        url: row.url
      }));
    } catch (error) {
      console.error('Error fetching all records:', error);
      return [];
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

export class JsonHandler {
  private records: UrlRecord[];

  constructor(filePath: string = './test.json') {
    try {
      const data = readFileSync(filePath, 'utf-8');
      this.records = JSON.parse(data);
    } catch (error) {
      console.error('Error reading JSON file:', error);
      this.records = [];
    }
  }

  getRecord(ref: string): UrlRecord | null {
    return this.records.find(r => r.ref === ref) || null;
  }

  getAllRecords(): UrlRecord[] {
    return this.records;
  }
}
