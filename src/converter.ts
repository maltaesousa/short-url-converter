import { NgeoParser } from './ngeo-parser';
import { GeoGirafeSerializer } from './geogirafe-serializer';
import { FeatureConverter } from './feature-converter';
import { Logger } from './logger';
import { UrlRecord, ConversionResult } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class UrlConverter {
  private ngeoParser: NgeoParser;
  private ggSerializer: GeoGirafeSerializer | null = null;
  private featureConverter: FeatureConverter;
  private logger: Logger;
  private originUrl: string;
  private destinationUrl: string;

  constructor() {
    this.originUrl = process.env.ORIGIN_URL;
    this.destinationUrl = process.env.DESTINATION_URL;
    
    this.ngeoParser = new NgeoParser();
    this.featureConverter = new FeatureConverter();
    this.logger = new Logger();
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
        error: `${url} does not match configured ORIGIN_URL: ${this.originUrl}`
      };
    }

    const state = this.ngeoParser.parseUrl(url);

    // Projection is not sharable in ngeo, so we set it to a default value
    state.projection = `EPSG:${process.env.SRID}`;

    this.logger.debug('Parsed ngeo state:');
    this.logger.debug(JSON.stringify(state, null, 2));


    let ngeoFeatures = undefined;
    let drawingFeatures = {};
    /* TODO
    if (State.features) {
      try {
        ngeoFeatures = this.ngeoParser.decodeFeatureHash(ngeoState.features);
        drawingFeatures = this.featureConverter.convertNgeoFeaturesToDrawing(ngeoFeatures);
        if (debug && drawingFeatures && drawingFeatures.length > 0) {
          this.logger.debug(`Converted ${drawingFeatures.length} drawing features`);
        }
      } catch (error) {
        console.warn(`[WARN] [${ref}] Could not convert drawing features: ${error}`);
      }
    }*/
    this.logger.debug('Converted geogirafe state (position, layers, etc.)');
  
    const convertedUrl = await this.ggSerializer.serializeToUrl(state, drawingFeatures, this.destinationUrl);
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

  async convertBatch(records: UrlRecord[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    
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
    }
    
    return results;
  }
}
