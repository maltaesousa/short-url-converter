# ngeo to geogirafe URL Converter

## Project Overview

A Node.js CLI tool that converts ngeo-style shared URLs into geogirafe-style shared URLs. The tool supports both PostgreSQL database input and local JSON file testing, with configurable execution modes for debugging and batch processing.

## Architecture

### Core Components

1. **ngeo-parser.ts**: Parses ngeo URLs based on Permalink.js and FeatureHash.js logic
   - Extracts map coordinates, zoom, theme, baselayer, layers, dimensions, opacity
   - Decodes feature hashes using CHAR64 encoding
   - Handles URL path parameters (e.g., `/theme/{name}`)

2. **geogirafe-serializer.ts**: Converts and serializes state to geogirafe format
   - Maps ngeo state to geogirafe state format (shorter keys: x, y, z, t, bl, l, o, d)
   - Compresses state using zlib deflate
   - Base64 encodes with URL-safe characters

3. **input-handlers.ts**: Dual input source support
   - DatabaseHandler: PostgreSQL connection for production
   - JsonHandler: Local JSON file for testing

4. **converter.ts**: Main conversion logic
   - Orchestrates parsing and serialization
   - Handles errors and unconvertible parts
   - Supports debug and batch modes

5. **cli.ts**: Command-line interface
   - Argument parsing for different modes
   - Executes conversions based on mode
   - Displays statistics and results

6. **logger.ts**: Comprehensive logging system
   - converted.csv: Successfully converted URLs (ref, new_url)
   - unconvertible.log: Failed conversions and unconvertible parts
   - Console output with debug/info/error levels

### Execution Modes

- **Debug Mode**: `npm start <ref>` - Single URL with verbose logging
- **Batch Mode**: `npm start -- --batch` - All URLs with statistics
- **Test Mode**: `npm start -- --test <ref>` - Single URL from test.json
- **Test Batch Mode**: `npm start -- --test --batch` - All URLs from test.json with validation

## Configuration

Environment variables in `.env`:
- `ORIGIN_URL`: Base URL to match (e.g., https://sitn.ne.ch)
- `DESTINATION_URL`: Destination base URL (e.g., https://demo.geogirafe.dev/sitn)
- `DB_SCHEMA`: PostgreSQL schema name
- `DB_CONNECTION`: PostgreSQL connection string
- `INPUT_SOURCE`: 'database' or 'json'

## URL Parameter Mapping

| ngeo | geogirafe | Description |
|------|-----------|-------------|
| map_x, map_y | x, y | Map coordinates |
| map_zoom | z | Zoom level |
| /theme/{name} | t | Theme name |
| baselayer_ref | bl | Base layer |
| tree_groups | l | Layer list |
| tree_opacity_* | o | Layer opacity |
| dim_* | d | Dimensions |
| rl_features | - | Logged as unconvertible |

## Recent Changes

- 2025-10-13: Initial implementation with TypeScript
- Complete ngeo URL parsing based on Permalink.js v2.9
- geogirafe state serialization with compression
- Dual input support (PostgreSQL + JSON)
- Comprehensive logging and error handling

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript
- **Database**: PostgreSQL (via pg driver)
- **CLI Execution**: tsx for TypeScript execution
- **Compression**: zlib (built-in)
- **Environment**: dotenv
