# ngeo to geogirafe URL Converter

A Node.js CLI script that converts ngeo-style shared URLs into geogirafe-style shared URLs.

## Features

- **Dual Input Sources**: PostgreSQL database or local JSON file (for testing)
- **Multiple Execution Modes**: 
  - Debug mode: Single URL conversion with verbose logging
  - Batch mode: Convert all URLs with summary statistics
  - Test mode: Use local JSON file for validation
- **Comprehensive Logging**: 
  - `converted.csv`: Successfully converted URLs
  - `unconvertible.log`: Failed conversions and unconvertible parts
- **URL State Conversion**: Parses ngeo URLs and converts to geogirafe format

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

### Debug Mode (Single URL)
```bash
npm start <ref>
```
Converts a single URL with detailed logging showing parsed state and conversions.

### Batch Mode (All URLs)
```bash
npm start -- --batch
```
Converts all URLs from the database and shows statistics.

### Test Mode (Using test.json)
```bash
npm start -- --test <ref>              # Single URL from test.json
npm start -- --test --batch            # All URLs from test.json
```

## URL Conversion

The tool converts ngeo URL parameters to geogirafe format:

### Supported Parameters

| ngeo Parameter | geogirafe | Description |
|---------------|-----------|-------------|
| `map_x`, `map_y` | `x`, `y` | Map coordinates |
| `map_zoom` | `z` | Zoom level |
| `/theme/{name}` | `t` | Theme name |
| `baselayer_ref` | `bl` | Base layer |
| `tree_groups` | `l` | Layer list |
| `tree_opacity_*` | `o` | Layer opacity |
| `dim_*` | `d` | Dimensions |

### Unconvertible Parts

- Drawing features (`rl_features`) are logged as unconvertible
- WFS layers and some advanced features may not convert

## Output Files

- **converted.csv**: CSV with columns `ref,new_url`
- **unconvertible.log**: Detailed log of conversion failures and unconvertible parts

## Example

```bash
# Debug single URL
npm start test1

# Batch conversion from database
npm start -- --batch

# Test with validation
npm start -- --test test1
```
