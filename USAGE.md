# Quick Start Guide

## Setup

1. **Configure your environment:**
   ```bash
   cp .env.example .env
   ```

2. **Edit `.env` with your settings:**
   ```env
   ORIGIN_URL=https://sitn.ne.ch
   DESTINATION_URL=https://demo.geogirafe.dev/sitn
   DB_SCHEMA=geoportal
   DB_CONNECTION=postgresql://user:password@host:port/database
   INPUT_SOURCE=database
   ```

## Usage Examples

### Debug Mode (Single URL)
Convert a single URL with detailed logging:
```bash
npm start <ref>
```

Example:
```bash
npm start abc123
```

Output shows:
- Original URL
- Parsed ngeo state
- Converted geogirafe state
- Final URL

### Batch Mode (All URLs)
Convert all URLs from the database:
```bash
npm start -- --batch
```

Shows conversion statistics:
- Total URLs processed
- Successfully converted
- Skipped (origin mismatch)
- Failed (errors)

### Test Mode (Using test.json)
Test with local JSON file:
```bash
npm start -- --test <ref>
```

Example:
```bash
npm start -- --test test1
```

### Test Batch Mode
Convert all URLs from test.json:
```bash
npm start -- --test --batch
```

Validates against expected values and shows matches.

## Output Files

- **converted.csv**: Successful conversions (ref, new_url)
- **unconvertible.log**: Errors and unconvertible URL parts

## Tips

- Use debug mode to troubleshoot individual URLs
- Use batch mode for production conversions
- Use test mode to validate conversion logic
- Check output files for conversion results
- Features (drawings) are logged as unconvertible
