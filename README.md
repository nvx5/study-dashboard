Personal project to power a Raspberry Pi always-on study dashboard. Vibe-coded using Cursor.

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

Point the Pi browser at the Worker URL root:

`https://<your-worker>.workers.dev/`

After a deploy, power-cycle the Pi so it loads the new page JS. Data updates (tags, ratings) do not require a reboot once this script is running; they arrive by polling.

The tiny [buildroot-webkit](https://github.com/TOLDOTECHNIK/buildroot-webkit) kiosk OS uses an old WPE WebKit (not Chromium). The display script is written for that. If you later use a bigger SD card, Raspberry Pi OS + Chromium kiosk also works:

```bash
chromium-browser --kiosk --noerrdialogs --disable-infobars https://<your-worker>.workers.dev/
```

## 7. Phone admin URL

`https://<your-worker>.workers.dev/admin`

There is no login. Treat the URL as private.

## 8. Default topics

Edit topics in admin as a normal text file: `# Heading` then one topic per line. **Save** builds the cards. New headings/topics default to Need (red); existing tags stay as they are.
