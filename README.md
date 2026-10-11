# ZEPHYR MD

> A fast, command-driven WhatsApp bot built with Baileys, with a lightweight pairing console and admin panel.

[![Node.js](https://img.shields.io/badge/Node.js-20%2B-111827?style=for-the-badge&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![WhatsApp](https://img.shields.io/badge/WhatsApp-Baileys-25D366?style=for-the-badge&logo=whatsapp&logoColor=white)](https://github.com/WhiskeySockets/Baileys)
[![Deploy on Render](https://img.shields.io/badge/Deploy-Render-46E3B7?style=for-the-badge&logo=render&logoColor=111827)](https://render.com/)

## Overview

ZEPHYR MD is a persistent WhatsApp automation bot for personal and community workflows. It includes a browser-based pairing flow, command handling, media utilities, API-backed commands, and an admin dashboard for managing runtime settings.

The bot must run as a persistent Node.js service. It is not suitable for Vercel serverless functions because the WhatsApp socket and authentication session need to remain alive between requests.

## Features

- Fast WhatsApp pairing-code flow
- Persistent Baileys connection and reconnect handling
- Command-based bot architecture
- Admin panel for runtime management
- API key management through the admin interface
- Media, utility, moderation, and entertainment commands
- Portable deployment on Render, Railway, Replit, VPS, or Termux
- Uses a persistent `auth_info/` directory so pairing survives restarts

## Requirements

- Node.js 20 or newer
- A WhatsApp account available for pairing
- A persistent filesystem for `auth_info/` and bot data
- Environment variables configured before production launch

## Local development

```bash
npm install
npm run dev
```

Then open the URL printed by the server. The pairing page is available at `/pair` and the admin panel at `/admin`.

For production-style startup:

```bash
npm start
```

## Render deployment

### 1. Create the service

1. Push this repository to GitHub.
2. In Render, choose **New → Web Service**.
3. Connect `Samkelo119/Zephyr-repo`.
4. Select a Node runtime and use the following commands:

| Setting | Value |
|---|---|
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

### 2. Add environment variables

Set these in **Render → Environment**:

| Variable | Required | Description |
|---|---:|---|
| `OWNER_NUMBER` | Yes | WhatsApp number without `+` or spaces |
| `ADMIN_PANEL_PASSWORD` | Yes | Strong password for `/admin` |
| `PORT` | No | Render provides this automatically |
| `OPENAI_API_KEY` | No | Enables AI-powered commands |
| `GIPHY_API_KEY` | No | Giphy integrations where enabled |
| `OMDB_API_KEY` | No | Movie lookup commands |

### 3. Persist the WhatsApp session

Add a Render persistent disk and mount it at the project root, or at the path used by the bot for `auth_info/`. Without persistent storage, Render may erase the WhatsApp session during redeploys and the number will need to be paired again.

### 4. Pair the number

After the first deploy:

1. Open `https://YOUR-SERVICE.onrender.com/pair`.
2. Enter the WhatsApp number in international format, without the plus sign.
3. Generate the pairing code.
4. On the phone, open **WhatsApp → Linked devices → Link a device → Link with phone number instead**.
5. Enter the displayed code.

Keep the Render service running while pairing. The dashboard will report connection state and pairing errors directly.

## Important production notes

- Do not commit `auth_info/`, API keys, passwords, or generated bot data.
- Use a persistent disk or external storage for session files.
- Keep the Render service on a plan that does not sleep while the bot is expected to answer messages.
- WhatsApp may revoke sessions or request re-pairing as a security measure.
- Never expose the admin panel password in client-side code or public screenshots.

## Project layout

```text
.
├── bootstrap.js                 # Service entrypoint and web server
├── public/pair.html             # Pairing console
├── public/                      # Static web assets
├── commands/                    # Bot command modules
├── auth_info/                   # WhatsApp session data (ignored)
├── data/                        # Runtime data (ignored where applicable)
└── package.json                 # Scripts and dependencies
```

## Troubleshooting

### Pairing code does not appear

- Confirm the service is healthy and the `/health` endpoint responds.
- Check Render logs for Baileys authentication or network errors.
- Use the full international number without `+`, spaces, or punctuation.
- Wait for the pairing page to show that the socket is ready before requesting another code.
- Restart only after checking logs; repeated requests can invalidate an earlier pairing attempt.

### The bot disconnects after deploy

This usually means the filesystem is ephemeral or the service is sleeping. Attach a persistent disk, verify the service is always running, and confirm that the `auth_info/` directory survives a restart.

### Commands are not responding

Check the service logs, confirm the WhatsApp account is connected, and verify any command-specific API keys. Restarting the service should not require pairing again when persistent storage is configured correctly.

## License

Use and modify this project responsibly. Follow WhatsApp's terms, respect user privacy, and only automate conversations where you have permission.

---

Built for reliable, persistent WhatsApp automation.
