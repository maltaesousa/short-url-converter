import { appendFileSync, writeFileSync, existsSync } from 'fs';

export class Logger {
  private static instance: Logger;
  private convertedCsvPath = './converted.csv';
  private reportPath = './report.csv';
  private debugMode: boolean;

  private constructor() {
    this.debugMode = process.env.DEBUG === 'true' || false;
    if (!existsSync(this.convertedCsvPath)) {
      writeFileSync(this.convertedCsvPath, '');
    }
    writeFileSync(this.convertedCsvPath, 'ref,new_url\n');
    if (existsSync(this.reportPath)) {
      writeFileSync(this.reportPath, '');
    }
    writeFileSync(this.reportPath, 'ref,status,issue\n');
  }

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  logConverted(ref: string, newUrl: string): void {
    const csvLine = `${ref},${newUrl}\n`;
    appendFileSync(this.convertedCsvPath, csvLine);
  }

  logUnconvertible(ref: string, parts: string[]): void {
    const logEntry = `"${ref}","PARTIALLY OR NOT CONVERTED","${parts.join(';')}"\n`;
    appendFileSync(this.reportPath, logEntry);
  }

  logError(ref: string, error: string): void {
    const logEntry = `"${ref}","ERROR","${error}"\n`;
    appendFileSync(this.reportPath, logEntry);
    this.error(`Error for ref ${ref}: ${error}`);
  }

  debug(message: string, data?: any): void {
    if (!this.debugMode) return;
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
