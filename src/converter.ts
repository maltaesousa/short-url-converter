import { NgeoParser } from './ngeo-parser';
import { GeoGirafeSerializer } from './geogirafe-serializer';
import { FeatureConverter } from './feature-converter';
import { Logger } from './logger';
import { UrlRecord, ConversionResult, NgeoState, State } from './types';

export class UrlConverter {
  private ngeoParser: NgeoParser;
  private ggSerializer: GeoGirafeSerializer;
  private featureConverter: FeatureConverter;
  private logger: Logger;
  private originUrl: string;
  private destinationUrl: string;

  constructor(originUrl: string, destinationUrl: string, logger: Logger) {
    this.ngeoParser = new NgeoParser();
    this.ggSerializer = new GeoGirafeSerializer();
    this.featureConverter = new FeatureConverter();
    this.logger = logger;
    this.originUrl = originUrl;
    this.destinationUrl = destinationUrl;
  }

  async convert(record: UrlRecord, debugMode: boolean = false): Promise<ConversionResult> {
    const { ref, url } = record;

    if (debugMode) {
      this.logger.debug(`Converting URL for ref: ${ref}`);
      this.logger.debug(`Original URL: ${url}`);
    }

    if (!url.startsWith(this.originUrl)) {
      const error = 'URL origin does not match';
      if (debugMode) {
        this.logger.debug(error);
      }
      return {
        ref,
        success: false,
        originalUrl: url,
        error
      };
    }

    const ngeoState = this.ngeoParser.parseUrl(url, this.originUrl);
    
    if (!ngeoState) {
      const error = 'Failed to parse ngeo URL';
      this.logger.logError(ref, error);
      return {
        ref,
        success: false,
        originalUrl: url,
        error
      };
    }

    if (debugMode) {
      this.logger.debug('Parsed ngeo state:', ngeoState);
    }

    let drawingFeatures;
    const unconvertibleParts: string[] = [];
    
    if (ngeoState.features) {
      try {
        const parsedFeatures = this.ngeoParser.decodeFeatureHash(ngeoState.features);
        if (parsedFeatures && parsedFeatures.length > 0) {
          drawingFeatures = this.featureConverter.convertNgeoFeaturesToDrawing(parsedFeatures);
          if (debugMode) {
            this.logger.debug(`Converted ${drawingFeatures.length} drawing features`);
          }
        }
      } catch (error) {
        unconvertibleParts.push('features (error parsing)');
        if (debugMode) {
          this.logger.debug('Error converting features:', error);
        }
      }
    }

    const ggState = this.ggSerializer.convertToState(ngeoState, drawingFeatures);
    
    if (debugMode) {
      this.logger.debug('Converted geogirafe state (position, layers, etc.)');
    }

    try {
      const convertedUrl = await this.ggSerializer.serializeToUrl(ggState, this.destinationUrl);
      
      if (debugMode) {
        this.logger.debug(`Converted URL: ${convertedUrl}`);
      }

      this.logger.logConverted(ref, convertedUrl);

      if (unconvertibleParts.length > 0) {
        this.logger.logUnconvertible(ref, url, unconvertibleParts);
      }

      return {
        ref,
        success: true,
        originalUrl: url,
        convertedUrl,
        unconvertibleParts: unconvertibleParts.length > 0 ? unconvertibleParts : undefined
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      this.logger.logError(ref, errorMsg);
      return {
        ref,
        success: false,
        originalUrl: url,
        error: errorMsg
      };
    }
  }

  async convertBatch(records: UrlRecord[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const record of records) {
      const result = await this.convert(record, false);
      results.push(result);
    }

    return results;
  }
}
