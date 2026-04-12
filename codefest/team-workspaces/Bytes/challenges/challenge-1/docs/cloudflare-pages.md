# Cloudflare Pages Deployment

This app is ready to deploy to Cloudflare Pages as a static React/Vite site.

## Recommended path

Use Git integration if you want automatic rebuilds on every push.

Use Direct Upload if you want to publish the local `dist` folder manually from
this machine.

## Git integration settings

In Cloudflare Pages, use these values:

- Production branch: `main`
- Build command: `npm run build`
- Build output directory: `dist`

## Local direct upload

From `interactive-ui`:

```bash
npm run pages:create
npm run build
npm run pages:deploy
```

`pages:create` creates the Pages project and caches the chosen project name for
future Wrangler deploys. `pages:deploy` uploads the built `dist` directory.

## Notes

- This app is a single-page application, which Cloudflare Pages supports by
  default.
- No API key is embedded in the frontend.
- If you later connect the real Inhibitor API, keep the key in a backend proxy
  or Pages Function rather than in browser code.
