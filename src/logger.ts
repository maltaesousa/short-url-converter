import { appendFileSync, writeFileSync, existsSync } from 'fs';
import { ConversionResult } from './types';

export class Logger {
  private convertedCsvPath = './converted.csv';
  private unconvertibleLogPath = './unconvertible.log';

  constructor() {
    if (!existsSync(this.convertedCsvPath)) {
      writeFileSync(this.convertedCsvPath, 'ref,new_url\n');
    }
    
    if (!existsSync(this.unconvertibleLogPath)) {
      writeFileSync(this.unconvertibleLogPath, '');
    }
  }

  logConverted(ref: string, newUrl: string): void {
    const csvLine = `${ref},${newUrl}\n`;
    appendFileSync(this.convertedCsvPath, csvLine);
  }

  logUnconvertible(ref: string, originalUrl: string, parts: string[]): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] REF: ${ref}\nOriginal URL: ${originalUrl}\nUnconvertible parts: ${parts.join(', ')}\n\n`;
    appendFileSync(this.unconvertibleLogPath, logEntry);
  }

  logError(ref: string, error: string): void {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ERROR - REF: ${ref}\nError: ${error}\n\n`;
    appendFileSync(this.unconvertibleLogPath, logEntry);
  }

  debug(message: string, data?: any): void {
    console.log(`[DEBUG] ${message}`);
    if (data) {
      console.log(JSON.stringify(data, null, 2));
    }
  }

  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  error(message: string, error?: any): void {
    console.error(`[ERROR] ${message}`);
    if (error) {
      console.error(error);
    }
  }
}
