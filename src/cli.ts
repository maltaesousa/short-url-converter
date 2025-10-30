import { config as loadEnv } from 'dotenv';
import { DatabaseHandler, JsonHandler } from './input-handlers';
import { UrlConverter } from './converter';
import { Logger } from './logger';
import { ConversionResult, ConversionStats } from './types';
import { ThemesLoader } from './themes-loader';

loadEnv();

function handleResult(result: ConversionResult, logger: Logger) {
  if (!result.success) {
    logger.logError(result.ref, result.error || 'Unknown error');
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);

  const dbSchema = process.env.DB_MAIN_SCHEMA;
  const dbStaticSchema = process.env.DB_MAIN_STATIC_SCHEMA;
  const dbConnection = process.env.DB_CONNECTION || '';
  const inputSource = process.env.INPUT_SOURCE || 'database';
  const srid = process.env.SRID;

  if (srid !== '2056') {
    console.error('Error: The SRID is not set to 2056. Other SRIDs are not supported yet.');
    process.exit(1);
  }

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npm start <ref>           - Debug mode: convert single URL');
    console.log('  npm start --batch         - Batch mode: convert all URLs');
    console.log('  npm start --test <ref>    - Test mode: use test.json');
    console.log('  npm start --test --batch  - Test batch mode: use test.json');
    console.log('  npm start --export-themes - Export DB themes to CSV');
    process.exit(1);
  }

  // Export themes from DB
  if (args[0] === '--export-themes') {
    const filename = 'themes.csv';
    const themesLoader = new ThemesLoader(dbConnection, dbSchema);
    try {
      const treeItems = await themesLoader.loadThemes();
      // Write CSV
      const fs = await import('fs');
      const header = 'id,name,type,parent_ids\n';
      const rows = treeItems.map(item => `${item.id},"${item.name}",${item.type},"[${item.parent_ids.join(',')}]"`).join('\n');
      fs.writeFileSync(filename, header + rows + '\n', 'utf-8');
      console.log(`Mapping exported to ${filename}`);
    } catch (error) {
      console.error('Failed to export mapping:', error);
      process.exit(1);
    } finally {
      await themesLoader.close();
    }
    process.exit(0);
  }

  process.env.DEBUG = !args.includes('--batch') ? 'true' : 'false';
  const logger = Logger.getInstance();

  const converter = new UrlConverter();

  if (args[0] === '--test') {
    const jsonHandler = new JsonHandler('./test.json');

    if (args[1] === '--batch') {
      logger.info('Running in TEST BATCH mode using test.json');
      const records = jsonHandler.getAllRecords();
      const results = await converter.convertBatch(records);

      const stats: ConversionStats = {
        total: results.length,
        converted: results.filter(r => r.success).length,
        skipped: results.filter(r => r.error === 'URL origin does not match').length,
        failed: results.filter(r => !r.success && r.error !== 'URL origin does not match').length
      };

      logger.info('\n=== Conversion Statistics ===');
      logger.info(`Total: ${stats.total}`);
      logger.info(`Converted: ${stats.converted}`);
      logger.info(`Skipped: ${stats.skipped}`);
      logger.info(`Failed: ${stats.failed}`);

      for (const record of records) {
        if (record.expected) {
          const result = results.find(r => r.ref === record.ref);
          if (result?.convertedUrl) {
            const match = result.convertedUrl === record.expected;
            logger.info(`\n[${record.ref}] Expected match: ${match ? 'YES' : 'NO'}`);
            if (!match) {
              logger.info(`  Expected: ${record.expected}`);
              logger.info(`  Got:      ${result.convertedUrl}`);
            }
          }
        }
      }
    } else {
      const ref = args[1];
      if (!ref) {
        logger.error('Please provide a ref for test mode');
        process.exit(1);
      }

      logger.info(`Running in TEST DEBUG mode for ref: ${ref}`);
      const record = jsonHandler.getRecord(ref);

      if (!record) {
        logger.error(`Record with ref ${ref} not found in test.json`);
        process.exit(1);
      }

      const result = await converter.convert(record);

      if (record.expected) {
        const match = result.convertedUrl === record.expected;
        logger.info(`\nExpected match: ${match ? 'YES' : 'NO'}`);
        if (!match) {
          logger.info(`Expected: ${record.expected}`);
          logger.info(`Got:      ${result.convertedUrl}`);
        }
      }
      handleResult(result, logger);
    }
  } else if (args[0] === '--batch') {
    logger.info('Running in BATCH mode using database');

    if (!dbConnection) {
      logger.error('DB_CONNECTION not set in .env file');
      process.exit(1);
    }

    const dbHandler = new DatabaseHandler(dbConnection);

    try {
      const records = await dbHandler.getAllRecords(dbStaticSchema);
      const results = await converter.convertBatch(records);

      const stats: ConversionStats = {
        total: results.length,
        converted: results.filter(r => r.success).length,
        skipped: results.filter(r => r.error === 'URL origin does not match').length,
        failed: results.filter(r => !r.success && r.error !== 'URL origin does not match').length
      };

      logger.info('\n=== Conversion Statistics ===');
      logger.info(`Total: ${stats.total}`);
      logger.info(`Converted: ${stats.converted}`);
      logger.info(`Skipped: ${stats.skipped}`);
      logger.info(`Failed: ${stats.failed}`);
    } finally {
      await dbHandler.close();
    }
  } else {
    const ref = args[0];
    logger.info(`Running in DEBUG mode for ref: ${ref}`);

    if (inputSource === 'json') {
      const jsonHandler = new JsonHandler('./test.json');
      const record = jsonHandler.getRecord(ref);

      if (!record) {
        logger.error(`Record with ref ${ref} not found in test.json`);
        process.exit(1);
      }

      const result = await converter.convert(record);
      handleResult(result, logger);
    } else {
      if (!dbConnection) {
        logger.error('DB_CONNECTION not set in .env file');
        process.exit(1);
      }

      const dbHandler = new DatabaseHandler(dbConnection);

      try {
        const record = await dbHandler.getRecord(ref, dbStaticSchema);

        if (!record) {
          logger.error(`Record with ref ${ref} not found in database`);
          process.exit(1);
        }

        const result = await converter.convert(record);
        handleResult(result, logger);
      } finally {
        await dbHandler.close();
      }
    }
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
