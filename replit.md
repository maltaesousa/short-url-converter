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
   - Maps ngeo state to geogirafe state format (position, theme, basemap, layers, opacity, dimensions)
   - Compresses state using zlib deflate
   - Base64 encodes with URL-safe characters

3. **feature-converter.ts**: Converts ngeo drawing features to geogirafe format
   - Parses ngeo rl_features parameter (CHAR64 encoded)
   - Converts to GeoJSON geometry
   - Outputs DrawingFeatureData format for geogirafe

4. **input-handlers.ts**: Dual input source support
   - DatabaseHandler: PostgreSQL connection for production
   - JsonHandler: Local JSON file for testing

5. **converter.ts**: Main conversion logic
   - Orchestrates parsing and serialization
   - Handles errors and unconvertible parts
   - Supports debug and batch modes

6. **cli.ts**: Command-line interface
   - Argument parsing for different modes
   - Executes conversions based on mode
   - Displays statistics and results

7. **logger.ts**: Comprehensive logging system
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
| map_x, map_y | position.center | Map coordinates |
| map_zoom | position.zoom | Zoom level |
| /theme/{name} | theme | Theme name |
| baselayer_ref | basemap | Base layer |
| tree_groups | layers | Layer list |
| tree_opacity_* | opacity | Layer opacity |
| dim_* | dimensions | Dimensions |
| rl_features | drawing.features | Drawing features (converted to GeoJSON) |

## Library Integration Notes

### @geogirafe/lib-geoportal Limitations

The @geogirafe/lib-geoportal package is installed but not directly used in the conversion logic due to compatibility limitations:

- **Browser-focused design**: The library is designed for browser/Vite environments, not standalone Node.js CLI
- **ES Module issues**: Complex ESM dependencies that don't work in Node.js CLI context (missing `.jsx` files, `ol` dependencies)
- **Missing exports**: Core classes (DrawingFeature, State, etc.) are not exported for direct programmatic use
- **Runtime requirements**: Requires browser APIs and OpenLayers that aren't available in Node.js

### Current Implementation

Instead of using the library directly, this tool implements:
- Custom serializers that match the geogirafe state specification
- Proper zlib compression and URL-safe base64 encoding
- Drawing feature conversion from ngeo format to geogirafe GeoJSON format
- All conversions produce valid geogirafe URLs compatible with the geogirafe platform

The library package remains installed as a reference for format specifications.

## Recent Changes

- 2025-10-13: Initial implementation with TypeScript
- 2025-10-13: Complete ngeo URL parsing based on Permalink.js v2.9
- 2025-10-13: geogirafe state serialization with compression
- 2025-10-13: Dual input support (PostgreSQL + JSON)
- 2025-10-13: Comprehensive logging and error handling
- 2025-10-13: Drawing features conversion (rl_features → drawing.features)
- 2025-10-13: Attempted @geogirafe/lib-geoportal integration - reverted due to compatibility issues
- 2025-10-13: Custom serializers based on geogirafe specification

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript (CommonJS modules)
- **Database**: PostgreSQL (via pg driver)
- **CLI Execution**: tsx for TypeScript execution
- **Compression**: zlib (built-in)
- **Environment**: dotenv

## Testing

Test cases in `test.json`:
- **test1**: Basic URL with position and baselayer
- **test2**: URL with multiple layers
- **test3**: URL with drawing features (rl_features)
- **test4**: Invalid URL (different origin) - should be skipped

All test cases pass successfully with proper conversion and logging.
