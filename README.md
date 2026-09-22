# ⚡ ZEPHYR MD BOT

A full-featured WhatsApp automation bot built on Baileys — 190+ commands,
group moderation, AI chat, a password-protected Admin Panel, and one-command
auto-install on any host.

**WhatsApp Channel:** https://whatsapp.com/channel/0029Vb8p6DV8aKvNTp6n8n45
**Powered By Awais MD**

---

## ✨ What's Inside

- **190+ working commands** across fun, tools, group management, downloaders,
  text utilities, math/finance calculators, and moderation
- **Advanced group moderation**: mute/unmute, bad-word filter, slow mode,
  keyword auto-responder, antilink, warnings, welcome/goodbye
- **AI chat** (`.ai` — DM only, needs an OpenAI-compatible key, settable
  from the Admin Panel with zero redeploy)
- **Admin Panel** (`/admin`) — password-protected control center: ban/unban
  users, toggle features live, manage menu images, replace API keys,
  broadcast announcements, download/restore full backups, view command
  usage stats
- **Auto-install** — `node bootstrap.js` checks for missing/outdated
  dependencies and runs `npm install` automatically before starting, so you
  never have to remember the step yourself
- **Deploys anywhere**: Railway, Replit, Heroku, Katabump, Termux (your own
  phone), any VPS, or a Vercel-hosted proxy for the dashboards — see
  [`DEPLOY.md`](./DEPLOY.md)

---

## 🚀 Quick Start (any host)

```bash
git clone <your-repo-url>
cd Awais_Mini_Bot2-main
node bootstrap.js
```

That's it — `bootstrap.js` installs dependencies automatically the first
time, then starts the bot. Open the URL your host gives you (or
`http://localhost:3000`) to scan the QR code or enter a pairing code.

Prefer the manual way? `npm install && node index.js` still works exactly
the same.

---

## 🔐 Admin Panel

Open `/admin` on your bot's URL (e.g. `https://your-bot.example.com/admin`).

**Default password:** `Awais Cyber 923295533214`
Change it any time by setting the `ADMIN_PANEL_PASSWORD` environment
variable on your host — no code edit needed.

| Tab | What it does |
|---|---|
| 📊 Overview | Live session count, uptime, known groups, banned users |
| 👥 Users & Bans | Ban/unban any number from using the bot instantly |
| ⚙️ Features | Toggle auto-react / AI replies / public-private mode per session |
| 🖼️ Menu Images | Add or remove the images/videos the `.menu` command rotates through |
| 🔑 API Keys | Replace `openaiApiKey`, `giphyApiKey`, `omdbApiKey`, or add your own — changes apply live, no restart |
| 📢 Broadcast | Send an announcement to every group the bot knows about |
| 💾 Backup | Download your full bot data as JSON, or restore from a previous backup |
| 📈 Stats | See your most-used commands |
| 🧩 Custom Commands | Add brand-new commands from the panel itself — paste a name + JS code, no restart needed. Runs with the same access level as any hand-written command file (`sock`, `botData`, `require`, etc.) — only paste code you trust. |
| 📜 Live Logs | Recent server activity, streamed from the bot process |
| 👨‍👩‍👧‍👦 Groups | See every group the bot is in, with member counts, and leave any of them |
| 🔐 Security | Change the Admin Panel password (persists across restarts) and restart the bot process |

Security: rate-limited login (5 wrong attempts = 15 min lockout),
timing-safe password check, signed session cookies, no-cache headers on
every admin route.

---

## 📋 Command Categories

Run `.menu` inside WhatsApp to see the full, always-up-to-date list. Rough
breakdown of what's in there:

