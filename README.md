# Study dashboard

A tiny Astro site for a Raspberry Pi study display and a phone control page.

- `/` — fullscreen topic list for the Pi (no controls)
- `/admin` — phone page to change confidence, add/edit/delete/reorder topics

Topic state is stored in Cloudflare D1 so both devices stay in sync.

## 1. Install

```bash
npm install
```

## 2. Run locally

```bash
npm run dev
```

Open [http://localhost:4321](http://localhost:4321) for the display and [http://localhost:4321/admin](http://localhost:4321/admin) for admin.

Local D1 storage is created automatically in `.wrangler/` and kept across restarts. No Cloudflare account is required for development.

## 3. Storage setup

Create one D1 database (production only):

```bash
npx wrangler login
npx wrangler d1 create study-dashboard
```

Copy the printed database ID into `wrangler.jsonc`:

```jsonc
"database_id": "paste-your-id-here"
```

The app creates its table and seed topics on first request. No migrations to run.

## 4. Environment variables

None. The only required production value is `database_id` in `wrangler.jsonc`.

## 5. Deploy to Cloudflare

```bash
npm run deploy
```

That builds the site and deploys it as a Cloudflare Worker.

You can also import this repo in the Cloudflare dashboard (Workers), using build command `npm run build`. Keep the D1 binding name as `DB`.

## 6. Raspberry Pi display URL

Use the Worker URL root:

`https://<your-worker>.workers.dev/`

Point Chromium kiosk mode at that URL, for example:

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars https://<your-worker>.workers.dev/
```

## 7. Phone admin URL

`https://<your-worker>.workers.dev/admin`

There is no login. Treat the URL as private.

## 8. Default topics

Edit `src/lib/defaults.ts`. Those topics are used only when the database is empty (first launch). Changing that file later does not overwrite topics you have already saved.
