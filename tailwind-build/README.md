Tailwind build helper

Usage (PowerShell):

1. From the `tailwind-build` folder install dev dependencies:

```
cd tailwind-build
npm install
```

2. Build the CSS once (outputs to project `popup.css`):

```
npm run build:css
```

3. For development with auto-rebuild on file changes:

```
npm run watch:css
```

Notes:
- The build reads `tailwind-build/tailwind.css` (contains Tailwind directives) and outputs to `../popup.css` so `popup.html` can continue using `popup.css`.
- Remove the CDN script `<script src="https://cdn.tailwindcss.com"></script>` from `popup.html` after you confirm the built CSS is working.
- Adjust `tailwind-build/tailwind.config.js` `content` paths if you add more files that should be scanned for classes.