1. **General & Owner** — ping, alive, menu, owner, source
2. **Downloaders** — YouTube, Facebook, Instagram, TikTok, Spotify, etc.
3. **Group Management** — kick, add, promote, demote, group info
4. **Group Admin Lab** (25 cmds) — grouplink, lockgroup, tagadmins, warn, broadcast, exportmembers...
5. **Fun & Games** — quote, joke, fact, 8ball, flip, dice, rps, ship
6. **Text Tools** — reverse, binary, base64, calc, count
7. **Stickers & Media** — sticker, toimg, converters
8. **Web Utilities** — qr, shorturl, translate, weather, define
9. **Anti-features** — antilink, antidelete, antistatus, anticall
10. **Status Tools** — auto view/save status
11. **Advanced Tools** (26 cmds) — bmi, encrypt/decrypt, hash, password gen, dns...
12. **Text Encode/Decode** — rot13, urlencode, slugify, camelCase/snake_case/kebab-case
13. **Text Stats** — word/char count, full stats, vowels, consonants
14. **Numbers & Math** — roman numerals, percentage, discount, tip, bill split, loan interest, leap year, days-left, zodiac
15. **Text Effects** — spongebob case, zalgo, fullwidth, smallcaps, strikethrough, mirror, shuffle
16. **Personal Utility** — `.todo`, `.note`, `.remind`, `.gencode`
17. **Advanced Moderation** — `.mute` / `.unmute` / `.mutelist`, `.filter`, `.slowmode`, `.autoresponder`

---

## 🧩 Notable Commands, Explained

### `.filter add/remove/clear <word>`
Group admins can ban specific words — any message containing one is
auto-deleted. Great for keeping a group clean without watching it 24/7.

### `.slowmode <seconds>`
Limits how often each member can send a message (e.g. `.slowmode 10` =
one message per 10 seconds per person). `.slowmode 0` disables it.

### `.mute` / `.unmute` (reply or tag a user)
Silently deletes a specific person's messages until unmuted — useful for
calming someone down without removing them from the group.

### `.autoresponder add <keyword> | <reply>`
Set up automatic replies for common questions, e.g.
`.autoresponder add price | Check the pinned message for our price list.`
Anyone who types a message containing "price" gets the reply automatically.

### `.todo`, `.note`, `.remind`
Personal productivity commands — per-user to-do lists, saved notes, and
timed reminders, right inside WhatsApp.

---

## 📖 Full Command Reference (180 commands)

Auto-generated straight from the code, so this list is always accurate —
every one of these is wired up and working. Run `.menu` in WhatsApp for
the categorized, live version with usage notes.

| Command | Command | Command | Command |
|---|---|---|---|
| .8ball | .dp | .love | .simdb |
| .accept | .duplicate | .lyrics | .slowmode |
| .activelist | .emoji | .membercount | .slugify |
| .addmember | .emojimix | .members | .small |
| .adminlist | .encrypt | .meme | .smallcaps |
| .admins | .exportmembers | .menu | .snakecase |
| .age | .facebook | .mf | .song |
| .ai | .fact | .mirror | .splitbill |
| .anagram | .fb | .morse | .spongebob |
| .anticall | .filter | .movie | .status |
| .antidelete | .flip | .mute | .sticker |
| .antilink | .fromroman | .mutelist | .strikethrough |
| .antistatus | .fullwidth | .note | .stylish |
| .apk | .gdrive | .owner | .tagadmins |
| .ascii | .gencode | .pair | .tagall |
| .autoreacts | .goodbye | .palindrome | .telenor |
| .autoread | .groupcount | .password | .textstats |
| .autorecording | .groupcreate | .percentage | .tiktok |
| .autoresponder | .groupdesc | .ping | .time |
| .autostatus | .groupinfo | .poll | .tip |
| .autotyping | .grouplink | .private | .titlecase |
| .ban | .groupname | .promote | .todo |
| .banwhatsapp | .hack | .public | .toimg |
| .base64 | .hash | .qr | .translate |
| .binary | .hidetag | .quote | .ud |
| .block | .hotgirl | .randomname | .unlockedit |
| .bmi | .htmlescape | .randomnum | .unlockgroup |
| .broadcast | .htmlunescape | .remind | .unmorse |
| .calc | .ig | .repeat | .unmute |
| .camelcase | .insta | .resetwarn | .unshorten |
| .caps | .inviteinfo | .reverse | .uptime |
| .charcount | .islamic | .revokelink | .urldecode |
| .chatid | .jid | .roman | .urlencode |
| .clap | .joingroup | .rot13 | .video |
| .clock | .joke | .rps | .vowelcount |
| .consonants | .kebabcase | .rules | .vowels |
| .count | .keepalive | .runtime | .vv |
| .currency | .kick | .s | .warn |
| .daysleft | .leapyear | .setgdesc | .warnings |
| .decrypt | .leavegroup | .setgname | .weather |
| .define | .leet | .setgpic | .welcome |
| .demote | .listmembers | .setname | .whois |
| .dice | .loaninterest | .ship | .wordcount |
| .discount | .lockedit | .shorturl | .zalgo |
| .dns | .lockgroup | .shuffle | .zodiac |

