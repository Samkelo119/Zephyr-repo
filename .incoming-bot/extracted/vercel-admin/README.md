# Admin Panel + Pairing Dashboard on Vercel

## ⚠️ Read this first — what actually runs where

The WhatsApp bot itself (the Baileys connection that logs in and sends
messages) **cannot run on Vercel**. Vercel functions are serverless —
they spin up per-request and shut down; they cannot hold a persistent
WhatsApp socket open 24/7. This isn't a limitation Awais Cyber Bot has —
**no WhatsApp bot of any kind can run on Vercel**, because of how
Vercel itself works.

So the real setup is:

1. **Your bot(s)** (`index.js`, the actual WhatsApp connection) run on
   real always-on hosts: Railway, Replit (with Always On / a Reserved
   VM), Heroku, Katabump, Termux on your own phone, or a VPS. You can
   have more than one deployed at once (e.g. one on Railway, another
   on Replit) — see "Multiple servers" below.
2. **This folder** is a tiny separate project you deploy to Vercel. It
   does nothing but transparently forward requests to whichever real
   backend you've selected — so you get a nice
   `https://your-name.vercel.app` URL for both the pairing dashboard
   and the Admin Panel, while the actual bot(s) keep running wherever
   you deployed them in step 1.

## What's included

- `https://your-project.vercel.app/` → if you have multiple servers
  configured, shows a picker to choose one; otherwise goes straight to...
- `https://your-project.vercel.app/pair` → your backend's pairing
  dashboard (`pair.html`), with the live QR/pairing-code socket
  connection pointed straight at your chosen backend (cross-origin —
  your backend's socket.io already allows this)
- `https://your-project.vercel.app/admin` → your backend's Admin Panel
- `https://your-project.vercel.app/switch` → clears your server
  selection and takes you back to the picker

## Setup — single server (simplest)

1. Deploy your bot (the parent folder) to Railway / Replit / Heroku /
   Katabump / a VPS. Note its public URL, e.g. `https://your-bot.up.railway.app`.
2. Push **this `vercel-admin` folder** to its own GitHub repo (or just the
   subfolder, if your Vercel project root is set to `vercel-admin`).
3. Import it into Vercel.
4. In Vercel → Project → Settings → Environment Variables, add:
   ```
   BACKEND_URL = https://your-bot.up.railway.app
   ```
   (no trailing slash, must be the exact URL your bot is reachable at)
5. Deploy. Open `https://your-project.vercel.app/` — it'll take you
   straight to the pairing dashboard (only one server, nothing to pick).

## Setup — multiple servers

If you've deployed the bot on more than one host (say, a main one on
Railway and a backup on Replit), you can front all of them from the
same Vercel deployment and pick which one to manage from the browser:

1. Deploy the bot on however many hosts you want.
2. In Vercel → Project → Settings → Environment Variables, add
   **`BACKEND_SERVERS`** instead of `BACKEND_URL` — a JSON array, one
   entry per server:
   ```json
   [
     { "name": "Railway Main", "url": "https://your-bot.up.railway.app" },
     { "name": "Replit Backup", "url": "https://your-bot.username.repl.co" }
   ]
   ```
3. Deploy. Open `https://your-project.vercel.app/` — you'll see a
   picker listing every server by name. Pick one; your choice is
   remembered (a cookie) until you visit `/switch`.
4. While connected, a small badge in the bottom-right corner of the
   pairing/admin pages shows which server you're currently on, with a
   one-click link to switch.

You can also jump straight to a specific server without using the
picker by adding `?server=<index>` to any URL, e.g.
`https://your-project.vercel.app/pair?server=1`.

## Notes

- Vercel's free tier limits function execution time (~10s) — fine for
  admin actions, but don't expect it to do anything long-running.
- If a selected backend is wrong, unreachable, or down, the proxy
  shows a clear "could not reach backend" error instead of a silent
  failure.
- `BACKEND_URL` and `BACKEND_SERVERS` can both be set; `BACKEND_SERVERS`
  takes priority if present.
