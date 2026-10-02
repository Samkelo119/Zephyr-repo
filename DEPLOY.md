# Deployment Guide — ZEPHYR MD Bot

Works on any host that can run a persistent Node.js 20+ process. Quick
notes for each platform you asked about:

## Railway
1. Push this repo to GitHub, then "New Project → Deploy from GitHub" on Railway.
2. Railway auto-detects Node via `railway.json` (already included) and runs `node index.js`.
3. Add environment variables in Railway → Variables: `OWNER_NUMBER`, `ADMIN_PANEL_PASSWORD`, etc.
4. Railway gives persistent disk by default in most plans — good for keeping your WhatsApp session (`auth_info/`) alive across restarts. Admin panel: `https://<your-app>.up.railway.app/admin`

## Render
1. Push this repo to GitHub, then in Render choose **New + → Blueprint** and select the repo.
   Render reads `render.yaml` (already included) and provisions the web service automatically.
2. During setup Render prompts for `OWNER_NUMBER` (your WhatsApp number, country code, no `+`).
   `ADMIN_PANEL_PASSWORD` and `OPENAI_API_KEY` are optional; leave blank for defaults.
3. Click **Apply** — Render runs `npm install` at build time and `node bootstrap.js` at runtime,
   and the bot comes up on the public `https://<service>.onrender.com` URL. Pairing site: `/`, Admin panel: `/admin`.
4. **Persistence:** `render.yaml` mounts a 1GB disk at `/var/data` and sets `DATA_PERSIST_DIR=/var/data`.
   `bootstrap.js` symlinks `auth_info/` and `data/` onto that disk, so your paired sessions and bot data
   survive redeploys and restarts — you only pair once.
   - This requires a **paid instance** (`plan: 0.5c-512mb`, Render's smallest paid web service); Render does not offer disks on the free plan.
   - On the free plan, set `plan: free` and delete the `disk:` block and the `DATA_PERSIST_DIR` env var. The bot still runs, but the
     filesystem is ephemeral and the service spins down after ~15 min idle, so you must re-pair after restarts
     and it will not stay online 24/7. For a real 24/7 bot use a paid Render instance, Railway, or a VPS.

## Replit
1. Import the GitHub repo into Replit (or upload the zip).
2. `.replit` is already included — it auto-runs `node index.js`.
3. Click "Run" once to install deps + pair your number.
4. **Free Replit "Always On" was discontinued** — for 24/7 uptime you now need a **Reserved VM Deployment** (paid) from the Deploy tab, otherwise the bot sleeps when the tab closes. This is a Replit platform rule, not something in the code.
5. Admin panel: `https://<your-repl-name>.<username>.repl.co/admin`

## Heroku
1. `app.json` + `Procfile` are included — use "Deploy to Heroku" or `heroku create && git push heroku main`.
2. Set config vars: `heroku config:set OWNER_NUMBER=923xxxxxxxxx ADMIN_PANEL_PASSWORD="your pass"`
3. **⚠️ Heroku's filesystem is ephemeral** — every dyno restart/redeploy wipes `auth_info/` and `data/`, meaning you'd have to re-pair your WhatsApp number each time. For a bot you pair once and forget, Railway, a VPS, or Termux is a much better fit than Heroku. If you must use Heroku, look into Heroku's add-on persistent storage or moving `auth_info`/`data` to an external store (S3, a database) — that's a bigger change outside this session's scope.

## Katabump
Katabump (like most Pterodactyl-panel Node hosts) just needs:
- Startup command: `node index.js`
- Node.js 20+ egg/version selected in the panel
- `npm install` run once (the panel usually does this automatically on first boot)
No special config file is needed beyond what's already in `package.json`. Upload the whole project folder (or connect your GitHub repo if the panel supports it), set your environment variables in the panel's "Startup" / "Variables" tab, and start the server.

## Termux (run it on your own Android phone)
```bash
pkg install git -y
git clone <your-repo-url>
cd Awais_Mini_Bot2-main
bash termux-setup.sh
node bootstrap.js
```
`termux-setup.sh` (included) installs Node, ffmpeg, and your dependencies in one go, and tells you how to keep it running in the background with `tmux` + `termux-wake-lock`. This is genuinely the most persistent option for most users since your own phone stays on.

**Two things the code already handles for you on Termux:**
- **ffmpeg**: Termux uses Android's own C library (Bionic), not standard Linux glibc/musl — the bot's prebuilt `ffmpeg-static` binary doesn't run there. The bot auto-detects Termux and switches to the system `ffmpeg` (installed by the setup script) instead — no action needed from you.
- **sharp (stickers)**: for the same Bionic-vs-glibc reason, `sharp` (used by `.sticker`/`.toimg`) can sometimes fail to install on Termux even with `libvips` from the setup script. If that happens, the bot won't crash — only `.sticker`/`.toimg` will show a clear error, every other command keeps working normally. If you specifically need stickers to work and hit this, running the bot on Railway/a VPS instead (where sharp's prebuilt binaries work out of the box) is the reliable fix.


## Any other host (general checklist)
The bot already follows the rules that make it portable:
- Listens on `process.env.PORT` (falls back to 3000) — works with any host that assigns a random port.
- All file writes (`auth_info/`, `data/`) use relative paths created with `fs.ensureDirSync`, so they work on any writable filesystem.
- No native build steps beyond what's in `package.json` (`sharp`, `ffmpeg-static` etc. all have prebuilt binaries for common platforms).
- If a host gives you a persistent volume/disk, mount it at the project root so `auth_info/` and `data/` survive restarts — otherwise you'll need to re-pair after every restart.

## Troubleshooting: "npm ci" / "package.json and package-lock.json are in sync" build failure
Some hosts (Railway's Nixpacks builder especially) run `npm ci` automatically
whenever a `package-lock.json` is present, and `npm ci` fails hard if that
lock file doesn't exactly match `package.json`'s dependencies. This repo
intentionally does **not** ship a `package-lock.json` (it's gitignored) —
without one, these builders fall back to a plain `npm install`, which
resolves fresh every time and can't go stale. If you ever generate your own
`package-lock.json` locally and commit it, make sure to regenerate it
(`npm install` again) any time you add/remove a dependency, or you'll hit
this same error.

## Vercel — read this before trying
Vercel **cannot run the bot itself** (see `vercel-admin/README.md` for exactly why — it's a Vercel platform limitation, true for every WhatsApp bot, not specific to this project). What Vercel *can* host is a proxy front-end for your **Admin Panel**, pointed at wherever you deployed the real bot (Railway/Replit/Heroku/Katabump/Termux). See `vercel-admin/README.md` for the 5-minute setup.

## Environment variables (all hosts)
| Variable | Purpose | Default |
|---|---|---|
| `OWNER_NUMBER` | Your WhatsApp number, no `+` | `923295533214` |
| `PORT` | Web server port | `3000` |
| `ADMIN_PANEL_PASSWORD` | Overrides the admin panel password | `Awais Cyber 923295533214` |
| `OPENAI_API_KEY` | For `.ai` command | none (or set via Admin Panel → API Keys) |
| `GIPHY_API_KEY` | Reserved for future giphy-based commands | free demo key |
| `OMDB_API_KEY` | For `.movie` command | free demo key (also settable via Admin Panel) |
