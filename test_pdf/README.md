# HTML extractor

This small tool extracts important travel booklet information from a DOM snapshot HTML file (for example `dom.html`) and writes a JSON file suitable to feed a PDF generator.

Files created:
- `scripts/extract.js` — Node script using cheerio to parse the HTML and extract fields
- `package.json` — defines an `extract` script and dependencies

Usage (PowerShell on Windows):

1. Install dependencies:

   npm install

2. Run the extractor (default reads `dom.html` and writes `extracted.json`):

   npm run extract

Or call directly with custom paths:

   node scripts/extract.js dom.html extracted.json

Output JSON shape (top-level keys):

- `title` — document title
- `startDate`, `endDate` — from `data-pdf-start-date` / `data-pdf-end-date`
- `destination` — from `data-pdf-destination`
- `covers` — array of cover image URLs
- `summary` — small summary text block
- `steps` — array of itinerary steps. Each step contains `sections`, each section has `segments` with fields like `role`, `title`, `description`, `provider`, `address`, `phone`, `images`, `bullets`.

Next steps (recommended):

- Run the extractor and inspect `extracted.json`.
- Map the JSON to a `react-pdf` template and render.
