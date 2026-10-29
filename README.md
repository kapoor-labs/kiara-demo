# KiaraDB

A vanilla HTML, CSS, and JavaScript starter for Azure Static Web Apps.
Vite provides the development server and production build; no UI framework is used.
This starter does not include a database or API.

## Requirements

- Node.js 22.12+ on the 22.x release line, or Node.js 24+
- npm

## Local development

```powershell
npm ci
npm run dev
```

Open the local URL printed by Vite (normally http://127.0.0.1:5173).
Press Ctrl+C to stop the server.

Edit [index.html](index.html), [src/main.js](src/main.js), and
[src/style.css](src/style.css) to customize the app.

## Production build

```powershell
npm run build
npm run preview
```

Vite writes deployable files to `dist`. Preview normally runs at
http://127.0.0.1:4173. The preview server does not emulate Azure routing or headers.

Azure configuration lives in
[public/staticwebapp.config.json](public/staticwebapp.config.json).
Vite copies it into the root of `dist` during builds. Unknown routes return 404;
there is no client-side router or SPA fallback in this starter.

## Deploy to Azure

No Azure resources, GitHub repository, or secrets are created by this starter.

1. Initialize a Git repository here, commit the project including `package-lock.json`,
   and push it to the `main` branch of a GitHub repository.
2. Create an **Azure Static Web App** in the Azure portal. Choose **Other** as the
   deployment source so Azure does not generate a second GitHub workflow.
3. Copy the resource's deployment token from **Manage deployment token**.
4. In the GitHub repository, add an Actions secret named
   `AZURE_STATIC_WEB_APPS_API_TOKEN` with that token. Never commit it.
5. Run **Deploy Azure Static Web App** from the GitHub Actions tab, or push a new
   commit to `main`.

The included [workflow](.github/workflows/azure-static-web-apps.yml) installs and
builds with Node.js 22, then uploads `dist` as prebuilt content. Its deployment
settings are `app_location: dist`, `output_location: ""`, and
`skip_app_build: true`; there is no API. Pull-request preview deployments are not
configured.

If configuring Azure's own build integration instead of this workflow, use
app location `/`, output location `dist`, no API location, and build command
`npm run build`. Do not enable both workflows.

Only expose public configuration through Vite's `VITE_` variables: they are
embedded in the browser bundle and cannot contain secrets.
