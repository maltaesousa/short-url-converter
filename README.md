# ngeo to geogirafe URL Converter

Convert ngeo-style shared URLs to geogirafe-style compressed hash URLs with proper layer structure serialization.

## Features

- ✅ Parse ngeo Permalink URLs (map position, theme, layers, dimensions, opacity)
- ✅ Convert drawing features from `rl_features` parameter to geogirafe GeoJSON format
- ✅ Generate compressed geogirafe URLs using LZ-string compression
- ✅ **Theme as layer**: Theme is correctly serialized as a layer object (not a separate property)
- ✅ Proper layer structure with IDs, order, checked status, and children
- ✅ Dual input sources: PostgreSQL database or local JSON file
- ✅ Debug and batch execution modes
- ✅ Comprehensive logging (CSV output + unconvertible parts)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `ORIGIN_URL`: Base URL to match (e.g., `https://sitn.ne.ch`)
- `DESTINATION_URL`: Destination base URL (e.g., `https://demo.geogirafe.dev/sitn`)
- `DB_SCHEMA`: Database schema (e.g., `main`)
- `DB_CONNECTION`: PostgreSQL connection string
- `INPUT_SOURCE`: `database` or `json` (defaults to `database`)

## Usage

### Test Mode (using test.json)

Test with a single URL:
```bash
npm start -- --test test1
```

Test all URLs with statistics:
```bash
npm start -- --test --batch
```

### Database Mode

Convert a single URL (debug mode):
```bash
npm start <ref>
```

Convert all URLs (batch mode):
```bash
npm start -- --batch
```

## geogirafe State Structure

The converter properly implements the geogirafe state structure based on the geogirafe viewer serialization:

### State Components

1. **Position** - Map position serialized separately:
   ```json
   {
     "center": [x, y],
     "resolution": 10
   }
   ```

2. **Basemap** - Basemap ID (number):
   ```json
   10
   ```

3. **Layers** - Array of layer objects (theme is a layer with children):
   ```json
   [{
     "id": 1,
     "order": 1,
     "checked": 1,
     "isExpanded": 1,
     "children": [
       {"id": 100, "order": 1, "checked": 1, "isExpanded": 0, "opacity": 0.8, "children": [], "excludedChildrenIds": []}
     ],
     "excludedChildrenIds": []
   }]
   ```

4. **Extended State** - Drawing features and other extended state:
   ```json
   {
     "drawing": {
       "features": [...]
     }
   }
   ```

### Compression

Uses LZ-string compression (same as geogirafe viewer):
1. Serialize state components to JSON
2. Compress with `LZString.compressToBase64()`
3. Format: `{compressedState}-{compressedExtendedState}`
4. Append to URL as hash fragment

## URL Parameter Mapping

| ngeo Parameter | geogirafe Structure | Notes |
|----------------|---------------------|-------|
| `map_x`, `map_y` | `position.center` | Map coordinates [x, y] |
| `map_zoom` | `position.resolution` | Converted to resolution |
| `/theme/{name}` | `layers[0]` (as SharedLayer) | Theme as layer object with ID |
| `baselayer_ref` | `basemap` | Basemap ID (requires mapping) |
| `tree_groups` | `layers[0].children` | Layers as children of theme |
| `tree_opacity_*` | `layers[].opacity` | Layer opacity |
| `dim_*` | Not yet implemented | Dimensions |
| `rl_features` | `extendedState.drawing.features` | Drawing features as GeoJSON |

## Output Files

### converted.csv
CSV file with successfully converted URLs:
```csv
ref,new_url
test1,https://demo.geogirafe.dev/sitn#IwBgPg3gRAxgpgOwC5wE5QFwG0BMBWPEIkAGmBxEKIF0SpU4BnAewBsBXJAS2YU2AB0eAL5gs0LgBN+dZqkloZsABZwYAazjSMwOl0YBRAB4AHAIYIF23Sq6tJDPtlpQ4RmBysBhZXYeIASUlGTCxqYWogA=
```

### unconvertible.log
Log file for unconvertible parts due to missing ID mappings:
```
[2025-01-13T10:30:00.000Z] REF: test5
Original URL: https://sitn.ne.ch/theme/unknown_theme
Unconvertible parts: theme: unknown_theme (no ID mapping), layer: unknown_layer (no ID mapping)
```

## Architecture

### Components

1. **ngeo-parser.ts** - Parses ngeo URLs and extracts state
2. **geogirafe-serializer.ts** - Converts state to proper geogirafe layer structure using LZ-string
3. **feature-converter.ts** - Converts drawing features from ngeo to geogirafe format
4. **input-handlers.ts** - Handles database and JSON input sources
5. **converter.ts** - Main conversion orchestrator with ID mapping support
6. **cli.ts** - Command-line interface
7. **logger.ts** - Logging system

### State Conversion Flow

```
ngeo URL → Parse → ngeo State → Convert with ID mappings → geogirafe State
                                                                    ↓
                                    Theme as layer object with ID
                                    Layers as children of theme
                                    Basemap as ID
                                                                    ↓
                                                          LZ-string compress
                                                                    ↓
                                                          geogirafe URL#hash
```

## Testing

Run the test suite:

```bash
npm start -- --test --batch
```

Expected output:
```
=== Conversion Statistics ===
Total: 4
Converted: 3
Skipped: 0
Failed: 1
```

## License

ISC
