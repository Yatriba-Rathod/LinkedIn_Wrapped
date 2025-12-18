# LinkedIn Wrapped - Prototype

## Installation
1. Download this repository as ZIP
2. Unzip it

## How To Load
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode** (top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Ensure you're logged into LinkedIn in this browser

## Basic Flow
1. Click the extension icon → paste your LinkedIn profile URL → click "Generate My Wrap"
2. The extension will open LinkedIn analytics pages in tabs (or background) and run scrapers
3. When finished, it opens a new tab with your Wrapped report
4. No Node.js, npm, or build tools required. The extension runs entirely locally.

## Notes & Troubleshooting
- The scraper relies on page DOM heuristics — if cards are empty, open DevTools on an analytics page and inspect selectors; update `extension/analytics-scraper.js`.
- Privacy: data is processed locally. The extension does not upload data by default. Read `PRIVACY.md` for more details.
- No Node.js, npm, or build tools required.

## Future Additions
- Transition the bot from a script prototype to a fully production-ready browser extension
- Implement a functional “Export as PNG” feature
- Expand data scraping capabilities and introduce additional analytics
- Improve overall UI/UX for a more intuitive and polished user experience
