# ngeo to geogirafe URL Converter

Convert ngeo-style shared URLs to geogirafe-style compressed hash URLs.

## Features

- ✅ Location (map_zoom, map_x and map_y)
- ✅ Single projection
- ✅ Base layer
- ✅ Themes, groups and checked layers

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
