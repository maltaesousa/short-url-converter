# ngeo to geogirafe URL Converter

Convert ngeo-style shared URLs to geogirafe-style compressed hash URLs.

## Features

- ✅ Parse ngeo Permalink URLs (map position, theme, layers, dimensions, opacity)
- ✅ Convert drawing features from `rl_features` parameter to geogirafe GeoJSON format
- ✅ Generate compressed geogirafe URLs with hash-based state
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
- `DB_SCHEMA`: Database schema (e.g., `geoportal`)
- `DB_CONNECTION`: PostgreSQL connection string
- `INPUT_SOURCE`: `database` or `json`

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

## Examples

### Example 1: Basic URL Conversion

**Input:**
```
https://sitn.ne.ch/theme/cadastre?map_x=2550000&map_y=1205000&map_zoom=8&baselayer_ref=plan_ville
```

**Output:**
```
https://demo.geogirafe.dev/sitn#eJwVyEsKgCAURuG9_GMHJgjhViLiZhcSfKHSIHHv2Rl9nI6cqmsuRZgOy7FxgdmU1nImFiV_7AJvSgFmHQLt5sAwsHRRbYUhcFJlQHnO7Ckej_OeMT42Lx1X
```

### Example 2: URL with Layers

**Input:**
```
https://sitn.ne.ch/theme/environnement?map_x=2560000&map_y=1210000&map_zoom=10&tree_groups=Layers,Filters
```

**Output:**
```
https://demo.geogirafe.dev/sitn#eJwlizEKgDAQBP-y9RWJoEUeYOUPxELkwEC8k3gIKvm7EafZ2WIe7HpEiyoIDxYW44wwNm3nKuQb_-1EuFU3BO8KwVbeGAEsZ8wqUp8YCGm-OB-1xvAboY_JPpvKC9RwIcA
```

### Example 3: URL with Drawing Features

**Input:**
```
https://sitn.ne.ch/theme/cadastre?map_x=2550000&map_y=1205000&map_zoom=8&rl_features=Fp(!!zzzzB*zB~a*2)
```

**Output:**
```
https://demo.geogirafe.dev/sitn#eJxVUMFugzAM_RfvmlYBxtbmVnXaeXfEIYKwRoIYJUaoRfz7bLpOqw_Re8_y84sXGDF58hjALNC4QC6CqfKy1Fwqy7WAWsENcQBzWBXQxQ0TODD2tYmiAwVttLMP32LROUtTdIlNFmBT-PjtKUgN05eiOB7PZ6EzmFxB96z2PAnd1PeMreCAQVbYkfF8wV5I6G5gslcFwwbEhbun6K2MbTnoOkrIz3scUR0OjuL1X_MLfSBuNYix9cHSFrva6X2u5KlVtSve3rXO9gf9qFLph54VjGs-yRhxdJG8zC9g2TqHlfWWD9DZPjmGfD2KE6OwffhuxsuHZ5r-JgiMXut1_QGTZ3fh
```

## URL Parameter Mapping

| ngeo Parameter | geogirafe State | Description |
|----------------|-----------------|-------------|
| `map_x`, `map_y` | `position.center` | Map coordinates [x, y] |
| `map_zoom` | `position.zoom` | Zoom level |
| `/theme/{name}` | `theme` | Theme name |
| `baselayer_ref` | `basemap` | Base layer |
| `tree_groups` | `layers` | Layer list (array) |
| `tree_opacity_*` | `opacity` | Layer opacity (object) |
| `dim_*` | `dimensions` | Dimensions (object) |
| `rl_features` | `drawing.features` | Drawing features (converted to GeoJSON) |

## Output Files

### converted.csv
CSV file with successfully converted URLs:
```csv
ref,new_url
test1,https://demo.geogirafe.dev/sitn#eJwVyEsKgCAURuG9...
test2,https://demo.geogirafe.dev/sitn#eJwlizEKgDAQBP-y...
```

### unconvertible.log
Log file for failed conversions and unconvertible parameters:
```
[ERROR] [ref] Conversion failed: error details
[WARN] [ref] Unconvertible parameters: param1, param2
```

## Architecture

### Components

1. **ngeo-parser.ts** - Parses ngeo URLs and extracts state
2. **geogirafe-serializer.ts** - Converts state and serializes to geogirafe format
3. **feature-converter.ts** - Converts drawing features from ngeo to geogirafe
4. **input-handlers.ts** - Handles database and JSON input sources
5. **converter.ts** - Main conversion orchestrator
6. **cli.ts** - Command-line interface
7. **logger.ts** - Logging system

### State Conversion Flow

```
ngeo URL → Parse → ngeo State → Convert → geogirafe State → Compress → geogirafe URL
                       ↓                        ↓
                   rl_features          drawing.features
                       ↓                        ↓
                 CHAR64 decode           GeoJSON format
```

### Compression

geogirafe URLs use deflate compression and URL-safe base64 encoding:

1. Convert state to JSON
2. Compress with zlib deflate
3. Base64 encode with URL-safe characters (`-` instead of `+`, `_` instead of `/`)
4. Append to URL as hash fragment

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
Skipped: 1
Failed: 0
```

Test cases (`test.json`):
- **test1**: Basic URL with position and baselayer
- **test2**: URL with multiple layers
- **test3**: URL with drawing features (rl_features)
- **test4**: Invalid URL (skipped - different origin)

## Library Notes

This tool was designed to use `@geogirafe/lib-geoportal`, but the library has limitations for standalone Node.js CLI usage:

- Designed for browser/Vite environments
- Complex ESM dependencies (OpenLayers)
- Classes not exported for programmatic use

Instead, this implementation uses custom serializers based on the geogirafe state specification, ensuring full compatibility with geogirafe URLs.

## Tech Stack

- **Runtime**: Node.js 20
- **Language**: TypeScript (CommonJS)
- **Database**: PostgreSQL (pg driver)
- **CLI**: tsx for TypeScript execution
- **Compression**: zlib (built-in)

## License

ISC
