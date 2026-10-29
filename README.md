# kiara-demo

Live demo for [kiara-ts](https://www.npmjs.com/package/@kapoorlabs/kiara-ts). 10k generated products, filter by any mix of fields, typo correction and type-ahead. Everything runs in the browser.

Libraries:
- TypeScript: https://github.com/kapoorlabs/kiara-ts
- Java: https://github.com/kapoorlabs/kiara
- Paper: https://jac.ut.ac.ir/article_76227.html

## Dev

Node 22.12+ or 24+

```
npm ci
npm run dev
```

## Build

```
npm run build
npm run preview
```

Output goes to `dist`. Paths are relative so it works under /kiara-demo/ or on a custom domain.

## Files

- `index.html` - markup
- `src/main.js` - playground, charts, quiz, effects
- `src/catalog.js` - fake product data (seeded, same every load)
- `src/style.css` - styles

## Deploy

GitHub Pages works without a build, `index.html` has an import map that loads kiara-ts from jsdelivr. Settings > Pages > main / root.

Azure: `.github/workflows/azure-static-web-apps.yml` builds and uploads `dist` on push to main. Needs the `AZURE_STATIC_WEB_APPS_API_TOKEN` secret (Azure portal > Manage deployment token).

Videos from Mixkit, photos from Unsplash.
