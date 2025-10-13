import { NgeoParser } from './ngeo-parser';
import { GeoGirafeSerializer } from './geogirafe-serializer';
import { FeatureConverter } from './feature-converter';
import { Logger } from './logger';
import { MappingLoader, IdMappings } from './mapping-loader';
import { UrlRecord, ConversionResult, Config } from './types';
import * as dotenv from 'dotenv';

dotenv.config();

export class UrlConverter {
  private ngeoParser: NgeoParser;
  private ggSerializer: GeoGirafeSerializer | null = null;
  private featureConverter: FeatureConverter;
  private logger: Logger;
  private originUrl: string;
  private destinationUrl: string;
  private mappingLoader: MappingLoader | null = null;
  private useDatabase: boolean;

  constructor() {
    this.originUrl = process.env.ORIGIN_URL || 'https://sitn.ne.ch';
    this.destinationUrl = process.env.DESTINATION_URL || 'https://demo.geogirafe.dev/sitn';
    // Default to database mode unless explicitly set to 'json'
    this.useDatabase = process.env.INPUT_SOURCE !== 'json';
    
    this.ngeoParser = new NgeoParser();
    this.featureConverter = new FeatureConverter();
    this.logger = new Logger();
    
    // Initialize mapping loader if using database
    if (this.useDatabase) {
      const dbConnection = process.env.DB_CONNECTION;
      const dbSchema = process.env.DB_SCHEMA || 'main';
      
      if (!dbConnection) {
        throw new Error('DB_CONNECTION environment variable is required when using database mappings');
      }
      
      this.mappingLoader = new MappingLoader(dbConnection, dbSchema);
    }
  }

  async initialize(): Promise<void> {
    let mappings: IdMappings;
    
    if (this.useDatabase && this.mappingLoader) {
      // Load mappings from database
      mappings = await this.mappingLoader.loadMappings();
      const basemaps = await this.mappingLoader.loadBasemaps();
      mappings.basemaps = basemaps;
    } else {
      // Fallback to JSON file
      mappings = this.loadMappingsFromFile();
    }
    
    this.ggSerializer = new GeoGirafeSerializer(
      mappings.themes,
      mappings.layers,
      mappings.basemaps
    );
  }

  private loadMappingsFromFile(): IdMappings {
    try {
      const mappings = require('../mappings.json');
      console.log('[INFO] Using mappings from mappings.json file');
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

  async close(): Promise<void> {
    if (this.mappingLoader) {
      await this.mappingLoader.close();
    }
  }

  async convert(record: UrlRecord, debug = false): Promise<ConversionResult> {
    if (!this.ggSerializer) {
      throw new Error('Converter not initialized. Call initialize() first.');
    }

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
