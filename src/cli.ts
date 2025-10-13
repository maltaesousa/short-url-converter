import { config as loadEnv } from 'dotenv';
import { DatabaseHandler, JsonHandler } from './input-handlers';
import { UrlConverter } from './converter';
import { Logger } from './logger';
import { ConversionStats } from './types';

loadEnv();

async function main() {
  const args = process.argv.slice(2);
  const logger = new Logger();

  const originUrl = process.env.ORIGIN_URL;
  const destinationUrl = process.env.DESTINATION_URL;
  const dbSchema = process.env.DB_SCHEMA || 'main';
  const dbConnection = process.env.DB_CONNECTION || '';
  const inputSource = process.env.INPUT_SOURCE || 'database';

  if (args.length === 0) {
    console.log('Usage:');
    console.log('  npm start <ref>           - Debug mode: convert single URL');
    console.log('  npm start --batch         - Batch mode: convert all URLs');
    console.log('  npm start --test <ref>    - Test mode: use test.json');
    console.log('  npm start --test --batch  - Test batch mode: use test.json');
    process.exit(1);
  }

  const converter = new UrlConverter();
  await converter.initialize();

  try {
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

        const result = await converter.convert(record, true);
        
        if (record.expected) {
          const match = result.convertedUrl === record.expected;
          logger.info(`\nExpected match: ${match ? 'YES' : 'NO'}`);
          if (!match) {
            logger.info(`Expected: ${record.expected}`);
            logger.info(`Got:      ${result.convertedUrl}`);
          }
        }
      }
    } else if (args[0] === '--batch') {
      logger.info('Running in BATCH mode using database');
      
      if (!dbConnection) {
        logger.error('DB_CONNECTION not set in .env file');
        process.exit(1);
      }

      const dbHandler = new DatabaseHandler(dbConnection);
      
      try {
        const records = await dbHandler.getAllRecords(dbSchema);
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

        await converter.convert(record, true);
      } else {
        if (!dbConnection) {
          logger.error('DB_CONNECTION not set in .env file');
          process.exit(1);
        }

        const dbHandler = new DatabaseHandler(dbConnection);
        
        try {
          const record = await dbHandler.getRecord(ref, dbSchema);
          
          if (!record) {
            logger.error(`Record with ref ${ref} not found in database`);
            process.exit(1);
          }

          await converter.convert(record, true);
        } finally {
          await dbHandler.close();
        }
      }
    }
  } finally {
    await converter.close();
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
