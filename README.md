# LinkedIn Wrapped - Prototype

## How to load
1. Open Chrome and go to `chrome://extensions`
2. Enable Developer mode
3. Click "Load unpacked" and select the `linkedin-wrapped` folder
4. Ensure you're logged into LinkedIn in this browser

## Basic flow
1. Click the extension icon → paste your LinkedIn profile URL → click "Generate my Wrap"
2. The extension will open LinkedIn analytics pages in tabs (or background) and run scrapers
3. When finished, it opens a new tab with your Wrapped report
4. Export cards as PNG using Export button
5. No Node.js, npm, or build tools required. The extension ships with precompiled CSS (popup.css) and runs entirely locally.

## Notes & troubleshooting
- The scraper relies on page DOM heuristics — if cards are empty, open DevTools on an analytics page and inspect selectors; update `content-scripts/analytics-scraper.js`.
- Privacy: data is processed locally. The extension does not upload data by default.

## Installation (Free – No Chrome Store)

1. Download this repository as ZIP
2. Unzip it
3. Open `chrome://extensions`
4. Enable **Developer Mode** (top-right)
5. Click **Load unpacked**
6. Select the `extension/` folder

No Node.js, npm, or build tools required.
