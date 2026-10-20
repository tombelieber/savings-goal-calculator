# Run and deploy your own copy

The maintained instance is **https://savings-goal-calculator-9eo.pages.dev/**.

## Local development

Use Node.js 22+ and Python 3.10+. There is no database or backend to configure.

```sh
npm ci
npm run build
npm test
python3 -m http.server 8080 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:8080. Only `dist/` should be served. Do not serve the repository
root, local QA directory or browser storage exports.

## Cloudflare Pages

1. Create a Pages project in your own Cloudflare account.
2. Set `name` in `wrangler.toml` to your project name. Set `publicUrl` in
   `public-config.json` to your HTTPS origin; downloaded HTML uses it for sharing.
3. Build and verify, then deploy using Cloudflare's authenticated Wrangler CLI:

   ```sh
   npm run build
   npm test
   wrangler pages deploy dist --project-name YOUR_PROJECT_NAME --branch main
   ```

4. Open the deployed origin and verify onboarding, saving, sharing and an offline
   reload with invented inputs. Confirm files in `dist/` match the deployed assets.

Only seven static app files are deployed. Credentials belong in your local
Cloudflare authentication or an approved secret store, never in this repository.
There is no automatic production deployment in the GitHub checks workflow.

## Offline download and updates

`dist/offline.zip` contains a self-contained `savings-goal-calculator.html`. Extract and open
it locally. Persistence for `file:` URLs varies by browser and file location.

The service worker uses a version derived from the application contents. An
already-open page can continue using its cached version until it reloads; the app
does not force a reload while someone is editing. First loading/downloading needs
a connection.

Local settings belong to a browser origin. A new host cannot read another host's
localStorage. Users can explicitly transfer a plan with its share link. Treat
that link as containing personal data; never paste a real one into an issue.
