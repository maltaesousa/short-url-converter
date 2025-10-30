import { NgeoParser } from './ngeo-parser';
import { GeoGirafeSerializer } from './geogirafe-serializer';
import { Logger } from './logger';
import { UrlRecord, ConversionResult } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class UrlConverter {
  private ngeoParser: NgeoParser;
  private ggSerializer: GeoGirafeSerializer | null = null;
  private logger: Logger;
  private originUrl: string;
  private destinationUrl: string;

  constructor() {
    this.originUrl = process.env.ORIGIN_URL;
    this.destinationUrl = process.env.DESTINATION_URL;
    
    this.ngeoParser = new NgeoParser();
    this.logger = Logger.getInstance();
  }

  async convert(record: UrlRecord): Promise<ConversionResult> {
    await this.ngeoParser.initialize();
    this.ggSerializer = new GeoGirafeSerializer();

    const { ref, url } = record;
    
    this.logger.debug(`Converting URL for ref: ${ref}`);
    this.logger.debug(`Original URL: ${url}`);

    if (!url.startsWith(this.originUrl)) {
      return {
        ref,
        success: false,
        error: `URL origin does not match`
      };
    }

    const state = this.ngeoParser.parseUrl(url);

    // Projection is not sharable in ngeo, so we set it to a default value
    state.projection = `EPSG:${process.env.SRID}`;

    this.logger.debug('Parsed ngeo state:');
    this.logger.debug(JSON.stringify(state, null, 2));

    const convertedUrl = await this.ggSerializer.serializeToUrl(state, this.destinationUrl);
    this.logger.debug(`Converted URL: ${convertedUrl}`);
    this.logger.logConverted(ref, convertedUrl);
    if (state.unconvertedParts && state.unconvertedParts.length > 0) {
      this.logger.logUnconvertible(ref, state.unconvertedParts);
    }

    return {
      ref,
      success: true,
      convertedUrl,
    };
  }

  printProgress(current: number, total: number) {
    const barLength = 30;
    const percent = Math.floor((current / total) * 100);
    const filled = Math.floor((current / total) * barLength);
    const bar = '='.repeat(filled) + '-'.repeat(barLength - filled);
    process.stdout.write(`\r[${bar}] ${percent}% (${current}/${total})`);
    if (current === total) {
      process.stdout.write('\n');
    }
  }

  async convertBatch(records: UrlRecord[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    const total = records.length;
    let processed = 0;



    for (const record of records) {
      try {
        const result = await this.convert(record);
        results.push(result);
      } catch (error) {
        this.logger.logError(record.ref, String(error));
        results.push({
          ref: record.ref,
          success: false,
          error: String(error)
        });
      }
      processed++;
      this.printProgress(processed, total);
    }

    return results;
  }
}
