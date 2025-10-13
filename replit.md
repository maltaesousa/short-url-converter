# ngeo to geogirafe URL Converter

## Project Overview

A Node.js CLI tool that converts ngeo-style shared URLs into geogirafe-style shared URLs. The tool supports both PostgreSQL database input and local JSON file testing, with configurable execution modes for debugging and batch processing. **Correctly implements geogirafe layer structure with theme as a layer object.**

## Architecture

### Core Components

1. **ngeo-parser.ts**: Parses ngeo URLs based on Permalink.js and FeatureHash.js logic
   - Extracts map coordinates, zoom, theme, baselayer, layers, dimensions, opacity
   - Decodes feature hashes using CHAR64 encoding
   - Handles URL path parameters (e.g., `/theme/{name}`)

2. **geogirafe-serializer.ts**: Converts and serializes state to geogirafe format
   - **Theme as layer**: Correctly structures theme as a SharedLayer object (not separate property)
   - Maps ngeo state to geogirafe state format (position, basemap, layers with proper structure)
   - Requires theme/layer/basemap name-to-ID mappings via `mappings.json`
   - Compresses state using LZ-string (same as geogirafe viewer)
   - Formats as: `{compressedState}-{compressedExtendedState}`

3. **feature-converter.ts**: Converts ngeo drawing features to geogirafe format
   - Parses ngeo rl_features parameter (CHAR64 encoded)
   - Converts to GeoJSON geometry
   - Outputs DrawingFeatureData format for geogirafe extended state

4. **input-handlers.ts**: Dual input source support
   - DatabaseHandler: PostgreSQL connection for production
   - JsonHandler: Local JSON file for testing

5. **converter.ts**: Main conversion logic
   - Loads theme/layer/basemap ID mappings from mappings.json
   - Orchestrates parsing and serialization
   - Handles errors and logs unconvertible parts (missing ID mappings)
   - Supports debug and batch modes

6. **cli.ts**: Command-line interface
   - Argument parsing for different modes
   - Executes conversions based on mode
   - Displays statistics and results

7. **logger.ts**: Comprehensive logging system
   - converted.csv: Successfully converted URLs (ref, new_url)
   - unconvertible.log: Failed conversions and unconvertible parts (missing ID mappings)
   - Console output with debug/info/error levels

### Execution Modes

- **Debug Mode**: `npm start <ref>` - Single URL with verbose logging
- **Batch Mode**: `npm start -- --batch` - All URLs with statistics
- **Test Mode**: `npm start -- --test <ref>` - Single URL from test.json
- **Test Batch Mode**: `npm start -- --test --batch` - All URLs from test.json with validation

## Configuration