---

## 🩹 Fixes & Improvements Log

A running record of what's been fixed/added, so it's clear what changed
and why:

- **Fixed: random "unlimited" duplicate messages.** Root cause was
  WhatsApp re-sending recent chat history after every reconnect, which
  the bot was treating as brand-new live commands and re-executing —
  every reconnect meant old replies fired again, in whatever chat they
  originally happened in. Fixed with a message-age guard: anything
  older than 60 seconds by the time it's received is now ignored as a
  replay, not processed as live.
- **Fixed: bot data not merging with new fields.** Upgrading used to
  fully replace saved data with whatever was in the old save file, so
  brand-new fields (mute lists, filters, etc.) could be silently
  missing until first used. Now merges over sane defaults on every load.
- **Fixed: one bad native dependency could crash the whole bot.**
  `sharp` (used for stickers) is now loaded safely — if it fails on a
  given host, only `.sticker`/`.toimg` show an error; the other 178
  commands are unaffected instead of the entire bot failing to start.
- **Fixed: ffmpeg not working on Termux.** Auto-detects Termux (Android's
  Bionic libc breaks the prebuilt ffmpeg binary) and switches to the
  system `ffmpeg` automatically.
- **Added:** auto npm install on start (`bootstrap.js`), Admin Panel with
  ban/unban, live feature toggles, broadcast, backup/restore, command
  stats, and full API key management, 37+ new utility commands, advanced
  moderation (mute/filter/slowmode/autoresponder), and a heavy/premium
  boxed design applied automatically to every command's reply.

---



Full step-by-step instructions for every host are in [`DEPLOY.md`](./DEPLOY.md):
Railway, Replit, Heroku, Katabump, Termux, a generic VPS checklist, and the
Vercel proxy setup for both the Admin Panel and the pairing dashboard.

**Quick note on Vercel:** the bot's live WhatsApp connection cannot run on
Vercel itself (no platform's serverless functions can hold a persistent
socket open — this is true everywhere, not a limitation specific to this
project). What *can* run on Vercel is a lightweight proxy (`vercel-admin/`
folder, included) that gives your Admin Panel and pairing dashboard a nice
Vercel URL while the real bot keeps running on Railway/Replit/Termux/etc.

---

## ⚙️ Environment Variables

| Variable | Purpose | Default |
|---|---|---|
| `OWNER_NUMBER` | Your WhatsApp number, no `+` | `923295533214` |
| `PORT` | Web server port | `3000` |
| `ADMIN_PANEL_PASSWORD` | Overrides the Admin Panel password | `Awais Cyber 923295533214` |
| `OPENAI_API_KEY` | For `.ai` command | none — set via Admin Panel instead |
| `GIPHY_API_KEY` | Reserved for future GIF commands | built-in demo key |
| `OMDB_API_KEY` | For `.movie` command | built-in demo key |

API keys can also be set/replaced entirely from the Admin Panel's 🔑 API
Keys tab — no redeploy required either way.

---

## 🗂️ Project Structure

```
├── index.js               # Main bot logic, message handling, command router
├── bootstrap.js            # Auto-installer launcher (use this to start)
├── settings.js             # Static config (bot name, version, prefix)
├── pair.html                # Pairing dashboard (QR / pairing code UI)
├── admin-panel/             # Admin Panel frontend (login + dashboard)
├── lib/
│   ├── adminAuth.js         # Password check, sessions, rate limiting
│   ├── adminPanel.js        # Admin Panel Express routes
│   ├── apiKeys.js           # Hot-swappable API key store
│   └── cookie.js             # Minimal cookie helper (no extra dependency)
├── commands/                # All command implementations, grouped by theme
├── data/                    # Runtime data (botData.json, api_keys.json) — gitignored
├── auth_info/                # WhatsApp session credentials — gitignored, never share this
├── vercel-admin/             # Optional: Vercel-hosted proxy for the dashboards
└── DEPLOY.md                 # Full deployment instructions for every host
```

---

## ❤️ Credits

Built and maintained by **Awais MD**. Join the WhatsApp channel for updates:
https://whatsapp.com/channel/0029VbBzlMlIt5rzSeMBE922
