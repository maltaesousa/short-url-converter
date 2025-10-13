import { NgeoParser } from './ngeo-parser';
import { GeoGirafeSerializer } from './geogirafe-serializer';
import { FeatureConverter } from './feature-converter';
import { Logger } from './logger';
import { UrlRecord, ConversionResult, Config } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class UrlConverter {
  private ngeoParser: NgeoParser;
  private ggSerializer: GeoGirafeSerializer;
  private featureConverter: FeatureConverter;
  private logger: Logger;
  private originUrl: string;
  private destinationUrl: string;

  constructor() {
    this.originUrl = process.env.ORIGIN_URL || 'https://sitn.ne.ch';
    this.destinationUrl = process.env.DESTINATION_URL || 'https://demo.geogirafe.dev/sitn';
    
    this.ngeoParser = new NgeoParser();
    
    const mappings = this.loadMappings();
    this.ggSerializer = new GeoGirafeSerializer(
      mappings.themes,
      mappings.layers,
      mappings.basemaps
    );
    
    this.featureConverter = new FeatureConverter();
    this.logger = new Logger();
  }

  private loadMappings(): {
    themes: Record<string, number>;
    layers: Record<string, number>;
    basemaps: Record<string, number>;
  } {
    try {
      const mappings = require('../mappings.json');
      return {
        themes: mappings.themes || {},
        layers: mappings.layers || {},
        basemaps: mappings.basemaps || {}
      };
    } catch {
      console.warn('[WARN] No mappings.json file found. Using empty mappings. Theme/layer/basemap names will not be converted to IDs.');
      return {
        themes: {},
        layers: {},
        basemaps: {}
      };
    }
  }

  async convert(record: UrlRecord, debug = false): Promise<ConversionResult> {
    const { ref, url } = record;
    
    if (debug) {
      this.logger.debug(`Converting URL for ref: ${ref}`);
      this.logger.debug(`Original URL: ${url}`);
    }

    const ngeoState = this.ngeoParser.parseUrl(url, this.originUrl);
    
    if (!ngeoState) {
      if (debug) {
        this.logger.debug('URL origin does not match');
      }
      return {
        ref,
        success: false,
        originalUrl: url,
        error: 'URL origin does not match configured ORIGIN_URL'
      };
    }

    if (debug) {
      this.logger.debug('Parsed ngeo state:');
      this.logger.debug(JSON.stringify(ngeoState, null, 2));
    }

    let ngeoFeatures = undefined;
    let drawingFeatures = undefined;
    if (ngeoState.features) {
      try {
        ngeoFeatures = this.ngeoParser.decodeFeatureHash(ngeoState.features);
        drawingFeatures = this.featureConverter.convertNgeoFeaturesToDrawing(ngeoFeatures);
        if (debug && drawingFeatures && drawingFeatures.length > 0) {
          this.logger.debug(`Converted ${drawingFeatures.length} drawing features`);
        }
      } catch (error) {
        console.warn(`[WARN] [${ref}] Could not convert drawing features: ${error}`);
      }
    }

    const { state, extendedState, unconvertible } = this.ggSerializer.convertToState(ngeoState, drawingFeatures);
    
    if (debug) {
      this.logger.debug('Converted geogirafe state (position, layers, etc.)');
    }

    if (unconvertible.length > 0) {
      this.logger.logUnconvertible(ref, url, unconvertible);
    }

    const convertedUrl = await this.ggSerializer.serializeToUrl(
      state,
      extendedState,
      this.destinationUrl
    );

    if (debug) {
      this.logger.debug(`Converted URL: ${convertedUrl}`);
    }

    this.logger.logConverted(ref, convertedUrl);

    return {
      ref,
      success: true,
      originalUrl: url,
      convertedUrl,
      unconvertibleParts: unconvertible.length > 0 ? unconvertible : undefined
    };
  }

  async convertBatch(records: UrlRecord[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];
    
    for (const record of records) {
      try {
        const result = await this.convert(record, false);
        results.push(result);
      } catch (error) {
        this.logger.logError(record.ref, String(error));
        results.push({
          ref: record.ref,
          success: false,
          originalUrl: record.url,
          error: String(error)
        });
      }
    }
    
    return results;
  }
}