### Environment variables in `.env`:
- `ORIGIN_URL`: Base URL to match (e.g., https://sitn.ne.ch)
- `DESTINATION_URL`: Destination base URL (e.g., https://demo.geogirafe.dev/sitn)
- `DB_SCHEMA`: PostgreSQL schema name
- `DB_CONNECTION`: PostgreSQL connection string
- `INPUT_SOURCE`: 'database' or 'json'

### ID Mappings:

**Database Mappings** (Recommended, when `INPUT_SOURCE=database`):
Automatically loaded from `main.treeitem` table:
```sql
main.treeitem (
  type VARCHAR(10),  -- 'theme', 'l_wms', 'l_wmts', 'group', or 'basemap'
  id INTEGER,        -- geogirafe ID
  name VARCHAR       -- ngeo name
)
```

**JSON Mappings** (Fallback, when `INPUT_SOURCE=json` or database unavailable):
Load from `mappings.json` file:
```json
{
  "themes": {
    "cadastre": 1,
    "environnement": 2
  },
  "layers": {
    "LayerName1": 100,
    "LayerName2": 101
  },
  "basemaps": {
    "plan_ville": 10,
    "orthophoto": 11
  }
}
```

**Important**: Without proper ID mappings, themes/layers/basemaps cannot be converted and will be logged as unconvertible.

## geogirafe State Structure

Based on the geogirafe viewer's LayersConfigSerializer and StateSerializer:

### State (Main State)
1. **Basemap**: ID (number) - e.g., `10`
2. **Position**: `{ center: [x, y], resolution: number }`
3. **Layers**: Array of SharedLayer objects

### SharedLayer Structure
```typescript
{
  id: number;              // Layer ID
  order: number;           // Display order
  checked: number;         // 1 = active, 0 = inactive
  isExpanded: number;      // 1 = expanded, 0 = collapsed
  opacity?: number;        // 0-1
  swiped?: 'left'|'right'|'no';
  timeRestriction?: string;
  children: SharedLayer[]; // Nested layers
  excludedChildrenIds: number[];
}
```

### Theme Representation
- **Theme is a layer**: Theme becomes a SharedLayer with its own ID
- **Layers as children**: Other layers become children of the theme layer
- **Example**:
  ```json
  {
    "id": 1,           // Theme ID
    "order": 1,
    "checked": 1,
    "isExpanded": 1,
    "children": [      // Tree_groups layers as children
      {"id": 100, "order": 1, "checked": 1, "isExpanded": 0, ...}
    ],
    "excludedChildrenIds": []
  }
  ```

### Extended State
- **Drawing features**: `{ drawing: { features: DrawingFeatureData[] } }`
- **Other extensions**: Additional state not in main state

### Compression Format
Uses LZ-string compression (same as geogirafe viewer):
```
State → JSON.stringify() → LZString.compressToBase64()
ExtendedState → JSON.stringify() → LZString.compressToBase64()
Final: {compressedState}-{compressedExtendedState}
```

## URL Parameter Mapping

| ngeo | geogirafe | Description |
|------|-----------|-------------|
| map_x, map_y | position.center | Map coordinates [x, y] |
| map_zoom | position.resolution | Zoom → resolution conversion |
| /theme/{name} | layers[0] (as SharedLayer) | Theme as layer with ID |
| baselayer_ref | basemap | Base layer ID (number) |
| tree_groups | layers[0].children | Layers as children of theme |
| tree_opacity_* | layers[].opacity | Layer opacity (0-1) |
| dim_* | dimensions | Dimensions (not yet implemented) |
| rl_features | extendedState.drawing.features | Drawing features (GeoJSON) |

## Recent Changes

- 2025-10-13: Initial implementation with TypeScript
- 2025-10-13: Complete ngeo URL parsing based on Permalink.js v2.9
- 2025-10-13: geogirafe state serialization with compression
- 2025-10-13: Dual input support (PostgreSQL + JSON)
- 2025-10-13: Comprehensive logging and error handling
- 2025-10-13: Drawing features conversion (rl_features → drawing.features)
- 2025-10-13: Attempted @geogirafe/lib-geoportal integration - reverted due to compatibility issues
- 2025-10-13: **CORRECTED**: Theme now properly serialized as a layer object (not separate property)
- 2025-10-13: **CORRECTED**: Using LZ-string compression (not zlib) to match geogirafe viewer
- 2025-10-13: **ADDED**: ID mapping system via mappings.json for theme/layer/basemap conversion
- 2025-10-13: **CORRECTED**: State structure matches geogirafe viewer serialization exactly
- 2025-10-13: **UPDATED**: ID mappings now loaded from PostgreSQL main.treeitem table (replaces mappings.json)

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript (CommonJS modules)
- **Database**: PostgreSQL (via pg driver)
- **CLI Execution**: tsx for TypeScript execution
- **Compression**: lz-string (browser-compatible Base64)
- **Environment**: dotenv

## Testing

Test cases in `test.json`:
- **test1**: Basic URL with position and baselayer
- **test2**: URL with multiple layers
- **test3**: URL with drawing features (rl_features)
- **test4**: Invalid URL (different origin) - should fail

All test cases pass successfully with proper conversion and logging.

## Key Implementation Notes

### Why Theme is a Layer
Based on geogirafe viewer's LayersConfigSerializer:
- ThemeLayer extends BaseLayer (it IS a layer)
- Serialized with same SharedLayer structure
- Has ID, order, checked, isExpanded, children properties
- Other layers become children of the theme layer

### Why ID Mappings are Required
- ngeo uses string names ("cadastre", "plan_ville")
- geogirafe uses numeric IDs (1, 10, 100)
- Without mappings, names cannot be converted to IDs
- Missing mappings are logged as unconvertible

### Why LZ-string (not zlib)
- geogirafe viewer uses LZ-string for browser compatibility
- Produces URL-safe Base64 output
- Matches geogirafe's decompression logic exactly
