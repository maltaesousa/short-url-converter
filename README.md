# ngeo to geogirafe URL Converter

Convert ngeo-style shared URLs to geogirafe-style compressed hash URLs.

## Features

- ✅ Location (map_zoom, map_x and map_y)
- ✅ Single projection
- ✅ Base layer
- Layertree:
    - ✅ Themes
    - ✅ Groups and layers
    - ✅ Checked layers
    - ✅ Opacity
    - ❌ Group opacity
    - ❌ Filters
- Drawing:
    - ✅ Simple geometries
    - ✅ Styles
    - ✅ Texts
    - ✅ Circles
    - ⚠️ Rectangles -> Polygons
- ❌ selected features
- ❌ no_redirect -> not supported by GG yet

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

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

*Where `ref` is the short code in your database*

Convert all URLs (batch mode):
```bash
npm start -- --batch
```

Export themes in a CSV (for debugging purpose):
```bash
npm start -- --export-themes
```

Will create a `themes.csv` with layer hierarchy.

## Output Files

### converted.csv
CSV file with successfully converted URLs:

```csv
ref,new_url
test1,https://demo.geogirafe.dev/sitn#IwBgPg3gRAxgpgOwC5wE5QFwG0BMBWPEIkAGmBxEKIF0SpU4BnAewBsBXJAS2YU2AB0eAL5gs0LgBN+dZqkloZsABZwYAazjSMwOl0YBRAB4AHAIYIF23Sq6tJDPtlpQ4RmBysBhZXYeIASUlGTCxqYWogA=
```

### report.csv

Log file for unconvertible parts:

```csv
ref,status,issue
"0038r","PARTIALLY OR NOT CONVERTED","Layers not found in DB: gp_mo_cadastre"
```
